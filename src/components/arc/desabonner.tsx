"use client";

import type { ReactNode } from "react";

import { useMail } from "@/lib/store";
import type { Message } from "@/lib/types";

/**
 * « Se désabonner », au bas d'une infolettre.
 *
 * Le geste existait déjà dans le message : un lien de six pixels, tout en bas,
 * après trois écrans de promotions. `List-Unsubscribe` le dit dans l'en-tête —
 * il suffisait de le lire.
 *
 * **Deux chemins, et ils ne se valent pas.** Par `mailto:` c'est un message que
 * notre propre SMTP envoie : on ne quitte pas l'app, et l'expéditeur n'apprend
 * rien de plus que ce qu'il a demandé. Par lien, il faut ouvrir sa page — le
 * bouton le dit alors (« la page de l'expéditeur ») plutôt que de faire croire
 * au même geste. Le lien porte `noreferrer` : la page n'a pas à savoir d'où on
 * vient.
 *
 * Une rangée discrète, pas un bandeau d'alerte : se désabonner est une chose
 * qu'on décide, jamais une chose dont l'app avertit.
 */
export function Desabonner({
  message,
  threadId,
  icone,
}: {
  message: Message;
  threadId: string;
  icone: ReactNode;
}) {
  const desabonner = useMail((s) => s.desabonner);
  const d = message.desabonnement;
  if (!d) return null;

  /* `items-start` et l'icône décalée d'un cheveu : la rangée a deux lignes, et
     une icône centrée sur les deux flotte au milieu de nulle part. */
  const boite =
    "flex w-full items-start gap-2 rounded-lg bg-black/[0.04] px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-black/[0.07] active:bg-black/[0.09] dark:bg-white/[0.06] dark:hover:bg-white/[0.09] dark:active:bg-white/[0.12] [&>svg]:mt-[3px]";

  if (d.mailto) {
    return (
      <button type="button" onClick={() => desabonner(threadId, message.id)} className={boite}>
        {icone}
        <span className="min-w-0 flex-1 text-left">
          Se désabonner de cette liste
          <span className="block text-[11px] opacity-70">
            Un message part vers {d.mailto} — rien ne quitte l&apos;app.
          </span>
        </span>
      </button>
    );
  }

  return (
    <a href={d.url} target="_blank" rel="noopener noreferrer" className={boite}>
      {icone}
      <span className="min-w-0 flex-1">
        Se désabonner de cette liste
        <span className="block text-[11px] opacity-70">Ouvre la page de l&apos;expéditeur.</span>
      </span>
    </a>
  );
}
