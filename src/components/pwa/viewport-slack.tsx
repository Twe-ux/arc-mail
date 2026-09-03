"use client";

import { useEffect } from "react";

/**
 * Installed on an iPhone home screen, the first paint happens on a viewport
 * amputated of its bottom safe area: a `fixed` shell stops short of the home
 * indicator and leaves a bare strip. The only cure that held (ported from the
 * Kairos app, which carries it from two apps before it) is a document tall
 * enough to scroll, which forces WebKit to resolve the viewport against the
 * real screen. `globals.css` adds `--viewport-slack` to the page height in
 * standalone mode; this sets it to 50px on mount, drops it to 0 after a
 * second so a page that fits no longer scrolls into nothing, and re-arms it
 * whenever the viewport shrinks for good (rotation, return from background).
 *
 * `visualViewport` is deliberately not observed: it shrinks with the keyboard.
 */
export function ViewportSlack() {
  useEffect(() => {
    const root = document.documentElement;
    let tallest = window.innerHeight;
    let release: ReturnType<typeof setTimeout> | undefined;

    const arm = () => {
      root.style.setProperty("--viewport-slack", "50px");
      clearTimeout(release);
      release = setTimeout(() => root.style.setProperty("--viewport-slack", "0px"), 1000);
    };

    const onResize = () => {
      if (window.innerHeight >= tallest) {
        tallest = window.innerHeight;
        return;
      }
      tallest = window.innerHeight;
      arm();
    };

    arm();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(release);
      window.removeEventListener("resize", onResize);
      root.style.removeProperty("--viewport-slack");
    };
  }, []);

  return null;
}
