"use client";

import { useEffect } from "react";

/**
 * iOS does not shrink the layout viewport for the on-screen keyboard: a sheet
 * pinned to the bottom keeps its toolbar under the keys. `visualViewport` does
 * shrink, so its shortfall is published as `--keyboard-inset` for sheets to
 * pad themselves with. Zero everywhere else.
 */
export function KeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const update = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      root.style.setProperty("--keyboard-inset", `${inset}px`);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.removeProperty("--keyboard-inset");
    };
  }, []);
  return null;
}
