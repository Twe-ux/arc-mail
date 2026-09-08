/**
 * Une étiquette, et le **mot-clé IMAP** qui la porte.
 *
 * `Thread.labels` existait depuis le premier jour et n'était rempli que par
 * les données mock : aucun écran n'en posait, et `imap.ts` rendait `[]`. Côté
 * serveur une étiquette est un **mot-clé** — un drapeau personnalisé, la même
 * mécanique que `\Seen` et `\Flagged`, écrit par `STORE`. C'est le seul des
 * trois chemins possibles qui ne change rien au modèle : un fil reste dans un
 * seul dossier, et l'étiquette voyage avec le message d'un client à l'autre.
 *
 * **Le problème, c'est l'alphabet.** Un mot-clé est un *atome* IMAP : ni
 * espace, ni accent, et une liste de caractères interdits (`( ) { %  * " \ ]`
 * et les contrôles). Or les étiquettes qu'on écrit en français sont « Amis »,
 * « Achats », « Santé ».
 *
 * D'où la règle, en deux temps :
 *
 * 1. **Une étiquette qui est déjà un atome part telle quelle.** « Amis »,
 *    « Achats », « Travaux » restent lisibles dans Mail d'iOS ou Thunderbird,
 *    et une étiquette posée là-bas nous revient telle quelle.
 * 2. **Tout le reste passe en `Arc_<base64url>`.** « Santé » devient
 *    `Arc_U2FudMOp` — opaque ailleurs, mais rien ne se perd et rien ne casse.
 *    Base64url et non pourcentage : `%` est justement l'un des caractères
 *    qu'un atome refuse.
 *
 * On ne montre pas tous les mots-clés d'un message : ceux qui commencent par
 * `$` sont ceux des autres clients (`$label1` de Thunderbird, `$MailFlagBit0`
 * d'Apple, `$Junk` des filtres), des codes internes et non des mots choisis.
 * Les afficher remplirait la liste de jargon.
 */

/** Le préfixe des étiquettes qu'on a dû encoder. */
const PREFIXE = "Arc_";

/** Ce qu'un atome IMAP accepte, moins ce qui prête à confusion (`$` en tête). */
const ATOME = /^[A-Za-z0-9_.\-+&#!'^~][A-Za-z0-9_.\-+&#!'^~]{0,63}$/;

const encoder = (texte: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(texte)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const decoder = (code: string) => {
  const base = code.replace(/-/g, "+").replace(/_/g, "/");
  const octets = Uint8Array.from(atob(base + "=".repeat((4 - (base.length % 4)) % 4)), (c) =>
    c.charCodeAt(0),
  );
  return new TextDecoder().decode(octets);
};

/** L'étiquette telle qu'elle part sur le serveur. */
export function motCle(etiquette: string): string {
  const propre = etiquette.trim();
  return ATOME.test(propre) ? propre : PREFIXE + encoder(propre);
}

/**
 * L'inverse — et `null` pour ce qui n'est pas une étiquette à nous : les
 * drapeaux système (`\Seen`), les codes des autres clients (`$label1`), et un
 * `Arc_` qu'on n'arrive pas à décoder (un mot-clé qui commence comme le nôtre
 * sans en être un).
 */
export function etiquetteDe(flag: string): string | null {
  if (flag.startsWith("\\") || flag.startsWith("$")) return null;
  if (!flag.startsWith(PREFIXE)) return flag;
  try {
    const nom = decoder(flag.slice(PREFIXE.length));
    return nom.trim() ? nom : null;
  } catch {
    return null;
  }
}

/** Les étiquettes d'un jeu de drapeaux, dédoublonnées et dans l'ordre. */
export function etiquettesDe(flags: Iterable<string> | undefined): string[] {
  if (!flags) return [];
  const vues = new Set<string>();
  for (const f of flags) {
    const nom = etiquetteDe(f);
    if (nom) vues.add(nom);
  }
  return [...vues].sort((a, b) => a.localeCompare(b, "fr"));
}
