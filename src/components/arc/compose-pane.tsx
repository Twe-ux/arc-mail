"use client";

import { Maximize2, X } from "lucide-react";

import { useMail } from "@/lib/store";
import type { ComposeDraft } from "@/lib/types";
import { ComposeCorps, HeaderButton } from "./compose-corps";

/**
 * **Le composeur dans le volet de droite.**
 *
 * Répondre se fait là où est le fil : ce qu'on cite reste à gauche, sous les
 * yeux, au lieu d'être recouvert par une fenêtre posée. C'est la seule chose
 * qui sépare ce contenant de l'autre — le formulaire, la barre du bas, la mise
 * en forme et le glisser-déposer sont **la même définition**
 * ([`compose-corps.tsx`](./compose-corps.tsx)).
 *
 * Deux portes de sortie, et aucune ne perd le message : « Détacher » rend le
 * volet et fait passer le brouillon dans la fenêtre — c'est la même mécanique
 * qui le promeut quand une pièce jointe réclame le volet —, « Fermer » le range
 * en brouillon.
 *
 * L'en-tête est celui de la fenêtre, à un bouton près : un volet ne s'agrandit
 * pas, il se tire par sa poignée.
 */
export function ComposePane({ draft }: { draft: ComposeDraft }) {
  const closeCompose = useMail((s) => s.closeCompose);
  const closeThird = useMail((s) => s.closeThird);
  const title = draft.subject.trim() || (draft.draftId ? "Brouillon" : "Nouveau message");

  return (
    <div
      role="dialog"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          closeCompose();
        }
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <header className="flex shrink-0 items-center gap-1 border-b border-black/[0.07] px-3.5 py-3 dark:border-white/10">
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</h2>
        <HeaderButton label="Détacher en fenêtre" onClick={closeThird}>
          <Maximize2 />
        </HeaderButton>
        <HeaderButton label="Fermer (brouillon conservé)" onClick={closeCompose}>
          <X />
        </HeaderButton>
      </header>

      <ComposeCorps draft={draft} />
    </div>
  );
}
