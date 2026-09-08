"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { useMail, useSpaces } from "@/lib/store";
import type { ComposeDraft } from "@/lib/types";
import { htmlDe } from "@/lib/riche";
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
  const router = useRouter();
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

  /* **Le champ du message, prêté au panneau de mise en forme.** Il vit ici
     parce que les deux vivent ici : le panneau commande une sélection dans un
     nœud, et sans cette référence il devrait la deviner. */
  const corps = useRef<HTMLDivElement>(null);
  /* Le champ se pose lui-même ici : c'est notre référence, à nous de l'écrire —
     un composant ne modifie pas celle qu'on lui passe. */
  const poserCorps = useCallback((el: HTMLDivElement | null) => {
    corps.current = el;
  }, []);

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
      /* **Dire où, pas seulement que.** Le message a existé six jours sans
         chemin : la signature ne se réglait alors nulle part, il n'y avait
         donc rien à montrer. Maintenant qu'elle a un écran, l'annonce d'un
         manque doit porter le moyen de le combler. */
      toast("Cet espace n’a pas encore de signature.", {
        description: "Elle se règle dans Profil et comptes, sous l’espace.",
        action: { label: "Ouvrir", onClick: () => router.push("/comptes") },
      });
      return;
    }
    /* **La signature entre telle qu'elle a été écrite.** Un « — » était collé
       devant : signalé le 8 sept. — la personne avait écrit son propre tiret
       dans le champ, et le message en portait deux. Ce n'est pas à l'insertion
       de décider de la ponctuation d'une signature ; ce qui est dans le champ
       est ce qui part, et le tiret se met dans le champ si on le veut.

       Le corps est repeuplé depuis le brouillon : on écrit les deux versions,
       sinon le champ garderait son HTML d'avant et la signature n'y serait
       jamais. */
    const texte = `${draft.body}\n\n${espace.signature}`;
    update({ body: texte, html: draft.html ? `${draft.html}${htmlDe(`\n${espace.signature}`)}` : undefined });
    setPanneau(null);
    setMenu(false);
  };

  /**
   * Une commande de mise en forme, appliquée à la sélection du champ.
   *
   * `execCommand` est marqué obsolète et **reste le seul chemin praticable** :
   * la refaire à la main, c'est réécrire la manipulation de plages pour six
   * commandes, dans quatre navigateurs, avec la gestion de l'annulation. Tous
   * les moteurs l'implémentent encore, y compris Safari d'iOS, et le jour où
   * l'un l'abandonnera c'est une bibliothèque d'édition qu'il faudra, pas
   * quinze lignes de plus.
   *
   * Le champ reprend le focus **avant** la commande : le bouton du panneau l'a
   * pris au passage, et une commande sans sélection ne fait rien.
   */
  const mettreEnForme = (commande: string, valeur?: string) => {
    const el = corps.current;
    if (!el) return;
    el.focus();
    document.execCommand(commande, false, valeur);
    /* La commande a changé le nœud sans passer par React : on relit. */
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };

  /**
   * Un lien : la seule commande qui pose une question.
   *
   * `prompt` plutôt qu'un champ de plus — le panneau est déjà la troisième
   * couche au-dessus du message, et une quatrième pour une ligne de texte
   * coûterait plus qu'elle ne rend.
   *
   * **`https` ou `mailto`, rien d'autre.** Un `javascript:` collé ici partirait
   * dans un message signé de notre adresse.
   */
  const lier = () => {
    const saisi = window.prompt("Adresse du lien");
    if (!saisi) return;
    const url = /^[a-z][a-z0-9+.-]*:/i.test(saisi) ? saisi : `https://${saisi}`;
    if (!/^(https?:|mailto:)/i.test(url)) {
      toast.error("Seuls les liens https et mailto sont acceptés.");
      return;
    }
    mettreEnForme("createLink", url);
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
    poserCorps,
    mettreEnForme,
    lier,
  };
}
