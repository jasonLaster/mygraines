"use client";

interface BottomNavProps {
  onNewEntry: () => void;
}

export function BottomNav({ onNewEntry }: BottomNavProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-md mx-auto overflow-visible border-t border-gray-800 bg-surface-dark/95 backdrop-blur-sm pt-2"
      style={{
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))",
      }}
    >
      <div className="flex h-14 items-center justify-center overflow-visible">
        <button
          onClick={onNewEntry}
          className="relative -mt-6 flex flex-col items-center justify-center z-50"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-purple-600/40 transition-all hover:scale-105 active:scale-95">
            <span className="material-symbols-outlined text-[32px]">add</span>
          </div>
          <span className="mt-1 text-[10px] font-medium text-gray-400">
            New
          </span>
        </button>
      </div>
    </div>
  );
}
