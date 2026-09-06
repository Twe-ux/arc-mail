import { threadMatchesFolder } from "@/lib/store";
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

function partout(t: Thread): string {
  const connu = cache.get(t);
  if (connu !== undefined) return connu;
  const morceaux = [t.subject, t.snippet, ...t.labels];
  for (const m of t.messages) {
    morceaux.push(m.from.name, m.from.email, m.body);
    for (const c of [...m.to, ...(m.cc ?? [])]) morceaux.push(c.name, c.email);
    for (const p of m.attachments ?? []) morceaux.push(p.name);
  }
  const lave = laver(morceaux.filter(Boolean).join(" "));
  /* Le fil est **remplacé** à chaque écriture du store, jamais muté : une
     entrée périmée n'existe pas, et la clé faible laisse partir les fils que la
     liste a oubliés. */
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
