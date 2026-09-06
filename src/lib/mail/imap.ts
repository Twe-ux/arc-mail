import "server-only";

import { createHash } from "node:crypto";

import {
  ImapFlow,
  type FetchMessageObject,
  type FetchQueryObject,
  type ListResponse,
  type SearchObject,
  type MessageAddressObject,
} from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";

import type { StoredAccount } from "@/lib/accounts/server";
import type { RechercheImap } from "@/lib/search/imap";
import type { Contact, FolderId, Message, Thread } from "@/lib/types";
import { apercuDe } from "./apercu";
import { lireListUnsubscribe } from "./desabonnement";
import { inlineImages, nettoyer } from "./html";

/**
 * IMAP, côté serveur uniquement.
 *
 * Sur Vercel chaque requête ouvre une connexion, lit, et ferme : il n'y a pas
 * de processus qui vit entre deux requêtes pour tenir une session ouverte.
 * C'est 1 à 2 s par lecture, et c'est le prix du serverless — le tirage pour
 * rafraîchir existe déjà, le push (IMAP IDLE) demandera un vrai serveur.
 *
 * Le vocabulaire de l'app (`unread`, `starred`, `folder`) est traduit ici, et
 * nulle part ailleurs : `\Seen` inversé, `\Flagged`, un chemin de dossier.
 */

/**
 * Ce qu'une lecture rapporte du serveur : l'enveloppe, et **les premiers
 * octets du corps** pour la ligne d'aperçu.
 *
 * Les deux dans la même commande : un aperçu qui coûterait un aller-retour de
 * plus par message ne vaudrait pas la ligne qu'il donne. 2 Ko suffisent à
 * remplir 200 caractères, même une fois l'encodage défait.
 *
 * `bodyParts` passe par `BODY.PEEK` — lire un aperçu ne marque pas comme lu.
 */
const APERCU_OCTETS = 2048;

const ENVELOPE_QUERY: FetchQueryObject = {
  uid: true,
  flags: true,
  envelope: true,
  headers: ["references"],
  bodyParts: [{ key: "TEXT", start: 0, maxLength: APERCU_OCTETS }],
};

/** Combien de messages une boîte rend par lecture. Au-delà, iCloud rame et personne ne défile. */
const WINDOW = 60;

export async function connect(account: StoredAccount, password: string): Promise<ImapFlow> {
  const client = new ImapFlow({
    host: account.imapHost ?? "imap.mail.me.com",
    port: account.imapPort ?? 993,
    secure: true,
    auth: { user: account.email, pass: password },
    /* Rien à journaliser dans une fonction serverless, et le journal par
       défaut recopie les commandes — dont celle qui porte le mot de passe. */
    logger: false,
    /* Une requête, une lecture, un logout : garder IDLE ouvert coûterait un
       aller-retour de plus à chaque commande pour rien. */
    disableAutoIdle: true,
  });
  await client.connect();
  return client;
}

/** Ouvre, fait, ferme — quoi qu'il arrive. */
/**
 * Les connexions gardées entre deux requêtes, par compte.
 *
 * **Ce qui coûte dans une lecture, c'est d'arriver** : résolution DNS, poignée
 * de main TLS, `LOGIN`, `SELECT`. Le `FETCH` lui-même est court. Rouvrir tout
 * ça à chaque appel, c'est payer le trajet plus cher que la course.
 *
 * Sur Vercel, une instance sert plusieurs requêtes tant qu'elle reste chaude :
 * la deuxième lecture retrouve la connexion de la première. Elle ne survit pas
 * à une instance neuve — le premier appel après un moment paie toujours le
 * trajet. Sur un hébergeur qui fait tourner un vrai processus, la même carte
 * garde ses connexions ouvertes en permanence, et c'est là que ça change tout.
 *
 * **La clé est l'empreinte des identifiants**, pas celle du compte. Brancher
 * une boîte vérifie la connexion *avant* d'enregistrer la ligne, donc sous un
 * identifiant provisoire que tout le monde partage : une clé faite du seul
 * identifiant aurait rendu à l'un la session ouverte de l'autre. Avec
 * l'adresse, l'hôte et le mot de passe dans l'empreinte, une connexion n'est
 * reprise que par des identifiants rigoureusement identiques — et un mot de
 * passe faux n'hérite jamais d'une session déjà authentifiée.
 */
const ouvertes = new Map<string, { client: ImapFlow; expire: number }>();

/** Le mot de passe n'est pas gardé : seulement de quoi reconnaître le même. */
const empreinte = (account: StoredAccount, password: string) =>
  createHash("sha256")
    .update(`${account.id}\0${account.email}\0${account.imapHost ?? ""}\0${password}`)
    .digest("hex");

/** Au-delà, on rouvre : une session laissée trop longtemps est fermée d'en face. */
const GARDE = 4 * 60_000;

/** Une connexion morte peut ne jamais répondre : on n'attend pas sa réponse longtemps. */
const PING = 1500;

async function vivante(client: ImapFlow): Promise<boolean> {
  if (!client.usable) return false;
  try {
    await Promise.race([
      client.noop(),
      new Promise((_, non) => setTimeout(() => non(new Error("muette")), PING)),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function reprendre(cle: string): Promise<ImapFlow | null> {
  const gardee = ouvertes.get(cle);
  if (!gardee) return null;
  ouvertes.delete(cle);
  if (Date.now() > gardee.expire || !(await vivante(gardee.client))) {
    await gardee.client.logout().catch(() => {});
    return null;
  }
  return gardee.client;
}

/**
 * Ouvre (ou reprend), fait, garde — et ferme pour de bon si quelque chose a
 * cassé.
 *
 * Une connexion sur laquelle une commande a échoué ne retourne **pas** dans la
 * carte : on ne sait pas dans quel état elle est, et la garder ferait échouer
 * la requête suivante pour la faute de celle-ci.
 */
export async function withImap<T>(
  account: StoredAccount,
  password: string,
  run: (client: ImapFlow) => Promise<T>,
): Promise<T> {
  const cle = empreinte(account, password);
  const client = (await reprendre(cle)) ?? (await connect(account, password));
  try {
    const resultat = await run(client);
    /* Deux requêtes en parallèle sur la même instance ouvrent chacune la
       leur : sans ça, la seconde à ranger écraserait la première, qui ne
       serait plus jamais fermée. */
    const deja = ouvertes.get(cle);
    if (deja && deja.client !== client) await deja.client.logout().catch(() => {});
    ouvertes.set(cle, { client, expire: Date.now() + GARDE });
    return resultat;
  } catch (error) {
    await client.logout().catch(() => {
      /* La connexion est morte : rien à sauver, et l'erreur d'origine compte plus. */
    });
    throw error;
  }
}

/**
 * Le chemin réel de chacun de nos dossiers, sur ce serveur-là.
 *
 * On ne devine pas les noms : iCloud dit « Sent Messages », Gmail
 * « [Gmail]/Messages envoyés », et tout cela change avec la langue du compte.
 * Le serveur les annonce lui-même par les attributs SPECIAL-USE ; `INBOX` est
 * la seule constante du protocole.
 */
export async function folderPaths(client: ImapFlow): Promise<Partial<Record<FolderId, string>>> {
  return cheminsDepuis(await client.list());
}

/**
 * La correspondance elle-même, à partir d'une liste déjà lue.
 *
 * Séparée de l'appel pour que le comptage des non-lus, qui demande la même
 * liste avec les `STATUS` en plus, n'ait pas à la redemander — ni à recopier
 * les attributs SPECIAL-USE, qui sont la seule chose à ne pas se tromper ici.
 */
function cheminsDepuis(list: ListResponse[]): Partial<Record<FolderId, string>> {
  const bySpecial = (use: string) => list.find((f) => f.specialUse === use)?.path;
  return {
    inbox: "INBOX",
    sent: bySpecial("\\Sent"),
    drafts: bySpecial("\\Drafts"),
    trash: bySpecial("\\Trash"),
    /* Gmail n'a pas d'« Archive » : archiver, chez lui, c'est retirer le
       libellé `INBOX`, et le dossier qui reste tout est annoncé `\All`. Le
       repli le rend équivalent sans que le reste de l'app ait à le savoir. */
    archive: bySpecial("\\Archive") ?? bySpecial("\\All"),
  };
}

/**
 * Combien de non-lus dans chacun de nos dossiers, en **un** aller-retour.
 *
 * `LIST` avec `statusQuery` : le serveur rend les dossiers et leur `UNSEEN`
 * ensemble, au lieu d'un `STATUS` par dossier. Le compte est celui du serveur,
 * pas le nôtre : c'est justement ce qu'on n'a pas en mémoire.
 *
 * **Favoris et « En pause » n'y sont pas**, et ne peuvent pas y être : le
 * premier est un drapeau réparti sur toute la boîte, le second n'a aucun
 * dossier derrière lui. Ils gardent le compte local.
 */
export async function unreadByFolder(
  client: ImapFlow,
  inboxPath?: string,
): Promise<Partial<Record<FolderId, number>>> {
  const list = await client.list({ statusQuery: { unseen: true } });
  const unseen = new Map(list.map((f) => [f.path, f.status?.unseen ?? 0]));
  /* La « Réception » d'un espace-vue est un autre dossier : c'est son compte
     qu'il faut, pas celui d'`INBOX`. */
  const chemins = { ...cheminsDepuis(list), inbox: inboxPath || "INBOX" };

  const comptes: Partial<Record<FolderId, number>> = {};
  for (const [id, chemin] of Object.entries(chemins)) {
    /* Un dossier que le serveur n'a pas annoncé n'est pas un zéro : c'est une
       absence, et le compte local vaut mieux qu'un chiffre inventé. */
    if (chemin && unseen.has(chemin)) comptes[id as FolderId] = unseen.get(chemin)!;
  }
  return comptes;
}

/** Tous les dossiers de la boîte, pour choisir celui qui fera office de réception. */
export async function listFolders(
  client: ImapFlow,
): Promise<{ path: string; name: string; unseen: number }[]> {
  const list = await client.list({ statusQuery: { unseen: true } });
  return list
    .filter((f) => !f.flags?.has("\\Noselect"))
    .map((f) => ({ path: f.path, name: f.name, unseen: f.status?.unseen ?? 0 }));
}

const contact = (a: MessageAddressObject | undefined): Contact => ({
  name: a?.name?.trim() || a?.address || "",
  email: a?.address ?? "",
});

const contacts = (list: MessageAddressObject[] | undefined): Contact[] => (list ?? []).map(contact);

/** « Re: Fwd: Objet » vers « objet » : ce qui reste quand on enlève les préfixes de réponse. */
function bareSubject(subject: string): string {
  return subject
    .replace(/^((re|ré|fwd|fw|tr)\s*(\[\d+\])?\s*:\s*)+/i, "")
    .trim()
    .toLowerCase();
}

/**
 * Un message **et sa boîte**.
 *
 * Un UID ne veut rien dire sans son dossier, et un fil peut désormais tenir
 * dans deux boîtes à la fois : la réception porte ce qu'on a reçu, « Envoyés »
 * ce qu'on a répondu. Chaque message emporte donc son chemin ; celui du fil ne
 * sert plus que de défaut, pour tout ce qui n'a jamais quitté sa boîte.
 */
type Situe = FetchMessageObject & { arcPath?: string };

const chemin = (m: Situe, defaut: string) => m.arcPath ?? defaut;

/** La date d'un message, pour trier un fil qui vient de deux boîtes : les UID
 *  de deux dossiers ne se comparent pas. */
const quand = (m: FetchMessageObject) => (m.envelope?.date ?? new Date(0)).getTime();

/** « Re: », « Fwd: », « Tr : » — ce message se présente comme une réponse. */
function estReponse(subject: string): boolean {
  return /^((re|ré|rép|fwd|fw|tr)\s*(\[\d+\])?\s*:\s*)+/i.test(subject.trim());
}

/** Les correspondants d'un message, **nous en moins**. */
function correspondants(m: FetchMessageObject, moi?: string): Set<string> {
  const mien = moi?.toLowerCase();
  const set = new Set<string>();
  for (const liste of [m.envelope?.from, m.envelope?.to, m.envelope?.cc]) {
    for (const a of liste ?? []) {
      const adresse = a?.address?.toLowerCase();
      if (adresse && adresse !== mien) set.add(adresse);
    }
  }
  return set;
}

/**
 * Regrouper des messages en fils.
 *
 * IMAP ne connaît pas la notion de fil : ce sont les en-têtes qui la portent.
 * On relie par `Message-ID` / `In-Reply-To` / `References` — la seule méthode
 * exacte — et on retombe sur l'objet pour les correspondants qui répondent
 * sans ces en-têtes, ce qui arrive plus souvent qu'on ne voudrait.
 *
 * **L'objet ne suffit jamais à lui seul.** Il a suffi, et quatre fiches de
 * salaire envoyées le même jour à quatre personnes différentes — même objet,
 * aucun lien entre elles — se sont retrouvées dans un seul fil, sous le nom du
 * dernier destinataire. Deux conditions maintenant, et il faut les deux :
 *
 * 1. **L'un des deux se présente comme une réponse** (`Re:`, `Fwd:`, `Tr :`).
 *    Deux messages d'origine ne se rejoignent donc plus jamais par leur objet :
 *    un envoi n'est pas la réponse d'un autre envoi. C'est la condition qui
 *    manquait, et à elle seule elle corrige le cas ci-dessus.
 * 2. **Ils ont un correspondant en commun**, nous exclus. Sans quoi la réponse
 *    d'Eva à « Fiche de salaire » rejoindrait l'exemplaire envoyé à Pedro : on
 *    est des deux côtés de tout notre courrier, notre propre adresse ne prouve
 *    donc aucun lien. Deux messages qui n'ont plus personne une fois nous
 *    retirés — un mot qu'on s'écrit à soi-même — comptent comme se croisant :
 *    c'est le seul cas où l'absence de correspondant est le lien.
 *
 * Ce qu'on y perd : une réponse sans `References` **et** sans `Re:` ne
 * s'attache plus. Elle est alors indistinguable d'un message neuf, et
 * l'attacher à l'un des quatre au hasard serait pire que de ne rien faire.
 */
function groupIntoThreads(messages: Situe[], moi?: string): Situe[][] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const up = parent.get(x);
    if (up === undefined || up === x) return x;
    const root = find(up);
    parent.set(x, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  const key = (m: FetchMessageObject) => `uid:${m.uid}`;

  for (const m of messages) {
    const own = key(m);
    if (!parent.has(own)) parent.set(own, own);
    const ids = [m.envelope?.messageId, m.envelope?.inReplyTo].filter(Boolean) as string[];
    const refs = (m.headers?.toString() ?? "").match(/<[^>]+>/g) ?? [];
    for (const id of [...ids, ...refs]) {
      if (!parent.has(id)) parent.set(id, id);
      union(own, id);
    }
  }

  /* La reprise par l'objet, par paires : un seau par objet normalisé, et
     dedans, deux messages ne se rejoignent que s'ils passent les deux
     conditions. Un seau tient dans une page de soixante messages ; comparer
     ses paires ne coûte rien. */
  const seaux = new Map<string, FetchMessageObject[]>();
  for (const m of messages) {
    const s = bareSubject(m.envelope?.subject ?? "");
    if (!s) continue;
    const seau = seaux.get(s);
    if (seau) seau.push(m);
    else seaux.set(s, [m]);
  }
  const gens = new Map<number, Set<string>>();
  const partis = (m: FetchMessageObject) => {
    let set = gens.get(m.uid);
    if (!set) gens.set(m.uid, (set = correspondants(m, moi)));
    return set;
  };
  for (const seau of seaux.values()) {
    if (seau.length < 2) continue;
    for (let i = 0; i < seau.length; i++) {
      for (let j = i + 1; j < seau.length; j++) {
        const a = seau[i];
        const b = seau[j];
        if (find(key(a)) === find(key(b))) continue;
        if (!estReponse(a.envelope?.subject ?? "") && !estReponse(b.envelope?.subject ?? "")) continue;
        const pa = partis(a);
        const pb = partis(b);
        const croise =
          (pa.size === 0 && pb.size === 0) || [...pa].some((adresse) => pb.has(adresse));
        if (!croise) continue;
        union(key(a), key(b));
      }
    }
  }

  const groups = new Map<string, FetchMessageObject[]>();
  for (const m of messages) {
    const root = find(key(m));
    const group = groups.get(root);
    if (group) group.push(m);
    else groups.set(root, [m]);
  }
  /* **Par date, plus par UID** : un fil peut venir de deux boîtes, et les UID
     de deux dossiers ne se comparent pas. À date égale l'UID départage, pour
     que deux messages de la même minute gardent un ordre stable. */
  return [...groups.values()].map((g) => g.sort((a, b) => quand(a) - quand(b) || a.uid - b.uid));
}

/**
 * L'identifiant d'un fil : le dossier et l'UID de son dernier message.
 *
 * Un UID n'a de sens que dans son dossier, et il **change quand le message
 * est déplacé** — d'où le dossier dedans, et d'où le fait qu'un déplacement
 * rende un nouvel identifiant plutôt que de garder l'ancien.
 */
export const threadId = (path: string, uid: number) => `${path} ${uid}`;

export function parseThreadId(id: string): { path: string; uid: number } | null {
  const cut = id.lastIndexOf(" ");
  if (cut < 0) return null;
  const uid = Number(id.slice(cut + 1));
  return Number.isFinite(uid) ? { path: id.slice(0, cut), uid } : null;
}

/**
 * Le fragment de corps rendu par le serveur, quelle que soit la façon dont il
 * nomme la partie.
 *
 * Une lecture partielle revient en `BODY[TEXT]<0>`, et imapflow garde l'octet
 * d'origine dans la clé : chercher « text » à l'identique manquerait la
 * réponse. On prend donc la première partie dont la clé commence par là.
 */
const fragment = (m: FetchMessageObject): Buffer | undefined => {
  for (const [cle, valeur] of m.bodyParts ?? []) {
    if (cle.toLowerCase().startsWith("text")) return valeur;
  }
  return undefined;
};

/**
 * Un en-tête du message analysé, en chaîne.
 *
 * `mailparser` rend soit une chaîne, soit une structure déjà découpée selon
 * l'en-tête ; `headerLines` garde la ligne d'origine, qui est ce qu'on veut
 * quand on relit soi-même la syntaxe.
 */
function entete(mime: ParsedMail, nom: string): string | undefined {
  const ligne = mime.headerLines?.find((h) => h.key === nom);
  if (!ligne) return undefined;
  const deuxPoints = ligne.line.indexOf(":");
  return deuxPoints < 0 ? undefined : ligne.line.slice(deuxPoints + 1).trim();
}

/**
 * Un fil sans espace : le fournisseur n'en connaît pas, c'est le store qui
 * tamponne à la réception (voir `stamp` dans `store.ts`).
 */
function toThread(group: Situe[], path: string, folder: FolderId): Thread {
  const last = group[group.length - 1];
  /* **L'identité du fil reste dans la boîte qu'on regarde.** Un fil fondu se
     termine souvent par notre propre réponse, qui vit dans « Envoyés » : en
     faire l'identifiant enverrait le prochain archivage écrire là-bas au lieu
     de la réception. On prend donc le dernier message **de cette boîte**. */
  const sien = [...group].reverse().find((m) => chemin(m, path) === path) ?? last;
  const messages: Message[] = group.map((m) => ({
    id: threadId(chemin(m, path), m.uid),
    from: contact(m.envelope?.from?.[0]),
    to: contacts(m.envelope?.to),
    cc: m.envelope?.cc?.length ? contacts(m.envelope.cc) : undefined,
    date: (m.envelope?.date ?? new Date()).toISOString(),
    /* Vide à la liste : le corps arrive par `getThread` quand on ouvre. Lire
       soixante messages entiers pour afficher soixante lignes coûterait des
       secondes, et presque tout serait jeté. */
    body: "",
  }));

  return {
    id: threadId(path, sien.uid),
    spaceId: "",
    folder,
    subject: last.envelope?.subject?.trim() || "(sans objet)",
    /* Le début du dernier message, décodé : c'est ce que la liste montre sous
       l'objet. Vide si le fragment n'a pas pu être lu — une ligne absente vaut
       mieux qu'une ligne fausse. */
    snippet: apercuDe(fragment(last)),
    labels: [],
    unread: group.some((m) => !m.flags?.has("\\Seen")),
    starred: group.some((m) => m.flags?.has("\\Flagged")),
    messages,
  };
}

/**
 * Les fils d'un dossier qui répondent à une requête.
 *
 * C'est le débouché du second compilateur : l'arbre devient un `SEARCH`, le
 * serveur rend des UID, et on ne descend que les enveloppes de ceux-là. La
 * différence avec la recherche en mémoire n'est pas la précision — c'est
 * **l'étendue** : ⌘K ne voyait que les 150 enveloppes gardées, ici c'est toute
 * la boîte.
 *
 * On garde les **derniers** UID, pas les premiers : un `SEARCH` rend ses
 * résultats du plus ancien au plus récent, et personne ne cherche pour lire
 * l'e-mail le plus vieux qui corresponde.
 */
export async function searchFolder(
  client: ImapFlow,
  path: string,
  folder: FolderId,
  critere: RechercheImap,
  limit = 40,
  moi?: string,
): Promise<Thread[]> {
  const lock = await client.getMailboxLock(path);
  try {
    const uids = await client.search(critere as SearchObject, { uid: true });
    const derniers = (uids || []).slice(-limit);
    if (derniers.length === 0) return [];
    const messages: FetchMessageObject[] = [];
    for await (const m of client.fetch(derniers, ENVELOPE_QUERY, { uid: true })) messages.push(m);
    return groupIntoThreads(messages, moi)
      .map((g) => toThread(g, path, folder))
      .sort((a, b) => (a.messages.at(-1)!.date < b.messages.at(-1)!.date ? 1 : -1));
  } finally {
    lock.release();
  }
}

/**
 * Combien d'« Envoyés » on relit pour fondre nos réponses dans les fils.
 *
 * Moins que la fenêtre d'un dossier : ce qu'on cherche est récent par nature —
 * nos réponses aux fils que la liste montre. Au-delà, on paierait un fetch pour
 * des messages dont l'autre moitié n'est plus à l'écran.
 */
const ENVOYES = 40;

/**
 * Nos propres réponses, lues dans « Envoyés » pour être fondues dans les fils.
 *
 * **Pourquoi il faut aller les chercher** : IMAP range une conversation dans
 * autant de boîtes qu'elle a de sens. Ce qu'on reçoit est dans la réception, ce
 * qu'on répond dans « Envoyés » — et une lecture de dossier ne rapporte qu'un
 * dossier. Un fil rouvert après rechargement ne montrait donc **que la moitié
 * reçue** : nos réponses n'y étaient plus, alors qu'elles étaient bien dans
 * « Envoyés ». Avant le rechargement elles s'y trouvaient par l'écriture
 * optimiste, ce qui faisait un défaut qui n'apparaissait qu'au retour.
 *
 * Le coût est réel et assumé : un SELECT et un FETCH de plus par lecture de
 * liste. C'est ce que font les clients qui montrent une conversation entière.
 */
async function lireEnvoyes(client: ImapFlow, path: string): Promise<Situe[]> {
  const lock = await client.getMailboxLock(path);
  try {
    const box = client.mailbox;
    const total = typeof box === "object" ? box.exists : 0;
    if (!total) return [];
    const from = Math.max(1, total - ENVOYES + 1);
    const messages: Situe[] = [];
    for await (const m of client.fetch(`${from}:*`, ENVELOPE_QUERY)) {
      messages.push(Object.assign(m, { arcPath: path }));
    }
    return messages;
  } catch {
    /* Une boîte sans « Envoyés », ou qui refuse : le fil garde sa moitié reçue
       plutôt que la lecture entière échoue. */
    return [];
  } finally {
    lock.release();
  }
}

/** Les derniers fils d'un dossier, du plus récent au plus ancien. */
export async function readFolder(
  client: ImapFlow,
  path: string,
  folder: FolderId,
  options: { flaggedOnly?: boolean; limit?: number; deja?: number; moi?: string; sentPath?: string } = {},
): Promise<Thread[]> {
  const lock = await client.getMailboxLock(path);
  let rendu = false;
  try {
    const box = client.mailbox;
    const total = typeof box === "object" ? box.exists : 0;
    if (!total) return [];

    const limit = options.limit ?? WINDOW;
    const deja = Math.max(0, options.deja ?? 0);
    if (deja >= total) return [];
    const messages: Situe[] = [];

    if (options.flaggedOnly) {
      const uids = await client.search({ flagged: true }, { uid: true });
      /* La page suivante se prend **avant** celle qu'on a déjà : la liste est
         du plus ancien au plus récent, donc on coupe par la fin. */
      const tous = uids || [];
      const fin = tous.length - deja;
      const recent = tous.slice(Math.max(0, fin - limit), fin);
      if (recent.length === 0) return [];
      for await (const m of client.fetch(recent, ENVELOPE_QUERY, { uid: true })) messages.push(m);
    } else {
      /* Par numéro de séquence : « les `limit` derniers » se dit `n:*`, et le
         serveur n'a rien à chercher. Une page plus ancienne est la fenêtre
         d'avant — `deja` messages plus haut, bornée des deux côtés. */
      const dernier = total - deja;
      const from = Math.max(1, dernier - limit + 1);
      if (from > dernier) return [];
      for await (const m of client.fetch(deja === 0 ? `${from}:*` : `${from}:${dernier}`, ENVELOPE_QUERY))
        messages.push(m);
    }

    /* Le verrou tombe ici : on ne peut sélectionner qu'une boîte à la fois, et
       la suite va lire « Envoyés ». */
    lock.release();
    rendu = true;

    const envoyes =
      options.sentPath && options.sentPath !== path ? await lireEnvoyes(client, options.sentPath) : [];

    /* **Seuls les fils qui existent ici.** Fondre ajoute nos réponses aux fils
       de cette boîte ; un fil qui n'est *que* dans « Envoyés » n'a rien à faire
       dans la réception — il est déjà dans le dossier « Envoyés ». */
    const propres = new Set(messages.map((m) => m.uid));
    const threads = groupIntoThreads([...messages, ...envoyes], options.moi)
      .filter((g) => g.some((m) => !m.arcPath && propres.has(m.uid)))
      .map((g) => toThread(g, path, folder));
    return threads.sort((a, b) => (a.messages.at(-1)!.date < b.messages.at(-1)!.date ? 1 : -1));
  } finally {
    if (!rendu) lock.release();
  }
}

/**
 * Marquer lu, mettre en favori, déplacer — et **rendre l'identifiant d'après**.
 *
 * Le vocabulaire de l'app traduit en drapeaux IMAP, et c'est le seul endroit
 * où cette traduction existe.
 *
 * **Un déplacement change l'UID, donc l'identifiant du fil.** Celui qu'on avait
 * en main ne désigne plus rien : le garder, c'était un fil fantôme dans la
 * liste et un second exemplaire à la relecture du dossier d'arrivée. `MOVE`
 * rend une table `ancien UID → nouvel UID` quand le serveur annonce `UIDPLUS`
 * (iCloud et Gmail le font tous les deux) ; on s'en sert pour reconstruire
 * l'identifiant. Sans elle, on rend `null` : déplacé, mais on ne sait pas où,
 * et c'est la prochaine lecture du dossier qui le retrouvera.
 */
export async function writeThread(
  client: ImapFlow,
  id: string,
  patch: { unread?: boolean; starred?: boolean; path?: string },
): Promise<string | null> {
  const parsed = parseThreadId(id);
  if (!parsed) throw new Error(`Identifiant de conversation illisible : « ${id} »`);
  const lock = await client.getMailboxLock(parsed.path);
  try {
    const range = [parsed.uid];
    const uid = { uid: true } as const;

    if (patch.unread !== undefined) {
      const seen = ["\\Seen"];
      if (patch.unread) await client.messageFlagsRemove(range, seen, uid);
      else await client.messageFlagsAdd(range, seen, uid);
    }
    if (patch.starred !== undefined) {
      const flagged = ["\\Flagged"];
      if (patch.starred) await client.messageFlagsAdd(range, flagged, uid);
      else await client.messageFlagsRemove(range, flagged, uid);
    }
    /* Le déplacement en dernier : après lui, l'UID de départ ne désigne plus
       rien dans ce dossier, et les drapeaux n'auraient plus de cible. */
    if (patch.path && patch.path !== parsed.path) {
      /* `messageMove` rend `false` quand rien n'a bougé (aucun message ne
         correspondait au critère) : ce n'est pas une table vide, c'est un
         déplacement qui n'a pas eu lieu — le fil garde alors son identifiant. */
      const bouge = await client.messageMove(range, patch.path, uid);
      if (!bouge) return id;
      const arrivee = bouge.uidMap?.get(parsed.uid);
      return arrivee ? threadId(patch.path, arrivee) : null;
    }
    return id;
  } finally {
    lock.release();
  }
}

/**
 * Plusieurs messages entiers, en **une** ouverture de dossier et **un** `FETCH`.
 *
 * C'est ce que le préchargement demande. Trois appels à `readThread`, c'est
 * trois requêtes HTTP, trois instances possiblement froides et trois sessions
 * IMAP ; ici la boîte est verrouillée une fois et les UID partent ensemble.
 *
 * Les identifiants sont regroupés par dossier : rien n'oblige les fils d'une
 * même demande à venir du même, et un verrou par dossier suffit.
 *
 * Un message illisible ne fait pas échouer les autres — c'est un préchargement,
 * son échec doit rester sans conséquence.
 *
 * **Un budget d'octets, pas seulement un nombre.** Dix messages courts font
 * 30 Ko ; dix infolettres avec leurs images en `data:` en font plusieurs
 * mégaoctets, et c'est le forfait mobile de quelqu'un. On s'arrête quand la
 * réponse est pleine, et les fils qui n'y tiennent pas seront lus à
 * l'ouverture — le préchargement est un bonus, jamais une dette.
 *
 * **`source` passe en `BODY.PEEK`** (imapflow le fait pour toute lecture de
 * corps) : précharger ne marque **pas** comme lu. Sans ça, la boîte se serait
 * vidée de ses non-lus toute seule.
 */
const BUDGET = 1_200_000;
export async function readThreads(
  client: ImapFlow,
  ids: string[],
  folder: FolderId,
): Promise<Thread[]> {
  const parDossier = new Map<string, number[]>();
  for (const id of ids) {
    const parsed = parseThreadId(id);
    if (!parsed) continue;
    parDossier.set(parsed.path, [...(parDossier.get(parsed.path) ?? []), parsed.uid]);
  }

  const fils: Thread[] = [];
  let poids = 0;
  for (const [path, uids] of parDossier) {
    if (poids > BUDGET) break;
    const lock = await client.getMailboxLock(path);
    try {
      for await (const message of client.fetch(uids, { ...ENVELOPE_QUERY, source: true }, { uid: true })) {
        if (!message.source) continue;
        try {
          const fil = await complet([message], path, folder);
          fils.push(fil);
          const lu = fil.messages[0];
          poids += (lu.html?.length ?? 0) + lu.body.length;
          if (poids > BUDGET) break;
        } catch {
          /* Ce message-là ne sera pas préchargé, les autres si. */
        }
      }
    } finally {
      lock.release();
    }
  }
  return fils;
}

/**
 * Un fil lu de bout en bout : les corps, le HTML lavé, les pièces.
 *
 * Écrit une fois et appelé par les trois lectures — un message ouvert, un
 * préchargement, un fil entier — pour qu'un fil arrive dans le même état quelle
 * que soit la porte par laquelle il entre.
 *
 * **Il remplit tous les messages qu'on lui donne**, et c'est le correctif du
 * 6 septembre : il n'en remplissait qu'un — celui dont l'UID nomme le fil,
 * c'est-à-dire le dernier. Les précédents gardaient leur corps vide, donc leur
 * squelette, **pour toujours** : « pourquoi je n'ai pas tous les messages de la
 * conversation ? ». Un fil de trois messages n'en montrait qu'un.
 */
async function complet(messages: Situe[], path: string, folder: FolderId): Promise<Thread> {
  const thread = toThread(messages, path, folder);
  await Promise.all(messages.map((m, i) => remplirMessage(thread, i, m, chemin(m, path))));

  /* L'aperçu du fil vient du **dernier** message : c'est celui que la liste
     résume, et c'est lui que le fil porte comme objet. */
  const dernier = thread.messages[thread.messages.length - 1];
  thread.snippet = dernier.body.split("\n").find((line) => line.trim())?.slice(0, 140) ?? thread.snippet;
  return thread;
}

/** Un message du fil, rempli depuis sa source. */
async function remplirMessage(
  thread: Thread,
  index: number,
  message: FetchMessageObject,
  path: string,
): Promise<void> {
  const mime = await simpleParser(message.source!);
  const id = threadId(path, message.uid);
  const cible = thread.messages[index];
  const body = (mime.text ?? "").trim();
  cible.body = body;

  /* La plupart des messages sont écrits en HTML, et une infolettre lue en
     texte n'est plus qu'une liste d'URL entre crochets. On la lave ici, une
     fois, côté serveur : le navigateur ne voit jamais le HTML d'origine. */
  if (mime.html) {
    const propre = nettoyer(mime.html, inlineImages(mime.attachments));
    cible.html = propre.html;
    cible.blockedImages = propre.bloquees;
    /* L'aperçu vient du texte quand il existe, du HTML lavé sinon : un message
       en HTML seul n'aurait aucune ligne de résumé. */
    if (!body) cible.body = propre.texte.slice(0, 2000);
  }

  /* **Le désabonnement se lit dans l'en-tête, pas au fond du message.**
     `List-Unsubscribe` est déjà là dans presque toutes les infolettres ; le
     lire coûte zéro aller-retour de plus, la source est déjà en main. */
  const desabonnement = lireListUnsubscribe(entete(mime, "list-unsubscribe"));
  if (desabonnement) cible.desabonnement = desabonnement;

  /* Un corps vide et pas de HTML, c'est un message sans texte — une invitation,
     une pièce jointe seule. Le dire : sinon l'affichage ne peut pas distinguer
     « rien à lire » de « pas encore arrivé », et montrerait un squelette pour
     l'éternité. */
  if (!cible.body && !cible.html) {
    cible.body = "(Message sans texte)";
  }

  /* Les images du corps ne sont pas des pièces jointes : elles sont déjà dans
     le message, les lister ferait une rangée de fichiers fantômes. */
  cible.attachments = piecesDe(mime).map((a, i) => ({
    id: `${id} ${i}`,
    name: a.filename ?? `pièce jointe ${i + 1}`,
    mime: a.contentType,
    size: a.size,
  }));
}

/**
 * Les pièces d'un message, dans l'ordre où l'app les nomme.
 *
 * Écrit une fois : `complet` numérote les pièces jointes en les listant, et la
 * lecture d'une pièce doit retrouver **exactement** la même liste, sinon le
 * numéro désigne un autre fichier. Les images du corps (`cid:`) en sont
 * exclues des deux côtés.
 */
const piecesDe = (mime: ParsedMail) =>
  mime.attachments.filter((a) => !a.cid || !a.contentType?.startsWith("image/"));

/** Une pièce jointe, lue à la demande pour être servie au navigateur. */
export async function readAttachment(
  client: ImapFlow,
  threadIdent: string,
  index: number,
): Promise<{ name: string; mime: string; content: Buffer } | null> {
  const parsed = parseThreadId(threadIdent);
  if (!parsed) return null;
  const lock = await client.getMailboxLock(parsed.path);
  try {
    const message = await client.fetchOne(String(parsed.uid), { source: true }, { uid: true });
    if (!message || !message.source) return null;
    const piece = piecesDe(await simpleParser(message.source))[index];
    if (!piece) return null;
    return {
      name: piece.filename ?? `piece-${index + 1}`,
      mime: piece.contentType || "application/octet-stream",
      content: piece.content as Buffer,
    };
  } finally {
    lock.release();
  }
}

/**
 * Un fil entier, corps et pièces jointes : ce que `readFolder` ne rapporte pas.
 *
 * **Tous ses messages, pas seulement le dernier.** L'identifiant d'un fil est
 * l'UID de son dernier message ; lire ce seul UID laissait les précédents avec
 * un corps vide, donc un squelette qui ne se remplissait jamais — « pourquoi je
 * n'ai pas tous les messages de la conversation ? ». Les autres UID viennent du
 * client, qui tient déjà le fil : chaque identifiant de message porte le sien
 * (`threadId(path, uid)`), et les redécouvrir côté serveur demanderait de
 * relire et regrouper tout le dossier.
 *
 * **Un seul aller-retour** : les enveloppes et les sources dans le même
 * `FETCH`. C'était `fetchOne` puis `download`, deux commandes là où le serveur
 * sait tout donner d'un coup — et sur une connexion qui vit le temps d'une
 * requête, chaque aller-retour se voit.
 */
export async function readThread(
  client: ImapFlow,
  id: string,
  folder: FolderId,
  messageIds?: string[],
): Promise<Thread | null> {
  const parsed = parseThreadId(id);
  if (!parsed) return null;
  /* **Les UID, rangés par boîte.** Un fil fondu tient dans deux dossiers — la
     réception pour ce qu'on a reçu, « Envoyés » pour ce qu'on a répondu —, et
     un UID n'a de sens que dans le sien. On ne peut sélectionner qu'une boîte à
     la fois : c'est donc un tour par boîte, et celle du fil toujours dedans —
     un client qui n'envoie rien retombe sur l'ancien comportement plutôt que
     sur une liste vide. */
  const parBoite = new Map<string, number[]>();
  for (const x of [...(messageIds ?? []), id].map(parseThreadId)) {
    if (!x) continue;
    const deja = parBoite.get(x.path);
    if (deja) {
      if (!deja.includes(x.uid)) deja.push(x.uid);
    } else parBoite.set(x.path, [x.uid]);
  }

  const messages: Situe[] = [];
  for (const [path, uids] of parBoite) {
    const lock = await client.getMailboxLock(path);
    try {
      for await (const m of client.fetch([...uids].sort((a, b) => a - b), { ...ENVELOPE_QUERY, source: true }, { uid: true })) {
        if (m.source) messages.push(Object.assign(m, { arcPath: path }));
      }
    } catch {
      /* Cette boîte-là ne répond pas : le fil garde ce que les autres ont
         rendu, plutôt que de ne rien rendre du tout. */
    } finally {
      lock.release();
    }
  }
  if (messages.length === 0) return null;
  /* Deux boîtes, donc l'ordre est celui des dates : les UID ne se comparent
     pas d'un dossier à l'autre. */
  messages.sort((a, b) => quand(a) - quand(b) || a.uid - b.uid);
  return await complet(messages, parsed.path, folder);
}
