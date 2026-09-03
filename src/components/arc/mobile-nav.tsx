"use client";

import { Inbox, PenSquare, Search } from "lucide-react";

import { selectUnreadCount, useMail, useSpace } from "@/lib/store";
import { cn } from "@/lib/utils";
import { SpaceIcon } from "./space-icon";

const ITEM = 56; // px, the width of one slot; the capsule slides by whole slots

/**
 * The floating bar: three icon slots on frosted glass with a capsule that
 * slides to whichever is current, and compose set apart as a round button in
 * the space's colour — the one thing here that asks for a thumb.
 */
export function MobileNav({ className }: { className?: string }) {
  const space = useSpace();
  const folderId = useMail((s) => s.folderId);
  const selectedThreadId = useMail((s) => s.selectedThreadId);
  const sidebarOpen = useMail((s) => s.sidebarOpen);
  const commandOpen = useMail((s) => s.commandOpen);
  const setFolder = useMail((s) => s.setFolder);
  const selectThread = useMail((s) => s.selectThread);
  const setSidebarOpen = useMail((s) => s.setSidebarOpen);
  const setCommandOpen = useMail((s) => s.setCommandOpen);
  const openCompose = useMail((s) => s.openCompose);
  const inboxUnread = useMail((s) => selectUnreadCount(s, s.spaceId, "inbox"));

  const active = sidebarOpen ? 0 : commandOpen ? 2 : folderId === "inbox" && selectedThreadId === null ? 1 : -1;

  return (
    <nav
      aria-label="Navigation"
      className={cn(
        // Clear of the home indicator, not a thumb's travel above it.
        "flex shrink-0 items-center justify-center gap-3 px-4 pt-2.5 pb-[max(14px,calc(env(safe-area-inset-bottom)-18px))] md:hidden",
        className,
      )}
    >
      <div className="relative flex h-14 items-center rounded-full bg-background/80 p-1.5 shadow-[0_8px_30px_rgb(0_0_0/0.12)] ring-1 ring-black/5 backdrop-blur-2xl dark:bg-white/[0.07] dark:ring-white/10">
        <span
          aria-hidden
          className="absolute top-1.5 bottom-1.5 left-1.5 rounded-full bg-[color-mix(in_oklch,var(--space-accent)_18%,transparent)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{ width: ITEM, transform: `translateX(${Math.max(active, 0) * ITEM}px)`, opacity: active < 0 ? 0 : 1 }}
        />
        <Slot label={`Espace ${space.name}`} active={active === 0} onClick={() => setSidebarOpen(true)}>
          <SpaceIcon space={space} size="md" />
        </Slot>
        <Slot
          label="Réception"
          active={active === 1}
          onClick={() => {
            setFolder("inbox");
            selectThread(null);
          }}
        >
          <Inbox className="size-6" strokeWidth={active === 1 ? 2.25 : 1.75} />
          {inboxUnread > 0 && (
            <span className="absolute top-2 right-2.5 min-w-4 rounded-full bg-[var(--space-accent)] px-1 text-center text-[10px] leading-4 font-bold text-white tabular-nums ring-2 ring-background dark:ring-transparent">
              {inboxUnread}
            </span>
          )}
        </Slot>
        <Slot label="Rechercher" active={active === 2} onClick={() => setCommandOpen(true)}>
          <Search className="size-6" strokeWidth={active === 2 ? 2.25 : 1.75} />
        </Slot>
      </div>

      <button
        type="button"
        onClick={() => openCompose()}
        aria-label="Écrire"
        className="flex size-14 shrink-0 items-center justify-center rounded-full text-white shadow-[0_8px_24px_rgb(0_0_0/0.22)] transition-transform active:scale-95 [background:var(--space-gradient)]"
      >
        <PenSquare className="size-6" strokeWidth={2} />
      </button>
    </nav>
  );
}

function Slot({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      style={{ width: ITEM }}
      className={cn(
        "relative z-10 flex h-11 items-center justify-center rounded-full transition-colors",
        active ? "text-[var(--space-accent)]" : "text-muted-foreground active:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
