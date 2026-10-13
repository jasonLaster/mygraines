"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useRef, useEffect, useMemo } from "react";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { FoodMultiSelect } from "@/components/FoodMultiSelect";
import { TOP_FOODS } from "@/lib/foods";
import { useCachedQuery } from "@/lib/use-cached-query";
import { effectiveEndTime, findOverdue } from "@/lib/auto-stop";
import {
  currentSeverity,
  peakSeverity,
  readingsOf,
  type Reading,
} from "@/lib/severity";
import { SeverityChart } from "./SeverityChart";

// --- Constants ---
const currentYear = new Date().getFullYear();
const minDate = `${currentYear}-01-01T00:00`;
const maxDate = `${currentYear}-12-31T23:59`;

const TRIGGERS = [
  "Crohns",
  "Coffee",
  "Sleep",
  "Stress",
  "Dehydration",
  "Other",
];

// Meal tracking is built (data, screens, backend) but hidden from the UI for
// now. Flip this to bring the Meals tab and screens back.
const SHOW_MEALS = false;

// --- Helpers ---

// Local "YYYY-MM-DDTHH:mm" for <input type="datetime-local">.
function toLocalInput(timestamp: number): string {
  const d = new Date(timestamp);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function formatDateShort(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(startTime: number, endTime: number | null): string {
  const end = endTime ?? Date.now();
  const ms = end - startTime;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatFriendlyDate(dateStr: string): string {
  if (!dateStr) return "Select Date";
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  // Check yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${timeStr}`;
}

type SeverityLevel = "High" | "Moderate" | "Mild" | "Low";

function getSeverityDetails(severity: number): {
  level: SeverityLevel;
  icon: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
} {
  if (severity >= 8) {
    return {
      level: "High",
      icon: "thunderstorm",
      colorClass: "text-red-400",
      bgClass: "bg-red-900/20",
      borderClass: "border-red-900/30",
      textClass: "text-red-300",
    };
  } else if (severity >= 5) {
    return {
      level: "Moderate",
      icon: "rainy",
      colorClass: "text-orange-400",
      bgClass: "bg-orange-900/20",
      borderClass: "border-orange-900/30",
      textClass: "text-orange-300",
    };
  } else if (severity >= 3) {
    return {
      level: "Mild",
      icon: "cloud",
      colorClass: "text-yellow-400",
      bgClass: "bg-yellow-900/20",
      borderClass: "border-yellow-900/30",
      textClass: "text-yellow-300",
    };
  } else {
    return {
      level: "Low",
      icon: "partly_cloudy_day",
      colorClass: "text-blue-400",
      bgClass: "bg-blue-900/20",
      borderClass: "border-blue-900/30",
      textClass: "text-blue-300",
    };
  }
}

// --- Calendar Helpers ---

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getMonthName(month: number): string {
  return new Date(2000, month, 1).toLocaleDateString("en-US", { month: "long" });
}

// --- Components ---

// Same box model as a migraine card in the list (avatar + three text rows) so
// the list doesn't shift when real data replaces it.
function MigraineCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex animate-pulse items-center justify-between rounded-xl border border-gray-800 bg-surface-dark p-4 shadow-lg shadow-black/20"
    >
      <div className="flex flex-1 items-start gap-4">
        <div className="h-12 w-12 shrink-0 rounded-full bg-gray-800" />
        <div className="flex flex-col justify-center gap-1">
          <div className="flex h-[18px] items-center">
            <div className="h-4 w-24 rounded bg-gray-800" />
          </div>
          <div className="flex h-5 items-center">
            <div className="h-3.5 w-36 rounded bg-gray-800/70" />
          </div>
          <div className="flex h-4 items-center">
            <div className="h-3 w-16 rounded bg-gray-800/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Home screen pieces ---

function HomeSkeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col items-center">
      <div className="h-24 w-24 rounded-full bg-gray-800" />
      <div className="mt-6 h-4 w-40 rounded bg-gray-800/70" />
      <div className="mt-4 h-12 w-32 rounded bg-gray-800" />
      <div className="mt-8 h-14 w-full rounded-full bg-gray-800" />
    </div>
  );
}

// The migraine that is happening now: how long, how bad, and a way to edit it.
function ActiveMigraine({
  migraine,
  others,
  now,
  onEdit,
}: {
  migraine: Doc<"migraines">;
  others: Doc<"migraines">[];
  now: number;
  onEdit: (migraine: Doc<"migraines">) => void;
}) {
  const readings = readingsOf(migraine);
  const current = currentSeverity(readings);
  const peak = peakSeverity(readings);
  const details = getSeverityDetails(current);
  const startedToday = isSameDay(new Date(migraine.startTime), new Date(now));
  const triggers = migraine.triggers ?? [];

  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={`flex h-24 w-24 items-center justify-center rounded-full border ${details.bgClass} ${details.borderClass} ${details.colorClass}`}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 44 }}>
          {details.icon}
        </span>
      </div>
      <p className="mt-6 text-sm font-bold uppercase tracking-wide text-primary">
        Migraine in progress
      </p>
      <p className="mt-2 text-5xl font-bold text-text-dark">
        {formatDuration(migraine.startTime, Math.max(now, migraine.startTime))}
      </p>
      <p className="mt-2 text-gray-400">
        Started{" "}
        {startedToday ? "" : `${formatDateShort(migraine.startTime)} at `}
        {formatTime(migraine.startTime)}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${details.bgClass} ${details.textClass} ${details.borderClass}`}
        >
          Now · {details.level} · {current}/10
        </span>
        {peak > current && (
          <span className="rounded-full border border-gray-800 bg-surface-dark px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-400">
            Peak {peak}/10
          </span>
        )}
      </div>
      {readings.length > 1 && (
        <div className="mt-5 w-full rounded-2xl border border-gray-800 bg-surface-dark p-3">
          <SeverityChart
            readings={readings}
            startTime={migraine.startTime}
            endTime={null}
            now={now}
          />
        </div>
      )}
      {triggers.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {triggers.map((trigger) => (
            <span
              key={trigger}
              className="rounded-full border border-gray-800 bg-surface-dark px-3 py-1 text-xs font-medium text-gray-300"
            >
              {trigger}
            </span>
          ))}
        </div>
      )}
      <button
        onClick={() => onEdit(migraine)}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-base font-bold text-white shadow-lg shadow-purple-900/30 transition-transform active:scale-95"
      >
        <span className="material-symbols-outlined">edit</span>
        Edit migraine
      </button>
      <p className="mt-4 text-xs text-gray-500">Ends automatically at midnight</p>

      {others.length > 0 && (
        <div className="mt-8 w-full text-left">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            Also in progress
          </p>
          <div className="flex flex-col gap-2">
            {others.map((other) => (
              <button
                key={other._id}
                onClick={() => onEdit(other)}
                className="flex items-center justify-between rounded-xl border border-gray-800 bg-surface-dark px-4 py-3 transition-transform active:scale-[0.98]"
              >
                <span className="text-sm font-medium text-text-dark">
                  {formatTime(other.startTime)} ·{" "}
                  {getSeverityDetails(other.severity).level}
                </span>
                <span className="material-symbols-outlined text-gray-600">
                  chevron_right
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Nothing in progress: invite the user to log one.
function NoActiveMigraine({
  last,
  onCreate,
}: {
  last: Doc<"migraines"> | undefined;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-gray-800 bg-surface-dark text-accent-purple">
        <span className="material-symbols-outlined" style={{ fontSize: 44 }}>
          light_mode
        </span>
      </div>
      <h3 className="mt-6 text-2xl font-bold text-text-dark">
        No migraine right now
      </h3>
      <p className="mt-2 max-w-xs text-gray-400">
        Log one when it starts and it will be tracked until it ends.
      </p>
      <button
        onClick={onCreate}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-base font-bold text-white shadow-lg shadow-purple-900/30 transition-transform active:scale-95"
      >
        <span className="material-symbols-outlined">add</span>
        Log a migraine
      </button>
      {last && (
        <p className="mt-6 text-xs text-gray-500">
          Last migraine: {formatDateShort(last.startTime)} ·{" "}
          {formatDuration(last.startTime, last.endTime)}
        </p>
      )}
    </div>
  );
}

export default function Home() {
  const { data: allMigraines, isLive: migrainesAreLive } = useCachedQuery(
    api.migraines.getAll,
    "migraines",
  );
  const createMigraine = useMutation(api.migraines.create);
  const updateMigraine = useMutation(api.migraines.update);
  const deleteMigraine = useMutation(api.migraines.deleteMigraine);

  // Meals
  const { data: allMeals } = useCachedQuery(api.meals.getAll, "meals", {
    skip: !SHOW_MEALS,
  });
  const createMeal = useMutation(api.meals.create);
  const updateMeal = useMutation(api.meals.update);
  const deleteMealMutation = useMutation(api.meals.deleteMeal);

  // View State
  const [view, setView] = useState<
    "home" | "list" | "calendar" | "new" | "edit" | "meals" | "newMeal" | "editMeal"
  >("home");
  // Where the new/edit form goes back to: home, history or the calendar.
  const [backView, setBackView] = useState<"home" | "list" | "calendar">("home");
  // Refreshed every 30s and on resume so durations tick and midnight is noticed.
  const [now, setNow] = useState(() => Date.now());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [filter, setFilter] = useState<"All" | SeverityLevel>("All");

  // Form State
  // Severity over time for the migraine being edited (see lib/severity.ts).
  // `at: 0` is a placeholder; the first reading is anchored to the start time.
  const [formReadings, setFormReadings] = useState<Reading[]>([
    { at: 0, severity: 5 },
  ]);
  // How many of formReadings were already saved; anything after is a new change.
  const [savedReadingCount, setSavedReadingCount] = useState(0);
  // We use unified state for form dates now
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");

  const [editingId, setEditingId] = useState<Id<"migraines"> | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);

  // Meal Form State
  const [selectedMealFoods, setSelectedMealFoods] = useState<string[]>([]);
  const [mealDescription, setMealDescription] = useState("");
  const [mealNotes, setMealNotes] = useState("");
  const [mealTimestamp, setMealTimestamp] = useState("");
  const [editingMealId, setEditingMealId] = useState<Id<"meals"> | null>(null);
  const mealInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  // Open-ended migraines stop at the first midnight after they started (see
  // lib/auto-stop.ts). Everything rendered uses these derived end times, so the
  // UI is right immediately, even before the write below has happened.
  const migraines = useMemo(
    () =>
      (allMigraines ?? []).map((m) => ({
        ...m,
        endTime: effectiveEndTime(m, now),
      })),
    [allMigraines, now],
  );

  // Persist the stop. Only ever driven by live data: the cached snapshot can be
  // stale, and writing from it could overwrite an end time set on another device.
  const sweptIds = useRef(new Set<string>());
  useEffect(() => {
    if (!migrainesAreLive || !allMigraines) return;
    for (const m of allMigraines) {
      if (m.endTime !== null) sweptIds.current.delete(m._id);
    }
    for (const { id, endTime } of findOverdue(allMigraines, now)) {
      if (sweptIds.current.has(id)) continue;
      sweptIds.current.add(id);
      updateMigraine({ id, endTime }).catch(() => sweptIds.current.delete(id));
    }
  }, [allMigraines, migrainesAreLive, now, updateMigraine]);

  // -- Handlers --

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(trigger)
        ? prev.filter((t) => t !== trigger)
        : [...prev, trigger]
    );
  };

  const resetForm = () => {
    setFormReadings([{ at: 0, severity: 5 }]);
    setSavedReadingCount(0);
    setFormStartTime("");
    setFormEndTime("");
    setNotes("");
    setSelectedTriggers([]);
    setEditingId(null);
  };

  // The first reading is always the start of the migraine.
  const readingsToSave = (startTime: number): Reading[] =>
    formReadings.map((r, i) => (i === 0 ? { ...r, at: startTime } : r));

  // The severity control edits the latest reading. On a migraine that is still
  // going, moving it away from the last saved value records a NEW reading (so
  // the timeline shows 5 -> 2); moving it back drops that pending change.
  const formIsOngoing = view === "edit" && formEndTime === "";
  const formSeverity = currentSeverity(formReadings);

  const changeSeverity = (value: number) => {
    setFormReadings((prev) => {
      const last = prev[prev.length - 1];
      if (
        formIsOngoing &&
        prev.length === savedReadingCount &&
        value !== last.severity
      ) {
        return [...prev, { at: Date.now(), severity: value }];
      }
      if (
        formIsOngoing &&
        prev.length === savedReadingCount + 1 &&
        value === prev[savedReadingCount - 1].severity
      ) {
        return prev.slice(0, -1);
      }
      return [...prev.slice(0, -1), { ...last, severity: value }];
    });
  };

  const bumpReading = (index: number, delta: number) =>
    setFormReadings((prev) =>
      prev.map((r, i) =>
        i === index
          ? { ...r, severity: Math.min(10, Math.max(1, r.severity + delta)) }
          : r,
      ),
    );

  const moveReading = (index: number, at: number) => {
    if (Number.isNaN(at)) return;
    setFormReadings((prev) =>
      prev.map((r, i) => (i === index ? { ...r, at } : r)).sort((a, b) => a.at - b.at),
    );
  };

  const removeReading = (index: number) =>
    setFormReadings((prev) => prev.filter((_, i) => i !== index));

  const addReading = () =>
    setFormReadings((prev) => {
      const last = prev[prev.length - 1];
      const at = formEndTime
        ? new Date(formEndTime).getTime()
        : Math.max(Date.now(), last.at);
      return [...prev, { at: Math.max(at, last.at), severity: last.severity }];
    });

  const handleCreate = async () => {
    try {
      const startTime = formStartTime
        ? new Date(formStartTime).getTime()
        : Date.now();
      const endTime = formEndTime ? new Date(formEndTime).getTime() : undefined;

      await createMigraine({
        startTime,
        endTime,
        severity: peakSeverity(formReadings),
        readings: readingsToSave(startTime),
        notes,
        triggers: selectedTriggers,
      });
      resetForm();
      setView(backView);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to create migraine"
      );
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      const startTime = formStartTime
        ? new Date(formStartTime).getTime()
        : undefined;
      const endTime = formEndTime ? new Date(formEndTime).getTime() : null; // null means active

      await updateMigraine({
        id: editingId,
        startTime,
        endTime,
        readings: readingsToSave(startTime ?? formReadings[0].at),
        notes,
        triggers: selectedTriggers,
      });
      resetForm();
      setView(backView);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!confirm("Are you sure you want to delete this entry?")) return;
    try {
      await deleteMigraine({ id: editingId });
      resetForm();
      setView(backView);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  const startNew = () => {
    resetForm();
    const d = new Date();
    setFormStartTime(
      new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    );
    setBackView(view === "list" || view === "calendar" ? view : "home");
    setView("new");
  };

  const startEdit = (migraine: Doc<"migraines">) => {
    setBackView(view === "list" || view === "calendar" ? view : "home");
    setEditingId(migraine._id);
    const saved = readingsOf(migraine);
    setFormReadings(saved);
    setSavedReadingCount(saved.length);

    // Convert timestamp to local datetime string
    const start = new Date(migraine.startTime);
    setFormStartTime(
      new Date(start.getTime() - start.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    );

    if (migraine.endTime) {
      const end = new Date(migraine.endTime);
      setFormEndTime(
        new Date(end.getTime() - end.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      );
    } else {
      setFormEndTime("");
    }

    setNotes(migraine.notes || "");
    setSelectedTriggers(migraine.triggers || []);
    setView("edit");
  };

  // -- Meal Handlers --

  const resetMealForm = () => {
    setSelectedMealFoods([]);
    setMealDescription("");
    setMealNotes("");
    setMealTimestamp("");
    setEditingMealId(null);
  };

  const buildMealDescription = () => {
    const parts = [...selectedMealFoods, mealDescription.trim()].filter(Boolean);
    return parts.join(", ");
  };

  const handleCreateMeal = async () => {
    const description = buildMealDescription();
    if (!description) {
      alert("Please select foods or type what you ate");
      return;
    }
    try {
      const timestamp = mealTimestamp
        ? new Date(mealTimestamp).getTime()
        : Date.now();

      await createMeal({
        description,
        timestamp,
        notes: mealNotes || undefined,
      });
      resetMealForm();
      setView("meals");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to add meal");
    }
  };

  const handleSaveMealEdit = async () => {
    if (!editingMealId) return;
    const description = buildMealDescription();
    if (!description) {
      alert("Please select foods or type what you ate");
      return;
    }
    try {
      const timestamp = mealTimestamp
        ? new Date(mealTimestamp).getTime()
        : undefined;

      await updateMeal({
        id: editingMealId,
        description,
        timestamp,
        notes: mealNotes || undefined,
      });
      resetMealForm();
      setView("meals");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update meal");
    }
  };

  const handleDeleteMeal = async () => {
    if (!editingMealId) return;
    if (!confirm("Are you sure you want to delete this meal?")) return;
    try {
      await deleteMealMutation({ id: editingMealId });
      resetMealForm();
      setView("meals");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete meal");
    }
  };

  const startMealEdit = (meal: Doc<"meals">) => {
    setEditingMealId(meal._id);
    // Parse description: parts in TOP_FOODS go to multi-select, rest to free text
    const parts = meal.description.split(",").map((p) => p.trim()).filter(Boolean);
    const fromDb: string[] = [];
    const custom: string[] = [];
    const foodSet = new Set(TOP_FOODS);
    for (const p of parts) {
      if (foodSet.has(p)) fromDb.push(p);
      else custom.push(p);
    }
    setSelectedMealFoods(fromDb);
    setMealDescription(custom.join(", "));
    setMealNotes(meal.notes || "");

    const date = new Date(meal.timestamp);
    setMealTimestamp(
      new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    );

    setView("editMeal");
  };

  // Focus input when entering new meal view
  useEffect(() => {
    if (view === "newMeal" && mealInputRef.current) {
      mealInputRef.current.focus();
    }
  }, [view]);

  // -- Filtering --

  const displayedMigraines = migraines.filter((m) => {
    if (filter === "All") return true;
    const details = getSeverityDetails(m.severity);
    return details.level === filter;
  });

  const isLoadingMigraines = allMigraines === undefined;
  const activeMigraines = migraines.filter((m) => m.endTime === null);
  const lastMigraine = migraines.find((m) => m.endTime !== null);

  return (
    // Sized from --app-height (see lib/app-height.ts), not bottom-anchored to
    // the viewport: iOS standalone mode reports a viewport shorter than the
    // screen, which left a dead strip under the bottom nav. Fixed (rather than
    // absolute) so a root taller than that viewport can't make the page
    // scrollable. 100dvh is the fallback everywhere else.
    <div
      data-app-root
      style={{ height: "var(--app-height, 100dvh)" }}
      className="fixed left-0 top-0 flex w-full flex-col overflow-hidden bg-background-dark font-display text-text-dark"
    >
      <div className="relative mx-auto flex h-full w-full max-w-md flex-col overflow-hidden bg-background-dark">

        {/* --- Home: log a new migraine, or edit the one in progress --- */}
        {view === "home" && (
          <>
            <div className="flex-shrink-0 bg-background-dark px-6 pt-safe-header pb-4">
              <h2 data-layout-debug className="text-2xl font-bold text-text-dark">Mygraines</h2>
            </div>
            <div className="no-scrollbar flex flex-1 flex-col justify-center overflow-y-auto px-6 pb-28">
              {isLoadingMigraines ? (
                <HomeSkeleton />
              ) : activeMigraines.length > 0 ? (
                <ActiveMigraine
                  migraine={activeMigraines[0]}
                  others={activeMigraines.slice(1)}
                  now={now}
                  onEdit={startEdit}
                />
              ) : (
                <NoActiveMigraine last={lastMigraine} onCreate={startNew} />
              )}
            </div>
          </>
        )}

        {/* --- History (all migraines) --- */}
        {view === "list" && (
          <>
            {/* Header */}
            <div className="flex-shrink-0 bg-background-dark px-6 pt-safe-header pb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-text-dark">History</h2>
                <button
                  onClick={startNew}
                  className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full font-medium text-sm shadow-lg shadow-purple-900/30 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add Migraine
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="no-scrollbar flex-shrink-0 overflow-x-auto bg-background-dark px-6 pb-2">
              <div className="flex gap-3">
                {(["All", "Severe", "Moderate", "Mild"] as const).map((f) => {
                  // Map UI filter names to logic
                  const logicFilter = f === "Severe" ? "High" : f;
                  const isActive = filter === logicFilter;
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(logicFilter)}
                      className={`flex h-10 shrink-0 items-center justify-center rounded-full px-6 text-sm font-medium transition-transform active:scale-95 ${
                        isActive
                          ? "bg-primary text-white shadow-sm shadow-purple-900/20"
                          : "bg-surface-dark border border-gray-800 text-text-dark hover:bg-gray-800"
                      }`}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List */}
            <div className="no-scrollbar flex-1 overflow-y-auto px-4 pt-2 pb-24">
              <div className="flex flex-col gap-3">
                {isLoadingMigraines &&
                  Array.from({ length: 6 }, (_, i) => (
                    <MigraineCardSkeleton key={i} />
                  ))}
                {displayedMigraines.map((migraine) => {
                  const details = getSeverityDetails(migraine.severity);
                  const isActive = migraine.endTime === null;

                  return (
                    <div
                      key={migraine._id}
                      onClick={() => startEdit(migraine)}
                      className={`group relative flex cursor-pointer items-center justify-between rounded-xl border border-gray-800 bg-surface-dark p-4 shadow-lg shadow-black/20 transition-all active:scale-[0.98] hover:border-primary/50 ${
                        isActive ? "border-primary shadow-purple-900/20" : ""
                      }`}
                    >
                      <div className="flex flex-1 items-start gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${details.bgClass} ${details.colorClass} ${details.borderClass}`}
                        >
                          <span className="material-symbols-outlined text-[24px]">
                            {details.icon}
                          </span>
                        </div>
                        <div className="flex flex-col justify-center gap-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold leading-none text-text-dark">
                              {formatDateShort(migraine.startTime)}
                            </h3>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                isActive
                                  ? "border-primary bg-primary text-white"
                                  : `bg-opacity-40 border-opacity-50 ${details.bgClass} ${details.textClass} ${details.borderClass}`
                              }`}
                            >
                              {isActive ? "Active" : details.level}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-400">
                            {formatTime(migraine.startTime)} –{" "}
                            {migraine.endTime
                              ? formatTime(migraine.endTime)
                              : "Now"}
                          </p>
                          <p className="flex items-center gap-1 text-xs font-medium text-gray-500">
                            <span className="material-symbols-outlined text-[14px]">
                              schedule
                            </span>{" "}
                            {formatDuration(
                              migraine.startTime,
                              migraine.endTime
                            )}
                            {readingsOf(migraine).length > 1 && (
                              <span className="text-gray-600">
                                {" "}
                                ·{" "}
                                {readingsOf(migraine)
                                  .map((r) => r.severity)
                                  .join(" → ")}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-gray-600 transition-colors group-hover:text-primary">
                        <span className="material-symbols-outlined">
                          chevron_right
                        </span>
                      </div>
                    </div>
                  );
                })}
                {!isLoadingMigraines && displayedMigraines.length === 0 && (
                  <div className="py-10 text-center text-gray-500">
                    <p>No entries found.</p>
                    <p className="text-sm mt-1">Tap &quot;Add Migraine&quot; to log one.</p>
                  </div>
                )}
              </div>
              {!isLoadingMigraines && (
                <div className="mt-6 flex h-20 items-center justify-center opacity-50">
                  <p className="text-xs text-gray-600">End of records</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* --- Calendar View --- */}
        {view === "calendar" && (
          <>
            {/* Calendar Header */}
            <div className="flex-shrink-0 bg-background-dark px-6 pt-safe-header pb-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    const newMonth = calendarMonth.month === 0 ? 11 : calendarMonth.month - 1;
                    const newYear = calendarMonth.month === 0 ? calendarMonth.year - 1 : calendarMonth.year;
                    setCalendarMonth({ year: newYear, month: newMonth });
                  }}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <h2 className="text-xl font-bold text-text-dark">
                  {getMonthName(calendarMonth.month)} {calendarMonth.year}
                </h2>
                <button
                  onClick={() => {
                    const newMonth = calendarMonth.month === 11 ? 0 : calendarMonth.month + 1;
                    const newYear = calendarMonth.month === 11 ? calendarMonth.year + 1 : calendarMonth.year;
                    setCalendarMonth({ year: newYear, month: newMonth });
                  }}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-24">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-gray-500 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const daysInMonth = getDaysInMonth(calendarMonth.year, calendarMonth.month);
                  const firstDay = getFirstDayOfMonth(calendarMonth.year, calendarMonth.month);
                  const today = new Date();
                  const cells = [];

                  // Empty cells for days before the first of the month
                  for (let i = 0; i < firstDay; i++) {
                    cells.push(
                      <div key={`empty-${i}`} className="aspect-square" />
                    );
                  }

                  // Days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const cellDate = new Date(calendarMonth.year, calendarMonth.month, day);
                    const isToday = isSameDay(cellDate, today);
                    
                    // Find migraines for this day
                    const dayMigraines = migraines.filter((m) => {
                      const startDate = new Date(m.startTime);
                      const endDate = m.endTime ? new Date(m.endTime) : new Date(now);

                      // Overlap with [dayStart, nextDayStart). Half-open, so a
                      // migraine that ends exactly at midnight (auto-stopped)
                      // belongs to the day it started on, not the next one.
                      const dayStart = new Date(calendarMonth.year, calendarMonth.month, day);
                      const nextDayStart = new Date(calendarMonth.year, calendarMonth.month, day + 1);

                      return (
                        startDate < nextDayStart &&
                        (endDate > dayStart || startDate >= dayStart)
                      );
                    });

                    const hasMigraine = dayMigraines.length > 0;
                    const maxSeverity = hasMigraine
                      ? Math.max(...dayMigraines.map((m) => m.severity))
                      : 0;
                    const severityDetails = hasMigraine
                      ? getSeverityDetails(maxSeverity)
                      : null;

                    cells.push(
                      <div
                        key={day}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center relative cursor-pointer transition-all hover:scale-105 ${
                          isToday
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background-dark"
                            : ""
                        } ${
                          hasMigraine && severityDetails
                            ? `${severityDetails.bgClass} border ${severityDetails.borderClass}`
                            : "bg-surface-dark border border-gray-800"
                        }`}
                        onClick={() => {
                          if (dayMigraines.length === 1) {
                            startEdit(dayMigraines[0]);
                          } else if (dayMigraines.length > 1) {
                            // If multiple migraines, go to list view (could be enhanced)
                            setView("list");
                          }
                        }}
                      >
                        <span
                          className={`text-sm font-medium ${
                            hasMigraine && severityDetails
                              ? severityDetails.textClass
                              : isToday
                                ? "text-primary"
                                : "text-text-dark"
                          }`}
                        >
                          {day}
                        </span>
                        {hasMigraine && severityDetails && (
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {dayMigraines.length > 1 ? (
                              <span className="text-[8px] font-bold text-gray-400">
                                {dayMigraines.length}
                              </span>
                            ) : (
                              <span
                                className={`material-symbols-outlined text-[12px] ${severityDetails.colorClass}`}
                              >
                                {severityDetails.icon}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return cells;
                })()}
              </div>

              {/* Legend */}
              <div className="mt-6 p-4 rounded-xl bg-surface-dark border border-gray-800">
                <h3 className="text-sm font-bold text-gray-400 mb-3">Severity Legend</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { level: "High", severity: 8 },
                    { level: "Moderate", severity: 5 },
                    { level: "Mild", severity: 3 },
                    { level: "Low", severity: 1 },
                  ].map(({ level, severity }) => {
                    const details = getSeverityDetails(severity);
                    return (
                      <div key={level} className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded flex items-center justify-center ${details.bgClass} border ${details.borderClass}`}
                        >
                          <span
                            className={`material-symbols-outlined text-[14px] ${details.colorClass}`}
                          >
                            {details.icon}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">{level}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Stats */}
              {(() => {
                const monthMigraines = (allMigraines || []).filter((m) => {
                  const startDate = new Date(m.startTime);
                  return (
                    startDate.getFullYear() === calendarMonth.year &&
                    startDate.getMonth() === calendarMonth.month
                  );
                });
                const totalCount = monthMigraines.length;
                const avgSeverity =
                  totalCount > 0
                    ? (
                        monthMigraines.reduce((sum, m) => sum + m.severity, 0) /
                        totalCount
                      ).toFixed(1)
                    : "0";

                return (
                  <div className="mt-4 p-4 rounded-xl bg-surface-dark border border-gray-800">
                    <h3 className="text-sm font-bold text-gray-400 mb-3">
                      Monthly Summary
                    </h3>
                    <div className="flex justify-around">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-text-dark">
                          {totalCount}
                        </div>
                        <div className="text-xs text-gray-500">Migraines</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-text-dark">
                          {avgSeverity}
                        </div>
                        <div className="text-xs text-gray-500">Avg Severity</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </>
        )}

        {/* --- Meals List View --- */}
        {SHOW_MEALS && view === "meals" && (
          <>
            {/* Header */}
            <div className="flex-shrink-0 bg-background-dark px-6 pt-safe-header pb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-text-dark">Meals</h2>
                <button
                  onClick={() => {
                    resetMealForm();
                    const now = new Date();
                    const localIso = new Date(
                      now.getTime() - now.getTimezoneOffset() * 60000
                    )
                      .toISOString()
                      .slice(0, 16);
                    setMealTimestamp(localIso);
                    setView("newMeal");
                  }}
                  className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full font-medium text-sm shadow-lg shadow-purple-900/30 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add Meal
                </button>
              </div>
            </div>

            {/* Meals List */}
            <div className="no-scrollbar flex-1 overflow-y-auto px-4 pt-2 pb-24">
              <div className="flex flex-col gap-3">
                {(allMeals || []).map((meal) => (
                  <div
                    key={meal._id}
                    onClick={() => startMealEdit(meal)}
                    className="group relative flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-gray-800 bg-surface-dark p-4 shadow-lg shadow-black/20 transition-all active:scale-[0.98] hover:border-primary/50"
                  >
                    <div className="flex flex-1 items-start gap-4 min-w-0">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-green-900/20 text-green-400 border-green-900/30">
                        <span className="material-symbols-outlined text-[24px]">
                          restaurant
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <h3 className="text-lg font-bold leading-snug text-text-dark break-words">
                          {meal.description}
                        </h3>
                        <p className="text-sm font-medium text-gray-400 shrink-0">
                          {formatDateShort(meal.timestamp)} at {formatTime(meal.timestamp)}
                        </p>
                        {meal.notes && (
                          <p className="text-xs text-gray-500 break-words">
                            {meal.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 pt-1 text-gray-600 transition-colors group-hover:text-primary">
                      <span className="material-symbols-outlined">
                        chevron_right
                      </span>
                    </div>
                  </div>
                ))}
                {allMeals !== undefined && allMeals.length === 0 && (
                  <div className="py-10 text-center text-gray-500">
                    <span className="material-symbols-outlined text-[48px] text-gray-600 mb-2 block">
                      restaurant
                    </span>
                    <p>No meals logged yet.</p>
                    <p className="text-sm mt-1">Tap "Add Meal" to start tracking.</p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex h-20 items-center justify-center opacity-50">
                <p className="text-xs text-gray-600">End of records</p>
              </div>
            </div>
          </>
        )}

        {/* --- New / Edit Meal Views --- */}
        {SHOW_MEALS && (view === "newMeal" || view === "editMeal") && (
          <div className="flex flex-1 flex-col overflow-hidden bg-background-dark">
            {/* Header */}
            <header className="flex-shrink-0 flex items-center justify-between px-6 pb-6 pt-safe-bar">
              <button
                onClick={() => {
                  resetMealForm();
                  setView("meals");
                }}
                className="p-2 -ml-2 text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <h2 className="text-lg font-bold text-text-dark">
                {view === "newMeal" ? "Add Meal" : "Edit Meal"}
              </h2>
              <button
                onClick={view === "newMeal" ? handleCreateMeal : handleSaveMealEdit}
                className="font-bold text-primary hover:text-accent-purple"
              >
                Save
              </button>
            </header>

            <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-4">
              <div className="space-y-6">
                {/* What did you eat? - Food database multi-select + free text */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-gray-200 font-bold">
                    <span className="material-symbols-outlined text-[20px]">
                      restaurant
                    </span>
                    <h3>What did you eat?</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Choose from common foods</p>
                      <FoodMultiSelect
                        value={selectedMealFoods}
                        onChange={setSelectedMealFoods}
                        placeholder="Search or select foods..."
                      />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Or type anything else</p>
                      <div className="rounded-2xl bg-surface-dark p-4 border border-gray-800">
                        <input
                          ref={mealInputRef}
                          type="text"
                          value={mealDescription}
                          onChange={(e) => setMealDescription(e.target.value)}
                          placeholder="e.g., Chicken salad, leftovers..."
                          className="w-full bg-transparent text-text-dark text-lg placeholder-gray-600 focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              view === "newMeal" ? handleCreateMeal() : handleSaveMealEdit();
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Time Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-gray-200 font-bold">
                    <span className="material-symbols-outlined text-[20px]">
                      schedule
                    </span>
                    <h3>When</h3>
                  </div>
                  <div className="relative rounded-2xl bg-surface-dark p-4 border border-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-text-dark">
                        {formatFriendlyDate(mealTimestamp)}
                      </span>
                      <span className="material-symbols-outlined text-gray-400">
                        edit_calendar
                      </span>
                    </div>
                    <input
                      type="datetime-local"
                      value={mealTimestamp}
                      onChange={(e) => setMealTimestamp(e.target.value)}
                      min={minDate}
                      max={maxDate}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-gray-200 font-bold">
                    <span className="material-symbols-outlined text-[20px]">
                      notes
                    </span>
                    <h3>Notes (optional)</h3>
                  </div>
                  <div className="rounded-2xl bg-surface-dark p-4 border border-gray-800">
                    <textarea
                      value={mealNotes}
                      onChange={(e) => setMealNotes(e.target.value)}
                      placeholder="Any details about this meal?"
                      className="w-full bg-transparent text-text-dark placeholder-gray-600 focus:outline-none min-h-[80px] resize-none"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={view === "newMeal" ? handleCreateMeal : handleSaveMealEdit}
                  className="w-full bg-primary text-white font-bold py-4 rounded-full text-lg shadow-lg shadow-purple-900/30 active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">check</span>
                  {view === "newMeal" ? "Add Meal" : "Save Changes"}
                </button>

                {/* Delete Button (Edit only) */}
                {view === "editMeal" && (
                  <button
                    onClick={handleDeleteMeal}
                    className="w-full text-red-400 font-medium py-2 flex items-center justify-center gap-2 hover:text-red-300 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      delete
                    </span>
                    Delete Meal
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- New / Edit Views (Updated Layout) --- */}
        {(view === "new" || view === "edit") && (
          <div className="flex flex-1 flex-col overflow-hidden bg-background-dark">
            {/* Header */}
            <header className="flex-shrink-0 flex items-center justify-between px-6 pb-6 pt-safe-bar">
              <button
                onClick={() => {
                  resetForm();
                  setView(backView);
                }}
                className="p-2 -ml-2 text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <h2 className="text-lg font-bold text-text-dark">
                {view === "new" ? "New Entry" : "Edit Migraine"}
              </h2>
              <button
                onClick={view === "new" ? handleCreate : handleSaveEdit}
                className="font-bold text-primary hover:text-accent-purple"
              >
                Save
              </button>
            </header>

            <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-4">
              <div className="space-y-8">
                {/* Duration Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-gray-200 font-bold">
                    <span className="material-symbols-outlined text-[20px]">
                      schedule
                    </span>
                    <h3>Duration</h3>
                  </div>
                  <div className="space-y-3">
                    {/* Start Time Card */}
                    <div className="relative rounded-2xl bg-surface-dark p-4 border border-gray-800">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Start Time
                      </label>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-text-dark">
                          {formatFriendlyDate(formStartTime)}
                        </span>
                        <span className="material-symbols-outlined text-gray-400">
                          edit_calendar
                        </span>
                      </div>
                      <input
                        type="datetime-local"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        min={minDate}
                        max={maxDate}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>

                    {/* End Time Card */}
                    <div className="relative rounded-2xl bg-surface-dark p-4 border border-gray-800">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        End Time
                      </label>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* Status Dot */}
                          {!formEndTime && (
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          )}
                          <span className="text-lg font-bold text-text-dark">
                            {formEndTime
                              ? formatFriendlyDate(formEndTime)
                              : "Ongoing"}
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-gray-400">
                          edit_calendar
                        </span>
                      </div>
                      <input
                        type="datetime-local"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        min={minDate}
                        max={maxDate}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Severity over time */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-gray-200 font-bold">
                    <span className="material-symbols-outlined text-[20px]">
                      favorite
                    </span>
                    <h3>Intensity Level</h3>
                  </div>
                  <div className="rounded-3xl bg-surface-dark p-8 border border-gray-800 flex flex-col items-center">
                    <div className="text-xs font-medium text-gray-500 mb-1">
                      {view === "new"
                        ? "Starting at"
                        : formIsOngoing
                          ? "Right now"
                          : "At the end"}
                    </div>
                    <div className="text-6xl font-bold text-text-dark mb-1">
                      {formSeverity}
                    </div>
                    <div className="text-xs font-bold tracking-widest text-accent-purple uppercase mb-8">
                      {formSeverity >= 8
                        ? "Severe"
                        : formSeverity >= 5
                          ? "Moderate"
                          : formSeverity >= 3
                            ? "Mild"
                            : "Low"}
                    </div>

                    <div className="w-full relative">
                      <div className="flex justify-between text-xs text-gray-500 font-medium mb-2 px-1">
                        <span>Mild</span>
                        <span>Extreme</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={formSeverity}
                        onChange={(e) => changeSeverity(Number(e.target.value))}
                        className="w-full accent-primary h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                      {/* Ticks visual approximation */}
                      <div className="flex justify-between px-1 mt-2">
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className="w-0.5 h-1 bg-gray-700"></div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {formReadings.length > 1 && (
                    <div className="mt-4 rounded-3xl bg-surface-dark p-4 border border-gray-800">
                      <SeverityChart
                        readings={readingsToSave(
                          formStartTime ? new Date(formStartTime).getTime() : now,
                        )}
                        startTime={
                          formStartTime ? new Date(formStartTime).getTime() : now
                        }
                        endTime={
                          formEndTime ? new Date(formEndTime).getTime() : null
                        }
                        now={now}
                      />
                    </div>
                  )}

                  {formReadings.length > 1 && (
                    <div className="mt-4 space-y-2">
                      {formReadings.map((reading, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 rounded-2xl border border-gray-800 bg-surface-dark px-4 py-3"
                        >
                          <div className="relative min-w-0 flex-1">
                            <p className="text-xs text-gray-500">
                              {index === 0 ? "Start" : "Change"}
                            </p>
                            <p className="truncate text-sm font-bold text-text-dark">
                              {formatFriendlyDate(
                                index === 0 ? formStartTime : toLocalInput(reading.at),
                              )}
                            </p>
                            {index > 0 && (
                              <input
                                type="datetime-local"
                                value={toLocalInput(reading.at)}
                                onChange={(e) =>
                                  moveReading(index, new Date(e.target.value).getTime())
                                }
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => bumpReading(index, -1)}
                              aria-label="Decrease severity"
                              className="h-8 w-8 rounded-full border border-gray-700 text-lg leading-none text-gray-300 active:scale-95"
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-lg font-bold text-text-dark">
                              {reading.severity}
                            </span>
                            <button
                              onClick={() => bumpReading(index, 1)}
                              aria-label="Increase severity"
                              className="h-8 w-8 rounded-full border border-gray-700 text-lg leading-none text-gray-300 active:scale-95"
                            >
                              +
                            </button>
                          </div>
                          {index > 0 ? (
                            <button
                              onClick={() => removeReading(index)}
                              aria-label="Remove this change"
                              className="p-1 text-gray-600 hover:text-red-400"
                            >
                              <span className="material-symbols-outlined">
                                delete
                              </span>
                            </button>
                          ) : (
                            <span className="w-8" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={addReading}
                    className="mt-4 flex items-center gap-2 text-sm font-medium text-primary active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      add
                    </span>
                    Add a severity change
                  </button>
                </div>

                {/* Triggers */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-gray-200 font-bold">
                    <span className="material-symbols-outlined text-[20px]">
                      bolt
                    </span>
                    <h3>Triggers & Symptoms</h3>
                  </div>
                  <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
                    {TRIGGERS.map((trigger) => {
                      const isSelected = selectedTriggers.includes(trigger);
                      return (
                        <button
                          key={trigger}
                          onClick={() => toggleTrigger(trigger)}
                          className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-transform active:scale-95 ${
                            isSelected
                              ? "bg-primary text-white shadow-lg shadow-purple-900/20"
                              : "border border-gray-800 bg-surface-dark text-gray-400 hover:bg-gray-800"
                          }`}
                        >
                          {trigger === "Lights" && (
                            <span className="material-symbols-outlined text-[18px]">
                              light_mode
                            </span>
                          )}
                          {trigger === "Stress" && (
                            <span className="material-symbols-outlined text-[18px]">
                              sentiment_stressed
                            </span>
                          )}
                          {trigger === "Dehydration" && (
                            <span className="material-symbols-outlined text-[18px]">
                              water_drop
                            </span>
                          )}
                          {trigger}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-gray-200 font-bold">
                    <span className="material-symbols-outlined text-[20px]">
                      notes
                    </span>
                    <h3>Notes</h3>
                  </div>
                  <div className="rounded-3xl bg-surface-dark p-4 border border-gray-800">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional details about this attack?"
                      className="w-full bg-transparent text-text-dark placeholder-gray-600 focus:outline-none min-h-[100px] resize-none"
                    />
                  </div>
                </div>

                {/* Save Button (Bottom) */}
                <button
                  onClick={view === "new" ? handleCreate : handleSaveEdit}
                  className="w-full bg-primary text-white font-bold py-4 rounded-full text-lg shadow-lg shadow-purple-900/30 active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">check</span>
                  Save Changes
                </button>

                {/* Delete Button */}
                {view === "edit" && (
                  <button
                    onClick={handleDelete}
                    className="w-full text-red-400 font-medium py-2 flex items-center justify-center gap-2 hover:text-red-300 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      delete
                    </span>
                    Delete Entry
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- Bottom Nav (Home, History, Calendar & Meals Views) --- */}
        {(view === "home" ||
          view === "list" ||
          view === "calendar" ||
          (SHOW_MEALS && view === "meals")) && (
          <div
            data-app-nav
            className="absolute bottom-0 left-0 right-0 z-50 w-full max-w-md mx-auto border-t border-gray-800 bg-surface-dark/95 backdrop-blur-sm"
            style={{
              paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))",
            }}
          >
            <div className="flex h-14 items-center justify-around px-4">
              {/* Home Button */}
              <button
                onClick={() => setView("home")}
                className={`flex flex-col items-center justify-center transition-colors ${
                  view === "home" ? "text-primary" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">
                  home
                </span>
                <span className="mt-0.5 text-[10px] font-medium">Home</span>
              </button>

              {/* History Button */}
              <button
                onClick={() => setView("list")}
                className={`flex flex-col items-center justify-center transition-colors ${
                  view === "list" ? "text-primary" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">
                  format_list_bulleted
                </span>
                <span className="mt-0.5 text-[10px] font-medium">History</span>
              </button>

              {/* Meals Button (hidden while SHOW_MEALS is false) */}
              {SHOW_MEALS && (
                <button
                  onClick={() => setView("meals")}
                  className={`flex flex-col items-center justify-center transition-colors ${
                    view === "meals" ? "text-primary" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    restaurant
                  </span>
                  <span className="mt-0.5 text-[10px] font-medium">Meals</span>
                </button>
              )}

              {/* Calendar Button */}
              <button
                onClick={() => setView("calendar")}
                className={`flex flex-col items-center justify-center transition-colors ${
                  view === "calendar" ? "text-primary" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">
                  calendar_month
                </span>
                <span className="mt-0.5 text-[10px] font-medium">Calendar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
