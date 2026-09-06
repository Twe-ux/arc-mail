import type { FolderId } from "@/lib/types";
import { et, ou, type Champ, type Drapeau, type Noeud } from "./ast";

/**
 * L'analyseur de la barre de recherche.
 *
 * **Il ne refuse jamais rien.** Une requête est tapée à la volée, lettre par
 * lettre : `de:` seul, une parenthèse ouverte, un `OU` en fin de ligne sont des
 * états normaux de la frappe, pas des erreurs. Tout ce qu'il ne comprend pas
 * redevient du texte à chercher — au pire on cherche `de:` comme trois
 * caractères, ce qui ne donne rien mais ne casse rien.
 *
 * **Le français d'abord, l'anglais admis.** L'interface est en français, mais
 * `from:` est dans les doigts de qui écrit du courrier. Les deux marchent.
 *
 * Grammaire, du plus lâche au plus serré :
 *
 *     requete  := ou
 *     ou       := et (("OU" | "OR") et)*
 *     et       := unaire (("ET" | "AND")? unaire)*     — la juxtaposition est un ET
 *     unaire   := ("SAUF" | "NOT" | "-") unaire | terme
 *     terme    := "(" requete ")" | champ ":" valeur | "phrase" | mot
 */

/** Les noms d'un champ, dans les deux langues. */
const CHAMPS: Record<string, Champ> = {
  de: "de", from: "de", exp: "de",
  a: "a", à: "a", to: "a", pour: "a",
  objet: "objet", obj: "objet", subject: "objet", sujet: "objet",
};

/** `est:` et `avec:` ne prennent pas un texte mais un état. */
const DRAPEAUX: Record<string, { drapeau: Drapeau; attendu: boolean }> = {
  "non-lu": { drapeau: "non-lu", attendu: true },
  nonlu: { drapeau: "non-lu", attendu: true },
  unread: { drapeau: "non-lu", attendu: true },
  lu: { drapeau: "non-lu", attendu: false },
  read: { drapeau: "non-lu", attendu: false },
  favori: { drapeau: "favori", attendu: true },
  starred: { drapeau: "favori", attendu: true },
  flagged: { drapeau: "favori", attendu: true },
  piece: { drapeau: "piece", attendu: true },
  "piece-jointe": { drapeau: "piece", attendu: true },
  attachment: { drapeau: "piece", attendu: true },
};

/** Les dossiers se nomment comme dans la feuille, ou comme sur le serveur. */
const DOSSIERS: Record<string, FolderId> = {
  reception: "inbox", inbox: "inbox", boite: "inbox",
  favoris: "starred", starred: "starred",
  pause: "snoozed", "en-pause": "snoozed", snoozed: "snoozed",
  envoyes: "sent", sent: "sent",
  brouillons: "drafts", drafts: "drafts",
  archive: "archive",
  corbeille: "trash", trash: "trash",
};

/** Sans accents ni casse : on ne cherche pas « Elodie » pour « Élodie ». */
export function laver(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

type Jeton = { k: "mot" | "phrase" | "(" | ")"; v: string };

/**
 * Découpe la requête.
 *
 * Une phrase entre guillemets reste d'un bloc — c'est le seul moyen de
 * chercher « demande de devis » sans chercher trois mots dispersés — et un
 * guillemet non refermé va jusqu'au bout de la ligne plutôt que d'annuler la
 * frappe en cours.
 */
function decouper(q: string): Jeton[] {
  const jetons: Jeton[] = [];
  let i = 0;
  while (i < q.length) {
    const c = q[i];
    if (c === " " || c === "\t") {
      i++;
    } else if (c === "(" || c === ")") {
      jetons.push({ k: c, v: c });
      i++;
    } else if (c === '"' || c === "«" || c === "»") {
      const fin = q.indexOf('"', i + 1);
      const coupe = fin === -1 ? q.length : fin;
      jetons.push({ k: "phrase", v: q.slice(i + 1, coupe) });
      i = coupe + 1;
    } else {
      let j = i;
      while (j < q.length && !' \t()"'.includes(q[j])) j++;
      jetons.push({ k: "mot", v: q.slice(i, j) });
      i = j;
    }
  }
  return jetons;
}

const OU = new Set(["ou", "or", "|"]);
const ET = new Set(["et", "and", "&"]);
const SAUF = new Set(["sauf", "not", "non"]);

/** Toutes les clés que `champ` sait lire — pour distinguer `de:` de `bidule:`. */
const CONNUES = new Set([
  ...Object.keys(CHAMPS),
  "est", "is", "avec", "has",
  "dans", "in", "dossier", "folder",
  "avant", "before", "depuis", "apres", "after",
]);

export function parse(requete: string): Noeud {
  const jetons = decouper(requete);
  let p = 0;
  const fini = () => p >= jetons.length;
  const voir = () => jetons[p];
  const motMinuscule = () => (voir()?.k === "mot" ? laver(voir().v) : null);

  const lireOu = (): Noeud => {
    const termes = [lireEt()];
    while (!fini() && OU.has(motMinuscule() ?? "")) {
      p++;
      /* « a OU » en fin de frappe : on rend ce qu'on a plutôt qu'un arbre bancal. */
      if (fini()) break;
      termes.push(lireEt());
    }
    return ou(termes);
  };

  const lireEt = (): Noeud => {
    const termes: Noeud[] = [];
    while (!fini()) {
      const m = motMinuscule();
      if (voir().k === ")" || (m && OU.has(m))) break;
      if (m && ET.has(m)) {
        p++;
        continue;
      }
      termes.push(lireUnaire());
    }
    return et(termes);
  };

  const lireUnaire = (): Noeud => {
    const m = motMinuscule();
    if (m && SAUF.has(m)) {
      p++;
      if (fini()) return { t: "texte", valeur: voir()?.v ?? m };
      return { t: "sauf", enfant: lireUnaire() };
    }
    if (voir().k === "mot" && voir().v.startsWith("-") && voir().v.length > 1) {
      jetons[p] = { k: "mot", v: voir().v.slice(1) };
      return { t: "sauf", enfant: lireUnaire() };
    }
    return lireTerme();
  };

  const lireTerme = (): Noeud => {
    const j = jetons[p++];
    if (j.k === "(") {
      const dedans = lireOu();
      /* Parenthèse jamais refermée : on prend ce qu'il y a et on continue. */
      if (!fini() && voir().k === ")") p++;
      return dedans;
    }
    if (j.k === ")") return { t: "tout" };
    if (j.k === "phrase") return { t: "texte", valeur: laver(j.v) };

    const sep = j.v.indexOf(":");
    if (sep > 0) {
      const cle = laver(j.v.slice(0, sep));
      let valeur = j.v.slice(sep + 1);
      /* **La valeur peut être le jeton d'après.** `de:"Claire Dubois"` pour une
         phrase ; et surtout `de: claire`, **avec l'espace**, qui est ce qu'on
         tape — c'est même ce que la palette montre sous le champ, la clé en gras
         puis sa valeur. Sans cette tolérance, `de:` ne contraignait rien et
         « claire » redevenait un mot nu : la recherche cherchait partout en
         ayant l'air de viser l'expéditeur. Signalé sur `de: Thierry`, qui
         remontait des messages de Google et d'OVHcloud.

         Un connecteur ne se laisse pas avaler (`de: OU x`), ni un autre champ
         (`de: objet:devis`) : ce sont des termes à part entière. */
      if (!valeur && !fini() && voir().k === "phrase") valeur = jetons[p++].v;
      else if (!valeur && !fini() && voir().k === "mot" && valeurPossible(voir().v)) valeur = jetons[p++].v;
      const noeud = champ(cle, valeur);
      if (noeud) return noeud;
    }
    return { t: "texte", valeur: laver(j.v) };
  };

  return lireOu();
}

/** Un mot qui peut servir de valeur à la clé qui précède : ni connecteur, ni champ. */
function valeurPossible(v: string): boolean {
  const lave = laver(v);
  if (OU.has(lave) || ET.has(lave) || SAUF.has(lave)) return false;
  if (v.startsWith("-")) return false;
  const sep = v.indexOf(":");
  return sep <= 0 || !CONNUES.has(laver(v.slice(0, sep)));
}

/** Un `cle:valeur` reconnu, ou `null` — auquel cas il redevient du texte. */
function champ(cle: string, valeur: string): Noeud | null {
  const lave = laver(valeur);
  /* **Un champ connu sans valeur ne contraint rien.** On tape `de:` avant de
     taper `de:claire`, et voir la liste se vider entre les deux fait croire
     qu'il n'y a rien à trouver. Une clé inconnue, elle, redevient du texte. */
  if (!lave) return CONNUES.has(cle) ? { t: "tout" } : null;

  if (CHAMPS[cle]) return { t: "champ", champ: CHAMPS[cle], valeur: lave };
  if (cle === "est" || cle === "is") {
    const d = DRAPEAUX[lave];
    return d ? { t: "drapeau", drapeau: d.drapeau, attendu: d.attendu } : null;
  }
  if (cle === "avec" || cle === "has") {
    const d = DRAPEAUX[lave];
    return d ? { t: "drapeau", drapeau: d.drapeau, attendu: d.attendu } : null;
  }
  if (cle === "dans" || cle === "in" || cle === "dossier" || cle === "folder") {
    const f = DOSSIERS[lave];
    return f ? { t: "dossier", dossier: f } : null;
  }
  if (cle === "avant" || cle === "before") {
    const d = date(lave);
    return d === null ? null : { t: "date", sens: "avant", borne: d };
  }
  if (cle === "depuis" || cle === "apres" || cle === "after") {
    const d = date(lave);
    return d === null ? null : { t: "date", sens: "depuis", borne: d };
  }
  return null;
}

/**
 * Une date, telle qu'on la tape.
 *
 * Trois formes, parce qu'aucune ne suffit : la date absolue (`2026-09-01`),
 * les deux mots qu'on emploie tout le temps (`hier`, `aujourd'hui`), et la
 * durée relative (`7j`) — « depuis:7j » est la question qu'on pose vraiment.
 * Toutes se ramènent au **début du jour** : chercher « depuis hier » et rater
 * les messages du matin serait absurde.
 */
export function date(v: string): number | null {
  const jour = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const maintenant = new Date();
  if (v === "aujourdhui" || v === "aujourd'hui" || v === "today") return jour(maintenant);
  if (v === "hier" || v === "yesterday") return jour(maintenant) - 864e5;
  const relatif = /^(\d+)\s*(j|d|jours?|days?)$/.exec(v);
  if (relatif) return jour(maintenant) - Number(relatif[1]) * 864e5;
  const absolu = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (absolu) return new Date(Number(absolu[1]), Number(absolu[2]) - 1, Number(absolu[3])).getTime();
  return null;
}
