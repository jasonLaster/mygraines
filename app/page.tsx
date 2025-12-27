"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id, Doc } from "@/convex/_generated/dataModel";

import { FilterPills, MigraineList, MigraineForm, BottomNav } from "@/app/components";
import { getSeverityDetails, toLocalDatetimeString } from "@/app/lib/utils";
import type { ViewState, FilterState } from "@/app/lib/types";

export default function Home() {
  const allMigraines = useQuery(api.migraines.getAll);
  const createMigraine = useMutation(api.migraines.create);
  const updateMigraine = useMutation(api.migraines.update);
  const deleteMigraine = useMutation(api.migraines.deleteMigraine);

  // View State
  const [view, setView] = useState<ViewState>("list");
  const [filter, setFilter] = useState<FilterState>("All");

  // Form State
  const [severity, setSeverity] = useState(5);
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
      const endTime = formEndTime ? new Date(formEndTime).getTime() : null;

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
    setFormStartTime(toLocalDatetimeString(new Date(migraine.startTime)));

    if (migraine.endTime) {
      setFormEndTime(toLocalDatetimeString(new Date(migraine.endTime)));
    } else {
      setFormEndTime("");
    }

    setNotes(migraine.notes || "");
    setSelectedTriggers(migraine.triggers || []);
    setView("edit");
  };

  const handleNewEntry = () => {
    resetForm();
    setFormStartTime(toLocalDatetimeString(new Date()));
    setFormEndTime("");
    setSeverity(5);
    setNotes("");
    setSelectedTriggers([]);
    setEditingId(null);
    setView("new");
  };

  const handleClose = () => {
    resetForm();
    setView("list");
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
        {/* --- List View --- */}
        {view === "list" && (
          <>
            <FilterPills filter={filter} onFilterChange={setFilter} />
            <MigraineList
              migraines={displayedMigraines}
              onMigraineClick={startEdit}
            />
          </>
        )}

        {/* --- New / Edit Views --- */}
        {(view === "new" || view === "edit") && (
          <MigraineForm
            view={view}
            startTime={formStartTime}
            endTime={formEndTime}
            severity={severity}
            notes={notes}
            selectedTriggers={selectedTriggers}
            onStartTimeChange={setFormStartTime}
            onEndTimeChange={setFormEndTime}
            onSeverityChange={setSeverity}
            onNotesChange={setNotes}
            onToggleTrigger={toggleTrigger}
            onSave={view === "new" ? handleCreate : handleSaveEdit}
            onDelete={view === "edit" ? handleDelete : undefined}
            onClose={handleClose}
          />
        )}

        {/* --- Bottom Nav (List View Only) --- */}
        {view === "list" && <BottomNav onNewEntry={handleNewEntry} />}
      </div>
    </div>
  );
}
