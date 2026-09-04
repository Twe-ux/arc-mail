"use client";

import { useState } from "react";

import { useMail } from "@/lib/store";
import type { Space } from "@/lib/types";

/**
 * Pose les espaces venus du serveur, **avant** que la boîte ne se rende.
 *
 * Dans l'initialiseur d'un `useState`, qui ne s'exécute qu'une fois et pendant
 * le rendu : un effet s'exécuterait après, et la maquette s'afficherait une
 * frame avant les vrais comptes. Le composant est un frère placé plus haut
 * que `AppShell`, donc le store est déjà à jour quand celui-ci lit.
 */
export function SpacesInit({ spaces }: { spaces: Space[] }) {
  useState(() => {
    useMail.getState().setSpaces(spaces);
    return null;
  });
  return null;
}
