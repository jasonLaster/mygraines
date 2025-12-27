"use client";

import { TRIGGERS } from "@/app/lib/constants";

interface TriggersSectionProps {
  selectedTriggers: string[];
  onToggleTrigger: (trigger: string) => void;
}

const TRIGGER_ICONS: Record<string, string> = {
  Lights: "light_mode",
  Stress: "sentiment_stressed",
  Dehydration: "water_drop",
};

export function TriggersSection({ selectedTriggers, onToggleTrigger }: TriggersSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-gray-200 font-bold">
        <span className="material-symbols-outlined text-[20px]">bolt</span>
        <h3>Triggers & Symptoms</h3>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
        {TRIGGERS.map((trigger) => {
          const isSelected = selectedTriggers.includes(trigger);
          const icon = TRIGGER_ICONS[trigger];
          return (
            <button
              key={trigger}
              onClick={() => onToggleTrigger(trigger)}
              className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-transform active:scale-95 ${
                isSelected
                  ? "bg-primary text-white shadow-lg shadow-purple-900/20"
                  : "border border-gray-800 bg-surface-dark text-gray-400 hover:bg-gray-800"
              }`}
            >
              {icon && (
                <span className="material-symbols-outlined text-[18px]">
                  {icon}
                </span>
              )}
              {trigger}
            </button>
          );
        })}
      </div>
    </div>
  );
}
