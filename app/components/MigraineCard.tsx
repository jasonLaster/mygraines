"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { formatDateShort, formatTime, formatDuration, getSeverityDetails } from "@/app/lib/utils";

interface MigraineCardProps {
  migraine: Doc<"migraines">;
  onClick: () => void;
}

export function MigraineCard({ migraine, onClick }: MigraineCardProps) {
  const details = getSeverityDetails(migraine.severity);
  const isActive = migraine.endTime === null;

  return (
    <div
      onClick={onClick}
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
            {migraine.endTime ? formatTime(migraine.endTime) : "Now"}
          </p>
          <p className="flex items-center gap-1 text-xs font-medium text-gray-500">
            <span className="material-symbols-outlined text-[14px]">
              schedule
            </span>{" "}
            {formatDuration(migraine.startTime, migraine.endTime)}
          </p>
        </div>
      </div>
      <div className="shrink-0 text-gray-600 transition-colors group-hover:text-primary">
        <span className="material-symbols-outlined">chevron_right</span>
      </div>
    </div>
  );
}
