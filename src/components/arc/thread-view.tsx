"use client";

import { useState } from "react";
import { Archive, ArrowLeft, ArrowUp, Forward, Mail, MailOpen, Reply, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatFullDate } from "@/lib/format";
import { selectSelectedThread, useMail } from "@/lib/store";
import type { Message, Thread } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./contact-avatar";
import { LabelChip } from "./label-chip";

export function ThreadView({ className }: { className?: string }) {
  const thread = useMail(selectSelectedThread);
  const splitView = useMail((s) => s.splitView);
  const selectThread = useMail((s) => s.selectThread);
  const toggleStar = useMail((s) => s.toggleStar);
  const toggleUnread = useMail((s) => s.toggleUnread);
  const moveThread = useMail((s) => s.moveThread);
  const openCompose = useMail((s) => s.openCompose);

  if (!thread) {
    return (
      <div className={cn("min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-3 text-muted-foreground", className)}>
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
  const forward = () => {
    const quoted = thread.messages
      .map((m) => `De : ${m.from.name} <${m.from.email}>\nDate : ${formatFullDate(m.date)}\nÀ : ${m.to.map((c) => c.name).join(", ")}\n\n${m.body}`)
      .join("\n\n— — —\n\n");
    openCompose({
      subject: /^(fwd|tr)\s*:/i.test(thread.subject) ? thread.subject : `Fwd : ${thread.subject}`,
      body: `\n\n---------- Message transféré ----------\n${quoted}`,
    });
  };
  const actions = (
    <>
      <Action label="Transférer" onClick={forward}>
        <Forward />
      </Action>
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
    </>
  );

  return (
    <article className={cn("min-h-0 min-w-0 flex-1 flex-col", className)}>
      {/* Mobile: back, actions and subject on the tinted backdrop */}
      <div className="shrink-0 px-2 pt-0.5 pb-2 md:hidden [&_button]:size-9 [&_svg]:size-5">
        {/* The subject rides beside the arrow it came from; the actions get their
            own line under it, still right-aligned, so neither crowds the other. */}
        {/* Top-aligned, with the title nudged onto the arrow's optical centre:
            centring a two-line subject would leave the arrow floating mid-title. */}
        <div className="flex items-start gap-0.5">
          <Button variant="ghost" size="icon-xs" onClick={() => selectThread(null)} aria-label="Retour" className="shrink-0">
            <ArrowLeft />
          </Button>
          <h1 className="line-clamp-2 min-w-0 flex-1 pt-[7px] text-[19px] leading-tight font-bold tracking-tight">
            {thread.subject}
          </h1>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 pl-3">
          <div className="flex min-w-0 flex-1 gap-1.5 overflow-hidden">
            {thread.labels.map((label) => (
              <LabelChip key={label} label={label} />
            ))}
          </div>
          <div className="flex shrink-0 items-center">{actions}</div>
        </div>
      </div>

      {/* Desktop header */}
      <header className="hidden h-12 shrink-0 items-center gap-1 border-b px-3 md:flex">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => selectThread(null)}
          aria-label="Retour"
          className={cn(splitView && "hidden")}
        >
          <ArrowLeft />
        </Button>
        <h2 className="min-w-0 flex-1 truncate px-1 text-sm font-semibold">{thread.subject}</h2>
        {actions}
      </header>

      {/* Messages: a floating card on mobile, plain column on desktop */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[28px] bg-card shadow-[0_-8px_30px_rgb(0_0_0/0.06)] ring-1 ring-black/[0.05] md:rounded-none md:bg-transparent md:shadow-none md:ring-0 dark:ring-white/[0.06]">
        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-4 md:gap-4 md:p-6">
            <div className="hidden flex-wrap items-center gap-2 md:flex">
              <h1 className="text-xl font-semibold tracking-tight">{thread.subject}</h1>
              {thread.labels.map((label) => (
                <LabelChip key={label} label={label} />
              ))}
            </div>
            {thread.messages.map((m) => (
              <MessageCard key={m.id} message={m} />
            ))}
            <ReplyBox key={thread.id} thread={thread} className="hidden md:block" />
          </div>
        </ScrollArea>
        <MobileReply key={`m-${thread.id}`} thread={thread} />
      </div>
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
    <div className="rounded-2xl bg-muted/50 p-4 dark:bg-white/[0.04]">
      <div className="flex items-start gap-3">
        <ContactAvatar contact={message.from} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[15px] font-semibold md:text-sm">{message.from.name}</span>
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
      <p className="mt-4 text-[15px] leading-relaxed whitespace-pre-wrap md:text-sm">{message.body}</p>
    </div>
  );
}

/** Desktop reply, inline at the end of the thread. */
function ReplyBox({ thread, className }: { thread: Thread; className?: string }) {
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
    <div className={cn("rounded-2xl border border-border/60 bg-card p-3", className)}>
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

/** Mobile reply, a messaging-style composer pinned above the home indicator. */
function MobileReply({ thread }: { thread: Thread }) {
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
    <div className="shrink-0 border-t border-border/50 bg-card px-3 pt-2 pb-[max(0.75rem,calc(env(safe-area-inset-bottom)-10px))] md:hidden">
      <div className="flex items-end gap-2 rounded-[22px] bg-muted/60 py-1.5 pr-1.5 pl-4">
        <textarea
          rows={1}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Répondre à ${last.from.name}…`}
          className="max-h-32 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-base leading-5 outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={send}
          disabled={!body.trim()}
          aria-label="Envoyer"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
        >
          <ArrowUp className="size-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
