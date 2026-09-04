"use client";

import { useEffect } from "react";

/**
 * En dessous, ce n'est pas un clavier : une PWA installée n'a pas de barre
 * d'URL qui se replie, et ce qui écarte les deux viewports autrement, c'est le
 * viewport qu'on recalcule. N'importe quel clavier de téléphone, barre de
 * suggestions comprise, est plus haut que ça.
 */
const SEUIL = 200;

/**
 * Publie ce que le navigateur montre vraiment : la hauteur du clavier
 * (`--keyboard-inset`), et le rectangle visible (`--vv-top`, `--vv-height`).
 *
 * **Le clavier ne se mesure plus contre `window.innerHeight`.** C'était la
 * méthode classique — le viewport de mise en page ne rétrécit pas, le visuel
 * si, et l'écart est le clavier. Sauf que sur iOS récent, en app installée, le
 * viewport de mise en page rétrécit *aussi* : l'écart tombe à zéro, on croit
 * qu'il n'y a pas de clavier, et tout ce qui en dépend s'éteint — la barre
 * d'outils du composeur restait affichée, ce qui est le symptôme par lequel on
 * l'a vu.
 *
 * On mesure donc contre **la plus grande hauteur visuelle observée** : celle
 * sans clavier. Elle vaut dans les deux mondes, puisqu'elle ne compare que le
 * viewport visuel à lui-même. Elle se remet à zéro quand l'écran tourne, sans
 * quoi la hauteur en paysage passerait pour un clavier en portrait.
 *
 * `--vv-top` est le défilement que le navigateur s'accorde pour révéler le
 * champ visé. Une carte `fixed` est posée dans le viewport de mise en page ; ce
 * défilement-là la fait glisser hors de l'écran sans qu'aucune de nos règles ne
 * l'ait bougée. La publier permet à la carte de rester dans le rectangle qu'on
 * voit — voir [Cartes flottantes](../../../docs/features/cartes-flottantes.md).
 */
export function KeyboardInset() {
  useEffect(() => {
    const visual = window.visualViewport;
    if (!visual) return;
    const root = document.documentElement;
    let plein = visual.height;

    const measure = () => {
      /* La hauteur sans clavier est la plus grande qu'on ait vue ; elle ne
         peut que grandir tant que l'orientation ne change pas. */
      plein = Math.max(plein, visual.height);
      const cache = plein - visual.height;
      const ouvert = cache > SEUIL;

      root.style.setProperty("--keyboard-inset", `${ouvert ? Math.round(cache) : 0}px`);
      root.style.setProperty("--vv-top", `${Math.round(visual.offsetTop)}px`);
      root.style.setProperty("--vv-height", `${Math.round(visual.height)}px`);
      /* Une classe en plus de la longueur, pour qu'une carte puisse abandonner
         ce dont elle n'a pas besoin pendant qu'on écrit, et pas seulement
         faire de la place aux touches. */
      root.classList.toggle("keyboard-open", ouvert);
    };

    /* Tourner l'écran change la hauteur sans clavier : la garder ferait passer
       le paysage pour un clavier ouvert en portrait. */
    const reset = () => {
      plein = visual.height;
      measure();
    };

    measure();
    visual.addEventListener("resize", measure);
    visual.addEventListener("scroll", measure);
    window.addEventListener("orientationchange", reset);
    return () => {
      visual.removeEventListener("resize", measure);
      visual.removeEventListener("scroll", measure);
      window.removeEventListener("orientationchange", reset);
      root.style.removeProperty("--keyboard-inset");
      root.style.removeProperty("--vv-top");
      root.style.removeProperty("--vv-height");
      root.classList.remove("keyboard-open");
    };
  }, []);
  return null;
}
