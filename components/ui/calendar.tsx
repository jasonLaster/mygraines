"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * shadcn/ui Calendar: react-day-picker with this app's dark theme applied.
 * Pass `components.DayButton` to customise how a day is drawn.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = false,
  components,
  ...props
}: CalendarProps) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      weekStartsOn={0}
      className={cn("w-full", className)}
      classNames={{
        root: cn("w-full", defaults.root),
        months: "relative flex w-full flex-col",
        month: "flex w-full flex-col gap-3",
        month_caption: "flex h-10 items-center justify-center",
        caption_label: "text-base font-bold text-text-dark",
        nav: "absolute inset-x-0 top-0 flex h-10 items-center justify-between",
        button_previous:
          "flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-800 hover:text-text-dark disabled:pointer-events-none disabled:opacity-30",
        button_next:
          "flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-800 hover:text-text-dark disabled:pointer-events-none disabled:opacity-30",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "flex-1 py-2 text-center text-xs font-medium uppercase tracking-wide text-gray-500",
        weeks: "flex flex-col gap-1",
        week: "flex w-full gap-1",
        day: "relative min-w-0 flex-1 p-0 text-center",
        day_button:
          "flex aspect-square w-full items-center justify-center rounded-xl text-sm font-medium text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        outside: "opacity-30",
        disabled: "opacity-30",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: iconClass }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("h-5 w-5", iconClass)} />
          ) : (
            <ChevronRight className={cn("h-5 w-5", iconClass)} />
          ),
        ...components,
      }}
      {...props}
    />
  );
}

export { Calendar };
