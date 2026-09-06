import type { Desabonnement } from "@/lib/types";

/**
 * `List-Unsubscribe` (RFC 2369 et 8058), lu tel qu'il arrive.
 *
 * **C'est la fonction la plus rentable du courrier.** L'en-tête est déjà dans
 * presque toutes les infolettres ; il suffit de le lire pour rendre un geste
 * qui demandait sinon de descendre en bas d'un message, de trouver un lien
 * minuscule et d'ouvrir une page.
 *
 * La forme est une liste de crochets, dans n'importe quel ordre :
 *
 *     List-Unsubscribe: <mailto:stop@x.fr?subject=unsub>, <https://x.fr/stop?t=1>
 *
 * **On garde les deux.** Le `mailto:` d'abord — se désabonner devient alors un
 * message envoyé par notre propre SMTP, sans rien demander à personne d'autre
 * et sans quitter l'app. Le lien reste pour les listes qui n'offrent que lui.
 *
 * Ce fichier ne parle qu'en chaînes : il est lu côté serveur, et vérifiable
 * sans ouvrir une session IMAP.
 */
export function lireListUnsubscribe(entete: string | undefined): Desabonnement | undefined {
  if (!entete) return undefined;
  const vu: Desabonnement = {};
  /* Les crochets sont obligatoires dans la RFC, et c'est ce qui permet de
     découper une liste dont les URL contiennent elles-mêmes des virgules. */
  for (const brut of entete.match(/<[^>]*>/g) ?? []) {
    const cible = brut.slice(1, -1).trim();
    if (/^mailto:/i.test(cible) && !vu.mailto) {
      const [adresse, requete] = cible.slice("mailto:".length).split("?");
      if (!adresse) continue;
      vu.mailto = adresse.trim();
      /* Le sujet demandé par la liste : souvent un jeton qui l'identifie, et
         l'ignorer ferait un désabonnement qui n'aboutit pas. */
      const sujet = new URLSearchParams(requete ?? "").get("subject");
      if (sujet) vu.sujet = sujet;
    }
    /* **`https` seulement.** Un `http:` nu envoie le jeton de désabonnement en
       clair, et c'est un jeton qui identifie l'abonné. */
    if (/^https:\/\//i.test(cible) && !vu.url) vu.url = cible;
  }
  return vu.mailto || vu.url ? vu : undefined;
}
