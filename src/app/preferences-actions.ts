"use server";

import { ecrirePreferences } from "@/lib/accounts/prefs";
import type { Preferences } from "@/lib/preferences";

/**
 * Ranger les réglages de la personne connectée.
 *
 * Rien à rendre : c'est le navigateur qui détient la vérité pendant la
 * session, la base ne fait que s'en souvenir pour le prochain appareil. Une
 * écriture ratée ne doit donc rien casser à l'écran — d'où l'absence de
 * retour, et le `void` du côté client.
 */
export async function enregistrerPreferences(prefs: Preferences): Promise<void> {
  await ecrirePreferences(prefs);
}
