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
    /* **Jamais une valeur négative.** Sur iOS, `scrollY` l'est pendant
       l'élastique de fin de course : ouvrir le composeur juste après un
       rebond figeait la page à un défilement négatif, l'app se retrouvait
       poussée vers le bas et le fond du document apparaissait au-dessus —
       le « flash de page blanche » à l'ouverture. */
    const depart = Math.max(0, window.scrollY);
    /* Un seuil et une frame : corriger au pixel près, à chaque événement de
       défilement, c'est se battre avec le navigateur pendant qu'il anime. */
    let prevu = 0;
    const remettre = () => {
      if (prevu) return;
      prevu = requestAnimationFrame(() => {
        prevu = 0;
        /* La cible se borne à ce que le document peut vraiment atteindre : le
           clavier raccourcit le viewport de mise en page en app installée, et
           viser une position devenue inatteignable relançait la correction à
           chaque frame — la boucle qu'on voyait clignoter. */
        const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const cible = Math.min(depart, max);
        if (Math.abs(window.scrollY - cible) > 1) window.scrollTo(0, cible);
      });
    };
    remettre();
    window.addEventListener("scroll", remettre, { passive: true });
    window.visualViewport?.addEventListener("resize", remettre);
    return () => {
      if (prevu) cancelAnimationFrame(prevu);
      window.removeEventListener("scroll", remettre);
      window.visualViewport?.removeEventListener("resize", remettre);
    };
  }, [active]);
}
