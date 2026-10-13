// A migraine's severity is a timeline of readings, not a single number:
// "5 at 11:00, 2 at 12:00, ended 3:00". This module is the single definition of
// that model, shared by the Convex functions (convex/migraines.ts) and the UI.
//
// Storage (convex/schema.ts): `readings` is an optional array on the migraine.
// Documents written before it existed have none, so they read as a single
// reading at `startTime` carrying the legacy `severity`. No backfill is needed;
// a document gains `readings` the first time it is written.
//
// `severity` on the document is kept as the PEAK of the readings, so anything
// that still reads it (older cached app bundles, the calendar) shows the
// maximum.

export type Reading = { at: number; severity: number };

type Timeline = {
  startTime: number;
  severity: number;
  readings?: readonly Reading[] | null;
};

/** The timeline for a migraine, oldest first. Legacy documents get one reading. */
export function readingsOf(migraine: Timeline): Reading[] {
  const stored = migraine.readings;
  const list =
    stored && stored.length > 0
      ? stored.map((r) => ({ at: r.at, severity: r.severity }))
      : [{ at: migraine.startTime, severity: migraine.severity }];
  return list.sort((a, b) => a.at - b.at);
}

/** Highest severity reached. */
export function peakSeverity(readings: readonly Reading[]): number {
  return Math.max(...readings.map((r) => r.severity));
}

/** Severity at the most recent reading. */
export function currentSeverity(readings: readonly Reading[]): number {
  let latest = readings[0];
  for (const r of readings) if (r.at >= latest.at) latest = r;
  return latest.severity;
}

/**
 * Puts readings in canonical form for a migraine spanning [startTime, endTime]:
 * sorted by time, the first reading anchored to the start, and every reading
 * kept inside the migraine. Throws if there are none.
 */
export function normalizeReadings(
  readings: readonly Reading[],
  startTime: number,
  endTime: number | null,
): Reading[] {
  if (readings.length === 0) {
    throw new Error("A migraine needs at least one severity reading.");
  }
  const upper =
    endTime !== null && endTime >= startTime ? endTime : Number.POSITIVE_INFINITY;
  return [...readings]
    .sort((a, b) => a.at - b.at)
    .map((r, i) => ({
      at: i === 0 ? startTime : Math.min(Math.max(r.at, startTime), upper),
      severity: r.severity,
    }));
}

/**
 * Decides the readings to store when a migraine is updated.
 * - `provided`: the full edited timeline from a current client; it wins.
 * - `legacySeverity`: an older client that only knows one severity value and
 *   sends it on every save; applied to the latest reading, as it always was.
 * - otherwise the existing timeline is kept (re-fitted to the new start/end).
 */
export function resolveReadings(args: {
  existing: readonly Reading[];
  provided?: readonly Reading[];
  legacySeverity?: number;
  startTime: number;
  endTime: number | null;
}): Reading[] {
  let base: readonly Reading[] = args.provided ?? args.existing;
  if (args.provided === undefined && args.legacySeverity !== undefined) {
    const copy = base.map((r) => ({ ...r }));
    copy[copy.length - 1].severity = args.legacySeverity;
    base = copy;
  }
  return normalizeReadings(base, args.startTime, args.endTime);
}
