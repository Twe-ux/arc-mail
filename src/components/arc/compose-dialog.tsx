"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { useMail } from "@/lib/store";
import { ComposeSheet } from "./compose-sheet";
import { ComposeWindow } from "./compose-window";

/**
 * Deux habillages autour d'un même formulaire.
 *
 * Sur téléphone, une carte qui flotte à distance des bords
 * ([`compose-sheet.tsx`](./compose-sheet.tsx)) ; sur bureau, une fenêtre de
 * 760 × 560 posée sur la boîte ([`compose-window.tsx`](./compose-window.tsx)).
 * Les lignes du message, elles, ne sont écrites qu'une fois
 * ([`compose-fields.tsx`](./compose-fields.tsx)).
 *
 * L'état du formulaire vit dans le store : fermer par n'importe quel chemin
 * garde un brouillon.
 */
export function ComposeDialog() {
  const compose = useMail((s) => s.compose);
  const desktop = useMediaQuery("(min-width: 640px)");
  if (desktop)
    return compose ? (
      <ComposeWindow key={compose.draftId ?? "new"} draft={compose} />
    ) : null;
  return <ComposeSheet draft={compose} />;
}
