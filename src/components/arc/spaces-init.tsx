"use client";

import { useEffect, useState } from "react";

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

  /* **Et une seconde fois quand le serveur en rend d'autres.** L'initialiseur
     ci-dessus ne s'exécute qu'au montage : un espace créé depuis la boîte
     revalidait bien `/` (`ajouterEspace`), le serveur renvoyait la liste
     complète, et le store gardait l'ancienne — l'espace neuf n'apparaissait
     qu'après un rechargement complet.
     Dans un effet, donc après la peinture : c'est une frame de retard sur un
     geste qu'on vient de faire soi-même, pas un scintillement au chargement.
     La comparaison porte sur les identifiants, seule chose qui distingue
     vraiment deux listes ici — le tableau, lui, est neuf à chaque rendu du
     serveur. */
  const cles = spaces.map((s) => s.id).join("|");
  useEffect(() => {
    const actuel = useMail.getState().spaces;
    if (actuel.map((s) => s.id).join("|") !== cles) useMail.getState().setSpaces(spaces);
    /* `spaces` volontairement hors des dépendances : c'est `cles` qui dit si
       la liste a changé, et le tableau change d'identité à chaque rendu. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cles]);

  return null;
}
