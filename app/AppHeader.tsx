import type { ReactNode } from "react";

// Same artwork as scripts/pwa/icon.svg (the home-screen icon), inlined so the
// logo is part of the prerendered HTML and can never pop in late. The tile is
// pure black, so the cut-out around the bolt is just a black stroke.
const BOLT = "M598 410 L432 640 L530 640 L468 806 L660 556 L556 556 L628 410 Z";
const CLOUD =
  "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z";

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
      aria-hidden
      className="shrink-0 rounded-[22%] ring-1 ring-white/10"
    >
      <rect width="1024" height="1024" fill="#000" />
      <path transform="translate(224 130) scale(24)" fill="#fff" d={CLOUD} />
      <path d={BOLT} fill="#000" stroke="#000" strokeWidth={58} strokeLinejoin="round" />
      <path d={BOLT} fill="#fff" stroke="#fff" strokeWidth={14} strokeLinejoin="round" />
    </svg>
  );
}

/** Round "+" for the app header: log a migraine. */
export function AddButton({
  onClick,
  label = "Log a migraine",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-purple-900/30 transition-transform active:scale-95"
    >
      <span className="material-symbols-outlined">add</span>
    </button>
  );
}

/**
 * The app bar shown on the main screens: logo and name, with room on the right
 * for context. It owns the top safe-area padding, so screens below it don't.
 */
export function AppHeader({ trailing }: { trailing?: ReactNode }) {
  return (
    <header className="flex-shrink-0 border-b border-gray-800/70 bg-background-dark px-6 pb-3 pt-safe-bar">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo />
          <h1
            data-layout-debug
            className="text-xl font-bold tracking-tight text-text-dark"
          >
            Mygraines
          </h1>
        </div>
        {trailing}
      </div>
    </header>
  );
}
