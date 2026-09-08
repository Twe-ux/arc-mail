import type { SpaceId, Vue } from "@/lib/types";

/**
 * Les réglages qui **suivent le compte**, et eux seuls.
 *
 * Signalé après une reconnexion : « mes choix n'ont pas tout été appliqués ».
 * Ils vivaient dans `localStorage`, donc par navigateur — et un lien de
 * connexion ouvre volontiers un autre navigateur que celui d'où il a été
 * demandé. Rien n'était perdu, c'était rangé ailleurs.
 *
 * **La liste est courte, et son complément est aussi important qu'elle.**
 * Restent locaux : l'état de la barre et les largeurs de colonnes (ils
 * décrivent un écran, pas un goût — un rail n'existe pas sur un téléphone),
 * les fils et la liste des boîtes (des copies du serveur), les récents (une
 * trace de navigation sur cet appareil).
 *
 * **Ce fichier n'est pas `server-only`, et c'est la raison de son existence** :
 * le composant qui synchronise vit dans le navigateur et a besoin de la liste
 * des clés comme du type. Les accès à la base, eux, restent derrière
 * `accounts/prefs.ts` — importer celui-là depuis un composant client casse la
 * construction, ce que le serveur de dev a dit avant le `build`.
 *
 * Les types sont **ceux du store**, pas des approximations : `listDensity` est
 * une union de deux mots, pas un `string`. Sans cela, relire la base rendrait
 * un `string` que le store refuse — et la seule façon de s'en sortir serait un
 * `as` à l'endroit exact où il faut se méfier.
 */
export type Preferences = {
  /** La teinte choisie par espace. */
  themes?: Partial<Record<SpaceId, number>>;
  dark?: boolean;
  listDensity?: "confort" | "compact";
  fondBureau?: "degrade" | "voile";
  groupBy?: "fil" | "correspondant";
  /** Les vues enregistrées : une question gardée, pas un réglage d'écran. */
  vues?: Vue[];
};

/** Les clés qu'on accepte de lire et d'écrire ; tout le reste est ignoré. */
export const PREF_KEYS = ["themes", "dark", "listDensity", "fondBureau", "groupBy", "vues"] as const;

/**
 * Ne garder que les clés connues.
 *
 * Dans les deux sens : ce qui monte du navigateur comme ce qui descend de la
 * base. Une version plus ancienne de l'app aurait sinon écrit une clé qu'on ne
 * comprend plus, et une plus récente en aurait posé une qu'on écraserait en
 * relisant.
 */
export function filtrer(brut: unknown): Preferences {
  if (!brut || typeof brut !== "object") return {};
  const source = brut as Record<string, unknown>;
  const propres: Record<string, unknown> = {};
  for (const cle of PREF_KEYS) {
    if (source[cle] !== undefined) propres[cle] = source[cle];
  }
  return propres as Preferences;
}
