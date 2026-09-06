"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useMail, useSpaces } from "@/lib/store";
import type { ComposeDraft } from "@/lib/types";
import { lireFichiers } from "./compose-attach";

/**
 * Ce qu'un composeur sait faire en plus d'écrire : joindre, signer, ranger.
 *
 * Écrit une fois pour les deux habillages — la carte du téléphone et la
 * fenêtre du bureau. Le bureau n'avait rien de tout ça : quatre icônes grises
 * qui ne faisaient rien, et aucun moyen de joindre un fichier alors que le
 * téléphone le sait depuis le 5 septembre.
 */
export function useComposeTools(draft: ComposeDraft | null) {
  const update = useMail((s) => s.updateCompose);
  const spaces = useSpaces();
  const pieces = draft?.attachments ?? [];
  const espace = spaces.find((sp) => sp.id === draft?.spaceId) ?? spaces[0];

  /* **Les deux panneaux s'excluent.** Ouvrir l'un ferme l'autre : empilés, ils
     débordaient de la carte, et le message qu'on écrit disparaissait sous ses
     propres outils. */
  const [panneau, setPanneau] = useState<null | "pieces" | "forme">(null);
  /* **Une clé à part pour le menu du brouillon.** Il se superpose au composeur,
     il ne le remplace pas : tant qu'il partageait `panneau`, l'ouvrir démontait
     la carte sous lui. */
  const [menu, setMenu] = useState(false);
  /* Confort d'écriture, local à la carte : ni le message ni le brouillon n'en
     portent la trace. */
  const [taille, setTaille] = useState(17);
  const [serif, setSerif] = useState(false);

  /* Ouvrir un panneau referme le clavier : la carte ne fait que la hauteur du
     rectangle visible, et les deux ensemble ne laissaient plus voir le
     message. */
  const flouter = () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  };

  const basculer = (cible: "pieces" | "forme") => {
    flouter();
    setMenu(false);
    setPanneau((p) => (p === cible ? null : cible));
  };

  const ouvrirMenu = () => {
    flouter();
    setPanneau(null);
    setMenu((m) => !m);
  };

  const signer = () => {
    if (!draft) return;
    if (!espace?.signature) {
      toast("Cet espace n’a pas encore de signature.");
      return;
    }
    update({ body: `${draft.body}\n\n— ${espace.signature}` });
    setPanneau(null);
    setMenu(false);
  };

  const joindre = async (files: FileList) => {
    const lues = await lireFichiers(files, pieces);
    if (lues.length === 0) return;
    update({ attachments: [...pieces, ...lues] });
    setPanneau(null);
    toast(lues.length === 1 ? `${lues[0].name} joint` : `${lues.length} fichiers joints`);
  };

  const retirer = (index: number) =>
    update({ attachments: pieces.filter((_, j) => j !== index) });

  return {
    pieces,
    espace,
    panneau,
    setPanneau,
    menu,
    setMenu,
    basculer,
    ouvrirMenu,
    taille,
    setTaille,
    serif,
    setSerif,
    signer,
    joindre,
    retirer,
  };
}
