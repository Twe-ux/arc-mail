"use client";

import { Info, Paperclip } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatFullDate, formatSize } from "@/lib/format";
import { useMail } from "@/lib/store";
import type { Contact, Thread } from "@/lib/types";
import { ContactAvatar } from "./contact-avatar";
import { LabelChip } from "./label-chip";
import { CASE, Titre } from "./thread-header-desktop";

/**
 * Ce que la conversation contient, sans le lire.
 *
 * Les pièces jointes y sont des rangées cliquables : c'est le seul chemin vers
 * un fichier qui n'oblige pas à retrouver le message auquel il pendait.
 */
export function ThreadDetails({ thread }: { thread: Thread }) {
  const openThird = useMail((s) => s.openThird);
  const [ouvert, setOuvert] = useState(false);

  const gens: Contact[] = [];
  for (const m of thread.messages) {
    for (const c of [m.from, ...m.to, ...(m.cc ?? [])]) {
      if (!gens.some((g) => g.email.toLowerCase() === c.email.toLowerCase())) gens.push(c);
    }
  }
  const pieces = thread.messages.flatMap((m) => m.attachments ?? []);
  const debut = thread.messages[0].date;

  return (
    <Popover open={ouvert} onOpenChange={setOuvert}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Détails de la conversation" className={CASE}>
              <Info />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Détails</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" sideOffset={8} className="w-[302px] rounded-xl p-3">
        <Titre>Participants</Titre>
        <ul className="flex flex-col gap-1.5">
          {gens.map((c) => (
            <li key={c.email} className="flex items-center gap-2.5">
              <ContactAvatar contact={c} className="size-7 shrink-0" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] font-medium">{c.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{c.email}</span>
              </span>
            </li>
          ))}
        </ul>

        {thread.labels.length > 0 && (
          <>
            <Titre>Étiquettes</Titre>
            <div className="flex flex-wrap gap-1.5">
              {thread.labels.map((l) => (
                <LabelChip key={l} label={l} />
              ))}
            </div>
          </>
        )}

        {pieces.length > 0 && (
          <>
            <Titre>Pièces jointes</Titre>
            <ul className="flex flex-col gap-0.5">
              {pieces.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOuvert(false);
                      openThird({ kind: "file", attachmentId: p.id });
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-muted"
                  >
                    <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-[13px]">{p.name}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                      {formatSize(p.size)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="mt-3 border-t pt-2 text-[11px] text-muted-foreground">
          {thread.messages.length} message{thread.messages.length > 1 ? "s" : ""} · Depuis le{" "}
          <time dateTime={debut} suppressHydrationWarning>
            {formatFullDate(debut)}
          </time>
        </p>
      </PopoverContent>
    </Popover>
  );
}

