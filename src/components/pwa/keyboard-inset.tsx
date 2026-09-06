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
 * Publie la hauteur du clavier à l'écran, `--keyboard-inset`, et rien d'autre.
 *
 * **Le clavier ne se mesure pas contre `window.innerHeight`.** C'était la
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
 * **`offsetTop` est délibérément laissé de côté**, et avec lui le rectangle
 * visible qu'on publiait ici jusqu'au 6 septembre. Une feuille calée sur ce
 * rectangle se redessine à chaque frame où le navigateur bouge le sien, et il
 * en bouge un au mauvais moment : ouvrir un dialogue verrouille le défilement
 * de la page, WebKit re-résout le viewport en app installée, et l'écart saute
 * d'une cinquantaine de pixels qui n'ont rien d'un clavier. Une feuille est
 * **ancrée** et laisse le clavier lui prendre un `padding-bottom` — la
 * mécanique de Kairos, à laquelle on est revenu →
 * [composeur](../../../docs/features/composeur-panneaux.md).
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
    };

    /* Tourner l'écran change la hauteur sans clavier : la garder ferait passer
       le paysage pour un clavier ouvert en portrait. */
    const reset = () => {
      plein = visual.height;
      measure();
    };

    measure();
    visual.addEventListener("resize", measure);
    window.addEventListener("orientationchange", reset);
    return () => {
      visual.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", reset);
      root.style.removeProperty("--keyboard-inset");
    };
  }, []);
  return null;
}
