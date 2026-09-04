/**
 * Où vit Supabase, et s'il est là du tout.
 *
 * Tant que les variables ne sont pas posées, l'app tourne exactement comme
 * avant — maquette, données mock, aucune connexion demandée. C'est délibéré :
 * un déploiement à moitié configuré doit rester utilisable, pas afficher une
 * page de connexion qui ne mène nulle part.
 */

/** Publiques par construction : elles partent dans le navigateur, et RLS est ce qui protège les données. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Vrai quand l'authentification est branchée ; faux = l'app reste ouverte et mock. */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}
