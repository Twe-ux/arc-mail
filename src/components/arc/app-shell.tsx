"use client";

import { useEffect, type CSSProperties } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useMail, useSpace } from "@/lib/store";
import { cn } from "@/lib/utils";
import { BackSwipe } from "./back-swipe";
import { CommandPalette } from "./command-palette";
import { ComposeDialog } from "./compose-dialog";
import { MobileNav } from "./mobile-nav";
import { MobileMenu } from "./mobile-menu";
import { Sidebar } from "./sidebar";
import { ThreadList } from "./thread-list";
import { ThreadView } from "./thread-view";

/**
 * The Arc window: a full-bleed space gradient, a translucent sidebar on the left
 * and the "page" (here the mailbox) as a rounded card floating on top.
 *
 * Below `md` the sidebar becomes a drawer, the list and the reading pane stack
 * (one at a time) and a bottom bar carries the space, search and compose.
 */
export function AppShell() {
  const space = useSpace();
  const dark = useMail((s) => s.dark);
  const splitView = useMail((s) => s.splitView);
  const selectedThreadId = useMail((s) => s.selectedThreadId);
  const selectThread = useMail((s) => s.selectThread);
  const spaceId = useMail((s) => s.spaceId);
  const loadSpace = useMail((s) => s.loadSpace);

  useKeyboardShortcuts();

  // Persisted preferences come back after mount, so server and client agree on the first paint.
  useEffect(() => {
    useMail.persist.rehydrate();
  }, []);

  /* The mail itself comes from the space's provider, read on arrival and on
     every switch — a switch back is also a refresh, and the list already on
     screen stays until the new read replaces it. */
  useEffect(() => {
    void loadSpace(spaceId);
  }, [spaceId, loadSpace]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Dialogs portal to <body>, outside the shell: give them the space colour too.
  useEffect(() => {
    document.documentElement.style.setProperty("--space-accent", space.theme.accent);
    document.documentElement.style.setProperty("--space-gradient", space.theme.gradient);
  }, [space.theme.accent, space.theme.gradient]);

  const hasSelection = selectedThreadId !== null;
  // Desktop: split view shows both; full view shows one or the other.
  const listOnDesktop = splitView || !hasSelection;
  const viewOnDesktop = splitView || hasSelection;

  return (
    <TooltipProvider>
      <div
        className="space-wash fixed inset-0 flex flex-col pt-[var(--safe-top)] transition-[background] duration-500 md:flex-row md:gap-2 md:p-2 md:[background:var(--space-gradient)]"
        style={{ "--space-gradient": space.theme.gradient, "--space-accent": space.theme.accent } as CSSProperties}
      >
        <Sidebar />
        <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden text-foreground md:rounded-xl md:bg-background md:shadow-2xl md:ring-1 md:ring-black/10">
          <ThreadList
            className={cn(
              "w-full",
              hasSelection ? "hidden" : "flex",
              listOnDesktop ? "md:flex" : "md:hidden",
              splitView ? "md:w-[380px] md:shrink-0 md:border-r" : "md:flex-1",
            )}
          />
          <BackSwipe
            enabled={hasSelection}
            onBack={() => selectThread(null)}
            className={cn(hasSelection ? "flex" : "hidden", viewOnDesktop ? "md:flex" : "md:hidden")}
            under={
              <>
                <ThreadList className="flex min-h-0 flex-1" />
                <MobileNav />
              </>
            }
          >
            <ThreadView className="flex" />
          </BackSwipe>
        </main>
        <MobileNav className={cn(hasSelection && "hidden")} />
        <MobileMenu />
        <CommandPalette />
        <ComposeDialog />
      </div>
    </TooltipProvider>
  );
}
