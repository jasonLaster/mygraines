"use client";

import type { ViewState } from "@/app/lib/types";
import { DurationSection, IntensitySection, TriggersSection, NotesSection } from "./form";

interface MigraineFormProps {
  view: ViewState;
  // Form values
  startTime: string;
  endTime: string;
  severity: number;
  notes: string;
  selectedTriggers: string[];
  // Handlers
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onSeverityChange: (value: number) => void;
  onNotesChange: (value: string) => void;
  onToggleTrigger: (trigger: string) => void;
  onSave: () => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function MigraineForm({
  view,
  startTime,
  endTime,
  severity,
  notes,
  selectedTriggers,
  onStartTimeChange,
  onEndTimeChange,
  onSeverityChange,
  onNotesChange,
  onToggleTrigger,
  onSave,
  onDelete,
  onClose,
}: MigraineFormProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background-dark">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-6">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-gray-400 hover:text-white"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 className="text-lg font-bold text-text-dark">
          {view === "new" ? "New Entry" : "Edit Migraine"}
        </h2>
        <button
          onClick={onSave}
          className="font-bold text-primary hover:text-accent-purple"
        >
          Save
        </button>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-4">
        <div className="space-y-8">
          <DurationSection
            startTime={startTime}
            endTime={endTime}
            onStartTimeChange={onStartTimeChange}
            onEndTimeChange={onEndTimeChange}
          />

          <IntensitySection
            severity={severity}
            onSeverityChange={onSeverityChange}
          />

          <TriggersSection
            selectedTriggers={selectedTriggers}
            onToggleTrigger={onToggleTrigger}
          />

          <NotesSection notes={notes} onNotesChange={onNotesChange} />

          {/* Save Button (Bottom) */}
          <button
            onClick={onSave}
            className="w-full bg-primary text-white font-bold py-4 rounded-full text-lg shadow-lg shadow-purple-900/30 active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">check</span>
            Save Changes
          </button>

          {/* Delete Button */}
          {view === "edit" && onDelete && (
            <button
              onClick={onDelete}
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
  );
}
