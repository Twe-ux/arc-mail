"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { useMail } from "@/lib/store";
import { ComposeSheet } from "./compose-sheet";
import { ComposePane } from "./compose-pane";

/**
 * Deux habillages autour d'un même formulaire.
 *
 * Sur téléphone, une feuille plein écran ([`compose-sheet.tsx`](./compose-sheet.tsx)).
 * Sur bureau, **un volet qui se pose sur la conversation**
 * ([`compose-pane.tsx`](./compose-pane.tsx)) — un seul contenant, pour une
 * réponse comme pour un message neuf : la fenêtre centrée de 760 × 560
 * recouvrait ce à quoi on répond, et la colonne réagençait toute la boîte.
 * Le formulaire, lui, n'est écrit qu'une fois
 * ([`compose-corps.tsx`](./compose-corps.tsx)).
 *
 * L'état du formulaire vit dans le store : fermer par n'importe quel chemin
 * garde un brouillon.
 */
export function ComposeDialog() {
  const compose = useMail((s) => s.compose);
  const desktop = useMediaQuery("(min-width: 640px)");
  if (desktop) return compose ? <ComposePane key={compose.draftId ?? "new"} draft={compose} /> : null;
  return <ComposeSheet draft={compose} />;
}
