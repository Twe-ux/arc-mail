"use client";

import { ChevronDown, MailMinus, Reply } from "lucide-react";
import { useState } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatFullDate, formatShortDate } from "@/lib/format";
import { useMail } from "@/lib/store";
import type { Contact, Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AttachmentRow } from "./attachment";
import { ContactAvatar } from "./contact-avatar";
import { Desabonner } from "./desabonner";
import { MessageBody } from "./message-body";

/**
 * Un message **en discussion** : une bulle, d'un côté ou de l'autre.
 *
 * C'est la moitié visible du mode `conversation`. L'autre moitié est ce qui
 * n'y passe pas : un courrier qui apporte sa mise en page — une infolettre,
 * une facture — garde sa feuille blanche et toute la largeur
 * (`enveloppe`, et c'est `MessageCard` qui le rend). Une bulle sert à lire un
 * échange, pas à écraser un document dans 76 % de la colonne.
 *
 * **Ce n'est pas un rangement.** L'objet, le dossier et le fil restent ce
 * qu'ils sont ; seule la peinture change. C'est là toute la différence avec
 * `arc-messenger`, qui regroupait par adresse et fondait deux échanges sans
 * rapport → [vue par correspondant](../../../docs/features/vue-correspondant.md).
 *
 * **Trois choses portent la lecture**, et il fallait les trois : le côté (nous
 * à droite), la teinte (l'accent de l'espace à 22 % contre une surface neutre),
 * et le groupement — une tête par grappe, pas une par message. Deux suffisaient
 * à distinguer ; la troisième est ce qui fait qu'on n'a plus à lire pour
 * savoir.
 */
export function MessageBubble({
  message,
  threadId,
  mien,
  tete,
  queue,
  forme,
  dark,
  onReplyTo,
}: {
  message: Message;
  threadId: string;
  /** Nous l'avons écrit : il va à droite. */
  mien: boolean;
  /** Premier de sa grappe : c'est lui qui porte l'en-tête. */
  tete: boolean;
  /** Dernier de sa grappe : c'est lui qui porte le coin coupé. */
  queue: boolean;
  /**
   * `bulle` ou `feuille` (`enveloppe`) — jamais `document`, qui ne passe pas
   * par ici. La géométrie est la même dans les deux cas ; seule la peau change.
   */
  forme: "bulle" | "feuille";
  dark: boolean;
  onReplyTo: (to: Contact[]) => void;
}) {
  const [deplie, setDeplie] = useState(false);
  const bureau = useMediaQuery("(min-width: 768px)");
  const openThird = useMail((s) => s.openThird);
  const detache = useMail((s) => s.third?.kind === "message" && s.third.messageId === message.id);

  return (
    <div
      className={cn(
        "group/msg flex flex-col px-4 md:px-2",
        /* Une grappe respire une fois, pas à chaque réplique : 2 px entre deux
           messages du même auteur, 14 quand la parole change. */
        tete ? "mt-3.5 first:mt-0" : "mt-0.5",
      )}
    >
      {tete && (
        <button
          type="button"
          onClick={() => (bureau ? openThird({ kind: "message", messageId: message.id }) : setDeplie((v) => !v))}
          aria-expanded={bureau ? undefined : deplie}
          aria-pressed={bureau ? detache : undefined}
          aria-label={
            bureau
              ? `Ouvrir le message de ${message.from.name} dans le volet`
              : deplie
                ? "Masquer les destinataires"
                : "Voir les destinataires"
          }
          className={cn(
            /* **Une ligne, pas un bloc.** L'en-tête d'un message pesait deux
               lignes et un avatar de 44 px pour dire un nom et une date ; en
               discussion il en reste une, de 22 px de haut, et elle ne revient
               qu'au changement de voix. */
            "mb-1 flex max-w-full items-center gap-1.5 rounded-full px-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            mien ? "flex-row-reverse self-end" : "self-start",
          )}
        >
          <ContactAvatar contact={message.from} className="size-[22px] text-[10px]" />
          <span className="min-w-0 truncate text-[13px] font-semibold">{mien ? "Vous" : message.from.name}</span>
          <time
            dateTime={message.date}
            suppressHydrationWarning
            className="shrink-0 text-[12px] text-muted-foreground tabular-nums"
          >
            {formatShortDate(message.date)}
          </time>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 md:hidden",
              deplie && "rotate-180",
            )}
          />
        </button>
      )}

      {deplie && (
        <dl className="mb-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl bg-foreground/[0.04] px-3 py-2.5 text-[13px] md:hidden">
          <Ligne label="De" value={`${message.from.name} <${message.from.email}>`} />
          <Ligne label="À" value={message.to.map((c) => `${c.name} <${c.email}>`).join(", ")} />
          <Ligne label="Date" value={formatFullDate(message.date)} />
          {message.cc && message.cc.length > 0 && (
            <Ligne label="Cc" value={message.cc.map((c) => `${c.name} <${c.email}>`).join(", ")} />
          )}
        </dl>
      )}

      {/* **La rangée prend toute la colonne**, et c'est le `justify` du sens de
          lecture qui range la bulle à droite ou à gauche — `flex-row-reverse`
          fait partir le premier enfant du bord droit. Avec un `items-end` sur la
          colonne, la rangée se dimensionnait sur son contenu et les 76 % de la
          bulle se résolvaient contre une largeur qui dépendait d'eux : une
          phrase de six mots se repliait dans 215 px au lieu des 460 offerts. */}
      <div className={cn("flex w-full items-end gap-1", mien && "flex-row-reverse")}>
        <div
          className={cn(
            /* 76 % : au-delà, une bulle touche les deux bords et le côté cesse
               de se voir — c'est le côté qui dit qui parle. Sur bureau une
               seconde borne, en `ch`, pour qu'une bulle ne redevienne pas la
               dalle qu'on vient de quitter — mais **68ch, pas 54** : à 54, une
               phrase de six mots se repliait sur deux lignes alors qu'elle
               tenait (mesuré : 515 px demandés, 410 accordés). 68ch est la
               mesure que le projet donne déjà au texte simple, pas un nombre
               de plus. */
            "max-w-[76%] min-w-0 overflow-hidden rounded-[18px] px-3.5 py-2.5 md:max-w-[min(76%,68ch)]",
            /* **La feuille blanche est une peau, pas une autre forme.** Un
               message qui a écrit ses couleurs les a écrites pour du blanc : le
               rouge d'une signature sur une teinte à 22 %, ou son noir sur un
               fond sombre, ne se lit plus. Il garde donc sa feuille — mais le
               même rayon, la même largeur, le même côté et le même coin de
               queue, pour rester le même objet. Un filet, parce qu'un blanc
               posé sur un fond sombre sans tranche flotte. */
            /* **Une feuille posée, pas un trou.** Sur la carte blanche du thème
               clair, un blanc sur du blanc à un filet de 8 % ne se voyait plus
               du tout : la bulle avait disparu (mesuré à la capture). Un bord
               plus franc **et** une ombre courte la posent *sur* la carte ; en
               sombre le blanc se détache tout seul et un filet clair suffit. */
            forme === "feuille"
              ? "bg-white text-[#111] shadow-[0_1px_3px_rgb(0_0_0/0.07),0_0_0_1px_rgb(0_0_0/0.11)] dark:shadow-[0_0_0_1px_rgb(255_255_255/0.14)]"
              : mien
                ? "bg-[color-mix(in_oklch,var(--space-accent)_22%,transparent)]"
                : "bg-foreground/[0.06] dark:bg-foreground/[0.09]",
            /* Le coin coupé du côté de qui parle, sur la **dernière** bulle de
               la grappe : c'est la grammaire d'iMessage, et le poser sur toutes
               ferait une pile de pastilles au lieu d'un tour de parole. */
            queue && (mien ? "rounded-br-[6px]" : "rounded-bl-[6px]"),
          )}
        >
          <MessageBody
            message={message}
            forme={forme}
            dark={dark}
            className="block text-[15px] leading-[1.45] whitespace-pre-wrap md:text-sm md:leading-[1.5]"
          />
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2">
              <AttachmentRow attachments={message.attachments} />
            </div>
          )}
          {message.desabonnement && (
            <div className="mt-2">
              <Desabonner
                message={message}
                threadId={threadId}
                icone={<MailMinus className="size-4 shrink-0" strokeWidth={1.75} />}
              />
            </div>
          )}
        </div>
        {/* Viser la réponse sur cette personne seule, à côté de la bulle et non
            dedans : une cible dans un bloc de texte se prend au lieu du texte. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onReplyTo([message.from])}
              aria-label={`Répondre à ${message.from.name} seulement`}
              className="hidden size-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/msg:opacity-100 md:grid"
            >
              <Reply className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side={mien ? "left" : "right"}>Répondre à {message.from.name}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function Ligne({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </>
  );
}
