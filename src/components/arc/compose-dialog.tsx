"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { useMail } from "@/lib/store";
import { ComposeSheet } from "./compose-sheet";
import { ComposeWindow } from "./compose-window";

/**
 * Deux habillages autour d'un même formulaire.
 *
 * Sur téléphone, une feuille plein écran ([`compose-sheet.tsx`](./compose-sheet.tsx)).
 * Sur bureau, **deux, et c'est le geste qui choisit** : répondre dans un fil
 * ouvre le volet de droite ([`compose-pane.tsx`](./compose-pane.tsx)), où ce
 * qu'on cite reste visible ; « Nouveau message », qui n'a aucun contexte,
 * garde la fenêtre de 760 × 560 posée sur la boîte
 * ([`compose-window.tsx`](./compose-window.tsx)). Le formulaire, lui, n'est
 * écrit qu'une fois ([`compose-corps.tsx`](./compose-corps.tsx)).
 *
 * L'état du formulaire vit dans le store : fermer par n'importe quel chemin
 * garde un brouillon.
 */
export function ComposeDialog() {
  const compose = useMail((s) => s.compose);
  const dansLeVolet = useMail((s) => s.third?.kind === "compose");
  const desktop = useMediaQuery("(min-width: 640px)");
  if (desktop) {
    /* **`third.kind` dit où le composeur vit, et rien d'autre.** Le volet le
       rend lui-même (`ThirdPane`) ; le lui laisser ici en ferait deux à
       l'écran. Et quand le volet lui est repris — une pièce jointe, ou sa
       fermeture —, la fenêtre reprend la main d'elle-même : c'est toute la
       promotion, sans état de plus. */
    if (dansLeVolet) return null;
    return compose ? <ComposeWindow key={compose.draftId ?? "new"} draft={compose} /> : null;
  }
  return <ComposeSheet draft={compose} />;
}
