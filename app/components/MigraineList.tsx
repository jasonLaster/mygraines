"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { MigraineCard } from "./MigraineCard";

interface MigraineListProps {
  migraines: Doc<"migraines">[];
  onMigraineClick: (migraine: Doc<"migraines">) => void;
}

export function MigraineList({ migraines, onMigraineClick }: MigraineListProps) {
  return (
    <div className="no-scrollbar flex-1 overflow-y-auto px-4 pt-4 pb-24">
      <div className="flex flex-col gap-3">
        {migraines.map((migraine) => (
          <MigraineCard
            key={migraine._id}
            migraine={migraine}
            onClick={() => onMigraineClick(migraine)}
          />
        ))}
        {migraines.length === 0 && (
          <div className="py-10 text-center text-gray-500">
            No entries found.
          </div>
        )}
      </div>
      <div className="mt-6 flex h-20 items-center justify-center opacity-50">
        <p className="text-xs text-gray-600">End of records</p>
      </div>
    </div>
  );
}
