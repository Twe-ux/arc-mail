"use server";

import { ecrirePause, oublierPauses, type PauseRangee } from "@/lib/accounts/pauses";

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
