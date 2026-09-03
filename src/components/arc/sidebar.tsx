"use client";

import {
  Archive,
  Clock,
  FileText,
  Inbox,
  Moon,
  Plus,
  Search,
  Send,
  Star,
  Sun,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FOLDERS } from "@/lib/mock-data";
import { selectFolder, selectSpace, selectUnreadCount, useMail } from "@/lib/store";
import type { FolderId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./contact-avatar";
import { InstallHint } from "./install-hint";
import { SpaceSwitcher } from "./space-switcher";

const FOLDER_ICONS: Record<FolderId, LucideIcon> = {
  inbox: Inbox,
  starred: Star,
  snoozed: Clock,
  sent: Send,
  drafts: FileText,
  archive: Archive,
  trash: Trash2,
};

/** The four "favorite" tiles under the address bar, like Arc's pinned favorites. */
const PINNED: FolderId[] = ["inbox", "starred", "sent", "drafts"];

/** Desktop sidebar, inline on the space gradient. */
export function Sidebar() {
  return (
    <aside className="hidden w-[260px] shrink-0 flex-col gap-3 px-2 py-2 text-white md:flex">
      {/* Window controls placeholder, keeps the Arc proportions. */}
      <div className="flex items-center gap-1.5 px-2 pt-1" aria-hidden>
        <span className="size-3 rounded-full bg-white/30" />
        <span className="size-3 rounded-full bg-white/30" />
        <span className="size-3 rounded-full bg-white/30" />
      </div>
      <SidebarContent />
    </aside>
  );
}

/** Mobile sidebar: the same content in a left drawer painted with the space gradient. */
export function MobileSidebar() {
  const space = useMail(selectSpace);
  const open = useMail((s) => s.sidebarOpen);
  const setOpen = useMail((s) => s.setSidebarOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-[85vw] max-w-sm gap-0 border-0 px-2 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-white md:hidden"
        style={{ background: space.theme.gradient }}
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Espaces, dossiers et conversations récentes</SheetDescription>
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <SidebarContent onNavigate={() => setOpen(false)} />
          <InstallHint />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const space = useMail(selectSpace);
  const folder = useMail(selectFolder);
  const folderId = useMail((s) => s.folderId);
  const setFolder = useMail((s) => s.setFolder);
  const threads = useMail((s) => s.threads);
  const recentIds = useMail((s) => s.recent[s.spaceId]);
  const selectedThreadId = useMail((s) => s.selectedThreadId);
  const selectThread = useMail((s) => s.selectThread);
  const removeRecent = useMail((s) => s.removeRecent);
  const clearRecent = useMail((s) => s.clearRecent);
  const setCommandOpen = useMail((s) => s.setCommandOpen);
  const setComposeOpen = useMail((s) => s.setComposeOpen);
  const dark = useMail((s) => s.dark);
  const toggleDark = useMail((s) => s.toggleDark);
  const inboxUnread = useMail((s) => selectUnreadCount(s, s.spaceId, "inbox"));

  const recentThreads = recentIds
    .map((id) => threads.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const go = (fn: () => void) => () => {
    fn();
    onNavigate?.();
  };

  return (
    <>
      {/* Address bar → command palette */}
      <button
        type="button"
        onClick={go(() => setCommandOpen(true))}
        className="glass flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm text-white/80 transition-colors hover:bg-white/20 hover:text-white"
      >
        <Search className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">{folder.name}</span>
        <Kbd className="hidden bg-white/15 text-white/70 md:inline-flex">⌘K</Kbd>
      </button>

      {/* Pinned favorites */}
      <div className="grid shrink-0 grid-cols-4 gap-1.5">
        {PINNED.map((id) => {
          const Icon = FOLDER_ICONS[id];
          const name = FOLDERS.find((f) => f.id === id)?.name ?? id;
          const active = id === folderId;
          const dot = id === "inbox" && inboxUnread > 0;
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={go(() => setFolder(id))}
                  aria-label={name}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-12 items-center justify-center rounded-xl transition-colors",
                    active ? "glass text-white" : "bg-white/5 text-white/70 hover:bg-white/15 hover:text-white",
                  )}
                >
                  <Icon className="size-5" />
                  {dot && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-white" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{name}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Space header */}
      <div className="flex shrink-0 items-center gap-2 px-2 pt-1">
        <span className="text-lg leading-none">{space.emoji}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{space.name}</p>
          <p className="truncate text-xs text-white/60">{space.email}</p>
        </div>
      </div>

      {/* Folders */}
      <nav className="flex shrink-0 flex-col gap-0.5" aria-label="Dossiers">
        {FOLDERS.map((f) => (
          <FolderRow
            key={f.id}
            icon={FOLDER_ICONS[f.id]}
            name={f.name}
            active={f.id === folderId}
            folderId={f.id}
            onClick={go(() => setFolder(f.id))}
          />
        ))}
      </nav>

      <Separator className="bg-white/15" />

      {/* Today — recently opened threads, like Arc's tabs */}
      <div className="flex min-h-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between px-2.5 text-[11px] font-semibold tracking-wider text-white/50 uppercase">
          <span>Aujourd&apos;hui</span>
          {recentThreads.length > 0 && (
            <button type="button" onClick={clearRecent} className="normal-case tracking-normal hover:text-white">
              Effacer
            </button>
          )}
        </div>
        <ScrollArea className="min-h-0 flex-1">
          {recentThreads.length === 0 ? (
            <p className="px-2.5 py-2 text-xs leading-relaxed text-white/40">
              Les conversations que tu ouvres s&apos;affichent ici, comme les onglets d&apos;Arc.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {recentThreads.map((t) => {
                const last = t.messages[t.messages.length - 1];
                const active = t.id === selectedThreadId;
                return (
                  <li
                    key={t.id}
                    className={cn(
                      "group flex h-8 items-center gap-1 rounded-lg pr-1 pl-2 text-sm transition-colors",
                      active ? "glass" : "text-white/80 hover:bg-white/15 hover:text-white",
                    )}
                  >
                    <button
                      type="button"
                      onClick={go(() => selectThread(t.id))}
                      className="flex min-w-0 flex-1 items-center gap-2"
                    >
                      <ContactAvatar contact={last.from} className="size-5 [&_[data-slot=avatar-fallback]]:text-[9px]" />
                      <span className="truncate">{t.subject}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRecent(t.id)}
                      aria-label="Fermer"
                      className="rounded p-1 transition-opacity hover:bg-white/20 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </div>

      {/* Bottom bar: spaces + quick actions */}
      <div className="flex shrink-0 items-center justify-between gap-1 pt-1">
        <SpaceSwitcher onSelect={onNavigate} />
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleDark}
                aria-label="Basculer le thème"
                className="flex size-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/15 hover:text-white"
              >
                {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Thème</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={go(() => setComposeOpen(true))}
                aria-label="Nouveau message"
                className="flex size-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/15 hover:text-white"
              >
                <Plus className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Nouveau message · ⌘N</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </>
  );
}

function FolderRow({
  icon: Icon,
  name,
  active,
  folderId,
  onClick,
}: {
  icon: LucideIcon;
  name: string;
  active: boolean;
  folderId: FolderId;
  onClick: () => void;
}) {
  const count = useMail((s) => selectUnreadCount(s, s.spaceId, folderId));
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
        active ? "glass font-medium text-white" : "text-white/80 hover:bg-white/15 hover:text-white",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-left">{name}</span>
      {count > 0 && (
        <span className="rounded-full bg-white/20 px-1.5 text-[11px] font-semibold tabular-nums">{count}</span>
      )}
    </button>
  );
}
