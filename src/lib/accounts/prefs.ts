import "server-only";

import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { filtrer, type Preferences } from "@/lib/preferences";

export type { Preferences };

/**
 * Les préférences de la personne connectée, ou `{}`.
 *
 * **Une absence n'est pas une erreur** : personne n'a de ligne avant d'avoir
 * changé un réglage, et `maybeSingle` rend `null` sans se plaindre. Une panne
 * de lecture non plus ne doit rien casser — l'app repart de ce que le
 * navigateur a gardé, ce qui est exactement le comportement d'avant.
 */
export async function lirePreferences(): Promise<Preferences> {
  const user = await currentUser();
  if (!user) return {};
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("user_prefs")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) return {};
  return filtrer(data.data);
}

/**
 * Écrire le bloc entier.
 *
 * `upsert` parce qu'il n'y a qu'une ligne par personne et qu'on ne sait pas si
 * elle existe : la première écriture la crée, les suivantes la remplacent.
 * `user_id` est posé ici et non par le client — RLS le vérifierait de toute
 * façon, mais une valeur qu'on n'a pas à croire est une valeur qu'on ne
 * regarde pas.
 */
export async function ecrirePreferences(prefs: Preferences): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  const supabase = await supabaseServer();
  await supabase
    .from("user_prefs")
    .upsert({ user_id: user.id, data: filtrer(prefs), updated_at: new Date().toISOString() });
}
