"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  SPRING_DISMISS,
  SPRING_SETTLE,
  animateSpring,
  projectMomentum,
  rubberband,
  velocityFrom,
  type Sample,
  type SpringAnimation,
} from "@/lib/gesture";

const INTENT_DISTANCE = 8;
const COMMIT_RATIO = 0.3;

/**
 * Drag a bottom sheet down to dismiss it. Attach the returned ref to the handle
 * (grabber and title bar); the sheet itself is moved. The release reads
 * velocity, so a short flick dismisses and a slow drag that came back does not.
 */
export function useSheetDismiss(sheet: RefObject<HTMLElement | null>, onDismiss: () => void) {
  const node = useRef<HTMLElement | null>(null);
  const [attached, setAttached] = useState(0);
  const ref = useCallback((next: HTMLElement | null) => {
    node.current = next;
    setAttached((n) => n + 1);
  }, []);

  const latest = useRef(onDismiss);
  useEffect(() => {
    latest.current = onDismiss;
  });

  useEffect(() => {
    const handle = node.current;
    if (!handle) return;

    let origin: { x: number; y: number } | null = null;
    let claimed = false;
    let travelled = 0;
    let samples: Sample[] = [];
    let settling: SpringAnimation | null = null;
    let done = false;

    const height = () => sheet.current?.getBoundingClientRect().height || window.innerHeight;
    const offsetFor = (pull: number) => (pull < 0 ? -rubberband(-pull, height(), 0.3) : pull);
    const draw = (offset: number) => {
      if (sheet.current) sheet.current.style.transform = `translate3d(0, ${offset}px, 0)`;
    };

    const settle = (from: { value: number; velocity: number }) => {
      settling = animateSpring({
        from,
        to: 0,
        spring: SPRING_SETTLE,
        onFrame: draw,
        onRest: () => {
          settling = null;
          if (sheet.current) sheet.current.style.transform = "";
        },
      });
    };

    const throwOut = (from: { value: number; velocity: number }) => {
      const target = height();
      settling = animateSpring({
        from,
        to: target * 1.4,
        spring: SPRING_DISMISS,
        onFrame: (value) => {
          if (done) return;
          draw(value);
          if (value >= target) {
            done = true;
            latest.current();
          }
        },
        onRest: () => {
          settling = null;
          if (!done) {
            done = true;
            latest.current();
          }
        },
      });
    };

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      const caught = settling?.stop().value ?? 0;
      settling = null;
      done = false;
      origin = { x: touch.clientX, y: touch.clientY - caught };
      claimed = false;
      travelled = caught;
      samples = [{ value: travelled, time: event.timeStamp }];
    };

    const onMove = (event: TouchEvent) => {
      if (!origin || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - origin.x;
      const dy = touch.clientY - origin.y;
      if (!claimed) {
        if (Math.abs(dx) < INTENT_DISTANCE && Math.abs(dy) < INTENT_DISTANCE) return;
        if (Math.abs(dy) < Math.abs(dx)) {
          origin = null;
          return;
        }
        claimed = true;
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      }
      if (event.cancelable) event.preventDefault();
      travelled = dy;
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
      const projected = travelled + projectMomentum(velocity);
      const from = { value: offsetFor(travelled), velocity };
      origin = null;
      claimed = false;
      samples = [];
      travelled = 0;
      if (!cancelled && projected > height() * COMMIT_RATIO) throwOut(from);
      else settle(from);
    };

    const onEnd = (e: TouchEvent) => finish(e, false);
    const onCancel = (e: TouchEvent) => finish(e, true);

    handle.addEventListener("touchstart", onStart, { passive: true });
    handle.addEventListener("touchmove", onMove, { passive: false });
    handle.addEventListener("touchend", onEnd);
    handle.addEventListener("touchcancel", onCancel);
    return () => {
      settling?.stop();
      handle.removeEventListener("touchstart", onStart);
      handle.removeEventListener("touchmove", onMove);
      handle.removeEventListener("touchend", onEnd);
      handle.removeEventListener("touchcancel", onCancel);
    };
  }, [attached, sheet]);

  return ref;
}
