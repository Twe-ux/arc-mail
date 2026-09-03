"use client";

import { Columns2, Inbox, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatShortDate } from "@/lib/format";
import { selectFolder, selectSpace, useMail, useVisibleThreads } from "@/lib/store";
import type { Thread } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./contact-avatar";

export function ThreadList({ className }: { className?: string }) {
  const folder = useMail(selectFolder);
  const space = useMail(selectSpace);
  const threads = useVisibleThreads();
  const selectedThreadId = useMail((s) => s.selectedThreadId);
  const selectThread = useMail((s) => s.selectThread);
  const toggleStar = useMail((s) => s.toggleStar);
  const unreadOnly = useMail((s) => s.unreadOnly);
  const setUnreadOnly = useMail((s) => s.setUnreadOnly);
  const splitView = useMail((s) => s.splitView);
  const toggleSplit = useMail((s) => s.toggleSplit);

  return (
    <section className={cn("flex min-w-0 flex-col", className)} aria-label={folder.name}>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="truncate text-sm font-semibold">{folder.name}</h1>
        <span className="text-xs text-muted-foreground tabular-nums">{threads.length}</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="flex rounded-md bg-muted p-0.5 text-xs" role="tablist" aria-label="Filtre">
            <FilterTab active={!unreadOnly} onClick={() => setUnreadOnly(false)}>
              Tous
            </FilterTab>
            <FilterTab active={unreadOnly} onClick={() => setUnreadOnly(true)}>
              Non lus
            </FilterTab>
          </div>
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

      <ScrollArea className="min-h-0 flex-1">
        {threads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-muted-foreground">
            <Inbox className="size-8 opacity-40" />
            <p className="text-sm">{unreadOnly ? "Tout est lu." : "Rien ici pour l'instant."}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5 p-2">
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
    </section>
  );
}

function FilterTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded px-2 py-0.5 transition-colors",
        active ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
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
    <li>
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
          "group flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
          active ? "bg-accent" : "hover:bg-accent/60",
        )}
      >
        <ContactAvatar contact={last.from} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {thread.unread && (
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-label="Non lu" />
            )}
            <span className={cn("truncate text-sm", thread.unread ? "font-semibold" : "font-medium")}>
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
          </div>
          <p className={cn("truncate text-sm", thread.unread ? "text-foreground" : "text-muted-foreground")}>
            {thread.subject}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{thread.snippet}</p>
            {thread.labels.map((label) => (
              <Badge key={label} variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                {label}
              </Badge>
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
            "mt-0.5 shrink-0 rounded p-1 transition-opacity hover:bg-background",
            thread.starred ? "text-amber-400" : "text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
        >
          <Star className={cn("size-4", thread.starred && "fill-current")} />
        </button>
      </div>
    </li>
  );
}
