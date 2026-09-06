import type { FolderId } from "@/lib/types";
import type { Noeud } from "./ast";

/**
 * Ce qu'ImapFlow accepte dans un `SEARCH`.
 *
 * Une poignée de clés du type `SearchObject`, pas le type entier : ce qu'on
 * sait produire, et rien d'autre. Le déclarer ici plutôt que d'importer
 * `imapflow` garde ce fichier **isomorphe** — il est lu par le compilateur
 * comme par les vérifications, et `imapflow` ne tourne que côté serveur.
 */
export type RechercheImap = {
  from?: string;
  to?: string;
  cc?: string;
  subject?: string;
  text?: string;
  seen?: boolean;
  flagged?: boolean;
  before?: Date;
  since?: Date;
  header?: Record<string, string>;
  all?: boolean;
  not?: RechercheImap;
  or?: RechercheImap[];
};

/**
 * Le second compilateur de l'arbre : **celui qui interroge le serveur**.
 *
 * Le premier ([`match.ts`](./match.ts)) filtre ce qu'on a déjà en mémoire —
 * immédiat, mais borné aux enveloppes descendues. Celui-ci pose la même
 * question à IMAP, donc à toute la boîte. Un seul arbre, deux dos : c'est ce
 * que l'audit du 6 septembre appelait « un langage compilé vers deux dos », et
 * c'est ce qui fait qu'ajouter `avant:` à la grammaire les sert tous les deux.
 *
 * **Ce qu'IMAP ne sait pas faire, et comment on contourne.** `SEARCH` met en ET
 * les critères qu'on lui liste, et ImapFlow les expose comme les clés d'un
 * objet : deux `text` ne peuvent donc pas cohabiter, alors que « facture
 * septembre » en demande deux. La loi de De Morgan les réconcilie —
 * `A ET B` s'écrit `NON (NON A OU NON B)` —, et `or`/`not` existent tous les
 * deux. On ne s'en sert qu'en cas de collision : sans elle, l'objet fusionné
 * reste lisible.
 */
export function versImap(n: Noeud): RechercheImap {
  switch (n.t) {
    case "tout":
      return { all: true };
    case "et":
      return n.enfants.map(versImap).reduce(fusionner, { all: true });
    case "ou":
      return { or: n.enfants.map(versImap) };
    case "sauf":
      return { not: versImap(n.enfant) };
    case "texte":
      return { text: n.valeur };
    case "champ":
      if (n.champ === "objet") return { subject: n.valeur };
      if (n.champ === "de") return { from: n.valeur };
      /* « à » couvre le destinataire **et** la copie, comme en mémoire ; IMAP
         les sépare, d'où le OU. */
      return { or: [{ to: n.valeur }, { cc: n.valeur }] };
    case "drapeau":
      if (n.drapeau === "non-lu") return { seen: !n.attendu };
      if (n.drapeau === "favori") return { flagged: n.attendu };
      /* Il n'y a pas de critère « a une pièce jointe » dans IMAP4. L'en-tête
         est le seul indice qui se cherche côté serveur : un message qui porte
         un fichier est `multipart/mixed`. Approché, et assumé — un message
         signé l'est aussi. */
      return n.attendu
        ? { header: { "content-type": "multipart/mixed" } }
        : { not: { header: { "content-type": "multipart/mixed" } } };
    case "date":
      /* `SEARCH BEFORE/SINCE` compare des **dates de réception**, sans heure —
         c'est exactement la granularité de nos bornes, qui sont des débuts de
         journée. */
      return n.sens === "avant" ? { before: new Date(n.borne) } : { since: new Date(n.borne) };
    case "dossier":
      /* **Un dossier n'est pas un critère, c'est une boîte à ouvrir.** IMAP
         cherche dans le dossier sélectionné ; `dans:` dit donc *où* chercher
         (voir `dossiersDe`) et ne contraint rien une fois qu'on y est. */
      return { all: true };
  }
}

/** `{ all: true }` ne dit rien : il disparaît dès qu'un vrai critère arrive. */
function estNeutre(r: RechercheImap): boolean {
  return Object.keys(r).length === 1 && r.all === true;
}

/**
 * Deux critères en ET.
 *
 * Sans clé commune, c'est une fusion d'objets — la forme lisible, celle qu'on
 * veut dans 90 % des cas. Avec une clé commune, De Morgan : `NON (NON A OU
 * NON B)`.
 */
function fusionner(a: RechercheImap, b: RechercheImap): RechercheImap {
  if (estNeutre(a)) return b;
  if (estNeutre(b)) return a;
  const commun = Object.keys(a).some((k) => k in b);
  if (!commun) return { ...a, ...b };
  return { not: { or: [{ not: a }, { not: b }] } };
}

/**
 * Les dossiers que la requête nomme — c'est-à-dire **où chercher**.
 *
 * Vide : on cherche là où l'on est. IMAP sélectionne une boîte à la fois, donc
 * plusieurs dossiers nommés font plusieurs `SEARCH`, pas un.
 *
 * Un `dans:` sous un `SAUF` n'est pas repris : « SAUF dans:archive » voudrait
 * dire « partout sauf Archive », ce qu'IMAP ne sait pas exprimer en une
 * sélection. Mieux vaut chercher là où l'on est que mentir sur l'étendue.
 */
export function dossiersDe(n: Noeud): FolderId[] {
  const vus: FolderId[] = [];
  const marcher = (x: Noeud) => {
    if (x.t === "dossier") {
      if (!vus.includes(x.dossier)) vus.push(x.dossier);
    } else if (x.t === "et" || x.t === "ou") x.enfants.forEach(marcher);
  };
  marcher(n);
  return vus;
}
