import "server-only";

import {
  ImapFlow,
  type FetchMessageObject,
  type FetchQueryObject,
  type MessageAddressObject,
} from "imapflow";
import { simpleParser } from "mailparser";

import type { StoredAccount } from "@/lib/accounts/server";
import type { Contact, FolderId, Message, Thread } from "@/lib/types";
import { apercuDe } from "./apercu";
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
export async function withImap<T>(
  account: StoredAccount,
  password: string,
  run: (client: ImapFlow) => Promise<T>,
): Promise<T> {
  const client = await connect(account, password);
  try {
    return await run(client);
  } finally {
    await client.logout().catch(() => {
      /* La connexion est morte : rien à sauver, et l'erreur d'origine compte plus. */
    });
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
  const list = await client.list();
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
 * Regrouper des messages en fils.
 *
 * IMAP ne connaît pas la notion de fil : ce sont les en-têtes qui la portent.
 * On relie par `Message-ID` / `In-Reply-To` / `References` — la seule méthode
 * exacte — et on retombe sur l'objet normalisé pour les correspondants qui
 * répondent sans ces en-têtes, ce qui arrive plus souvent qu'on ne voudrait.
 */
function groupIntoThreads(messages: FetchMessageObject[]): FetchMessageObject[][] {
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
    const subject = bareSubject(m.envelope?.subject ?? "");
    if (subject) {
      const s = `subj:${subject}`;
      if (!parent.has(s)) parent.set(s, s);
      union(own, s);
    }
  }

  const groups = new Map<string, FetchMessageObject[]>();
  for (const m of messages) {
    const root = find(key(m));
    const group = groups.get(root);
    if (group) group.push(m);
    else groups.set(root, [m]);
  }
  return [...groups.values()].map((g) => g.sort((a, b) => a.uid - b.uid));
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
 * Un fil sans espace : le fournisseur n'en connaît pas, c'est le store qui
 * tamponne à la réception (voir `stamp` dans `store.ts`).
 */
function toThread(group: FetchMessageObject[], path: string, folder: FolderId): Thread {
  const last = group[group.length - 1];
  const messages: Message[] = group.map((m) => ({
    id: threadId(path, m.uid),
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
    id: threadId(path, last.uid),
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

/** Les derniers fils d'un dossier, du plus récent au plus ancien. */
export async function readFolder(
  client: ImapFlow,
  path: string,
  folder: FolderId,
  options: { flaggedOnly?: boolean; limit?: number } = {},
): Promise<Thread[]> {
  const lock = await client.getMailboxLock(path);
  try {
    const box = client.mailbox;
    const total = typeof box === "object" ? box.exists : 0;
    if (!total) return [];

    const limit = options.limit ?? WINDOW;
    const messages: FetchMessageObject[] = [];

    if (options.flaggedOnly) {
      const uids = await client.search({ flagged: true }, { uid: true });
      const recent = (uids || []).slice(-limit);
      if (recent.length === 0) return [];
      for await (const m of client.fetch(recent, ENVELOPE_QUERY, { uid: true })) messages.push(m);
    } else {
      /* Par numéro de séquence : « les `limit` derniers » se dit `n:*`, et le
         serveur n'a rien à chercher. */
      const from = Math.max(1, total - limit + 1);
      for await (const m of client.fetch(`${from}:*`, ENVELOPE_QUERY)) messages.push(m);
    }

    const threads = groupIntoThreads(messages).map((g) => toThread(g, path, folder));
    return threads.sort((a, b) => (a.messages.at(-1)!.date < b.messages.at(-1)!.date ? 1 : -1));
  } finally {
    lock.release();
  }
}

/**
 * Marquer lu, mettre en favori, déplacer.
 *
 * Le vocabulaire de l'app traduit en drapeaux IMAP, et c'est le seul endroit
 * où cette traduction existe. Un déplacement change l'UID donc l'identifiant
 * du fil : celui qu'on a en main devient périmé, et c'est la relecture du
 * dossier qui rend les nouveaux — d'où le fait qu'on referme la conversation
 * en la déplaçant.
 */
export async function writeThread(
  client: ImapFlow,
  id: string,
  patch: { unread?: boolean; starred?: boolean; path?: string },
): Promise<void> {
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
      await client.messageMove(range, patch.path, uid);
    }
  } finally {
    lock.release();
  }
}

/** Un message entier, corps et pièces jointes : ce que `readFolder` ne rapporte pas. */
export async function readThread(
  client: ImapFlow,
  id: string,
  folder: FolderId,
): Promise<Thread | null> {
  const parsed = parseThreadId(id);
  if (!parsed) return null;
  const lock = await client.getMailboxLock(parsed.path);
  try {
    /* **Un seul aller-retour** : l'enveloppe et la source dans le même `FETCH`.
       C'était `fetchOne` puis `download`, deux commandes là où le serveur sait
       tout donner d'un coup — et sur une connexion qui vit le temps d'une
       requête, chaque aller-retour se voit. */
    const envelope = await client.fetchOne(
      String(parsed.uid),
      { ...ENVELOPE_QUERY, source: true },
      { uid: true },
    );
    if (!envelope || !envelope.source) return null;
    const mime = await simpleParser(envelope.source);

    /* On hydrate le message ouvert, pas tout le fil : c'est celui qu'on
       regarde, et chaque corps de plus est un aller-retour de plus. */
    const thread = toThread([envelope], parsed.path, folder);
    const body = (mime.text ?? "").trim();
    thread.messages[0].body = body;

    /* La plupart des messages sont écrits en HTML, et une infolettre lue en
       texte n'est plus qu'une liste d'URL entre crochets. On la lave ici, une
       fois, côté serveur : le navigateur ne voit jamais le HTML d'origine. */
    if (mime.html) {
      const propre = nettoyer(mime.html, inlineImages(mime.attachments));
      thread.messages[0].html = propre.html;
      thread.messages[0].blockedImages = propre.bloquees;
      /* L'aperçu vient du texte quand il existe, du HTML lavé sinon : un
         message en HTML seul n'avait aucune ligne de résumé. */
      if (!body) thread.messages[0].body = propre.texte.slice(0, 2000);
    }

    const apercu = thread.messages[0].body;
    thread.snippet = apercu.split("\n").find((line) => line.trim())?.slice(0, 140) ?? "";

    /* Les images du corps ne sont pas des pièces jointes : elles sont déjà
       dans le message, les lister ferait une rangée de fichiers fantômes. */
    thread.messages[0].attachments = mime.attachments
      .filter((a) => !a.cid || !a.contentType?.startsWith("image/"))
      .map((a, i) => ({
      id: `${id} ${i}`,
      name: a.filename ?? `pièce jointe ${i + 1}`,
      mime: a.contentType,
      size: a.size,
    }));
    return thread;
  } finally {
    lock.release();
  }
}
