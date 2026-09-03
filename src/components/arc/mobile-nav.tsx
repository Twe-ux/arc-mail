"use client";

import { Inbox, PenSquare, Search } from "lucide-react";

import { selectSpace, selectUnreadCount, useMail } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Arc mobile's bottom bar: space, inbox, search, compose. Hidden from `md` up. */
export function MobileNav() {
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
      className="flex shrink-0 items-center justify-around px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] text-white md:hidden"
    >
      <NavButton label={space.name} onClick={() => setSidebarOpen(true)}>
        <span className="text-xl leading-none">{space.emoji}</span>
      </NavButton>
      <NavButton label="Réception" active={folderId === "inbox"} onClick={goInbox}>
        <Inbox className="size-5" />
        {inboxUnread > 0 && (
          <span className="absolute top-0.5 right-2 min-w-4 rounded-full bg-white px-1 text-center text-[10px] font-bold text-black tabular-nums">
            {inboxUnread}
          </span>
        )}
      </NavButton>
      <NavButton label="Rechercher" onClick={() => setCommandOpen(true)}>
        <Search className="size-5" />
      </NavButton>
      <NavButton label="Écrire" onClick={() => setComposeOpen(true)}>
        <PenSquare className="size-5" />
      </NavButton>
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
      className={cn(
        "relative flex h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-xl px-3 transition-colors",
        active ? "glass" : "text-white/80 active:bg-white/15",
      )}
    >
      {children}
      <span className="max-w-16 truncate text-[10px] font-medium">{label}</span>
    </button>
  );
}
