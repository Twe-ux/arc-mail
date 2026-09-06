"use client";

import { useEffect } from "react";

/**
 * En dessous, ce n'est pas un clavier : ouvrir un dialogue verrouille le
 * défilement de la page, et c'est le moment où WebKit re-résout le viewport en
 * app installée — l'écart entre les deux viewports a tenu une cinquantaine de
 * pixels sans qu'aucune touche ne soit sortie. Un clavier de téléphone, barre
 * de suggestions comprise, fait au moins 250 px.
 */
const SEUIL = 200;

/**
 * Publie **ce que le viewport de mise en page ne compense pas** du clavier,
 * `--keyboard-inset`.
 *
 * C'est la mesure de Kairos, `innerHeight − visualViewport.height`, et on y
 * revient après avoir cru la corriger. Elle vaut zéro en app installée sur iOS
 * récent — **parce que le viewport de mise en page y rétrécit aussi**, et
 * c'est exactement ce qu'il faut savoir : une feuille ancrée à `bottom: 0`
 * s'arrête alors d'elle-même au-dessus des touches, et lui ajouter un coussin
 * compte le clavier **deux fois**. Sa tête sortait de l'écran par le haut et le
 * bas de la feuille laissait une bande blanche — signalé le 6 septembre, deux
 * captures à l'appui.
 *
 * Dans un navigateur ordinaire, où le viewport de mise en page ne bouge pas,
 * elle rend la hauteur du clavier : le coussin est alors nécessaire, et il est
 * exactement de cette taille. La mesure et l'ancrage sont **les deux moitiés
 * d'une même mécanique** ; on ne peut pas changer l'une sans l'autre.
 *
 * La version intermédiaire mesurait contre la plus grande hauteur visuelle
 * observée, pour répondre à « le clavier est-il sorti ? ». Plus personne ne
 * pose cette question-là : ce qu'on veut savoir, c'est de combien il faut
 * reculer, et la réponse est zéro quand le navigateur a déjà reculé.
 *
 * **`--vv-top` est publié, et lui seul du rectangle visible.** Une feuille
 * dont la *hauteur* suit le viewport visuel se redessine à chaque frame où le
 * navigateur bouge le sien — c'est ce qui provoquait les flashs, et
 * `--vv-height` ne revient pas. Mais `offsetTop` est autre chose : c'est le
 * défilement que le navigateur s'accorde pour révéler un champ, et un élément
 * `fixed` — posé dans le viewport de *mise en page* — apparaît décalé
 * d'autant. Le composeur s'en sert pour une **marge**, jamais pour une
 * hauteur : on rend à la feuille ce que le navigateur lui a pris, sans que
 * rien ne se recalcule →
 * [composeur](../../../docs/features/composeur-panneaux.md).
 */
export function KeyboardInset() {
  useEffect(() => {
    const visual = window.visualViewport;
    if (!visual) return;
    const root = document.documentElement;

    const measure = () => {
      const cache = window.innerHeight - visual.height;
      root.style.setProperty("--keyboard-inset", `${cache > SEUIL ? Math.round(cache) : 0}px`);
      root.style.setProperty("--vv-top", `${Math.round(visual.offsetTop)}px`);
    };

    measure();
    visual.addEventListener("resize", measure);
    visual.addEventListener("scroll", measure);
    return () => {
      visual.removeEventListener("resize", measure);
      visual.removeEventListener("scroll", measure);
      root.style.removeProperty("--keyboard-inset");
      root.style.removeProperty("--vv-top");
    };
  }, []);
  return null;
}
