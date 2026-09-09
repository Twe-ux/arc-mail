import type { Message } from "@/lib/types";

/**
 * **Le cache des corps.** Ce qui manquait pour qu'ouvrir un message déjà lu
 * soit instantané.
 *
 * Les enveloppes survivent déjà à un rechargement (`enMemoire`, dans le
 * store) : la liste s'affiche tout de suite. Les corps, non — ils étaient
 * retirés parce qu'ils pèsent, et `localStorage` tient dans cinq mégaoctets,
 * s'écrit de façon **synchrone** et bloquerait le fil principal à chaque
 * frappe du store. Une seule infolettre avec ses images en `data:` le remplit.
 *
 * Donc IndexedDB, à côté du store et jamais dedans : asynchrone, large, et
 * écrit quand le corps arrive, pas à chaque changement d'état.
 *
 * **Un corps est immuable.** C'est ce qui rend ce cache simple : un message
 * reçu ne change plus jamais. Rien à invalider, seulement à évincer. Ce qui
 * bouge — lu/non lu, favori, dossier, étiquettes — vit dans l'enveloppe, qui
 * est relue à chaque lecture de liste.
 *
 * **L'enveloppe fait foi.** L'identifiant d'un message est `chemin uid`, et un
 * `UIDVALIDITY` qui change renumérote toute la boîte : le même identifiant
 * désignerait alors un autre message. On garde donc la date et l'expéditeur
 * avec le corps, et une entrée qui ne leur correspond plus est jetée au lieu
 * d'être servie. Un mauvais corps sous un bon objet serait pire que pas de
 * cache du tout.
 *
 * Ce sont des messages en clair sur l'appareil, comme les enveloppes : la
 * déconnexion les efface (`viderCorps`, appelé par `useSignOut`).
 */

const BASE = "arc-mail-corps";
const VERSION = 1;
/** Les corps eux-mêmes, un enregistrement par message. */
const CORPS = "corps";
/** Leur poids et leur date d'écriture — petits, pour évincer sans tout relire. */
const POIDS = "poids";

/**
 * Au-delà, on ne garde pas : c'est une infolettre qui porte ses images en
 * `data:`, elle remplirait le cache à elle seule et se relit en une requête.
 */
const MAX_MESSAGE = 2_000_000;
/** Ce que le cache ne dépasse pas, en tout. */
const MAX_POIDS = 20_000_000;
const MAX_ENTREES = 600;

/** Ce qu'un corps ajoute à une enveloppe. */
export type CorpsConnu = Pick<
  Message,
  "body" | "html" | "blockedImages" | "desabonnement" | "attachments"
>;

type Entree = CorpsConnu & {
  id: string;
  /** L'enveloppe telle qu'elle était : de quoi refuser un identifiant réattribué. */
  date: string;
  from: string;
};

type Fiche = { id: string; poids: number; ecrit: number };

let base: Promise<IDBDatabase | null> | null = null;

/**
 * Ouvrir, une fois. Un navigateur sans IndexedDB — ou en navigation privée,
 * où l'ouverture échoue — rend `null` : le cache **n'est jamais une
 * dépendance**, tout ce qui l'appelle sait s'en passer.
 */
function ouvrir(): Promise<IDBDatabase | null> {
  if (base) return base;
  base = new Promise<IDBDatabase | null>((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    let demande: IDBOpenDBRequest;
    try {
      demande = indexedDB.open(BASE, VERSION);
    } catch {
      return resolve(null);
    }
    demande.onupgradeneeded = () => {
      const db = demande.result;
      if (!db.objectStoreNames.contains(CORPS)) db.createObjectStore(CORPS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(POIDS)) db.createObjectStore(POIDS, { keyPath: "id" });
    };
    demande.onsuccess = () => resolve(demande.result);
    demande.onerror = () => resolve(null);
    demande.onblocked = () => resolve(null);
  });
  return base;
}

const attendre = <T>(demande: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    demande.onsuccess = () => resolve(demande.result);
    demande.onerror = () => reject(demande.error);
  });

/** Ce que pèse un corps, à peu près : les deux chaînes qui font tout le poids. */
const pese = (m: Message) => (m.body?.length ?? 0) + (m.html?.length ?? 0);

/**
 * Ce que le cache connaît de ces enveloppes.
 *
 * On lui passe les **enveloppes**, pas des identifiants : c'est ce qui permet
 * de vérifier que l'entrée parle bien du même message.
 */
export async function lireCorps(enveloppes: Message[]): Promise<Map<string, CorpsConnu>> {
  const connus = new Map<string, CorpsConnu>();
  if (enveloppes.length === 0) return connus;
  const db = await ouvrir();
  if (!db) return connus;
  try {
    const tx = db.transaction(CORPS, "readonly");
    const magasin = tx.objectStore(CORPS);
    const lots = await Promise.all(
      enveloppes.map((m) => attendre<Entree | undefined>(magasin.get(m.id)).catch(() => undefined)),
    );
    lots.forEach((entree, i) => {
      const enveloppe = enveloppes[i];
      if (!entree || !entree.body) return;
      /* L'enveloppe fait foi : une boîte renumérotée ne sert pas un autre
         message sous le même identifiant. */
      if (entree.date !== enveloppe.date || entree.from !== enveloppe.from.email) return;
      connus.set(enveloppe.id, {
        body: entree.body,
        html: entree.html,
        blockedImages: entree.blockedImages,
        desabonnement: entree.desabonnement,
        attachments: entree.attachments,
      });
    });
  } catch {
    /* Une lecture ratée n'est pas une erreur : c'est un cache vide. */
  }
  return connus;
}

/**
 * Garder ce qui vient d'arriver. Sans attendre, et sans jamais faire échouer
 * l'appelant : personne ne l'a demandé.
 */
export function garderCorps(messages: Message[]): void {
  void ecrire(messages).catch(() => {});
}

async function ecrire(messages: Message[]): Promise<void> {
  const gardables = messages.filter((m) => m.body && pese(m) <= MAX_MESSAGE);
  if (gardables.length === 0) return;
  const db = await ouvrir();
  if (!db) return;
  const ecrit = Date.now();
  const tx = db.transaction([CORPS, POIDS], "readwrite");
  const corps = tx.objectStore(CORPS);
  const poids = tx.objectStore(POIDS);
  for (const m of gardables) {
    const entree: Entree = {
      id: m.id,
      date: m.date,
      from: m.from.email,
      body: m.body,
      html: m.html,
      blockedImages: m.blockedImages,
      desabonnement: m.desabonnement,
      attachments: m.attachments,
    };
    corps.put(entree);
    poids.put({ id: m.id, poids: pese(m), ecrit } satisfies Fiche);
  }
  await new Promise<void>((resolve) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
  await evincer(db);
}

/**
 * Faire de la place.
 *
 * On évince le plus anciennement **écrit**, pas le plus anciennement lu :
 * tenir un vrai LRU demanderait de réécrire un enregistrement d'un mégaoctet
 * pour y changer une date. Les fiches de poids, elles, sont minuscules — c'est
 * pour ça qu'elles vivent dans leur propre magasin.
 */
async function evincer(db: IDBDatabase): Promise<void> {
  try {
    const lecture = db.transaction(POIDS, "readonly");
    const fiches = await attendre<Fiche[]>(lecture.objectStore(POIDS).getAll());
    const total = fiches.reduce((n, f) => n + f.poids, 0);
    if (total <= MAX_POIDS && fiches.length <= MAX_ENTREES) return;

    fiches.sort((a, b) => b.ecrit - a.ecrit);
    const aJeter: string[] = [];
    let garde = 0;
    fiches.forEach((f, rang) => {
      garde += f.poids;
      if (garde > MAX_POIDS || rang >= MAX_ENTREES) aJeter.push(f.id);
    });
    if (aJeter.length === 0) return;

    const tx = db.transaction([CORPS, POIDS], "readwrite");
    for (const id of aJeter) {
      tx.objectStore(CORPS).delete(id);
      tx.objectStore(POIDS).delete(id);
    }
  } catch {
    /* Le cache reste un peu trop gros : ce n'est pas une raison de parler. */
  }
}

/** Partir sans rien laisser. Appelé par la déconnexion, avec les enveloppes. */
export async function viderCorps(): Promise<void> {
  try {
    const db = await ouvrir();
    if (!db) return;
    const tx = db.transaction([CORPS, POIDS], "readwrite");
    tx.objectStore(CORPS).clear();
    tx.objectStore(POIDS).clear();
  } catch {
    /* Rien à effacer, ou rien d'ouvrable. */
  }
}
