"use client";

import { useEffect } from "react";

/**
 * Fige le document tant qu'une feuille est ouverte.
 *
 * **Signalé sur iPhone** : « quand la feuille s'ouvre avec le clavier,
 * l'écran derrière se lève aussi, et si le clavier se ferme il redescend ».
 * Ce n'est pas la feuille qui bouge — elle se cale sur `--vv-top` — c'est la
 * page : pour révéler le champ visé, iOS fait défiler le **document**, et
 * l'app entière remonte derrière le voile, puis redescend au repli du clavier.
 *
 * On note donc la position au moment où la feuille s'ouvre et on y ramène la
 * page à chaque défilement qu'on n'a pas demandé. Pas d'`overflow: hidden` sur
 * `html` ni `body` — la règle du dépôt, et le remède qui casserait la hauteur
 * dynamique de la barre d'URL.
 */
export function useFrozenPage(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const depart = window.scrollY;
    const remettre = () => {
      if (window.scrollY !== depart) window.scrollTo(0, depart);
    };
    remettre();
    window.addEventListener("scroll", remettre, { passive: true });
    window.visualViewport?.addEventListener("resize", remettre);
    return () => {
      window.removeEventListener("scroll", remettre);
      window.visualViewport?.removeEventListener("resize", remettre);
    };
  }, [active]);
}
