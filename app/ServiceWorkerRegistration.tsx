"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js, which caches the app shell so launching the installed app
 * never waits on the network. Disabled in development so HMR keeps working.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;

    // An installed app is resumed far more often than it is relaunched, so
    // refresh the cached shell on resume; the next cold launch is then current.
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !registration) return;
      registration.update().catch(() => {});
      registration.active?.postMessage("revalidate");
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        registration = reg;
      })
      .catch(() => {});

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return null;
}
