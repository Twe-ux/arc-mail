"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SPRING_DISMISS,
  SPRING_SETTLE,
  animateSpring,
  projectMomentum,
  rubberband,
  startsOnControl,
  swallowNextClick,
  velocityFrom,
  type Sample,
  type SpringAnimation,
} from "@/lib/gesture";

/**
 * How far in from the left edge counts as "the edge".
 *
 * 24px was the strip Kairos could spare, because every one of its screens has
 * something horizontally draggable on it. A mail thread has nothing of the
 * kind, so the target can be the width of a thumb — and beyond it the gesture
 * still works, it just has to be meant (see `RATIO_*`).
 */
export const EDGE_ZONE = 56;
const INTENT_DISTANCE = 8;
const COMMIT_RATIO = 0.4;

/**
 * How much more horizontal than vertical a drag must be to count.
 *
 * From the edge, ties go to the gesture: nothing else starts there, and a
 * thumb coming in from the side never travels straight. Away from the edge the
 * page scrolls, so only a clearly sideways drag may take the touch — stealing a
 * scroll is worse than missing a swipe.
 */
const RATIO_EDGE = 1.2;
const RATIO_INSIDE = 2.5;

const clamp = (p: number) => Math.min(1, Math.max(0, p));

/**
 * Drag rightwards to go back — the gesture iOS gives every app and an installed
 * PWA gets from nobody. Generous from the left edge, still available from
 * anywhere else if the drag is plainly horizontal. Touch only. Progress is 0..1.
 */
export function useEdgeSwipeBack({
  enabled,
  onClaim,
  onProgress,
  onCommit,
  onCancel,
}: {
  enabled: boolean;
  onClaim: () => void;
  onProgress: (progress: number) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const node = useRef<HTMLElement | null>(null);
  const [attached, setAttached] = useState(0);
  const ref = useCallback((next: HTMLElement | null) => {
    node.current = next;
    setAttached((n) => n + 1);
  }, []);

  const latest = useRef({ enabled, onClaim, onProgress, onCommit, onCancel });
  useEffect(() => {
    latest.current = { enabled, onClaim, onProgress, onCommit, onCancel };
  });

  useEffect(() => {
    const element = node.current;
    if (!element) return;

    let origin: { x: number; y: number } | null = null;
    let fromEdge = false;
    let claimed = false;
    let travelled = 0;
    let samples: Sample[] = [];
    let settling: SpringAnimation | null = null;
    let committed = false;

    const width = () =>
      element.getBoundingClientRect().width || window.innerWidth;
    const offsetFor = (pull: number) =>
      pull < 0 ? -rubberband(-pull, width()) : Math.min(pull, width());
    const draw = (offset: number) =>
      latest.current.onProgress(clamp(offset / width()));

    const settle = (from: { value: number; velocity: number }) => {
      settling = animateSpring({
        from,
        to: 0,
        spring: SPRING_SETTLE,
        onFrame: draw,
        onRest: () => {
          settling = null;
          latest.current.onCancel();
        },
      });
    };

    const throwOut = (from: { value: number; velocity: number }) => {
      const target = width();
      settling = animateSpring({
        from,
        to: target * 1.6,
        spring: SPRING_DISMISS,
        onFrame: (value) => {
          if (committed) return;
          draw(value);
          if (value >= target) {
            committed = true;
            latest.current.onCommit();
          }
        },
        onRest: () => {
          settling = null;
          if (!committed) {
            committed = true;
            latest.current.onCommit();
          }
        },
      });
    };

    const onStart = (event: TouchEvent) => {
      if (!latest.current.enabled || event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (startsOnControl(event.target)) return;
      fromEdge =
        touch.clientX - element.getBoundingClientRect().left <= EDGE_ZONE;
      const caught = settling?.stop().value ?? 0;
      settling = null;
      committed = false;
      origin = { x: touch.clientX - caught, y: touch.clientY };
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
        if (Math.abs(dx) < INTENT_DISTANCE && Math.abs(dy) < INTENT_DISTANCE)
          return;
        if (
          dx <= 0 ||
          Math.abs(dx) < Math.abs(dy) * (fromEdge ? RATIO_EDGE : RATIO_INSIDE)
        ) {
          origin = null;
          return;
        }
        claimed = true;
        latest.current.onClaim();
        if (document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
      }
      if (event.cancelable) event.preventDefault();
      travelled = dx;
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
      if (!cancelled && projected > width() * COMMIT_RATIO) {
        /* Only on an actual commit: the finger lifts over the list now
           revealed underneath, and the browser's synthesized click would
           otherwise land on whatever thread sits there. A drag that springs
           back leaves the same thread open, where swallowing the click would
           just eat the next legitimate tap. */
        swallowNextClick();
        throwOut(from);
      } else {
        settle(from);
      }
    };

    const onEnd = (e: TouchEvent) => finish(e, false);
    const onCancelTouch = (e: TouchEvent) => finish(e, true);

    element.addEventListener("touchstart", onStart, { passive: true });
    element.addEventListener("touchmove", onMove, { passive: false });
    element.addEventListener("touchend", onEnd);
    element.addEventListener("touchcancel", onCancelTouch);
    return () => {
      settling?.stop();
      element.removeEventListener("touchstart", onStart);
      element.removeEventListener("touchmove", onMove);
      element.removeEventListener("touchend", onEnd);
      element.removeEventListener("touchcancel", onCancelTouch);
    };
  }, [attached]);

  return ref;
}
