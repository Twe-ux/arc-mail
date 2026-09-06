import type { FolderId } from "@/lib/types";

/**
 * L'arbre d'une requête de recherche.
 *
 * C'est la seconde des deux mécaniques que
 * l'[audit du 6 septembre](../../../docs/audits/2026-09-06-clients-mail.md) désigne comme portant
 * le reste des fonctions. Le principe tient en une phrase : **un analyseur, un arbre, et autant de
 * compilateurs qu'on a de dos**. Aujourd'hui un seul — celui qui filtre ce qui est déjà en mémoire
 * ([`match.ts`](./match.ts)) ; demain un second qui écrit un `SEARCH` IMAP, sans que la barre ⌘K
 * ait à changer d'un caractère.
 *
 * L'alternative — une suite de `if` dans la palette — ne se compile vers rien, et c'est bien le
 * problème : elle rend impossible de demander la même chose au serveur.
 */
export type Noeud =
  | { t: "et"; enfants: Noeud[] }
  | { t: "ou"; enfants: Noeud[] }
  | { t: "sauf"; enfant: Noeud }
  /** Un mot nu : il cherche partout — objet, aperçu, expéditeur, corps connu. */
  | { t: "texte"; valeur: string }
  | { t: "champ"; champ: Champ; valeur: string }
  | { t: "drapeau"; drapeau: Drapeau; attendu: boolean }
  | { t: "dossier"; dossier: FolderId }
  /** Une borne de date, en millisecondes depuis l'époque. */
  | { t: "date"; sens: "avant" | "depuis"; borne: number }
  /** Rien à filtrer : une requête vide, ou qui n'a que des blancs. */
  | { t: "tout" };

export type Champ = "de" | "a" | "objet";
export type Drapeau = "non-lu" | "favori" | "piece";

/** Un `ET` qui ne s'empile pas quand il n'a qu'un enfant. */
export function et(enfants: Noeud[]): Noeud {
  const utiles = enfants.filter((n) => n.t !== "tout");
  if (utiles.length === 0) return { t: "tout" };
  if (utiles.length === 1) return utiles[0];
  return { t: "et", enfants: utiles };
}

/** Idem pour `OU` — un `OU` à un terme est ce terme. */
export function ou(enfants: Noeud[]): Noeud {
  if (enfants.length === 1) return enfants[0];
  return { t: "ou", enfants };
}

/**
 * Les mots nus d'une requête, mis bout à bout.
 *
 * Ce sont eux — et eux seuls — qui ont un sens hors du courrier : `de:claire`
 * ne doit pas faire remonter l'action « Nouveau message », mais `nouveau` si.
 * La palette s'en sert pour filtrer ses actions et ses dossiers, que l'arbre ne
 * concerne pas.
 */
export function texteLibre(n: Noeud): string {
  switch (n.t) {
    case "texte":
      return n.valeur;
    case "et":
    case "ou":
      return n.enfants.map(texteLibre).filter(Boolean).join(" ");
    /* Un terme nié ne remonte pas : « SAUF facture » ne cherche pas « facture ». */
    default:
      return "";
  }
}

/**
 * La requête nomme-t-elle un dossier ?
 *
 * La palette écarte la corbeille de ses résultats — on ne retombe pas par
 * hasard sur ce qu'on a jeté. Mais `dans:corbeille` est tout sauf un hasard :
 * la question posée doit l'emporter sur la précaution.
 */
export function nommeUnDossier(n: Noeud): boolean {
  switch (n.t) {
    case "dossier":
      return true;
    case "et":
    case "ou":
      return n.enfants.some(nommeUnDossier);
    case "sauf":
      return nommeUnDossier(n.enfant);
    default:
      return false;
  }
}
