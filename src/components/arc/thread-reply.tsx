"use client";

import { ArrowUp, Reply } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMail } from "@/lib/store";
import type { Contact, Thread } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Qui va recevoir la réponse, au-dessus du champ.
 *
 * C'est le seul endroit qui le dit avant l'envoi : il montre les noms et le
 * chemin du retour vers tout le monde — restreindre est un appui, élargir doit
 * en être un aussi.
 */
export function ReplyTargets({
  to,
  everyone,
  onReplyAll,
  className,
}: {
  to: Contact[];
  everyone: Contact[];
  onReplyAll: () => void;
  className?: string;
}) {
  const narrowed = to.length < everyone.length;
  /* Une conversation à deux n'a pas besoin de liste : le texte d'invite nomme
     déjà la personne, et une puce serait l'étiquette d'une étiquette. */
  if (everyone.length <= 1) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 text-xs", className)}>
      <span className="text-muted-foreground">À :</span>
      {to.map((c) => (
        <span
          key={c.email}
          title={c.email}
          className="rounded-full bg-[color-mix(in_oklch,var(--space-accent)_14%,transparent)] px-2 py-0.5 font-medium"
        >
          {c.name}
        </span>
      ))}
      {narrowed && (
        <button
          type="button"
          onClick={onReplyAll}
          className="relative rounded px-1 py-0.5 font-medium text-[var(--space-ink)] after:absolute after:-inset-1.5 active:opacity-60"
        >
          Répondre à tous
        </button>
      )}
    </div>
  );
}

/** La réponse du bureau, dans le flux à la fin du fil. */
export function ReplyBox({
  thread,
  to,
  everyone,
  onReplyAll,
  focusTick,
  className,
}: {
  thread: Thread;
  to: Contact[];
  everyone: Contact[];
  onReplyAll: () => void;
  focusTick: number;
  className?: string;
}) {
  const [body, setBody] = useState("");
  const reply = useMail((s) => s.reply);
  const field = useRef<HTMLTextAreaElement>(null);

  /* Viser la réponse, c'est aussi demander à l'écrire : le champ prend le
     focus et vient à l'écran. Pas au premier rendu, où rien n'était visé. */
  useEffect(() => {
    if (focusTick === 0) return;
    field.current?.focus();
    field.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusTick]);

  const send = () => {
    const text = body.trim();
    if (!text) return;
    setBody("");
    /* La boîte se vide tout de suite ; un refus du fournisseur y remet le texte. */
    void reply(thread.id, text, to).then((ok) => {
      if (!ok) setBody((current) => current || text);
    });
  };

  const ecrit = body.trim().length > 0;

  return (
    <div className={cn(className)}>
      <ReplyTargets to={to} everyone={everyone} onReplyAll={onReplyAll} className="px-1 pb-1.5" />
      {/* 44 px au repos, et il pousse avec le texte (`field-sizing`) jusqu'à ce
          qu'il prenne un tiers du volet : posé en bas, un champ de cinq lignes
          vide aurait mangé la conversation qu'on lit. */}
      <Textarea
        ref={field}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send();
        }}
        placeholder={replyPlaceholder(to)}
        className="max-h-48 min-h-11 resize-none rounded-xl border-0 bg-muted px-3 py-2.5 shadow-none field-sizing-content focus-visible:ring-0 dark:bg-muted"
      />
      {/* Le pied n'arrive qu'avec le texte : rien à envoyer, rien à dire. */}
      {ecrit && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">⌘⏎ pour envoyer</span>
          <Button size="sm" onClick={send}>
            <Reply /> Répondre
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * La barre de réponse du téléphone, **à la demande**.
 *
 * Elle n'est plus là en permanence : un champ vide occupait le bas de chaque
 * message lu, c'est-à-dire l'endroit où le pouce se pose, pour une intention
 * qu'on n'a pas toujours. « Répondre » la fait venir, « Annuler » la renvoie,
 * et le reste du temps la pill d'actions occupe cette place.
 *
 * Elle prend le focus en arrivant : demander à répondre et devoir viser le
 * champ ensuite serait deux gestes pour une intention.
 */
export function MobileReply({
  thread,
  to,
  everyone,
  onReplyAll,
  onClose,
}: {
  thread: Thread;
  to: Contact[];
  everyone: Contact[];
  onReplyAll: () => void;
  onClose: () => void;
}) {
  const [body, setBody] = useState("");
  const reply = useMail((s) => s.reply);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    field.current?.focus();
  }, []);

  const send = () => {
    const text = body.trim();
    if (!text) return;
    setBody("");
    void reply(thread.id, text, to).then((ok) => {
      if (!ok) setBody((current) => current || text);
      else onClose();
    });
  };

  return (
    /* Mêmes marges que la pill qu'elle remplace (14 px, 16 px du bas) : elle
       prend sa place, elle ne doit pas décaler l'écran en arrivant. */
    <div className="shrink-0 border-t border-black/[0.08] bg-card px-[14px] pt-2 pb-[max(16px,calc(env(safe-area-inset-bottom)-18px))] md:hidden dark:border-white/12">
      <div className="flex items-center gap-2 pb-1.5">
        <div className="min-w-0 flex-1">
          <ReplyTargets to={to} everyone={everyone} onReplyAll={onReplyAll} className="px-1" />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="relative shrink-0 rounded px-1 py-0.5 text-[13px] font-medium text-[var(--space-ink)] after:absolute after:-inset-2 active:opacity-60"
        >
          Annuler
        </button>
      </div>
      <div className="flex items-end gap-2 rounded-3xl bg-muted/60 py-1.5 pr-1.5 pl-4 dark:bg-white/[0.07]">
        <textarea
          ref={field}
          rows={1}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={replyPlaceholder(to)}
          className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-base leading-5 outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={send}
          disabled={!body.trim()}
          aria-label="Envoyer"
          /* 40 px dessinés dans la bulle, 44 au doigt. */
          className="relative flex size-10 shrink-0 items-center justify-center rounded-full text-white transition-[opacity,transform] ease-out after:absolute after:-inset-0.5 active:scale-95 active:duration-0 disabled:opacity-30 [background:var(--space-gradient)]"
        >
          <ArrowUp className="size-5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

/**
 * Le champ dit qui recevra vraiment la réponse — les puces au-dessus sont la
 * vérité complète, ceci en est la forme courte.
 */
export function replyPlaceholder(to: Contact[]): string {
  const names = to.map((c) => c.name.split(" ")[0]);
  const shown = names.length > 3 ? `${names.slice(0, 3).join(", ")}…` : names.join(", ");
  return `Répondre à ${shown}…`;
}
