"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { formatFullDate } from "@/lib/format";
import { useSpace } from "@/lib/store";
import type { Contact, Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AttachmentRow } from "./attachment";
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
 * Sur bureau la carte grise reste : la colonne y est large, et c'est elle qui
 * sépare cinq messages d'un fil les uns des autres.
 */
export function MessageCard({
  message,
  onReplyTo,
}: {
  message: Message;
  onReplyTo: (to: Contact[]) => void;
}) {
  /* Les destinataires ne sont dépliés qu'à la demande : « à moi » suffit dans
     l'immense majorité des cas, et la liste complète est ce qu'on va vérifier
     une fois sur vingt. */
  const [deplie, setDeplie] = useState(false);
  const space = useSpace();
  const aQui = destinataires(message.to, space.identity.email);

  return (
    <div className="border-t border-black/[0.06] first-of-type:border-0 md:rounded-2xl md:border-0 md:bg-muted/50 md:p-4 dark:border-white/[0.08] md:dark:bg-white/[0.07]">
      <div className="flex items-center gap-3 px-5 pt-3.5 md:px-0 md:pt-0">
        {/* L'en-tête est aussi la façon de répondre à cette personne seule :
            viser le champ sur l'expéditeur est le geste qu'on attend d'un
            message dans un fil de cinq. */}
        <button
          type="button"
          onClick={() => onReplyTo([message.from])}
          aria-label={`Répondre à ${message.from.name} seulement`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ContactAvatar contact={message.from} className="size-10 md:size-9" />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[15px] font-semibold md:text-sm">{message.from.name}</span>
            <span className="block truncate text-[13px] text-muted-foreground">
              à {aQui} ·{" "}
              <time dateTime={message.date} suppressHydrationWarning>
                {formatFullDate(message.date)}
              </time>
            </span>
          </span>
        </button>
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

      {deplie && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-5 pt-3 text-[13px] md:hidden">
          <Ligne label="De" value={`${message.from.name} <${message.from.email}>`} />
          <Ligne label="À" value={message.to.map((c) => `${c.name} <${c.email}>`).join(", ")} />
          {message.cc && message.cc.length > 0 && (
            <Ligne label="Cc" value={message.cc.map((c) => `${c.name} <${c.email}>`).join(", ")} />
          )}
        </dl>
      )}

      <MessageBody
        message={message}
        className="block px-5 py-[18px] text-[15px] leading-[1.6] whitespace-pre-wrap md:mt-4 md:px-0 md:py-0 md:text-sm md:leading-relaxed"
      />
      {message.attachments && message.attachments.length > 0 && (
        <div className="px-5 pb-4 md:px-0 md:pb-0">
          <AttachmentRow attachments={message.attachments} />
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
