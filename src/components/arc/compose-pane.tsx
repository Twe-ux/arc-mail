"use client";

import { X } from "lucide-react";

import { enveloppe } from "@/lib/fil";
import { formatFullDate } from "@/lib/format";
import { useMail } from "@/lib/store";
import type { ComposeDraft } from "@/lib/types";
import { ComposeCorps, HeaderButton } from "./compose-corps";
import { ContactAvatar } from "./contact-avatar";
import { MessageBody } from "./message-body";

/**
 * **Le composeur, posé sur la conversation.**
 *
 * Il a été une fenêtre centrée de 760 × 560, puis une colonne du volet. Les
 * deux avaient le même défaut, et il vient du même endroit : la fenêtre
 * *recouvrait* ce à quoi on répond, la colonne *réagençait* toute la boîte —
 * la barre passait en rail, la liste s'effaçait sous 1400 px. Un volet qui se
 * pose ne fait ni l'un ni l'autre : rien ne bouge derrière lui, et la
 * conversation reste visible sur sa gauche.
 *
 * **Le message auquel on répond est en tête, en lecture.** C'est ce qui permet
 * à la citation de quitter le champ : on écrit dans du vide, avec sous les yeux
 * ce qu'on est en train de commenter, et les chevrons ne s'empilent nulle part.
 * Elle part quand même — `sendMail` la rebâtit depuis `citeMessage`.
 *
 * Le formulaire, lui, est **la même définition** que sur la feuille du
 * téléphone ([`compose-corps.tsx`](./compose-corps.tsx)) : ce fichier n'est
 * qu'un châssis.
 */
export function ComposePane({ draft }: { draft: ComposeDraft }) {
  const closeCompose = useMail((s) => s.closeCompose);
  const dark = useMail((s) => s.dark);
  const cite = useMail((s) => {
    if (!draft.replyTo || !draft.citeMessage) return null;
    const t = s.threads.find((x) => x.id === draft.replyTo);
    return t?.messages.find((m) => m.id === draft.citeMessage) ?? null;
  });
  const title = draft.subject.trim() || (draft.draftId ? "Brouillon" : "Nouveau message");

  return (
    <>
      {/* Le voile assombrit la conversation sans la cacher, et **ne ferme
          pas** : on ne perd pas un message en cours parce que le pointeur a
          glissé (règle des cartes flottantes). */}
      <div aria-hidden className="absolute inset-0 z-40 hidden bg-black/25 animate-in fade-in-0 md:block" />
      <section
        role="dialog"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            closeCompose();
          }
        }}
        className={[
          "fenetre-carte absolute inset-y-0 right-0 z-50 hidden w-[min(620px,100%)] flex-col overflow-hidden",
          "rounded-l-xl bg-background text-foreground shadow-[-24px_0_60px_-20px_rgb(0_0_0/0.45)] md:flex",
          /* La recette d'entrée des cartes, dans le sens du volet. */
          "animate-in duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] slide-in-from-right",
        ].join(" ")}
      >
        <header className="flex shrink-0 items-center gap-1 border-b border-black/[0.07] px-3.5 py-3 dark:border-white/10">
          <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</h2>
          <HeaderButton label="Fermer (brouillon conservé)" onClick={closeCompose}>
            <X />
          </HeaderButton>
        </header>

        {cite && (
          /* **Ce à quoi on répond, pas ce qu'on recopie.** En lecture, borné en
             hauteur et défilant : un message de trois écrans ne doit pas
             repousser le champ hors de la vue. */
          <div className="max-h-[38%] shrink-0 overflow-y-auto border-b border-black/[0.07] px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <ContactAvatar contact={cite.from} className="size-7" />
              <span className="min-w-0 truncate text-sm font-semibold">{cite.from.name}</span>
              <time
                dateTime={cite.date}
                suppressHydrationWarning
                className="shrink-0 text-xs text-muted-foreground tabular-nums"
              >
                {formatFullDate(cite.date)}
              </time>
            </div>
            <MessageBody
              message={cite}
              dark={dark}
              /* La même règle qu'ailleurs : un courrier qui a ses couleurs
                 garde sa feuille, sinon il prend l'encre de l'app. Le forcer en
                 transparent rendrait invisible un message qui déclare son noir
                 sur un fond sombre. */
              forme={enveloppe(cite.html)}
              className="mt-1.5 ms-[38px] block max-w-[68ch] text-sm leading-[1.6] whitespace-pre-wrap text-muted-foreground"
            />
          </div>
        )}

        <ComposeCorps draft={draft} />
      </section>
    </>
  );
}
