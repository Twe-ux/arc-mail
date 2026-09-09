"use client";

import { useEffect, useRef } from "react";

import { enregistrerPreferences } from "@/app/preferences-actions";
import type { Pause } from "@/lib/pause";
import { PREF_KEYS, type Preferences } from "@/lib/preferences";
import { useMail } from "@/lib/store";

/** Le temps qu'on laisse aux réglages de se stabiliser avant d'écrire. */
const REPOS = 800;

/**
 * **Les réglages suivent le compte.**
 *
 * Signalé après une reconnexion : « mes choix n'ont pas tout été appliqués ».
 * Ils vivaient dans `localStorage`, donc **par navigateur** — et un lien de
 * connexion ouvre volontiers un autre navigateur que celui d'où il a été
 * demandé. Rien n'était perdu : c'était rangé ailleurs, et l'ailleurs ne
 * suivait pas.
 *
 * Deux moitiés, et l'ordre entre elles est tout le problème :
 *
 * 1. **Poser ce que la base dit**, mais seulement une fois que
 *    `localStorage` a fini d'être relu. Le store se réhydrate dans un effet
 *    d'`AppShell` (`skipHydration`, pour que le premier rendu client soit
 *    celui du serveur) ; poser avant, c'était se faire écraser une frame plus
 *    tard par des valeurs plus vieilles. D'où `onFinishHydration` plutôt qu'un
 *    effet qui court après.
 * 2. **Renvoyer ce qui change**, au repos. Sans le délai, glisser le curseur
 *    de teinte écrivait une ligne par degré.
 *
 * **La base gagne à l'arrivée**, et c'est le sens de la fonction : elle est ce
 * que le compte sait, le navigateur n'est qu'un cache. Une fois posée, c'est
 * l'écran qui commande et la base qui suit.
 *
 * Le retour dans `localStorage` se fait tout seul : le `set` traverse le
 * `persist` du store, donc le script inline de `layout.tsx` aura le bon thème
 * au **prochain** chargement. Le premier sur un appareil neuf garde donc une
 * frame de thème clair — le prix d'un thème posé avant toute peinture.
 */
export function PrefsSync({
  initial,
  pauses,
}: {
  initial: Preferences;
  /** Les promesses en cours, telles que la base les connaît. */
  pauses: Record<string, Pause>;
}) {
  /* Ce qu'on vient de poser soi-même : la première notification de `subscribe`
     est la conséquence de notre propre écriture, pas un choix de la personne,
     et la renvoyer ferait un aller-retour pour rien. */
  const pose = useRef(false);

  useEffect(() => {
    const appliquer = () => {
      /* `undefined` veut dire « la base n'en sait rien » et non « remets à
         zéro » : on ne pose que ce qui existe. */
      const patch = Object.fromEntries(
        PREF_KEYS.filter((c) => initial[c] !== undefined).map((c) => [c, initial[c]]),
      );
      if (Object.keys(patch).length > 0) {
        pose.current = true;
        useMail.setState(patch as Partial<ReturnType<typeof useMail.getState>>);
      }
      /* **Les pauses aussi suivent le compte** (9 sept.). La base gagne, comme
         pour les réglages : une promesse faite sur l'iPhone doit exister sur
         le bureau. Elle **fusionne** au lieu de remplacer — une pause posée
         sur cet appareil pendant que la page se montait serait sinon perdue,
         et une base muette (hors ligne, erreur) ne doit rien effacer. */
      if (Object.keys(pauses).length > 0)
        useMail.setState((s) => ({ pauses: { ...pauses, ...s.pauses } }));
    };

    let arreter: (() => void) | undefined;
    if (useMail.persist.hasHydrated()) appliquer();
    else arreter = useMail.persist.onFinishHydration(appliquer);
    return () => arreter?.();
  }, [initial, pauses]);

  useEffect(() => {
    let minuteur: ReturnType<typeof setTimeout> | undefined;
    let dernier = "";

    const desabonner = useMail.subscribe((s) => {
      const prefs: Preferences = {
        themes: s.themes,
        dark: s.dark,
        listDensity: s.listDensity,
        fondBureau: s.fondBureau,
        groupBy: s.groupBy,
        vues: s.vues,
      };
      /* `subscribe` parle à **chaque** `set` du store — l'ouverture d'un fil,
         l'arrivée d'une liste, un compteur. On compare donc ce qui nous
         regarde, sinon on écrirait des centaines de fois la même chose. */
      const signature = JSON.stringify(prefs);
      if (signature === dernier) return;
      dernier = signature;
      if (pose.current) {
        pose.current = false;
        return;
      }
      clearTimeout(minuteur);
      minuteur = setTimeout(() => void enregistrerPreferences(prefs), REPOS);
    });

    return () => {
      clearTimeout(minuteur);
      desabonner();
    };
  }, []);

  return null;
}
