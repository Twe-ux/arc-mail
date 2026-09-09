"use server";

import { ecrirePause, lirePauses, oublierPauses, type PauseRangee } from "@/lib/accounts/pauses";

/**
 * Les deux gestes d'une pause, côté serveur.
 *
 * Rien à rendre, comme pour les préférences : le navigateur détient la vérité
 * pendant la session et la base s'en souvient pour les autres appareils. Une
 * écriture ratée laisse la pause locale — elle marche, elle ne voyage pas.
 */
export async function enregistrerPause(pause: PauseRangee): Promise<void> {
  await ecrirePause(pause);
}

export async function oublierPause(threadIds: string[]): Promise<void> {
  await oublierPauses(threadIds);
}

/**
 * Relire les promesses en cours.
 *
 * Elles étaient lues **au chargement de la page seulement** : une pause posée
 * sur le téléphone n'apparaissait sur le bureau qu'après un rechargement
 * complet — c'est-à-dire jamais, dans l'usage. Signalé au premier test.
 */
export async function relirePauses(): Promise<Record<string, { wake: string }>> {
  return lirePauses();
}
