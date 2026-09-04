"use client";

import { Columns2, Inbox, RefreshCw, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { formatShortDate } from "@/lib/format";
import { selectFolder, useMail, useSpace, useVisibleThreads } from "@/lib/store";
import type { Thread } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./contact-avatar";
import { LabelChip } from "./label-chip";
import { SpaceIcon } from "./space-icon";

export function ThreadList({ className }: { className?: string }) {
  const folder = useMail(selectFolder);
  const space = useSpace();
  const threads = useVisibleThreads();
  const selectedThreadId = useMail((s) => s.selectedThreadId);
  const selectThread = useMail((s) => s.selectThread);
  const openDraft = useMail((s) => s.openDraft);
  const toggleStar = useMail((s) => s.toggleStar);
  const unreadOnly = useMail((s) => s.unreadOnly);
  const splitView = useMail((s) => s.splitView);
  const toggleSplit = useMail((s) => s.toggleSplit);

  const unread = threads.filter((t) => t.unread).length;
  const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

  /* A real reload, not a re-render: installed on the home screen there is no
     address bar to pull down and no reload button, so this is the only way to
     get a fresh page — and the way a new deploy arrives without force-quitting
     the app. When a mail provider lands, this becomes its refetch.
     The pause is what makes it legible: reloading the instant the finger lifts
     tears the document down before the spinner has turned once, so the whole
     gesture reads as a flicker rather than as work being done. The hook holds
     the list open and spins for as long as this takes. */
  const { ref: cardRef, indicatorRef } = usePullToRefresh(async () => {
    await new Promise((resolve) => setTimeout(resolve, 550));
    window.location.reload();
  });

  return (
    <section className={cn("min-h-0 min-w-0 flex-col", className)} aria-label={folder.name}>
      {/* Mobile: large title on the tinted backdrop, iOS style */}
      <div className="shrink-0 px-5 pt-1 pb-3 md:hidden">
        <h1 className="truncate text-[30px] leading-tight font-bold tracking-tight">{folder.name}</h1>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
            <SpaceIcon space={space} size="xs" />
            <span className="truncate">
              {space.name} · {plural(threads.length, "conversation")}
              {unread > 0 && ` · ${unread} non lue${unread > 1 ? "s" : ""}`}
            </span>
          </p>
          <Segmented tone="glass" />
        </div>
      </div>

      {/* Desktop header */}
      <header className="hidden h-12 shrink-0 items-center gap-2 border-b px-4 md:flex">
        <h1 className="truncate text-sm font-semibold">{folder.name}</h1>
        <span className="text-xs text-muted-foreground tabular-nums">{threads.length}</span>
        <div className="ml-auto flex items-center gap-1">
          <Segmented tone="muted" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-xs" onClick={toggleSplit} aria-pressed={splitView} aria-label="Vue partagée">
                <Columns2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Vue partagée · ⌘⇧D</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* The list: a floating card on mobile, plain column on desktop.
          The card is what the pull-to-refresh gesture moves, so it sits in a
          box of its own with the indicator behind it — the card's own opaque
          background is what hides the mark until the finger reveals it. */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={indicatorRef}
          aria-hidden
          data-armed="false"
          className="group/pull pointer-events-none absolute inset-x-0 top-0 flex h-16 items-center justify-center opacity-0 md:hidden"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-black/[0.06] dark:ring-white/12">
            <RefreshCw
              /* While it spins, the pull's own angle has to get out of the way,
                 and a class cannot do that to an inline `rotate` — inline
                 wins. So zero the variable the angle is computed from, on this
                 element: its own declaration beats the one inherited from the
                 indicator, and `calc()` lands on 0deg. */
              className="size-4 text-muted-foreground transition-colors group-data-[armed=true]/pull:text-[var(--space-accent)] group-data-[refreshing]/pull:animate-spin group-data-[refreshing]/pull:text-[var(--space-accent)] group-data-[refreshing]/pull:[--pull-progress:0]"
              /* Turned by the pull itself rather than by a render per frame:
                 the hook only publishes how far along the gesture is. */
              style={{
                rotate:
                  "calc(var(--pull-progress, 0) * 180deg)",
              }}
            />
          </span>
        </div>
        <div
          ref={cardRef}
          className="h-full overflow-hidden rounded-t-[28px] bg-card shadow-[0_-8px_30px_rgb(0_0_0/0.06)] ring-1 ring-black/[0.05] md:rounded-none md:bg-transparent md:shadow-none md:ring-0 dark:ring-white/12"
        >
        <ScrollArea className="h-full">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-muted-foreground">
              <Inbox className="size-8 opacity-40" />
              <p className="text-sm">{unreadOnly ? "Tout est lu." : "Rien ici pour l'instant."}</p>
            </div>
          ) : (
            <ul className="flex flex-col pt-2 pb-4 md:gap-0.5 md:p-2">
              {threads.map((t) => (
                <ThreadRow
                  key={t.id}
                  thread={t}
                  accent={space.theme.accent}
                  active={t.id === selectedThreadId}
                  onSelect={() => (t.folder === "drafts" ? openDraft(t.id) : selectThread(t.id))}
                  onStar={() => toggleStar(t.id)}
                />
              ))}
            </ul>
          )}
        </ScrollArea>
        </div>
      </div>
    </section>
  );
}

function Segmented({ tone }: { tone: "glass" | "muted" }) {
  const unreadOnly = useMail((s) => s.unreadOnly);
  const setUnreadOnly = useMail((s) => s.setUnreadOnly);
  return (
    <div
      role="tablist"
      aria-label="Filtre"
      className={cn("flex shrink-0 rounded-full p-0.5 text-xs", tone === "glass" ? "bg-foreground/[0.06]" : "bg-muted")}
    >
      <Tab tone={tone} active={!unreadOnly} onClick={() => setUnreadOnly(false)}>
        Tous
      </Tab>
      <Tab tone={tone} active={unreadOnly} onClick={() => setUnreadOnly(true)}>
        Non lus
      </Tab>
    </div>
  );
}

function Tab({
  tone,
  active,
  onClick,
  children,
}: {
  tone: "glass" | "muted";
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 font-medium transition-colors",
        tone === "glass"
          ? active
            ? "bg-card text-foreground shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.08]"
            : "text-muted-foreground"
          : active
            ? "bg-background text-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ThreadRow({
  thread,
  accent,
  active,
  onSelect,
  onStar,
}: {
  thread: Thread;
  accent: string;
  active: boolean;
  onSelect: () => void;
  onStar: () => void;
}) {
  const last = thread.messages[thread.messages.length - 1];
  const isDraft = thread.folder === "drafts";
  const outgoing = isDraft || thread.folder === "sent";
  const who = outgoing
    ? last.to.length
      ? `À : ${last.to.map((c) => c.name).join(", ")}`
      : "Aucun destinataire"
    : last.from.name;

  return (
    <li className="md:border-0">
      <div
        role="button"
        tabIndex={0}
        aria-current={active ? "true" : undefined}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className={cn(
          "group flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 md:rounded-lg md:px-3 md:py-2.5",
          active ? "bg-accent" : "active:bg-accent/60 md:hover:bg-accent/60",
        )}
      >
        <ContactAvatar contact={last.from} className="mt-0.5 size-10 md:size-9" />
        <div className="min-w-0 flex-1 border-b border-black/[0.06] pb-3 md:border-0 md:pb-0 dark:border-white/[0.10]">
          <div className="flex items-center gap-2">
            {thread.unread && (
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-label="Non lu" />
            )}
            <span className={cn("truncate text-[15px] md:text-sm", thread.unread ? "font-semibold" : "font-medium")}>
              {who}
            </span>
            {isDraft && <span className="shrink-0 text-xs font-medium text-destructive">Brouillon</span>}
            {thread.messages.length > 1 && (
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{thread.messages.length}</span>
            )}
            <time
              dateTime={last.date}
              suppressHydrationWarning
              className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums"
            >
              {formatShortDate(last.date)}
            </time>
            {thread.starred && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400 md:hidden" />}
          </div>
          <p
            className={cn(
              "truncate text-[15px] md:text-sm",
              thread.unread ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {thread.subject}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground md:text-xs">{thread.snippet}</p>
            {thread.labels.map((label) => (
              <LabelChip key={label} label={label} />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStar();
          }}
          aria-label={thread.starred ? "Retirer des favoris" : "Ajouter aux favoris"}
          aria-pressed={thread.starred}
          className={cn(
            "mt-0.5 hidden shrink-0 rounded p-1 transition-opacity hover:bg-background md:block",
            thread.starred
              ? "text-amber-400"
              : "text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
        >
          <Star className={cn("size-4", thread.starred && "fill-current")} />
        </button>
      </div>
    </li>
  );
}
