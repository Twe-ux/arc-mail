"use client";

import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { selectSpace, useMail } from "@/lib/store";
import { CommandPalette } from "./command-palette";
import { ComposeDialog } from "./compose-dialog";
import { Sidebar } from "./sidebar";
import { ThreadList } from "./thread-list";
import { ThreadView } from "./thread-view";

/**
 * The Arc window: a full-bleed space gradient, a translucent sidebar on the left
 * and the "page" (here the mailbox) as a rounded card floating on top.
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

  const showList = splitView || selectedThreadId === null;
  const showView = splitView || selectedThreadId !== null;

  return (
    <TooltipProvider>
      <div
        className="flex h-dvh w-full gap-2 p-2 transition-[background] duration-500"
        style={{ background: space.theme.gradient }}
      >
        <Sidebar />
        <main className="flex min-w-0 flex-1 overflow-hidden rounded-xl bg-background text-foreground shadow-2xl ring-1 ring-black/10">
          {showList && <ThreadList className={splitView ? "w-[380px] shrink-0 border-r" : "flex-1"} />}
          {showView && <ThreadView />}
        </main>
        <CommandPalette />
        <ComposeDialog />
      </div>
    </TooltipProvider>
  );
}
