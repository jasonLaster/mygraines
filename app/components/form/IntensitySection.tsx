"use client";

import { getSeverityLabel } from "@/app/lib/utils";

interface IntensitySectionProps {
  severity: number;
  onSeverityChange: (value: number) => void;
}

export function IntensitySection({ severity, onSeverityChange }: IntensitySectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-gray-200 font-bold">
        <span className="material-symbols-outlined text-[20px]">favorite</span>
        <h3>Intensity Level</h3>
      </div>
      <div className="rounded-3xl bg-surface-dark p-8 border border-gray-800 flex flex-col items-center">
        <div className="text-6xl font-bold text-text-dark mb-1">{severity}</div>
        <div className="text-xs font-bold tracking-widest text-accent-purple uppercase mb-8">
          {getSeverityLabel(severity)}
        </div>

        <div className="w-full relative">
          <div className="flex justify-between text-xs text-gray-500 font-medium mb-2 px-1">
            <span>Mild</span>
            <span>Extreme</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={severity}
            onChange={(e) => onSeverityChange(Number(e.target.value))}
            className="w-full accent-primary h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          {/* Ticks visual */}
          <div className="flex justify-between px-1 mt-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="w-0.5 h-1 bg-gray-700"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
