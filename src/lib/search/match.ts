import { cestNous, threadMatchesFolder } from "@/lib/store";
import type { Contact, Message, Thread } from "@/lib/types";
import type { Noeud } from "./ast";
import { laver } from "./parse";

/**
 * Le premier compilateur de l'arbre : **celui qui filtre ce qu'on a déjà**.
 *
 * Il ne demande rien à personne — la liste est en mémoire, la réponse est
 * immédiate, et c'est ce qui fait qu'on peut chercher pendant qu'on tape. Le
 * second compilateur, qui écrira un `SEARCH` IMAP pour ce qu'on n'a pas
 * chargé, lira le même arbre : c'est tout l'intérêt de l'avoir.
 *
 * **Il cherche dans ce qui est là, et le dit.** Un fil dont le corps n'est pas
 * encore descendu ne se laisse chercher que par son objet, son aperçu et ses
 * correspondants — l'aperçu voyage avec l'enveloppe, donc il y a toujours de
 * quoi. Chercher un mot du corps dans un fil non ouvert demande le serveur, et
 * c'est le travail de l'autre compilateur.
 */
export function correspond(n: Noeud, t: Thread): boolean {
  switch (n.t) {
    case "tout":
      return true;
    case "et":
      return n.enfants.every((e) => correspond(e, t));
    case "ou":
      return n.enfants.some((e) => correspond(e, t));
    case "sauf":
      return !correspond(n.enfant, t);
    case "texte":
      return partout(t).includes(n.valeur);
    case "champ":
      if (n.champ === "objet") return laver(t.subject).includes(n.valeur);
      if (n.champ === "de") return t.messages.some((m) => dansContacts([m.from], n.valeur));
      return t.messages.some((m) => dansContacts([...m.to, ...(m.cc ?? [])], n.valeur));
    case "drapeau":
      if (n.drapeau === "non-lu") return t.unread === n.attendu;
      if (n.drapeau === "favori") return t.starred === n.attendu;
      return t.messages.some((m) => (m.attachments?.length ?? 0) > 0) === n.attendu;
    case "dossier":
      return threadMatchesFolder(t, n.dossier);
    case "date": {
      const d = dateDuFil(t);
      if (d === null) return false;
      /* `avant:` est **exclusif du jour nommé**, `depuis:` l'inclut : « avant
         hier » ne doit pas rendre les messages d'hier, « depuis hier » doit
         les rendre tous. Les deux bornes sont des débuts de journée. */
      return n.sens === "avant" ? d < n.borne : d >= n.borne;
    }
  }
}

/** Tout ce qu'un fil offre à un mot nu, lavé une fois et gardé. */
const cache = new WeakMap<Thread, string>();

/**
 * Les morceaux d'un fil qu'un mot nu peut atteindre, dans l'ordre où on les
 * montrerait — c'est aussi celui où `extrait` les fouille pour dire *pourquoi*
 * un fil est là.
 *
 * **Notre propre identité n'en est pas.** Elle est dans les destinataires de
 * tout le courrier reçu et dans l'expéditeur de tout celui qu'on écrit :
 * chercher son propre prénom rendait la boîte entière, et sur une ligne qui ne
 * montre ni destinataire ni corps, rien n'expliquait ces résultats. Signalé sur
 * « Thierry », qui remontait toute la réception. Les autres correspondants
 * restent cherchables — un mot nu les trouve, et `à:` les vise —, y compris
 * dans Envoyés où l'expéditeur est toujours nous. Le corps, lui, reste entier :
 * « Bonjour Thierry » est une vraie mention, et l'extrait la montre.
 */
function morceauxDe(t: Thread): string[] {
  const morceaux = [t.subject, t.snippet];
  for (const m of t.messages) {
    if (!cestNous(m.from.email)) morceaux.push(entier(m.from));
    morceaux.push(m.body);
    for (const c of [...m.to, ...(m.cc ?? [])]) {
      if (!cestNous(c.email)) morceaux.push(entier(c));
    }
    for (const p of m.attachments ?? []) morceaux.push(p.name);
  }
  morceaux.push(...t.labels);
  return morceaux.filter(Boolean);
}

/** Un correspondant d'un seul tenant : trouvé dans la copie, l'extrait montre
 *  qui c'est, pas seulement l'adresse qui a répondu. */
function entier(c: Contact): string {
  return c.name ? `${c.name} <${c.email}>` : c.email;
}

function partout(t: Thread): string {
  const connu = cache.get(t);
  if (connu !== undefined) return connu;
  const lave = laver(morceauxDe(t).join(" "));
  /* Le fil est **remplacé** à chaque écriture du store, jamais muté : une
     entrée périmée n'existe pas, et la clé faible laisse partir les fils que la
     liste a oubliés. Brancher un compte de plus change ce que `cestNous`
     répond sans toucher aux fils — mais un compte de plus recharge la liste. */
  cache.set(t, lave);
  return lave;
}

function dansContacts(gens: Contact[], v: string): boolean {
  return gens.some((c) => laver(c.name).includes(v) || laver(c.email).includes(v));
}

/** La date du fil, c'est celle de son dernier message. */
function dateDuFil(t: Thread): number | null {
  const dernier: Message | undefined = t.messages[t.messages.length - 1];
  if (!dernier) return null;
  const d = Date.parse(dernier.date);
  return Number.isNaN(d) ? null : d;
}

/**
 * **Pourquoi ce fil est là**, quand la rangée ne le montre pas.
 *
 * Une rangée de résultat porte l'objet et l'expéditeur. Un mot nu, lui, cherche
 * aussi dans l'aperçu, le corps, les correspondants et les pièces jointes : le
 * fil remonte alors sans que rien ne s'y surligne, et la liste a l'air fausse
 * — c'est exactement ce que la règle de la fiche interdit, « un résultat qui ne
 * montre pas pourquoi il est là oblige à relire la ligne entière ».
 *
 * On rend donc le morceau qui a répondu, taillé autour du mot. `null` quand
 * l'objet ou l'expéditeur portent déjà tous les mots : la ligne se suffit, et
 * une troisième ligne de plus la surchargerait pour rien.
 */
export function extrait(t: Thread, mots: string): string | null {
  const cherches = mots.split(" ").filter((m) => m.length >= 2);
  if (cherches.length === 0) return null;
  const dernier = t.messages[t.messages.length - 1];
  const visible = laver(`${t.subject} ${dernier?.from.name ?? ""}`);
  const manquant = cherches.find((m) => !visible.includes(m));
  if (manquant === undefined) return null;
  /* **La source la plus riche l'emporte**, pas la première venue : l'aperçu est
     la première ligne du corps, donc « Salut Thierry, » gagnait contre la phrase
     entière qui suit. On garde la fenêtre la plus large — et l'aperçu reprend la
     main quand le corps n'est pas encore descendu, ce qui est le cas de tout fil
     qu'on n'a pas ouvert. */
  let meilleur: string | null = null;
  for (const source of morceauxDe(t)) {
    const propre = source.replace(/\s+/g, " ").trim();
    const i = laver(propre).indexOf(manquant);
    if (i < 0) continue;
    const coupe = fenetre(propre, i, manquant.length);
    if (meilleur === null || coupe.length > meilleur.length) meilleur = coupe;
  }
  return meilleur;
}

/**
 * Une fenêtre autour du mot trouvé, coupée aux espaces.
 *
 * Plus court devant que derrière : ce qui suit le mot dit de quoi il retourne,
 * ce qui le précède sert seulement à ne pas commencer au milieu d'une syllabe.
 */
function fenetre(texte: string, i: number, n: number): string {
  const AVANT = 24;
  const APRES = 64;
  let debut = Math.max(0, i - AVANT);
  let fin = Math.min(texte.length, i + n + APRES);
  if (debut > 0) {
    const espace = texte.indexOf(" ", debut);
    if (espace >= 0 && espace < i) debut = espace + 1;
  }
  if (fin < texte.length) {
    const espace = texte.lastIndexOf(" ", fin);
    if (espace > i + n) fin = espace;
  }
  return `${debut > 0 ? "…" : ""}${texte.slice(debut, fin)}${fin < texte.length ? "…" : ""}`;
}
