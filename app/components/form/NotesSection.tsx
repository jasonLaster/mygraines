"use client";

interface NotesSectionProps {
  notes: string;
  onNotesChange: (value: string) => void;
}

export function NotesSection({ notes, onNotesChange }: NotesSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-gray-200 font-bold">
        <span className="material-symbols-outlined text-[20px]">notes</span>
        <h3>Notes</h3>
      </div>
      <div className="rounded-3xl bg-surface-dark p-4 border border-gray-800">
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Any additional details about this attack?"
          className="w-full bg-transparent text-text-dark placeholder-gray-600 focus:outline-none min-h-[100px] resize-none"
        />
      </div>
    </div>
  );
}
