"use client";

import { Columns2, Inbox, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatShortDate } from "@/lib/format";
import { selectFolder, selectSpace, useMail, useVisibleThreads } from "@/lib/store";
import type { Thread } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./contact-avatar";
import { LabelChip } from "./label-chip";

export function ThreadList({ className }: { className?: string }) {
  const folder = useMail(selectFolder);
  const space = useMail(selectSpace);
  const threads = useVisibleThreads();
  const selectedThreadId = useMail((s) => s.selectedThreadId);
  const selectThread = useMail((s) => s.selectThread);
  const toggleStar = useMail((s) => s.toggleStar);
  const unreadOnly = useMail((s) => s.unreadOnly);
  const splitView = useMail((s) => s.splitView);
  const toggleSplit = useMail((s) => s.toggleSplit);

  const unread = threads.filter((t) => t.unread).length;
  const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

  return (
    <section className={cn("min-w-0 flex-col", className)} aria-label={folder.name}>
      {/* Mobile: large title on the space gradient, iOS style */}
      <div className="shrink-0 px-5 pt-1 pb-3 text-white md:hidden">
        <h1 className="truncate text-[30px] leading-tight font-bold tracking-tight">{folder.name}</h1>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[13px] text-white/75">
            {space.emoji} {space.name} · {plural(threads.length, "conversation")}
            {unread > 0 && ` · ${unread} non lue${unread > 1 ? "s" : ""}`}
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

      {/* The list: a floating card on mobile, plain column on desktop */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-t-[28px] bg-background shadow-[0_-10px_40px_rgb(0_0_0/0.18)] md:rounded-none md:shadow-none">
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
                  onSelect={() => selectThread(t.id)}
                  onStar={() => toggleStar(t.id)}
                />
              ))}
            </ul>
          )}
        </ScrollArea>
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
      className={cn("flex shrink-0 rounded-full p-0.5 text-xs", tone === "glass" ? "bg-white/15" : "bg-muted")}
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
            ? "bg-white text-neutral-900 shadow-sm"
            : "text-white/80"
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
        <div className="min-w-0 flex-1 border-b border-border/50 pb-3 md:border-0 md:pb-0">
          <div className="flex items-center gap-2">
            {thread.unread && (
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-label="Non lu" />
            )}
            <span className={cn("truncate text-[15px] md:text-sm", thread.unread ? "font-semibold" : "font-medium")}>
              {last.from.name}
            </span>
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
