"use client";

import type { FilterState } from "@/app/lib/types";

const FILTER_OPTIONS = ["All", "Severe", "Moderate", "Mild"] as const;

interface FilterPillsProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
}

export function FilterPills({ filter, onFilterChange }: FilterPillsProps) {
  return (
    <div className="no-scrollbar flex-shrink-0 overflow-x-auto bg-background-dark px-6 pt-12 pb-2">
      <div className="flex gap-3">
        {FILTER_OPTIONS.map((f) => {
          // Map UI filter names to logic
          const logicFilter: FilterState = f === "Severe" ? "High" : f as FilterState;
          const isActive = filter === logicFilter;
          return (
            <button
              key={f}
              onClick={() => onFilterChange(logicFilter)}
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
  );
}
