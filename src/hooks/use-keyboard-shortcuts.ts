"use client";

import { useEffect, useRef } from "react";
import { selectVisibleThreads, useMail, useSpaces } from "@/lib/store";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

/**
 * Arc-flavoured shortcuts:
 *  ⌘K  command bar · ⌘N / c  compose · ⌘B  sidebar · ⌘⇧D  split view · ⌘1-3  spaces
 *  j/k  next / previous thread · e  archive · s  star · #  delete · u  unread · Esc  close
 */
export function useKeyboardShortcuts() {
  /* Read through the store like every other component (fiche thème), kept in
     a ref so the listener is installed once. */
  const spaces = useSpaces();
  const spacesRef = useRef(spaces);
  useEffect(() => {
    spacesRef.current = spaces;
  }, [spaces]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = useMail.getState();
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        s.setCommandOpen(!s.commandOpen);
        return;
      }
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        s.openCompose();
        return;
      }
      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        s.cycleSidebarMode();
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        s.toggleSplit();
        return;
      }
      if (mod && /^[1-9]$/.test(e.key)) {
        const space = spacesRef.current[Number(e.key) - 1];
        if (space) {
          e.preventDefault();
          s.setSpace(space.id);
        }
        return;
      }

      if (isTyping(e.target) || s.commandOpen || s.compose !== null || mod) return;

      const visible = selectVisibleThreads(s);
      const index = visible.findIndex((t) => t.id === s.selectedThreadId);

      switch (e.key) {
        case "c":
          e.preventDefault();
          s.openCompose();
          break;
        case "j": {
          const next = visible[Math.min(index + 1, visible.length - 1)];
          if (next) s.selectThread(next.id);
          break;
        }
        case "k": {
          const prev = visible[Math.max(index - 1, 0)];
          if (prev) s.selectThread(prev.id);
          break;
        }
        case "e":
          if (s.selectedThreadId) s.moveThread(s.selectedThreadId, "archive");
          break;
        case "#":
          if (s.selectedThreadId) s.moveThread(s.selectedThreadId, "trash");
          break;
        case "s":
          if (s.selectedThreadId) s.toggleStar(s.selectedThreadId);
          break;
        case "u":
          if (s.selectedThreadId) s.toggleUnread(s.selectedThreadId);
          break;
        case "Escape":
          if (s.selectedThreadId) s.selectThread(null);
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
