"use client";

import { useEffect, useRef } from "react";

/** Assez de course pour ne pas basculer sur un tremblement du pouce. */
const SEUIL = 8;
/** En deçà, on est encore « en haut » : l'en-tête reste, quoi qu'on fasse. */
const HAUT = 32;

/**
 * L'en-tête du mail ouvert se replie quand on descend dans le message.
 *
 * Sur un iPhone, l'en-tête (retour · dossier·espace / n sur N · favori) coûte
 * 56 px de hauteur en permanence — sur 852, et sous une pill qui en prend 80.
 * Lire une infolettre revenait à la regarder par une fente. Il se replie donc
 * dès qu'on descend, et **revient dès qu'on remonte** : c'est la façon dont
 * Safari range sa barre d'adresse, et le geste pour le rappeler est celui qu'on
 * fait déjà pour relire ce qu'on vient de passer.
 *
 * **L'état est écrit sur le nœud, pas dans React.** Un `setState` par événement
 * de défilement ferait rendre tout le fil — corps HTML compris — soixante fois
 * par seconde. Un attribut, et le CSS fait le reste : c'est la règle des gestes
 * de l'app, et ici le mouvement est une transition de 260 ms, pas un suivi du
 * doigt — le repli est un changement d'état, pas une transformation tirée.
 *
 * On écoute le défilant de `ScrollArea` (`data-slot="scroll-area-viewport"`),
 * pas la fenêtre : c'est lui qui bouge.
 */
export function useEnteteRepliable<T extends HTMLElement>(cle: string | null) {
  const racine = useRef<T>(null);

  /* **La clé est le fil ouvert.** Sans elle l'effet ne partait qu'une fois, au
     premier montage — c'est-à-dire quand rien n'est encore ouvert et que la vue
     rend son état vide : le défilant n'existait pas, l'effet renonçait, et il
     ne repassait jamais. Il se réattache donc à chaque conversation, et c'est
     aussi ce qui remet l'en-tête en place quand on en ouvre une autre. */
  useEffect(() => {
    const noeud = racine.current;
    const vue = noeud?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (!noeud || !vue) return;

    let dernier = vue.scrollTop;
    let replie = false;
    noeud.dataset.compact = "false";

    const onScroll = () => {
      const y = vue.scrollTop;
      const delta = y - dernier;
      /* Le repère ne se déplace qu'une fois le seuil franchi : sinon une
         oscillation d'un pixel le suivrait, et le seuil ne servirait à rien. */
      if (Math.abs(delta) < SEUIL) return;
      dernier = y;
      const voulu = delta > 0 && y > HAUT;
      if (voulu === replie) return;
      replie = voulu;
      noeud.dataset.compact = String(voulu);
    };

    vue.addEventListener("scroll", onScroll, { passive: true });
    return () => vue.removeEventListener("scroll", onScroll);
  }, [cle]);

  return racine;
}
