/**
 * Où vit Supabase, et s'il est là du tout.
 *
 * Tant que les variables ne sont pas posées, l'app tourne exactement comme
 * avant — maquette, données mock, aucune connexion demandée. C'est délibéré :
 * un déploiement à moitié configuré doit rester utilisable, pas afficher une
 * page de connexion qui ne mène nulle part.
 *
 * Mais **silencieux ne veut pas dire muet** : `/connexion` dit alors ce qui
 * manque, plutôt que de renvoyer à la boîte — sans quoi une variable oubliée
 * ressemble à une page absente, ce qui est arrivé.
 *
 * Le piège à connaître : `NEXT_PUBLIC_*` est **remplacé à la construction**,
 * pas lu à l'exécution. Poser la variable dans Vercel ne change rien tant
 * qu'un nouveau déploiement n'a pas été construit avec elle.
 */

/** Les noms acceptés pour chaque variable, dans l'ordre où on les essaie. */
const URL_NAMES = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PROJECT_URL"] as const;
const KEY_NAMES = [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
] as const;

/*
 * Écrites une par une et en toutes lettres : le remplacement à la construction
 * ne comprend que `process.env.NOM_LITTÉRAL`. Une boucle sur un tableau de
 * noms rendrait `undefined` dans le navigateur, quoi qu'il y ait dans Vercel.
 * Publiques par construction : elles partent dans le navigateur, et ce sont
 * les politiques RLS qui protègent les données, pas le secret de cette clé.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL || "";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  "";

/** Vrai quand l'authentification est branchée ; faux = l'app reste ouverte et mock. */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

/** Ce qui manque, par son nom — jamais par sa valeur. Pour l'écran de diagnostic. */
export function missingSupabaseNames(): { url: readonly string[]; anonKey: readonly string[] } {
  return {
    url: SUPABASE_URL ? [] : URL_NAMES,
    anonKey: SUPABASE_ANON_KEY ? [] : KEY_NAMES,
  };
}
