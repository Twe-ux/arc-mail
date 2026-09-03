/**
 * The arithmetic shared by every finger-driven surface: the back gesture and
 * the sheet dismiss. Transforms are written straight to the node on the frame
 * the finger moves (never a React state round-trip, never a CSS transition on a
 * transform a finger is driving), and what follows the release is a spring that
 * can be caught mid-flight. Ported in spirit from Kairos.
 */

export type Sample = { value: number; time: number };

export type Spring = { stiffness: number; damping: number };

/** Home again after a drag that lost. */
export const SPRING_SETTLE: Spring = { stiffness: 420, damping: 38 };
/** Out of the way after a drag that won. */
export const SPRING_DISMISS: Spring = { stiffness: 320, damping: 30 };

/** px/s from the last ~80ms of samples, so a pause before lifting reads as zero. */
export function velocityFrom(samples: Sample[]): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  let first = samples[0];
  for (let i = samples.length - 2; i >= 0; i--) {
    first = samples[i];
    if (last.time - first.time >= 80) break;
  }
  const dt = last.time - first.time;
  return dt > 0 ? ((last.value - first.value) / dt) * 1000 : 0;
}

/** Where a flick would come to rest on its own, so intent is read from the release. */
export function projectMomentum(velocity: number): number {
  return velocity * 0.18;
}

/** Resistance past a limit: the surface yields a little and no more. */
export function rubberband(pull: number, dimension: number, coefficient = 0.55): number {
  return (1 - 1 / ((pull * coefficient) / dimension + 1)) * dimension;
}

export type SpringAnimation = { stop: () => { value: number; velocity: number } };

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A damped spring on requestAnimationFrame; `stop` hands back the live state so a new drag can catch it. */
export function animateSpring({
  from,
  to,
  spring,
  onFrame,
  onRest,
}: {
  from: { value: number; velocity: number };
  to: number;
  spring: Spring;
  onFrame: (value: number) => void;
  onRest: () => void;
}): SpringAnimation {
  let value = from.value;
  let velocity = from.velocity;
  let raf = 0;
  let last = performance.now();

  if (reduceMotion()) {
    onFrame(to);
    onRest();
    return { stop: () => ({ value: to, velocity: 0 }) };
  }

  const tick = (now: number) => {
    const dt = Math.min(1 / 30, (now - last) / 1000);
    last = now;
    const accel = -spring.stiffness * (value - to) - spring.damping * velocity;
    velocity += accel * dt;
    value += velocity * dt;
    if (Math.abs(value - to) < 0.5 && Math.abs(velocity) < 8) {
      onFrame(to);
      onRest();
      return;
    }
    onFrame(value);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    stop: () => {
      cancelAnimationFrame(raf);
      return { value, velocity };
    },
  };
}

/** Controls own their touches; a drag must not start on one. */
export function startsOnControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("input, textarea, select, [contenteditable=true]") !== null;
}
