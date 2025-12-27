"use client";

import { MIN_DATE, MAX_DATE } from "@/app/lib/constants";
import { formatFriendlyDate } from "@/app/lib/utils";

interface DurationSectionProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
}

export function DurationSection({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
}: DurationSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-gray-200 font-bold">
        <span className="material-symbols-outlined text-[20px]">schedule</span>
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
              {formatFriendlyDate(startTime)}
            </span>
            <span className="material-symbols-outlined text-gray-400">
              edit_calendar
            </span>
          </div>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            min={MIN_DATE}
            max={MAX_DATE}
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
              {!endTime && (
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              )}
              <span className="text-lg font-bold text-text-dark">
                {endTime ? formatFriendlyDate(endTime) : "Ongoing"}
              </span>
            </div>
            <span className="material-symbols-outlined text-gray-400">
              edit_calendar
            </span>
          </div>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            min={MIN_DATE}
            max={MAX_DATE}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
