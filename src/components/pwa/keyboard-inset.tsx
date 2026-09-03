"use client";

import { useEffect } from "react";

/**
 * Below this it is not a keyboard: an installed PWA has no collapsing URL bar,
 * and what else moves the two viewports apart is the viewport being re-resolved.
 * Any phone keyboard, accessory bar included, is taller than this.
 */
const KEYBOARD_THRESHOLD = 200;

/**
 * Publishes the on-screen keyboard's height as `--keyboard-inset` on the root.
 *
 * iOS does not shrink the layout viewport for the keyboard, so a card pinned to
 * the bottom would keep its toolbar under the keys. `visualViewport` does
 * shrink, and the gap between the two viewports is the keyboard.
 *
 * `offsetTop` is deliberately left out (as in Kairos, where the same mistake was
 * made first): it says how far the visual viewport has scrolled to reveal a
 * focused field, which is a different quantity — subtracting it too lifted the
 * card by the keyboard *plus* the scroll, leaving a band of nothing above the
 * keys and squeezing the message.
 */
export function KeyboardInset() {
  useEffect(() => {
    const visual = window.visualViewport;
    if (!visual) return;
    const root = document.documentElement;
    const measure = () => {
      const hidden = window.innerHeight - visual.height;
      const open = hidden > KEYBOARD_THRESHOLD;
      root.style.setProperty("--keyboard-inset", `${open ? Math.round(hidden) : 0}px`);
      /* A class as well as the length, so a card can drop what it does not need
         while someone is typing rather than only make room for the keys. */
      root.classList.toggle("keyboard-open", open);
    };
    measure();
    visual.addEventListener("resize", measure);
    return () => {
      visual.removeEventListener("resize", measure);
      root.style.removeProperty("--keyboard-inset");
      root.classList.remove("keyboard-open");
    };
  }, []);
  return null;
}
