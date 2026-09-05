"use client";

import { useEffect, useRef } from "react";

import {
  animateSpring,
  SPRING_SETTLE,
  swallowNextClick,
  velocityFrom,
  type Sample,
  type SpringAnimation,
} from "@/lib/gesture";

/** Ce qu'il faut parcourir pour changer d'espace. */
const SEUIL = 60;
/** La liste ne suit qu'en partie : elle indique un ailleurs, elle n'y va pas. */
const SUIVI = 0.35;
const AXE = 10;

/**
 * Balayer la liste pour passer d'un compte à l'autre.
 *
 * Le geste ne déplace pas la liste d'un écran : elle suit à 35 %, juste assez
 * pour dire qu'il y a autre chose à côté, et revient. Ce qui a changé, c'est
 * son contenu — et c'est le contenu qui est la réponse au geste, pas la
 * translation.
 *
 * **Il ne part pas d'une rangée.** Les deux gestes sont horizontaux, et sur la
 * liste toute la surface est faite de rangées : mesuré, le balayage d'espace
 * ne se déclenchait jamais, la rangée prenant l'axe la première. Il part donc
 * de l'en-tête — grand titre, ligne méta, tuiles — c'est-à-dire exactement là
 * où vit l'indicateur de pages qui l'annonce. Ce qui bouge, en revanche, reste
 * la colonne entière : le titre et la liste partent ensemble.
 *
 * Le tirage vertical gagne toujours : dans le doute, on fait défiler.
 */
export function useSwipeSpace(
  onChange: (direction: 1 | -1) => void,
  /** Les nœuds qui possèdent déjà l'horizontale ; un geste qui y naît est à eux. */
  ignore?: string,
) {
  const noeud = useRef<HTMLElement | null>(null);
  const rappel = useRef(onChange);
  useEffect(() => {
    rappel.current = onChange;
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
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return; // le pointeur a les pastilles et la feuille
      if (ignore && e.target instanceof Element && e.target.closest(ignore)) return;
      const etat = vol?.stop() ?? { value: x, velocity: 0 };
      vol = null;
      x = etat.value;
      pointer = e.pointerId;
      depart = { x: e.clientX, y: e.clientY };
      axe = "inconnu";
      echantillons = [{ value: 0, time: e.timeStamp }];
    };

    const move = (e: PointerEvent) => {
      if (pointer !== e.pointerId || axe === "abandon") return;
      const dx = e.clientX - depart.x;
      const dy = e.clientY - depart.y;
      if (axe === "inconnu") {
        if (Math.abs(dx) < AXE && Math.abs(dy) < AXE) return;
        if (Math.abs(dy) >= Math.abs(dx)) {
          axe = "abandon";
          return;
        }
        axe = "horizontal";
      }
      const valeur = (dx - Math.sign(dx) * AXE) * SUIVI;
      echantillons.push({ value: valeur, time: e.timeStamp });
      if (echantillons.length > 12) echantillons.shift();
      ecrire(valeur);
    };

    const up = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      pointer = null;
      if (axe !== "horizontal") {
        axe = "inconnu";
        return;
      }
      axe = "inconnu";
      const vitesse = velocityFrom(echantillons);
      /* Le seuil est sur le **déplacement du doigt**, pas sur celui de la
         liste : 60 px parcourus, quel que soit le pourcentage qu'on en montre. */
      const parcouru = Math.abs(x) / SUIVI;
      if (parcouru >= SEUIL || Math.abs(vitesse) >= 500) {
        swallowNextClick();
        rappel.current(x < 0 ? 1 : -1);
      } else if (Math.abs(x) > 2) {
        swallowNextClick();
      }
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
  }, [ignore]);

  return noeud;
}
