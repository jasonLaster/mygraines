"use client";

import { useEffect, useState } from "react";

type StandaloneNavigator = Navigator & { standalone?: boolean };

declare global {
  interface Window {
    __updateAppHeight?: () => void;
  }
}

/**
 * Keeps --app-height (set before first paint by APP_HEIGHT_SCRIPT) correct as
 * the window changes, and hosts a hidden layout-diagnostics panel: tap any
 * element marked data-layout-debug five times quickly to toggle it. It exists
 * because iOS standalone viewport behaviour can't be reproduced off-device.
 */
export function AppHeightSync() {
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    const update = () => window.__updateAppHeight?.();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.addEventListener("pageshow", update);
    document.addEventListener("visibilitychange", update);
    // iOS sometimes settles the standalone viewport a beat after launch.
    const timers = [100, 500, 1500].map((ms) => setTimeout(update, ms));
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("pageshow", update);
      document.removeEventListener("visibilitychange", update);
      timers.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    let taps: number[] = [];
    const onClick = (event: Event) => {
      const target = event.target as Element | null;
      if (!target?.closest?.("[data-layout-debug]")) return;
      const now = Date.now();
      taps = [...taps.filter((t) => now - t < 2000), now];
      if (taps.length >= 5) {
        taps = [];
        setDebug((on) => !on);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return debug ? <LayoutDebug onClose={() => setDebug(false)} /> : null;
}

function LayoutDebug({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const probe = (css: string) => {
      const el = document.createElement("div");
      el.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;${css}`;
      document.body.appendChild(el);
      const height = Math.round(el.getBoundingClientRect().height);
      el.remove();
      return height;
    };
    const read = () => {
      const vv = window.visualViewport;
      const root = document.querySelector("[data-app-root]")?.getBoundingClientRect();
      const nav = document.querySelector("[data-app-nav]")?.getBoundingClientRect();
      const standalone = (navigator as StandaloneNavigator).standalone;
      setText(
        [
          `standalone: ${standalone}  display-mode: ${matchMedia("(display-mode: standalone)").matches}`,
          `innerHeight: ${innerHeight}  outerHeight: ${outerHeight}`,
          `visualViewport: ${vv ? `${Math.round(vv.height)} @${vv.scale}` : "n/a"}`,
          `screen: ${screen.width}x${screen.height}  avail: ${screen.availHeight}`,
          `100vh: ${probe("height:100vh")}  100dvh: ${probe("height:100dvh")}  100lvh: ${probe("height:100lvh")}  100svh: ${probe("height:100svh")}`,
          `safe top/bottom: ${probe("height:env(safe-area-inset-top)")}/${probe("height:env(safe-area-inset-bottom)")}`,
          `--app-height: ${getComputedStyle(document.documentElement).getPropertyValue("--app-height") || "(unset)"}`,
          `root top/bottom: ${root ? `${Math.round(root.top)}/${Math.round(root.bottom)}` : "n/a"}  nav bottom: ${nav ? Math.round(nav.bottom) : "n/a"}`,
          `document height: ${document.documentElement.scrollHeight}  scrollY: ${Math.round(scrollY)}`,
        ].join("\n"),
      );
    };
    read();
    const id = setInterval(read, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      onClick={onClose}
      className="fixed inset-x-2 top-24 z-[100] whitespace-pre rounded-xl border border-gray-700 bg-black/90 p-3 font-mono text-[11px] leading-5 text-green-300"
    >
      {text}
      {"\n(tap to close)"}
    </div>
  );
}
