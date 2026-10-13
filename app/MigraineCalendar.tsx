"use client";

import * as React from "react";
import type { DayButtonProps } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

/** Days that had a migraine, bucketed by that day's peak severity level. */
export type MigraineDays = {
  high: Date[];
  moderate: Date[];
  mild: Date[];
  low: Date[];
};

// Day button colours per severity bucket. Full class names so Tailwind sees them.
const TONES = {
  high: {
    cell: "border-red-900/40 bg-red-900/25 text-red-200",
    dot: "bg-red-400",
  },
  moderate: {
    cell: "border-orange-900/40 bg-orange-900/25 text-orange-200",
    dot: "bg-orange-400",
  },
  mild: {
    cell: "border-yellow-900/40 bg-yellow-900/25 text-yellow-200",
    dot: "bg-yellow-400",
  },
  low: {
    cell: "border-blue-900/40 bg-blue-900/25 text-blue-200",
    dot: "bg-blue-400",
  },
} as const;

function MigraineDayButton({
  day,
  modifiers,
  className,
  ...props
}: DayButtonProps) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  // Custom modifiers arrive on `modifiers` by name (see MigraineDays).
  const level = (["high", "moderate", "mild", "low"] as const).find(
    (key) => modifiers[key],
  );

  return (
    <button
      ref={ref}
      {...props}
      className={cn(
        className,
        "relative flex aspect-square w-full flex-col items-center justify-center rounded-xl border border-transparent text-sm font-medium transition-all active:scale-95",
        level && !modifiers.selected && TONES[level].cell,
        !level && !modifiers.selected && "text-text-dark hover:bg-gray-800",
        modifiers.today && !modifiers.selected && "ring-2 ring-primary/70",
        modifiers.selected &&
          "border-primary bg-primary text-white shadow-lg shadow-purple-900/40",
        modifiers.today && "font-bold",
      )}
    >
      {day.date.getDate()}
      {level && (
        <span
          className={cn(
            "absolute bottom-1.5 h-1 w-1 rounded-full",
            modifiers.selected ? "bg-white/80" : TONES[level].dot,
          )}
        />
      )}
    </button>
  );
}

/**
 * Month calendar for the migraine log: days with a migraine are tinted by their
 * peak severity, today is ringed, and one day is selected. Future days can't be
 * picked (there is nothing to log yet).
 */
export function MigraineCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  today,
  days,
}: {
  month: Date;
  onMonthChange: (month: Date) => void;
  selected: Date;
  onSelect: (day: Date) => void;
  today: Date;
  days: MigraineDays;
}) {
  return (
    <Calendar
      mode="single"
      required
      month={month}
      onMonthChange={onMonthChange}
      selected={selected}
      onSelect={(day) => day && onSelect(day)}
      disabled={{ after: today }}
      modifiers={days}
      components={{ DayButton: MigraineDayButton }}
      className="rounded-3xl border border-gray-800 bg-surface-dark p-4"
    />
  );
}
