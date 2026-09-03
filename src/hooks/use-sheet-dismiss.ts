"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SPRING_DISMISS,
  SPRING_SETTLE,
  animateSpring,
  projectMomentum,
  rubberband,
  scrollTopUnder,
  startsOnDragControl,
  velocityFrom,
  type Sample,
  type SpringAnimation,
} from "@/lib/gesture";

const INTENT_DISTANCE = 8;
/** Where the *projected* pull has to land for the sheet to go. */
const DISMISS_DISTANCE = 96;
/** Where the sheet starts resisting rather than following one for one. */
const MAX_PULL = 320;

/**
 * Pull a sheet down to dismiss it — from anywhere on it, not from a grab bar.
 *
 * One continuous drag does both jobs, in the order the content dictates: while
 * there is somewhere to scroll under the finger it scrolls, and the moment that
 * reaches its top the same finger starts pulling the sheet. That is why the
 * decision is taken on every move rather than once at touchstart, and why the
 * pull is measured from where the top was reached — otherwise the sheet jumps.
 *
 * Ported from Kairos, along with the two rules that make it feel right: the
 * transform is written straight to the node on the frame (a render per move
 * reads as a tremor), and the release reads velocity rather than distance.
 *
 * The sheet must also carry `transition-none`. Every dialog primitive here
 * ships a duration for its enter and exit, and `transition-property` defaults
 * to `all`, so the transform this writes gets interpolated too: the sheet
 * trails the finger and settles a tenth of a second late, which is the second,
 * lagging card you can see behind the one you are holding.
 */
export function useSheetDismiss(onDismiss: () => void) {
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
    const element = node.current;
    if (!element) return;
    /* A dismissal leaves the sheet where the finger dropped it, so a reopened
       sheet reusing this node would come back displaced and mute. */
    element.style.transform = "";
    element.style.animation = "";

    let origin: { x: number; y: number } | null = null;
    let claimed = false;
    let travelled = 0;
    let samples: Sample[] = [];
    let settling: SpringAnimation | null = null;
    let dismissed = false;

    const offsetFor = (pull: number) =>
      pull > MAX_PULL ? MAX_PULL + rubberband(pull - MAX_PULL, MAX_PULL) : pull;

    const draw = (offset: number) => {
      element.style.transform = offset === 0 ? "" : `translate3d(0, ${offset}px, 0)`;
    };

    const settle = (from: { value: number; velocity: number }) => {
      settling = animateSpring({
        from,
        to: 0,
        spring: SPRING_SETTLE,
        onFrame: draw,
        onRest: () => {
          settling = null;
          /* Back at rest and closable by a button again, so give the primitive
             its exit animation back. */
          element.style.animation = "";
        },
      });
    };

    /**
     * Carry the sheet the rest of the way down and close when it has gone.
     * Aimed past the bottom edge so the part anyone can see never decelerates,
     * and the close fires the frame it clears the edge.
     */
    const throwOut = (from: { value: number; velocity: number }) => {
      const height = element.getBoundingClientRect().height || window.innerHeight;
      settling = animateSpring({
        from,
        to: height + 80,
        spring: SPRING_DISMISS,
        onFrame: (value) => {
          if (dismissed) return;
          draw(value);
          if (value >= height) {
            dismissed = true;
            latest.current();
          }
        },
        onRest: () => {
          settling = null;
          if (!dismissed) {
            dismissed = true;
            latest.current();
          }
        },
      });
    };

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      if (startsOnDragControl(event.target)) return;
      /* Caught where it is, not where it was heading: re-grabbing a settling
         sheet continues from the pixel on screen. */
      const caught = settling?.stop().value ?? 0;
      settling = null;
      dismissed = false;
      origin = { x: event.touches[0].clientX, y: event.touches[0].clientY - caught };
      claimed = false;
      travelled = caught;
      samples = [{ value: travelled, time: event.timeStamp }];
    };

    const onMove = (event: TouchEvent) => {
      if (!origin || event.touches.length !== 1) return;
      const point = event.touches[0];

      /* The content's own scroll comes first, and nothing is preventDefault'ed
         while it does. Holding the origin under the finger means the pull is
         measured from the moment the top is reached. */
      if (!claimed && scrollTopUnder(event.target, element) > 0) {
        origin = { x: point.clientX, y: point.clientY };
        return;
      }

      const dx = point.clientX - origin.x;
      const dy = point.clientY - origin.y;

      if (!claimed) {
        if (Math.abs(dx) < INTENT_DISTANCE && Math.abs(dy) < INTENT_DISTANCE) return;
        /* Upward is the content's own scroll, sideways is someone else's
           gesture — neither ends the drag, the finger may still come down. */
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) {
          origin = { x: point.clientX, y: point.clientY };
          return;
        }
        claimed = true;
        /* The primitive's exit is a keyframe animation, and a keyframe
           animation overrides an inline transform: without this the sheet
           would snap back from where the finger left it to replay a slide it
           has already made. */
        element.style.animation = "none";
        /* While a field holds focus iOS pans the visual viewport under a drag
           and the whole page slides with it. Dropping focus leaves it to us. */
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
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
      const projected = travelled + projectMomentum(velocity);
      const from = { value: offsetFor(travelled), velocity };
      origin = null;
      claimed = false;
      samples = [];
      travelled = 0;
      if (!cancelled && projected > DISMISS_DISTANCE) throwOut(from);
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

  /** Put on the sheet itself. */
  return ref;
}
