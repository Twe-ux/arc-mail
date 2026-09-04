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
  PanelLeftClose,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

import { SignOut } from "@/components/auth/sign-out";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FOLDERS } from "@/lib/mock-data";
import { selectFolder, selectUnreadCount, useMail, useSpace } from "@/lib/store";
import type { FolderId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./contact-avatar";
import { SpaceIcon } from "./space-icon";
import { ThemePicker } from "./theme-picker";
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

type Tone = "gradient" | "surface";

/** Desktop sits on the space gradient (white ink); the mobile drawer sits on a frosted surface. */
const TONES: Record<Tone, Record<string, string>> = {
  gradient: {
    /* The barre has no ground of its own: the ink sits straight on the
       calmed backdrop (see docs/features/theme.md). Measured at the exact
       spot each one is drawn, worst case Side at the top of the window:
       plain white 6.14:1, 85 % 4.96:1, 80 % 4.58:1, 75 % 4.22:1. So there is
       one secondary ink at 85 %, not three that would sit on the AA line,
       and the hierarchy is carried by size, weight and capitals instead of
       by four opacities that all look alike anyway. */
    text: "text-white",
    sub: "text-white/85",
    faint: "text-white/85",
    heading: "text-white/85",
    bar: "glass text-white/80 hover:bg-white/20 hover:text-white",
    kbd: "bg-white/15 text-white/70",
    tile: "bg-white/5 text-white/70 hover:bg-white/15 hover:text-white",
    tileActive: "glass text-white",
    item: "text-white/80 hover:bg-white/15 hover:text-white",
    itemActive: "glass font-medium text-white",
    count: "bg-white/20",
    sep: "bg-white/15",
    close: "hover:bg-white/20",
    icon: "text-white/70 hover:bg-white/15 hover:text-white",
    hover: "hover:text-white",
  },
  surface: {
    text: "text-foreground",
    sub: "text-muted-foreground",
    faint: "text-muted-foreground/70",
    heading: "text-muted-foreground",
    bar: "bg-muted text-muted-foreground hover:bg-muted/70",
    kbd: "",
    tile: "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
    tileActive: "bg-muted text-foreground",
    item: "text-foreground/85 hover:bg-muted",
    itemActive: "bg-muted font-medium text-foreground",
    count: "bg-foreground/10",
    sep: "bg-border",
    close: "hover:bg-background",
    icon: "text-muted-foreground hover:bg-muted hover:text-foreground",
    hover: "hover:text-foreground",
  },
};

/** Desktop sidebar, inline on the space gradient. Folds away on demand. */
export function Sidebar() {
  const collapsed = useMail((s) => s.sidebarCollapsed);
  const toggle = useMail((s) => s.toggleSidebarCollapsed);

  return (
    <aside
      className={cn(
        "hidden w-[260px] shrink-0 flex-col gap-3 px-2 py-2 text-white",
        collapsed ? "md:hidden" : "md:flex",
      )}
    >
      <SidebarContent onCollapse={toggle} />
    </aside>
  );
}

function SidebarContent({
  onNavigate,
  onCollapse,
  tone = "gradient",
}: {
  onNavigate?: () => void;
  /** Desktop only: folds the whole barre away. */
  onCollapse?: () => void;
  tone?: Tone;
}) {
  const tn = TONES[tone];
  const space = useSpace();
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
  const openCompose = useMail((s) => s.openCompose);
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
      {/* Address bar → command palette, and the fold beside it: the one
          control that is about the barre itself, at the top of the barre. */}
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={go(() => setCommandOpen(true))}
          className={cn("flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-3 text-sm transition-colors", tn.bar)}
        >
          <Search className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">{folder.name}</span>
          <Kbd className={cn("hidden md:inline-flex", tn.kbd)}>⌘K</Kbd>
        </button>
        {onCollapse && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onCollapse}
                aria-label="Replier la barre latérale"
                className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors", tn.bar)}
              >
                <PanelLeftClose className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Replier · ⌘B</TooltipContent>
          </Tooltip>
        )}
      </div>

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
                    active ? tn.tileActive : tn.tile,
                  )}
                >
                  <Icon className="size-5" />
                  {dot && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-current" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{name}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Space header */}
      <div className="flex shrink-0 items-center gap-2 px-2 pt-1">
        <SpaceIcon space={space} size="lg" />
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-semibold", tn.text)}>{space.name}</p>
          <p className={cn("truncate text-xs", tn.sub)}>{space.email}</p>
        </div>
        <ThemePicker space={space} tone={tone} className="ml-auto" />
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
            tone={tone}
          />
        ))}
      </nav>

      <Separator className={tn.sep} />

      {/* Today — recently opened threads, like Arc's tabs */}
      <div className="flex min-h-0 flex-1 flex-col gap-1">
        <div className={cn("flex items-center justify-between px-2.5 text-[11px] font-semibold tracking-wider uppercase", tn.heading)}>
          <span>Aujourd&apos;hui</span>
          {recentThreads.length > 0 && (
            <button type="button" onClick={clearRecent} className={cn("normal-case tracking-normal", tn.hover)}>
              Effacer
            </button>
          )}
        </div>
        <ScrollArea className="min-h-0 flex-1">
          {recentThreads.length === 0 ? (
            <p className={cn("px-2.5 py-2 text-xs leading-relaxed", tn.faint)}>
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
                      active ? tn.itemActive : tn.item,
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
                      className={cn("rounded p-1 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100", tn.close)}
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

      {/* Qui est connecté, et la sortie. Ne rend rien sans session. */}
      <SignOut tone={tone === "gradient" ? "clair" : "sombre"} className="shrink-0 px-1.5" />

      {/* Bottom bar: spaces + quick actions */}
      <div className="flex shrink-0 items-center justify-between gap-1 pt-1">
        <SpaceSwitcher onSelect={onNavigate} tone={tone} />
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleDark}
                aria-label="Basculer le thème"
                className={cn("flex size-8 items-center justify-center rounded-lg transition-colors", tn.icon)}
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
                onClick={go(() => openCompose())}
                aria-label="Nouveau message"
                className={cn("flex size-8 items-center justify-center rounded-lg transition-colors", tn.icon)}
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
  tone,
}: {
  icon: LucideIcon;
  name: string;
  active: boolean;
  folderId: FolderId;
  onClick: () => void;
  tone: Tone;
}) {
  const tn = TONES[tone];
  const count = useMail((s) => selectUnreadCount(s, s.spaceId, folderId));
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
        active ? tn.itemActive : tn.item,
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-left">{name}</span>
      {count > 0 && (
        <span className={cn("rounded-full px-1.5 text-[11px] font-semibold tabular-nums", tn.count)}>{count}</span>
      )}
    </button>
  );
}
