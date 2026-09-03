"use client";

import { useState } from "react";
import { Archive, ArrowLeft, Mail, MailOpen, Reply, Star, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatFullDate } from "@/lib/format";
import { selectSelectedThread, useMail } from "@/lib/store";
import type { Message, Thread } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./contact-avatar";

export function ThreadView({ className }: { className?: string }) {
  const thread = useMail(selectSelectedThread);
  const splitView = useMail((s) => s.splitView);
  const selectThread = useMail((s) => s.selectThread);
  const toggleStar = useMail((s) => s.toggleStar);
  const toggleUnread = useMail((s) => s.toggleUnread);
  const moveThread = useMail((s) => s.moveThread);

  if (!thread) {
    return (
      <div className={cn("min-w-0 flex-1 flex-col items-center justify-center gap-3 text-muted-foreground", className)}>
        <Mail className="size-10 opacity-30" />
        <p className="text-sm">Sélectionne une conversation</p>
        <p className="text-xs">
          <kbd className="rounded bg-muted px-1">j</kbd> / <kbd className="rounded bg-muted px-1">k</kbd> pour naviguer ·{" "}
          <kbd className="rounded bg-muted px-1">⌘K</kbd> pour chercher
        </p>
      </div>
    );
  }

  const inTrash = thread.folder === "trash";

  return (
    <article className={cn("min-w-0 flex-1 flex-col", className)}>
      <header className="flex h-12 shrink-0 items-center gap-1 border-b px-3">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => selectThread(null)}
          aria-label="Retour"
          className={cn(splitView && "md:hidden")}
        >
          <ArrowLeft />
        </Button>
        <h2 className="min-w-0 flex-1 truncate px-1 text-sm font-semibold">{thread.subject}</h2>
        <Action label="Archiver · e" onClick={() => moveThread(thread.id, "archive")} disabled={thread.folder === "archive"}>
          <Archive />
        </Action>
        <Action label={inTrash ? "Restaurer" : "Supprimer · #"} onClick={() => moveThread(thread.id, inTrash ? "inbox" : "trash")}>
          <Trash2 />
        </Action>
        <Action label={thread.unread ? "Marquer comme lu · u" : "Marquer comme non lu · u"} onClick={() => toggleUnread(thread.id)}>
          {thread.unread ? <MailOpen /> : <Mail />}
        </Action>
        <Action label={thread.starred ? "Retirer des favoris · s" : "Ajouter aux favoris · s"} onClick={() => toggleStar(thread.id)}>
          <Star className={cn(thread.starred && "fill-amber-400 text-amber-400")} />
        </Action>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{thread.subject}</h1>
            {thread.labels.map((label) => (
              <Badge key={label} variant="secondary">
                {label}
              </Badge>
            ))}
          </div>
          {thread.messages.map((m) => (
            <MessageCard key={m.id} message={m} />
          ))}
          <ReplyBox key={thread.id} thread={thread} />
        </div>
      </ScrollArea>
    </article>
  );
}

function Action({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-xs" onClick={onClick} disabled={disabled} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function MessageCard({ message }: { message: Message }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <ContactAvatar contact={message.from} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold">{message.from.name}</span>
            <span className="truncate text-xs text-muted-foreground">{message.from.email}</span>
            <time dateTime={message.date} suppressHydrationWarning className="ml-auto text-xs text-muted-foreground">
              {formatFullDate(message.date)}
            </time>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            À : {message.to.map((c) => c.name).join(", ")}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap">{message.body}</p>
    </div>
  );
}

function ReplyBox({ thread }: { thread: Thread }) {
  const [body, setBody] = useState("");
  const reply = useMail((s) => s.reply);
  const last = thread.messages[thread.messages.length - 1];

  const send = () => {
    const text = body.trim();
    if (!text) return;
    reply(thread.id, text);
    setBody("");
  };

  return (
    <div className="rounded-xl border bg-card p-3 shadow-xs">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send();
        }}
        placeholder={`Répondre à ${last.from.name}…`}
        className="min-h-20 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">⌘⏎ pour envoyer</span>
        <Button size="sm" onClick={send} disabled={!body.trim()}>
          <Reply /> Répondre
        </Button>
      </div>
    </div>
  );
}
