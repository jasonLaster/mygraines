"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id, Doc } from "@/convex/_generated/dataModel";

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

// --- Helpers ---

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

// --- Components ---

export default function Home() {
  const allMigraines = useQuery(api.migraines.getAll);
  const createMigraine = useMutation(api.migraines.create);
  const updateMigraine = useMutation(api.migraines.update);
  const deleteMigraine = useMutation(api.migraines.deleteMigraine);

  // View State
  const [view, setView] = useState<"list" | "new" | "edit">("list");
  const [filter, setFilter] = useState<"All" | SeverityLevel>("All");

  // Form State
  const [severity, setSeverity] = useState(5);
  // We use unified state for form dates now
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");

  const [editingId, setEditingId] = useState<Id<"migraines"> | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);

  // -- Handlers --

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(trigger)
        ? prev.filter((t) => t !== trigger)
        : [...prev, trigger]
    );
  };

  const resetForm = () => {
    setSeverity(5);
    setFormStartTime("");
    setFormEndTime("");
    setNotes("");
    setSelectedTriggers([]);
    setEditingId(null);
  };

  const handleCreate = async () => {
    try {
      const startTime = formStartTime
        ? new Date(formStartTime).getTime()
        : Date.now();
      const endTime = formEndTime ? new Date(formEndTime).getTime() : undefined;

      await createMigraine({
        startTime,
        endTime,
        severity,
        notes,
        triggers: selectedTriggers,
      });
      resetForm();
      setView("list");
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
        severity,
        startTime,
        endTime,
        notes,
        triggers: selectedTriggers,
      });
      resetForm();
      setView("list");
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
      setView("list");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  const startEdit = (migraine: Doc<"migraines">) => {
    setEditingId(migraine._id);
    setSeverity(migraine.severity);

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

  // -- Filtering --

  const displayedMigraines = (allMigraines || []).filter((m) => {
    if (filter === "All") return true;
    const details = getSeverityDetails(m.severity);
    return details.level === filter;
  });

  if (allMigraines === undefined) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-dark text-text-dark">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background-dark font-display text-text-dark">
      <div className="relative mx-auto flex h-full w-full max-w-md flex-col overflow-hidden bg-background-dark">

        {/* --- Main Content Area --- */}
        {view === "list" && (
          <>
            {/* Filter Pills */}
            <div className="no-scrollbar flex-shrink-0 overflow-x-auto bg-background-dark px-6 pt-12 pb-2">
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
            <div className="no-scrollbar flex-1 overflow-y-auto px-4 pt-4 pb-24">
              <div className="flex flex-col gap-3">
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
                {displayedMigraines.length === 0 && (
                  <div className="py-10 text-center text-gray-500">
                    No entries found.
                  </div>
                )}
              </div>
              <div className="mt-6 flex h-20 items-center justify-center opacity-50">
                <p className="text-xs text-gray-600">End of records</p>
              </div>
            </div>
          </>
        )}

        {/* --- New / Edit Views (Updated Layout) --- */}
        {(view === "new" || view === "edit") && (
          <div className="flex flex-1 flex-col overflow-hidden bg-background-dark">
            {/* Header */}
            <header className="flex-shrink-0 flex items-center justify-between px-6 py-6">
              <button
                onClick={() => {
                  resetForm();
                  setView("list");
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

                {/* Intensity Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-gray-200 font-bold">
                    <span className="material-symbols-outlined text-[20px]">
                      favorite
                    </span>
                    <h3>Intensity Level</h3>
                  </div>
                  <div className="rounded-3xl bg-surface-dark p-8 border border-gray-800 flex flex-col items-center">
                    <div className="text-6xl font-bold text-text-dark mb-1">
                      {severity}
                    </div>
                    <div className="text-xs font-bold tracking-widest text-accent-purple uppercase mb-8">
                      {severity >= 8
                        ? "Severe"
                        : severity >= 5
                          ? "Moderate"
                          : severity >= 3
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
                        value={severity}
                        onChange={(e) => setSeverity(Number(e.target.value))}
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

        {/* --- Bottom Nav (List View Only) --- */}
        {view === "list" && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-md mx-auto overflow-visible border-t border-gray-800 bg-surface-dark/95 backdrop-blur-sm pt-1"
            style={{
              paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))",
            }}
          >
            <div className="flex h-12 items-center justify-center overflow-visible">
              <button
                onClick={() => {
                  resetForm();
                  // Initialize new form
                  const now = new Date();
                  const localIso = new Date(
                    now.getTime() - now.getTimezoneOffset() * 60000
                  )
                    .toISOString()
                    .slice(0, 16);
                  setFormStartTime(localIso);
                  setFormEndTime("");
                  setSeverity(5);
                  setNotes("");
                  setSelectedTriggers([]);
                  setEditingId(null);

                  setView("new");
                }}
                className="relative -mt-5 flex flex-col items-center justify-center z-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-purple-600/40 transition-all hover:scale-105 active:scale-95">
                  <span className="material-symbols-outlined text-[28px]">
                    add
                  </span>
                </div>
                <span className="mt-1 text-[10px] font-medium text-gray-400">
                  New
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
