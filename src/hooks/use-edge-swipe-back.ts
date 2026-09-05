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
 * Un toucher rapporté par un `iframe`, en coordonnées de la page.
 *
 * Un cadre garde pour lui tous les touchers qui naissent sur lui : le geste de
 * retour n'existait donc pas sur un message HTML, c'est-à-dire sur la moitié du
 * courrier réel. Le cadre les **relaie** (voir `message-body.tsx`), et le geste
 * ne fait pas la différence — ce sont les mêmes trois moments.
 */
export type TouchRelaye = {
  phase: "start" | "move" | "end" | "cancel";
  x: number;
  y: number;
  time: number;
};

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

  /* Le geste vit dans la fermeture de l'effet ; le relais y entre par ce
     renvoi, qui, lui, ne change jamais d'identité. */
  const relais = useRef<((p: TouchRelaye) => void) | null>(null);
  const feed = useCallback((p: TouchRelaye) => relais.current?.(p), []);

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

    const debut = (x: number, y: number, time: number) => {
      if (!latest.current.enabled) return;
      fromEdge = x - element.getBoundingClientRect().left <= EDGE_ZONE;
      const caught = settling?.stop().value ?? 0;
      settling = null;
      committed = false;
      origin = { x: x - caught, y };
      claimed = false;
      travelled = caught;
      samples = [{ value: travelled, time }];
    };

    /* `empeche` n'existe que pour un vrai `TouchEvent` : un toucher relayé par
       un cadre a déjà été traité chez lui (le cadre pose `touch-action: pan-y`,
       ce qui lui retire l'horizontale). */
    const bouge = (x: number, y: number, time: number, empeche?: () => void) => {
      if (!origin) return;
      const dx = x - origin.x;
      const dy = y - origin.y;
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
      empeche?.();
      travelled = dx;
      samples.push({ value: travelled, time });
      if (samples.length > 12) samples.shift();
      draw(offsetFor(travelled));
    };

    const fin = (time: number, cancelled: boolean) => {
      if (!origin) return;
      if (!claimed) {
        origin = null;
        return;
      }
      samples.push({ value: travelled, time });
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

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || startsOnControl(e.target)) return;
      debut(e.touches[0].clientX, e.touches[0].clientY, e.timeStamp);
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      bouge(e.touches[0].clientX, e.touches[0].clientY, e.timeStamp, () => {
        if (e.cancelable) e.preventDefault();
      });
    };
    const onEnd = (e: TouchEvent) => fin(e.timeStamp, false);
    const onCancelTouch = (e: TouchEvent) => fin(e.timeStamp, true);

    /* Ce que le cadre nous envoie entre par ici, et par nulle part ailleurs. */
    relais.current = (p) => {
      if (p.phase === "start") debut(p.x, p.y, p.time);
      else if (p.phase === "move") bouge(p.x, p.y, p.time);
      else fin(p.time, p.phase === "cancel");
    };

    element.addEventListener("touchstart", onStart, { passive: true });
    element.addEventListener("touchmove", onMove, { passive: false });
    element.addEventListener("touchend", onEnd);
    element.addEventListener("touchcancel", onCancelTouch);
    return () => {
      relais.current = null;
      settling?.stop();
      element.removeEventListener("touchstart", onStart);
      element.removeEventListener("touchmove", onMove);
      element.removeEventListener("touchend", onEnd);
      element.removeEventListener("touchcancel", onCancelTouch);
    };
  }, [attached]);

  return { ref, feed };
}
