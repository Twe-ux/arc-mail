import "server-only";

import type { User } from "@supabase/supabase-js";

import { AVATAR_BUCKET, cheminAvatar } from "@/lib/avatar";
import { supabaseServer } from "@/lib/supabase/server";

/** Ce que l'app affiche d'une personne : son nom, et son visage s'il existe. */
export type Profil = { name: string | null; avatar: string | null };

/**
 * Une heure de signature.
 *
 * Assez long pour qu'un onglet ouvert la matinée garde son visage, assez
 * court pour qu'une URL copiée hors de l'app cesse de valoir quelque chose.
 * Une signature périmée ne casse rien : `AvatarImage` bascule sur les
 * initiales dès que l'image ne charge pas, et le rendu serveur suivant en
 * signe une neuve.
 */
const SIGNATURE = 3600;

/**
 * **Le profil de la personne connectée.**
 *
 * Elle reçoit la personne **déjà lue** : les deux appelants sortent de
 * `currentUser()`, et la redemander serait un aller-retour pour la même réponse.
 *
 * `full_name` et `avatar_path` vivent dans les **métadonnées** de l'identité
 * Supabase, pas dans une table à nous : c'est déjà l'endroit prévu pour ce
 * qu'une personne dit d'elle-même, et `auth.updateUser` s'y écrit depuis le
 * navigateur sans qu'on ait à ouvrir une route. On n'y range **que** de
 * l'affichage — le courrier, lui, est signé par l'identité de l'espace
 * (`Space.identity`), jamais par ce nom.
 *
 * **Le chemin est vérifié avant d'être signé.** Ces métadonnées sont
 * modifiables par la personne elle-même : elles n'ouvrent rien de plus (RLS
 * borne la signature à son propre dossier, et `supabaseServer()` porte sa
 * session, pas la clé de service), mais un champ qu'on n'a pas écrit se
 * relit avant de s'en servir.
 */
export async function lireProfil(user: User): Promise<Profil> {
  const name = (user.user_metadata?.full_name as string | undefined)?.trim() || null;

  const chemin = user.user_metadata?.avatar_path as string | undefined;
  if (chemin !== cheminAvatar(user.id)) return { name, avatar: null };

  const supabase = await supabaseServer();
  const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(chemin, SIGNATURE);
  return { name, avatar: data?.signedUrl ?? null };
}
