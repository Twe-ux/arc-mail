"use client";

import { useEffect, useRef } from "react";

import {
  animateSpring,
  SPRING_DISMISS,
  SPRING_SETTLE,
  swallowNextClick,
  velocityFrom,
  type Sample,
  type SpringAnimation,
} from "@/lib/gesture";

/** Le voyage qu'il faut avoir fait pour que le relâchement vaille validation. */
const SEUIL = 150;
/** Où la rangée part quand l'action est validée : au-delà de sa propre largeur. */
const SORTIE = 300;
/** De quoi distinguer « je balaye » de « je fais défiler ». */
const AXE = 10;

export type SwipeAction = {
  /** Ce qui se passe au relâchement au-delà du seuil. */
  run: () => void;
  /** Absent : ce côté ne fait rien, la rangée y résiste. */
  enabled: boolean;
};

/**
 * Balayer une rangée de liste : à droite pour archiver, à gauche pour supprimer.
 *
 * Trois choses font la différence entre ce geste et une animation :
 *
 * - **la rangée suit le doigt au pixel**, écrite sur le nœud à chaque frame,
 *   jamais par un état React (un rendu par frame sur une liste de cent lignes
 *   est un diaporama) ;
 * - **l'axe se décide au dixième de geste** : sous 10 px on ne sait pas encore,
 *   au-delà c'est le plus grand des deux déplacements qui gagne, et si c'est la
 *   verticale on rend la main au défilement pour de bon ;
 * - **le retour est un ressort**, pas une transition CSS : il peut être rattrapé
 *   en vol par un second geste, ce qu'une transition ne sait pas faire, et il
 *   respecte déjà « Réduire les animations ».
 *
 * L'action est **optimiste**, comme `moveThread` : la rangée part, le store
 * écrit, et une écriture refusée ramène le fil seul.
 */
export function useSwipeRow({
  left,
  right,
}: {
  /** Vers la gauche : supprimer. */
  left: SwipeAction;
  /** Vers la droite : archiver. */
  right: SwipeAction;
}) {
  /** Ce qui bouge sous le doigt. */
  const noeud = useRef<HTMLElement | null>(null);
  /**
   * Ce qui porte l'état du geste, en **variables CSS** : `--swipe-progress`
   * (0 → 1 vers le seuil), `data-side`, `data-armed` — et `data-press`, l'appui.
   *
   * Le calque révélé se dessine entièrement à partir de là : pas un rendu React
   * par frame, et le dégradé de couleur, l'échelle de l'icône et l'apparition
   * du libellé suivent le doigt au pixel plutôt que de basculer d'un coup.
   *
   * **L'appui ne passe pas par `:active`.** Le pseudo-classe arrive en retard
   * sous le doigt (le navigateur attend de savoir si c'est un défilement), ne
   * se déclenche pas du tout sous un toucher synthétique — donc invérifiable —
   * et surtout elle reste allumée pendant un balayage, alors qu'un geste qui
   * part n'est plus un appui. Ici c'est `pointerdown` qui l'allume et le
   * premier vrai déplacement qui l'éteint.
   */
  const piste = useRef<HTMLElement | null>(null);
  const actions = useRef({ left, right });
  useEffect(() => {
    actions.current = { left, right };
  });

  useEffect(() => {
    const el = noeud.current;
    if (!el) return;

    let pointer: number | null = null;
    let depart = { x: 0, y: 0 };
    let axe: "inconnu" | "horizontal" | "abandon" = "inconnu";
    let x = 0;
    let echantillons: Sample[] = [];
    let vol: SpringAnimation | null = null;

    const ecrire = (valeur: number) => {
      x = valeur;
      el.style.transform = valeur === 0 ? "" : `translate3d(${valeur}px,0,0)`;
      const p = piste.current;
      if (!p) return;
      const distance = Math.abs(valeur);
      p.style.setProperty("--swipe-progress", String(Math.min(1, distance / SEUIL)));
      const cote = valeur > 1 ? "right" : valeur < -1 ? "left" : "none";
      if (p.dataset.side !== cote) p.dataset.side = cote;
      const arme = distance >= SEUIL ? "true" : "false";
      if (p.dataset.armed !== arme) p.dataset.armed = arme;
    };

    const presser = (valeur: boolean) => {
      const p = piste.current;
      const etat = valeur ? "true" : "false";
      if (p && p.dataset.press !== etat) p.dataset.press = etat;
    };

    const arreter = () => {
      const etat = vol?.stop() ?? { value: x, velocity: 0 };
      vol = null;
      return etat;
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const etat = arreter();
      x = etat.value;
      pointer = e.pointerId;
      depart = { x: e.clientX, y: e.clientY };
      axe = "inconnu";
      echantillons = [{ value: 0, time: e.timeStamp }];
      presser(true);
    };

    const move = (e: PointerEvent) => {
      if (pointer !== e.pointerId || axe === "abandon") return;
      const dx = e.clientX - depart.x;
      const dy = e.clientY - depart.y;

      if (axe === "inconnu") {
        if (Math.abs(dx) < AXE && Math.abs(dy) < AXE) return;
        /* Le doigt a bougé pour de bon : ce n'est plus un appui, quel que soit
           l'axe qui gagne ensuite. */
        presser(false);
        /* Le défilement vertical est prioritaire : dans le doute, ce n'est pas
           notre geste. On ne capture le pointeur qu'une fois l'axe tranché,
           sinon la liste ne défilerait plus du tout. */
        if (Math.abs(dy) >= Math.abs(dx)) {
          axe = "abandon";
          return;
        }
        /* Un côté sans action ne prend pas le geste : il le laisse à la liste,
           qui en fera un changement d'espace. Mieux vaut passer la main que
           d'ouvrir un calque qui ne ferait rien. */
        if (!(dx > 0 ? actions.current.right.enabled : actions.current.left.enabled)) {
          axe = "abandon";
          return;
        }
        axe = "horizontal";
        el.setPointerCapture(e.pointerId);
      }

      /* La rangée a pris l'axe : le balayage d'espace, qui écoute plus haut, ne
         doit pas voir cette même main partir de deux côtés à la fois. */
      e.stopPropagation();
      const valeur = dx - Math.sign(dx) * AXE;
      echantillons.push({ value: valeur, time: e.timeStamp });
      if (echantillons.length > 12) echantillons.shift();
      ecrire(valeur);
    };

    const up = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      pointer = null;
      presser(false);
      if (axe !== "horizontal") {
        axe = "inconnu";
        return;
      }
      axe = "inconnu";
      el.releasePointerCapture?.(e.pointerId);
      e.stopPropagation();
      const vitesse = velocityFrom(echantillons);
      const action = x > 0 ? actions.current.right : actions.current.left;
      /* Distance **ou** élan : un balayage vif et court est la même intention
         qu'un balayage lent et long, et refuser le premier fait passer le geste
         pour capricieux. */
      const valide = action.enabled && (Math.abs(x) >= SEUIL || Math.abs(vitesse) >= 900);

      if (valide) {
        swallowNextClick();
        const but = Math.sign(x) * SORTIE;
        vol = animateSpring({
          from: { value: x, velocity: vitesse },
          to: but,
          spring: SPRING_DISMISS,
          onFrame: ecrire,
          onRest: () => {
            vol = null;
            action.run();
          },
        });
        return;
      }

      if (Math.abs(x) > AXE) swallowNextClick();
      vol = animateSpring({
        from: { value: x, velocity: vitesse },
        to: 0,
        spring: SPRING_SETTLE,
        onFrame: ecrire,
        onRest: () => {
          vol = null;
        },
      });
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      vol?.stop();
    };
  }, []);

  return { noeud, piste };
}
