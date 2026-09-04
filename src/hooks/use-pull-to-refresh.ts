"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SPRING_SETTLE,
  animateSpring,
  rubberband,
  scrollTopUnder,
  startsOnDragControl,
  velocityFrom,
  type Sample,
  type SpringAnimation,
} from "@/lib/gesture";

const INTENT_DISTANCE = 8;
/** The pull that means it — deliberate, like the sheet's own threshold. */
const TRIGGER = 72;
/** Where the list waits while the work runs, so the spinner has a seat. */
const HOLD = 64;
/** Past here the list resists rather than following one for one. */
const MAX_PULL = 150;

/**
 * Pull the list down past its top to refresh.
 *
 * An installed PWA has no address bar and no reload button, so this is the only
 * way back to a fresh page from inside the app — which is exactly how a new
 * deploy gets picked up without force-quitting.
 *
 * Same rules as the other gestures here (see `src/lib/gesture.ts`): the content's
 * own scroll comes first and nothing is preventDefault'ed while it has somewhere
 * to go; the pull is measured from the moment the top is reached, so the list
 * never jumps; the transform is written straight to the node each frame rather
 * than through React; and the release reads velocity, not distance alone.
 *
 * The indicator is driven the same way — opacity written per frame, progress
 * published as `--pull-progress` for CSS to use — because a state update per
 * touchmove reads as a tremor.
 */
export function usePullToRefresh(onRefresh: () => void | Promise<void>) {
  const node = useRef<HTMLElement | null>(null);
  const indicator = useRef<HTMLElement | null>(null);
  const [attached, setAttached] = useState(0);

  const ref = useCallback((next: HTMLElement | null) => {
    node.current = next;
    setAttached((n) => n + 1);
  }, []);

  const indicatorRef = useCallback((next: HTMLElement | null) => {
    indicator.current = next;
  }, []);

  const latest = useRef(onRefresh);
  useEffect(() => {
    latest.current = onRefresh;
  });

  useEffect(() => {
    const element = node.current;
    if (!element) return;
    element.style.transform = "";

    let origin: { x: number; y: number } | null = null;
    let claimed = false;
    let travelled = 0;
    let samples: Sample[] = [];
    let settling: SpringAnimation | null = null;
    let running = false;

    const offsetFor = (pull: number) =>
      pull > MAX_PULL ? MAX_PULL + rubberband(pull - MAX_PULL, MAX_PULL) : pull;

    const draw = (offset: number) => {
      element.style.transform =
        offset === 0 ? "" : `translate3d(0, ${offset}px, 0)`;
      const mark = indicator.current;
      if (!mark) return;
      const progress = Math.min(1, offset / TRIGGER);
      mark.style.opacity = String(progress);
      mark.style.setProperty("--pull-progress", progress.toFixed(3));
      /* Armed, so the icon can say so before the finger lifts. */
      mark.dataset.armed = offset >= TRIGGER ? "true" : "false";
    };

    const settle = (from: { value: number; velocity: number }, to = 0) => {
      settling = animateSpring({
        from,
        to,
        spring: SPRING_SETTLE,
        onFrame: draw,
        onRest: () => {
          settling = null;
        },
      });
    };

    /** Hold the list open at the indicator, run the work, then let go. */
    const run = async (from: { value: number; velocity: number }) => {
      running = true;
      indicator.current?.setAttribute("data-refreshing", "true");
      settle(from, HOLD);
      try {
        await latest.current();
      } finally {
        /* A refresh that reloads the page never gets here — the document is
           replaced first, which is the point. Anything that resolves (a data
           refetch, later) hands the list back. */
        running = false;
        indicator.current?.removeAttribute("data-refreshing");
        const caught = settling?.stop() ?? { value: HOLD, velocity: 0 };
        settling = null;
        settle(caught);
      }
    };

    const onStart = (event: TouchEvent) => {
      if (running || event.touches.length !== 1) return;
      if (startsOnDragControl(event.target)) return;
      /* A phone gesture: on the desktop layout the list is a plain column with
         no card to pull, and a mouse has the browser's own reload. */
      if (window.matchMedia("(min-width: 768px)").matches) return;
      const caught = settling?.stop().value ?? 0;
      settling = null;
      origin = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY - caught,
      };
      claimed = false;
      travelled = caught;
      samples = [{ value: travelled, time: event.timeStamp }];
    };

    const onMove = (event: TouchEvent) => {
      if (!origin || running || event.touches.length !== 1) return;
      const point = event.touches[0];

      /* While the list has somewhere to scroll it scrolls; holding the origin
         under the finger means the pull starts from the top, not from a jump. */
      if (!claimed && scrollTopUnder(event.target, element) > 0) {
        origin = { x: point.clientX, y: point.clientY };
        return;
      }

      const dx = point.clientX - origin.x;
      const dy = point.clientY - origin.y;

      if (!claimed) {
        if (Math.abs(dx) < INTENT_DISTANCE && Math.abs(dy) < INTENT_DISTANCE)
          return;
        /* Upward is the list's own scroll, sideways belongs to another
           gesture — neither ends the drag, the finger may still come down. */
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) {
          origin = { x: point.clientX, y: point.clientY };
          return;
        }
        claimed = true;
      }

      if (event.cancelable) event.preventDefault();
      travelled = Math.max(0, dy);
      samples.push({ value: travelled, time: event.timeStamp });
      if (samples.length > 12) samples.shift();
      draw(offsetFor(travelled));
    };

    const finish = (event: TouchEvent, cancelled: boolean) => {
      if (!origin) return;
      if (!claimed) {
        origin = null;
        return;
      }
      samples.push({ value: travelled, time: event.timeStamp });
      const velocity = cancelled ? 0 : velocityFrom(samples);
      const pulled = travelled;
      const from = { value: offsetFor(travelled), velocity };
      origin = null;
      claimed = false;
      samples = [];
      travelled = 0;
      /* Distance only, no flick shortcut: a quick downward flick at the top of
         a list is how one scrolls back up, and it must not reload the app. */
      if (!cancelled && pulled >= TRIGGER) run(from);
      else settle(from);
    };

    const onEnd = (e: TouchEvent) => finish(e, false);
    const onCancel = (e: TouchEvent) => finish(e, true);

    element.addEventListener("touchstart", onStart, { passive: true });
    element.addEventListener("touchmove", onMove, { passive: false });
    element.addEventListener("touchend", onEnd);
    element.addEventListener("touchcancel", onCancel);
    return () => {
      settling?.stop();
      element.removeEventListener("touchstart", onStart);
      element.removeEventListener("touchmove", onMove);
      element.removeEventListener("touchend", onEnd);
      element.removeEventListener("touchcancel", onCancel);
    };
  }, [attached]);

  /** `ref` goes on the list card, `indicatorRef` on the mark behind it. */
  return { ref, indicatorRef };
}
