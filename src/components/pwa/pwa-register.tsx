"use client";

import { useEffect } from "react";

/** Registers the service worker in production so the shell launches offline. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Offline support is a progressive enhancement: ignore registration failures.
    });
  }, []);
  return null;
}
