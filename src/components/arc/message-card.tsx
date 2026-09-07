"use client";

import { ChevronDown, MailMinus, Reply } from "lucide-react";
import { useState } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatFullDate, formatShortDate } from "@/lib/format";
import { enveloppe } from "@/lib/fil";
import { useMail } from "@/lib/store";
import type { Contact, Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AttachmentRow } from "./attachment";
import { ContactAvatar } from "./contact-avatar";
import { Desabonner } from "./desabonner";
import { MessageBody } from "./message-body";

/**
 * Un message dans un fil — **à plat**.
 *
 * Les bulles ont vécu une journée. Elles réglaient une vraie question — « on ne
 * sait pas qui a répondu à quoi » —, mais elles la réglaient **deux fois** : la
 * cause était la citation dépliée, qui recopiait tout l'échange dans chaque
 * message. Une fois la citation repliée (`couperCitation`), un fil plat avec un
 * nom par message se lit très bien, et il se lit comme du **courrier** — ce que
 * ce projet est. « Ça fait chip », et c'était juste.
 *
 * Ce qui reste de la refonte, parce que c'est ce qui marchait :
 *
 * - **une ligne d'en-tête, pas un bloc** : avatar, nom, heure. Plus de « à moi »,
 *   qui prenait une ligne entière pour dire ce qu'on sait déjà ;
 * - **une tête par grappe** : deux messages de suite du même auteur n'ont qu'un
 *   en-tête, et c'est la respiration qui les sépare — plus de filet entre les
 *   messages, il découpait le fil en tranches ;
 * - **« Vous »** à la place de notre nom ;
 * - et **un filet d'accent** dans la marge de nos messages : le seul signal de
 *   direction qui reste, deux pixels au lieu d'un côté et d'un fond.
 *
 * Le corps s'aligne **sous le nom**, jamais sous l'avatar. Seul un courrier qui
 * apporte sa mise en page (`enveloppe` → `document`) reprend toute la largeur :
 * une infolettre n'a pas à payer la gouttière d'une conversation.
 */
export function MessageCard({
  message,
  threadId,
  sujet,
  mien,
  tete,
  onReplyTo,
}: {
  message: Message;
  /** Le fil auquel il appartient — le désabonnement écrit dessus. */
  threadId: string;
  /** L'objet du fil, passé au corps : il masque le préheader qui le répète. */
  sujet: string;
  /** Nous l'avons écrit : il porte le filet d'accent et s'appelle « Vous ». */
  mien?: boolean;
  /** Premier de sa grappe : c'est lui qui porte l'en-tête. */
  tete?: boolean;
  onReplyTo: (to: Contact[]) => void;
}) {
  /* Les destinataires ne sont dépliés qu'à la demande : la liste complète est
     ce qu'on va vérifier une fois sur vingt. */
  const [deplie, setDeplie] = useState(false);
  const dark = useMail((s) => s.dark);
  const bureau = useMediaQuery("(min-width: 768px)");
  const openThird = useMail((s) => s.openThird);
  const detache = useMail((s) => s.third?.kind === "message" && s.third.messageId === message.id);

  const forme = enveloppe(message.html);
  /* **Deux surfaces, pas trois.** Un message sans couleurs à lui prend l'encre
     de l'app, dans la gouttière. Tout le reste garde la feuille blanche du
     courrier, parce que ces couleurs ont été écrites pour du blanc ; et un
     document la garde **en pleine largeur**. */
  const feuille = forme !== "bulle";
  const pleineLargeur = forme === "document";

  return (
    <div
      className={cn(
        "group/msg relative rounded-xl px-4 md:px-3",
        /* **Le survol tient le message entier**, en-tête et corps : c'est lui
           l'objet qu'on désigne, et c'est ce qui sépare deux messages dans un
           fil qui n'a plus de filet entre eux. La même encre que les rangées de
           la liste — un fil et une liste sont la même matière.
           Bureau seulement : sur téléphone il n'y a pas de pointeur, et le
           retour à l'appui appartient aux cibles, pas à un bloc de lecture. */
        "md:transition-colors md:hover:bg-foreground/[0.04]",
        /* 24 px quand la parole change, 6 entre deux messages du même auteur :
           c'est la respiration qui sépare, plus un filet. */
        tete ? "mt-6 first:mt-0" : "mt-1.5",
        /* Le filet d'accent, dans la marge de gauche et sur toute la hauteur du
           message : deux pixels suffisent à dire « c'est nous », là où un côté
           et un fond en faisaient une messagerie instantanée. */
        mien &&
          "before:absolute before:inset-y-0 before:left-2 before:w-[2px] before:rounded-full before:bg-[var(--space-accent)] before:opacity-60 md:before:left-1.5",
      )}
    >
      {tete && (
        <div className="flex items-center gap-3 md:gap-2.5">
          {/* **Sur bureau** l'en-tête détache le message dans le troisième
              volet — lire un message à côté du fil est ce qu'on vient y faire.
              **Sur téléphone il déplie les destinataires**, comme le chevron
              qui le termine : viser la réponse d'ici y ouvrait le clavier, le
              clic fantôme d'iOS retombant sur la vue qui venait de s'ouvrir. */}
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
            className="flex min-w-0 flex-1 items-baseline gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:gap-2.5"
          >
            <ContactAvatar contact={message.from} className="size-8 self-center md:size-7" />
            <span className="min-w-0 truncate text-[15px] font-semibold md:text-sm">
              {mien ? "Vous" : message.from.name}
            </span>
            <time
              dateTime={message.date}
              suppressHydrationWarning
              className="shrink-0 text-[13px] text-muted-foreground tabular-nums md:text-xs"
            >
              {formatShortDate(message.date)}
            </time>
          </button>
          {/* Viser la réponse sur cette personne seule. Toujours dans le DOM
              pour rester atteignable au clavier. */}
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
            <TooltipContent side="bottom">Répondre à {message.from.name}</TooltipContent>
          </Tooltip>
          <button
            type="button"
            onClick={() => setDeplie((v) => !v)}
            aria-expanded={deplie}
            aria-label={deplie ? "Masquer les destinataires" : "Voir les destinataires"}
            className="relative grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground after:absolute after:-inset-1 active:bg-black/10 md:hidden dark:active:bg-white/20"
          >
            <ChevronDown className={cn("size-4 transition-transform duration-200", deplie && "rotate-180")} />
          </button>
        </div>
      )}

      {deplie && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl bg-foreground/[0.04] px-3 py-2.5 text-[13px] md:hidden">
          <Ligne label="De" value={`${message.from.name} <${message.from.email}>`} />
          <Ligne label="À" value={message.to.map((c) => `${c.name} <${c.email}>`).join(", ")} />
          {/* La date longue vit ici : elle n'est pas perdue, elle est rangée là
              où on la cherche. */}
          <Ligne label="Date" value={formatFullDate(message.date)} />
          {message.cc && message.cc.length > 0 && (
            <Ligne label="Cc" value={message.cc.map((c) => `${c.name} <${c.email}>`).join(", ")} />
          )}
        </dl>
      )}

      <div className={cn(!pleineLargeur && "ms-[44px] md:ms-[38px]")}>
        <MessageBody
          message={message}
          sujet={sujet}
          dark={dark}
          /* `bulle` rend le cadre transparent et lui donne l'encre de l'app ;
             sans forme, il garde la feuille blanche du courrier. */
          forme={feuille ? undefined : "bulle"}
          className={cn(
            "mt-1.5 block text-[15px] leading-[1.65] whitespace-pre-wrap md:text-sm md:leading-[1.6]",
            /* Le texte simple borne **sa propre longueur de ligne** : la colonne
               ne le fait plus, et 200 caractères par ligne ne se lisent pas. */
            !feuille && "max-w-[68ch]",
          )}
        />
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2.5">
            <AttachmentRow attachments={message.attachments} />
          </div>
        )}
        {/* **Sous le message, jamais dedans.** Le désabonnement parle de la
            liste, pas du message, et une infolettre en texte simple n'a pas de
            feuille blanche où le poser. */}
        {message.desabonnement && (
          <div className="mt-2.5">
            <Desabonner
              message={message}
              threadId={threadId}
              icone={<MailMinus className="size-4 shrink-0" strokeWidth={1.75} />}
            />
          </div>
        )}
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
