"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Paperclip, Send, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SPACES } from "@/lib/mock-data";
import { selectContacts, useMail } from "@/lib/store";
import type { ComposeDraft } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RecipientField } from "./recipient-field";

/**
 * Full-screen sheet on phones (Annuler · title · Envoyer, iOS Mail style),
 * centred dialog on desktop. The form state lives in the store so closing by
 * any route (overlay, Escape, Annuler) can keep the text as a draft.
 */
export function ComposeDialog() {
  const compose = useMail((s) => s.compose);
  const closeCompose = useMail((s) => s.closeCompose);

  return (
    <Dialog
      open={compose !== null}
      onOpenChange={(open) => {
        if (!open) closeCompose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex flex-col gap-0 overflow-hidden p-0 max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-h-[85vh] sm:max-w-2xl"
      >
        {compose && <ComposeForm key={compose.draftId ?? "new"} draft={compose} />}
      </DialogContent>
    </Dialog>
  );
}

function ComposeForm({ draft }: { draft: ComposeDraft }) {
  const threads = useMail((s) => s.threads);
  const update = useMail((s) => s.updateCompose);
  const closeCompose = useMail((s) => s.closeCompose);
  const sendMail = useMail((s) => s.sendMail);
  const deleteDraft = useMail((s) => s.deleteDraft);

  const contacts = useMemo(() => selectContacts(threads), [threads]);
  const [showCc, setShowCc] = useState(draft.cc.length > 0 || draft.bcc.length > 0);
  const space = SPACES.find((sp) => sp.id === draft.spaceId) ?? SPACES[0];
  const canSend = draft.to.length > 0;

  const onBodyKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSend) sendMail();
  };

  return (
    <>
      <header className="flex shrink-0 items-center gap-1 border-b border-border/60 px-2 pt-[calc(env(safe-area-inset-top)+0.25rem)] pb-2 sm:px-4 sm:py-3">
        <Button variant="ghost" size="sm" onClick={closeCompose} className="sm:hidden">
          Annuler
        </Button>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <DialogTitle className="truncate text-[15px] font-semibold sm:text-sm">
            {draft.draftId ? "Brouillon" : "Nouveau message"}
          </DialogTitle>
          <DialogDescription asChild>
            <label className="relative mt-0.5 inline-flex max-w-full cursor-pointer items-center gap-1 text-xs text-muted-foreground">
              <span>De :</span>
              <span className="truncate font-medium text-foreground">
                {space.emoji} {space.name} · {space.email}
              </span>
              <ChevronDown className="size-3 shrink-0" />
              <select
                value={draft.spaceId}
                onChange={(e) => update({ spaceId: e.target.value as ComposeDraft["spaceId"] })}
                aria-label="Expéditeur"
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                {SPACES.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.emoji} {sp.name} · {sp.email}
                  </option>
                ))}
              </select>
            </label>
          </DialogDescription>
        </div>
        <Button
          size="sm"
          onClick={sendMail}
          disabled={!canSend}
          className="rounded-full bg-[var(--space-accent)] px-4 text-white hover:bg-[var(--space-accent)]/90 sm:hidden"
        >
          Envoyer
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={closeCompose} aria-label="Fermer" className="hidden sm:inline-flex">
          <X />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <RecipientField
          label="À"
          value={draft.to}
          onChange={(to) => update({ to })}
          suggestions={contacts}
          autoFocus={draft.to.length === 0}
          trailing={
            !showCc && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCc(true);
                }}
                className="ml-auto shrink-0 text-xs text-muted-foreground hover:text-foreground"
              >
                Cc / Cci
              </button>
            )
          }
        />
        {showCc && (
          <>
            <RecipientField label="Cc" value={draft.cc} onChange={(cc) => update({ cc })} suggestions={contacts} />
            <RecipientField label="Cci" value={draft.bcc} onChange={(bcc) => update({ bcc })} suggestions={contacts} />
          </>
        )}
        <label className="flex h-11 shrink-0 items-center gap-3 border-b border-border/60 px-4 text-sm sm:px-5">
          <span className="w-10 shrink-0 text-muted-foreground">Objet</span>
          <input
            value={draft.subject}
            onChange={(e) => update({ subject: e.target.value })}
            placeholder="Objet du message"
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
          />
        </label>
        <textarea
          value={draft.body}
          onChange={(e) => update({ body: e.target.value })}
          onKeyDown={onBodyKeyDown}
          placeholder="Écris ton message…"
          className={cn(
            "min-h-56 flex-1 resize-none bg-transparent px-4 py-4 text-base leading-relaxed outline-none placeholder:text-muted-foreground sm:px-5 sm:text-sm",
            "max-sm:pb-[max(1rem,calc(env(safe-area-inset-bottom)-10px))]",
          )}
        />
      </div>

      <footer className="hidden shrink-0 items-center gap-2 border-t border-border/60 px-4 py-3 sm:flex">
        <Button onClick={sendMail} disabled={!canSend}>
          <Send /> Envoyer
        </Button>
        <span className="text-xs text-muted-foreground">⌘⏎</span>
        <Button variant="ghost" size="icon-sm" disabled aria-label="Pièces jointes (bientôt)">
          <Paperclip />
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {draft.draftId ? "Brouillon" : "Conservé en brouillon si tu fermes"}
        </span>
        {draft.draftId && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => deleteDraft(draft.draftId!)}
            aria-label="Supprimer le brouillon"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 />
          </Button>
        )}
      </footer>
    </>
  );
}
