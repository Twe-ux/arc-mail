"use client";

import { ChevronDown, MailMinus, Reply } from "lucide-react";
import { useState } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatFullDate, formatShortDate } from "@/lib/format";
import { useMail, useSpace } from "@/lib/store";
import type { Contact, Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AttachmentRow } from "./attachment";
import { Desabonner } from "./desabonner";
import { ContactAvatar } from "./contact-avatar";
import { MessageBody } from "./message-body";

/**
 * Un message dans un fil.
 *
 * **À bord perdu sur téléphone.** Il y avait là trois cadres emboîtés — la
 * carte arrondie de l'écran, une carte grise par message, puis le bloc blanc
 * du HTML — et le texte finissait à quarante pixels des deux bords sur un
 * écran qui en fait trois cent quatre-vingt-dix. Seul l'en-tête de
 * l'expéditeur garde son retrait ; le corps prend toute la largeur.
 *
 * **Sur bureau c'est un bloc cliquable, pas une carte.** Rayon 10 et encart
 * comme les rangées de la liste, sans fond au repos : un fil est une suite de
 * messages, et cinq cartes grises empilées le faisaient lire comme cinq
 * documents. Le bloc se teinte au survol, et reste teinté quand son message est
 * ouvert dans le troisième volet.
 *
 * **Son en-tête détache le message** (troisième volet) ; c'est le bouton
 * « Répondre » du survol qui vise la réponse sur cette personne seule. Les deux
 * gestes étaient sur le même clic : viser la réponse était le seul, et on ne
 * pouvait plus lire un message à côté du fil.
 */
export function MessageCard({
  message,
  threadId,
  sujet,
  premier,
  onReplyTo,
}: {
  message: Message;
  /** Le fil auquel il appartient — le désabonnement écrit dessus. */
  threadId: string;
  /** L'objet du fil, passé au corps : il masque le préheader qui le répète. */
  sujet: string;
  /** Le premier message du fil : c'est lui qui porte l'objet, sur téléphone. */
  premier?: boolean;
  onReplyTo: (to: Contact[]) => void;
}) {
  /* Les destinataires ne sont dépliés qu'à la demande : « à moi » suffit dans
     l'immense majorité des cas, et la liste complète est ce qu'on va vérifier
     une fois sur vingt. */
  const [deplie, setDeplie] = useState(false);
  const space = useSpace();
  const bureau = useMediaQuery("(min-width: 768px)");
  const openThird = useMail((s) => s.openThird);
  const detache = useMail((s) => s.third?.kind === "message" && s.third.messageId === message.id);
  /* Un courrier HTML apporte **sa propre feuille blanche**. Le bloc ne peint
     donc pas la sienne derrière : trois cadres emboîtés — le volet sombre, le
     bloc teinté, la feuille — c'est le défaut qu'on avait déjà corrigé sur
     téléphone. Ici c'est l'en-tête seul qui porte la teinte, et c'est lui qui
     détache le message. */
  const estHtml = Boolean(message.html);
  const aQui = destinataires(message.to, space.identity.email);

  return (
    <div
      className={cn(
        "group/msg border-t border-black/[0.06] first-of-type:border-0 dark:border-white/[0.08]",
        "md:rounded-xl md:border-0 md:transition-colors",
        estHtml
          ? "md:px-2 md:py-2"
          : cn("md:px-4 md:py-3.5", detache ? "md:bg-foreground/[0.07]" : "md:hover:bg-foreground/[0.04]"),
      )}
    >
      {/* **L'en-tête du message est un bloc, et le corps commence après un
          filet.** Tout vivait sur la même dalle blanche — objet, expéditeur,
          message — sans rien pour dire où l'un finissait ; c'est ce que Mail
          d'iOS sépare d'un trait, et c'est ce qui manquait ici. Le filet est
          rendu par le bloc lui-même (`border-b`) et disparaît sur bureau, où
          l'en-tête est déjà une pastille teintée au survol. */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-black/[0.06] px-5 py-4 md:gap-2.5 md:border-0 md:py-0 dark:border-white/[0.08]",
          /* Le premier message porte l'objet juste en dessous : c'est le bloc
             entier — qui, puis quoi — que le filet doit clore, pas le nom seul. */
          premier && "max-md:border-b-0 max-md:pb-2.5",
          estHtml
            ? cn(
                "md:rounded-lg md:px-2 md:py-1.5 md:transition-colors",
                detache ? "md:bg-foreground/[0.07]" : "md:group-hover/msg:bg-foreground/[0.04]",
              )
            : "md:px-0",
        )}
      >
        {/* **Sur bureau** l'en-tête détache le message dans le troisième
            volet : lire un message à côté du fil est ce qu'on vient y faire, et
            la réponse ciblée garde son bouton juste à droite.

            **Sur téléphone il déplie les destinataires**, comme le chevron qui
            le termine. Viser la réponse d'ici y ouvrait le clavier : le clic
            fantôme d'iOS retombait sur cette rangée juste après l'ouverture du
            fil, et on arrivait sur un message déjà à moitié caché par les
            touches. Lire d'abord ; « Répondre » est en bas, et c'est lui qui
            lève le clavier. */}
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
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:gap-2.5"
        >
          <ContactAvatar contact={message.from} className="size-11 md:size-7" />
          <span className="min-w-0 flex-1 leading-tight">
            {/* **La date passe à droite du nom sur téléphone**, en court. Elle
                terminait la ligne « à moi · dimanche 6 septembre à 01:49 », qui
                prenait toute la largeur pour dire deux choses dont une seule se
                lit d'un coup d'œil ; la date longue reste, dépliée avec les
                destinataires. */}
            <span className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-[16px] font-semibold md:text-sm">{message.from.name}</span>
              <time
                dateTime={message.date}
                suppressHydrationWarning
                className="shrink-0 text-[13px] font-normal text-muted-foreground tabular-nums md:hidden"
              >
                {formatShortDate(message.date)}
              </time>
            </span>
            <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
              à {aQui}
              <span className="hidden md:inline">
                {" · "}
                <time dateTime={message.date} suppressHydrationWarning>
                  {formatFullDate(message.date)}
                </time>
              </span>
            </span>
          </span>
        </button>
        {/* Viser la réponse sur cette personne seule : au survol du bloc, là
            où l'en-tête l'avait avant de servir à le détacher. Toujours dans le
            DOM pour rester atteignable au clavier. */}
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
          className="relative grid size-9 shrink-0 place-items-center rounded-full bg-black/[0.05] text-muted-foreground after:absolute after:-inset-1 active:bg-black/10 md:hidden dark:bg-white/10 dark:active:bg-white/20"
        >
          <ChevronDown className={cn("size-4 transition-transform duration-200", deplie && "rotate-180")} />
        </button>
      </div>

      {/* **Qui, puis quoi.** L'objet vivait au-dessus de l'expéditeur, en 26 px :
          il se lisait comme le titre de la page et le nom comme sa légende,
          alors qu'on décide de lire un mail dans l'autre sens. Descendu sous le
          nom et ramené à 19 px semi-gras — c'est l'ordre de Mail d'iOS —, il
          rend 39 px au message et cesse de disputer la vedette au corps.
          Sur bureau il est déjà dans l'en-tête de la conversation. */}
      {premier && (
        <h1 className="border-b border-black/[0.06] px-5 pb-4 text-[19px] leading-[1.3] font-semibold tracking-[-0.01em] text-pretty md:hidden dark:border-white/[0.08]">
          {sujet}
        </h1>
      )}

      {deplie && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b border-black/[0.06] px-5 py-3.5 text-[13px] md:hidden dark:border-white/[0.08]">
          <Ligne label="De" value={`${message.from.name} <${message.from.email}>`} />
          <Ligne label="À" value={message.to.map((c) => `${c.name} <${c.email}>`).join(", ")} />
          {/* La date longue vit ici depuis qu'elle a quitté la ligne d'en-tête :
              elle n'est pas perdue, elle est rangée là où on la cherche. */}
          <Ligne label="Date" value={formatFullDate(message.date)} />
          {message.cc && message.cc.length > 0 && (
            <Ligne label="Cc" value={message.cc.map((c) => `${c.name} <${c.email}>`).join(", ")} />
          )}
        </dl>
      )}

      <MessageBody
        message={message}
        sujet={sujet}
        /* Sur bureau le texte s'aligne sous le nom, pas sous l'avatar : 28 px
           de tuile plus 10 de gouttière. */
        className={cn(
          /* Téléphone : le texte respire — 20 px de côté comme tout l'écran,
             22 de haut et de bas, et un interligne de 1,7. Il était à 18 px et
             1,6, collé sous l'expéditeur ; c'est le « trop compact » qu'on
             corrige. */
          "block px-5 py-[22px] text-[15px] leading-[1.7] whitespace-pre-wrap md:mt-2.5 md:px-0 md:py-0 md:text-sm md:leading-[1.65]",
          /* Le texte simple borne **sa propre longueur de ligne** : la colonne
             ne le fait plus, et 200 caractères par ligne ne se lisent pas. Le
             HTML, lui, garde toute la largeur — il porte la sienne. */
          estHtml ? "md:mt-2" : "md:ms-[38px] md:max-w-[68ch]",
        )}
      />
      {message.attachments && message.attachments.length > 0 && (
        <div className={cn("px-5 pb-4 md:px-0 md:pb-0", !estHtml && "md:ms-[38px]")}>
          <AttachmentRow attachments={message.attachments} />
        </div>
      )}
      {/* **Sous le message, jamais dedans.** Le bandeau des images distantes vit
          dans la feuille blanche du courrier parce qu'il parle de ce qui y est
          retenu ; le désabonnement, lui, parle de la **liste**, pas du message,
          et une infolettre en texte simple n'a pas de feuille blanche. Il prend
          donc l'encre de l'app, en fin de message, là où le lien minuscule
          qu'on cherchait se trouvait. */}
      {message.desabonnement && (
        <div className={cn("px-5 pb-4 md:px-0 md:pb-0", !estHtml && "md:ms-[38px]")}>
          <Desabonner message={message} threadId={threadId} icone={<MailMinus className="size-4 shrink-0" strokeWidth={1.75} />} />
        </div>
      )}
    </div>
  );
}

/**
 * « à moi », et pas « à Thierry Milone, Claire Dubois ».
 *
 * La ligne d'en-tête a un objet, un nom et une date longue à faire tenir sur
 * 390 px : nommer le lecteur au milieu de tout ça mange la date, qui est la
 * seule information qu'on vienne y chercher. Notre adresse devient donc
 * « moi », et les autres se comptent.
 */
function destinataires(to: Contact[], moi: string): string {
  if (to.length === 0) return "personne";
  const nous = to.some((c) => c.email.toLowerCase() === moi.toLowerCase());
  const autres = to.filter((c) => c.email.toLowerCase() !== moi.toLowerCase());
  if (!nous) return autres.map((c) => c.name).join(", ");
  if (autres.length === 0) return "moi";
  return `moi et ${autres.length} autre${autres.length > 1 ? "s" : ""}`;
}

function Ligne({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </>
  );
}
