"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { useEdgeSwipeBack, type TouchRelaye } from "@/hooks/use-edge-swipe-back";
import { cn } from "@/lib/utils";

/**
 * Par où un `iframe` rend ses touchers au geste de retour.
 *
 * `null` partout ailleurs — sur bureau, hors d'une pile navigable — et le
 * consommateur (`MessageBody`) n'a alors rien à faire.
 */
const RelaisRetour = createContext<((p: TouchRelaye) => void) | null>(null);

export const useRelaisRetour = () => useContext(RelaisRetour);

const PARALLAX = 0.25;
const SCRIM = 0.22;
const parallaxFor = (progress: number, width: number) => -(1 - progress) * width * PARALLAX;
const scrimFor = (progress: number) => (1 - progress) * SCRIM;

/**
 * Two layers the back gesture moves: the screen showing (children) slides out
 * under the thumb, and the screen it goes back to (`under`) is really mounted
 * beneath it, a quarter-width behind, coming home as the top one leaves.
 * Ported from Kairos. Progress is written to the nodes on the frame, never
 * through React state.
 */
export function BackSwipe({
  enabled,
  onBack,
  under,
  className,
  children,
}: {
  enabled: boolean;
  onBack: () => void;
  under: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const [revealing, setRevealing] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const beneath = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);

  const onProgress = useCallback((progress: number) => {
    const w = top.current?.getBoundingClientRect().width ?? window.innerWidth;
    if (top.current) top.current.style.transform = `translate3d(${progress * w}px, 0, 0)`;
    if (beneath.current) beneath.current.style.transform = `translate3d(${parallaxFor(progress, w)}px, 0, 0)`;
    if (scrim.current) scrim.current.style.opacity = String(scrimFor(progress));
  }, []);

  const cancel = useCallback(() => {
    if (top.current) top.current.style.transform = "";
    setRevealing(false);
  }, []);

  /* The swap must land before the next paint, with the layer still off screen:
     `flushSync`, then clear the transform. The other order flashes the old screen. */
  const commit = useCallback(() => {
    flushSync(() => {
      onBack();
      setRevealing(false);
    });
    if (top.current) top.current.style.transform = "";
  }, [onBack]);

  const { ref, feed } = useEdgeSwipeBack({
    enabled,
    onClaim: useCallback(() => setRevealing(true), []),
    onProgress,
    onCommit: commit,
    onCancel: cancel,
  });

  return (
    /* `touch-pan-y`: the browser keeps vertical panning, we get horizontal. Without
       it iOS can claim the touch for a scroll and the swipe never becomes cancelable. */
    <div ref={ref} className={cn("relative isolate min-w-0 flex-1 flex-col touch-pan-y md:touch-auto", className)}>
      {revealing && (
        /* No ground of its own: it sits exactly over the shell's wash, which is
            already the right one. */
        <div aria-hidden inert className="absolute inset-0 z-0 overflow-hidden">
          <div
            ref={beneath}
            className="flex h-full flex-col will-change-transform"
            style={{ transform: `translate3d(${-PARALLAX * 100}%, 0, 0)` }}
          >
            {under}
          </div>
          <div ref={scrim} className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: scrimFor(0) }} />
        </div>
      )}
      <div
        ref={top}
        className={cn(
          "relative isolate flex min-h-0 min-w-0 flex-1 flex-col",
          revealing && "z-10 shadow-[-14px_0_28px_rgb(0_0_0/0.18)] will-change-transform",
        )}
      >
        {/* The layer needs an opaque ground to slide over the one beneath, but
            painting `space-wash` on the layer itself restarts the gradient at
            the layer's own top — a seam right on the safe-area line. This copy
            is stretched back up to where the shell's wash begins, so the two
            are the same picture; and being inside the transformed layer, it
            travels with it during the drag. */}
        <div
          aria-hidden
          className="space-wash pointer-events-none absolute inset-x-0 -z-10 h-dvh md:hidden"
          style={{ top: "calc(-1 * var(--safe-top))" }}
        />
        <RelaisRetour.Provider value={feed}>{children}</RelaisRetour.Provider>
      </div>
    </div>
  );
}
