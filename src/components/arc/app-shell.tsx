"use client";

import { useEffect, type CSSProperties } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { selectSpace, useMail } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./command-palette";
import { ComposeDialog } from "./compose-dialog";
import { MobileNav } from "./mobile-nav";
import { MobileSidebar, Sidebar } from "./sidebar";
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
  const space = useMail(selectSpace);
  const dark = useMail((s) => s.dark);
  const splitView = useMail((s) => s.splitView);
  const selectedThreadId = useMail((s) => s.selectedThreadId);

  useKeyboardShortcuts();

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
        className="space-wash fixed inset-0 flex flex-col pt-[env(safe-area-inset-top)] transition-[background] duration-500 md:flex-row md:gap-2 md:p-2 md:[background:var(--space-gradient)]"
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
          <ThreadView className={cn(hasSelection ? "flex" : "hidden", viewOnDesktop ? "md:flex" : "md:hidden")} />
        </main>
        <MobileNav className={cn(hasSelection && "hidden")} />
        <MobileSidebar />
        <CommandPalette />
        <ComposeDialog />
      </div>
    </TooltipProvider>
  );
}
