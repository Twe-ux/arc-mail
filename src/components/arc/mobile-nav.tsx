"use client";

import { Inbox, PenSquare, Search } from "lucide-react";

import { selectSpace, selectUnreadCount, useMail } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Floating frosted pill: space, inbox, search, compose. Hidden from `md` up. */
export function MobileNav({ className }: { className?: string }) {
  const space = useMail(selectSpace);
  const folderId = useMail((s) => s.folderId);
  const setFolder = useMail((s) => s.setFolder);
  const selectThread = useMail((s) => s.selectThread);
  const setSidebarOpen = useMail((s) => s.setSidebarOpen);
  const setCommandOpen = useMail((s) => s.setCommandOpen);
  const setComposeOpen = useMail((s) => s.setComposeOpen);
  const inboxUnread = useMail((s) => selectUnreadCount(s, s.spaceId, "inbox"));

  const goInbox = () => {
    setFolder("inbox");
    selectThread(null);
  };

  return (
    <nav
      aria-label="Navigation"
      className={cn(
        // Clear of the home indicator, not a thumb's travel above it: the full
        // safe area pushed the bar ~40px up on an installed iPhone.
        "flex shrink-0 justify-center px-4 pt-2.5 pb-[max(14px,calc(env(safe-area-inset-bottom)-18px))] md:hidden",
        className,
      )}
    >
      <div className="flex items-center gap-1 rounded-full bg-background/80 p-1.5 shadow-[0_8px_30px_rgb(0_0_0/0.12)] ring-1 ring-black/5 backdrop-blur-2xl dark:bg-card/80 dark:ring-white/10">
        <NavButton label={space.name} onClick={() => setSidebarOpen(true)}>
          <span className="text-[22px] leading-none">{space.emoji}</span>
        </NavButton>
        <NavButton label="Réception" active={folderId === "inbox"} onClick={goInbox}>
          <Inbox className="size-[22px]" strokeWidth={1.75} />
          {inboxUnread > 0 && (
            <span className="absolute top-1 right-3 min-w-4 rounded-full bg-[var(--space-accent)] px-1 text-center text-[10px] leading-4 font-bold text-white tabular-nums">
              {inboxUnread}
            </span>
          )}
        </NavButton>
        <NavButton label="Rechercher" onClick={() => setCommandOpen(true)}>
          <Search className="size-[22px]" strokeWidth={1.75} />
        </NavButton>
        <NavButton label="Écrire" onClick={() => setComposeOpen(true)}>
          <PenSquare className="size-[22px]" strokeWidth={1.75} />
        </NavButton>
      </div>
    </nav>
  );
}

function NavButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={cn(
        "relative flex h-12 w-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-full transition-colors",
        active
          ? "bg-[color-mix(in_oklch,var(--space-accent)_14%,transparent)] text-[var(--space-accent)]"
          : "text-muted-foreground active:bg-muted",
      )}
    >
      {children}
      <span className="max-w-full truncate px-1 text-[10px] font-medium">{label}</span>
    </button>
  );
}
