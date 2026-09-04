"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SPRING_DISMISS,
  SPRING_SETTLE,
  animateSpring,
  rubberband,
  scrollTopUnder,
  startsOnDragControl,
  swallowNextClick,
  velocityFrom,
  type Sample,
  type SpringAnimation,
} from "@/lib/gesture";

const INTENT_DISTANCE = 8;
/**
 * What counts as meaning it.
 *
 * Projected distance alone (travel plus momentum) made a short, brisk nudge
 * enough — 20px at 500px/s projects past 100 — so a sheet one meant to jostle
 * left. A dismissal now needs real travel first, and then either a deliberate
 * pull or a genuine flick. Anything less springs back, which is the other thing
 * a small movement is allowed to do.
 */
const MIN_TRAVEL = 40;
const DISMISS_TRAVEL = 110;
const FLICK_VELOCITY = 550;
/**
 * A pull past `DISMISS_TRAVEL` followed by a brisk push back *up* is a
 * change of mind, not a dismissal: below this (negative) velocity the sheet
 * settles back however far it was pulled. Without it the throw started with
 * an upward velocity, rose, then came back down and closed against the
 * finger that had just refused it.
 */
const RETURN_VELOCITY = -250;
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

    /* The one moment `animation:none` should let go: the primitive itself is
       closing (Annuler, the X, sending — none of which go through this
       hook), and its exit keyframe deserves to play rather than snap. Every
       other time control is handed back, per the note in `settle` above,
       replays the entrance instead. */
    const onStateChange = () => {
      if (element.getAttribute("data-state") === "closed")
        element.style.animation = "";
    };
    const observer = new MutationObserver(onStateChange);
    observer.observe(element, {
      attributes: true,
      attributeFilter: ["data-state"],
    });

    let origin: { x: number; y: number } | null = null;
    let claimed = false;
    let travelled = 0;
    let samples: Sample[] = [];
    let settling: SpringAnimation | null = null;
    let dismissed = false;

    const offsetFor = (pull: number) =>
      pull > MAX_PULL ? MAX_PULL + rubberband(pull - MAX_PULL, MAX_PULL) : pull;

    const draw = (offset: number) => {
      element.style.transform =
        offset === 0 ? "" : `translate3d(0, ${offset}px, 0)`;
    };

    const settle = (from: { value: number; velocity: number }) => {
      settling = animateSpring({
        from,
        to: 0,
        spring: SPRING_SETTLE,
        onFrame: draw,
        onRest: () => {
          settling = null;
          /* Left at "none", not reset to "": the sheet is still open, and
             clearing the override here would restart its own entrance
             keyframe — measured with the animation replaying start to finish,
             opacity 0 back up to 1, right after every settle. Every nudge
             that didn't dismiss looked exactly like a close-then-reopen. The
             observer below gives the exit animation back at the one moment
             it's actually needed: closing for real. */
        },
      });
    };

    /**
     * Carry the sheet the rest of the way down and close when it has gone.
     * Aimed past the bottom edge so the part anyone can see never decelerates,
     * and the close fires the frame it clears the edge.
     */
    const throwOut = (from: { value: number; velocity: number }) => {
      const height =
        element.getBoundingClientRect().height || window.innerHeight;
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
      origin = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY - caught,
      };
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
        if (Math.abs(dx) < INTENT_DISTANCE && Math.abs(dy) < INTENT_DISTANCE)
          return;
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
        if (document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
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
      const meant =
        pulled >= MIN_TRAVEL &&
        velocity > RETURN_VELOCITY &&
        (pulled > DISMISS_TRAVEL || velocity > FLICK_VELOCITY);
      if (!cancelled && meant) {
        /* Only here: the drag is actually taking the sheet away, so the
           browser's synthesized click will land on the page now revealed
           underneath — often the very button that opens this sheet, since a
           downward pull ends low on the screen. A drag that springs back
           stays covered by the sheet, and swallowing its click too would eat
           a legitimate tap right after. */
        swallowNextClick();
        throwOut(from);
      } else {
        settle(from);
      }
    };

    const onEnd = (e: TouchEvent) => finish(e, false);
    const onCancel = (e: TouchEvent) => finish(e, true);

    element.addEventListener("touchstart", onStart, { passive: true });
    element.addEventListener("touchmove", onMove, { passive: false });
    element.addEventListener("touchend", onEnd);
    element.addEventListener("touchcancel", onCancel);
    return () => {
      observer.disconnect();
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
