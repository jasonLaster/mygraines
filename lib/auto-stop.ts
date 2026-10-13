// Migraines that are still open-ended stop automatically at midnight: the first
// local midnight after they started. This module is the single definition of
// that rule; the UI derives end times from it immediately, and a sweep in
// app/page.tsx persists the result to Convex.

type Timed = { startTime: number; endTime: number | null };

/** The first local midnight strictly after `timestamp` (DST-safe). */
export function nextLocalMidnight(timestamp: number): number {
  const d = new Date(timestamp);
  // Date normalises day overflow (e.g. Jan 32 -> Feb 1) in local time.
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
}

/**
 * The end time a migraine has at `now`: its recorded end, or the midnight it
 * was cut off at, or null while it is still genuinely in progress.
 */
export function effectiveEndTime(migraine: Timed, now: number): number | null {
  if (migraine.endTime !== null) return migraine.endTime;
  const cutoff = nextLocalMidnight(migraine.startTime);
  return now >= cutoff ? cutoff : null;
}

/** Open-ended migraines whose midnight has passed, with the end to persist. */
export function findOverdue<T extends Timed & { _id: string }>(
  migraines: readonly T[],
  now: number,
): { id: T["_id"]; endTime: number }[] {
  const overdue: { id: T["_id"]; endTime: number }[] = [];
  for (const m of migraines) {
    const endTime = effectiveEndTime(m, now);
    if (m.endTime === null && endTime !== null) {
      overdue.push({ id: m._id, endTime });
    }
  }
  return overdue;
}
