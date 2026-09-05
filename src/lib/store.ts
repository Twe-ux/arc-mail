import { useMemo } from "react";
import { toast } from "sonner";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { renommerEspace } from "./accounts/actions";
import { firstLine } from "./format";
import { providerFor } from "./mail";
import { FOLDERS, SPACES } from "./mock-data";
import { resolveSpace } from "./theme";
import type { Attachment, ComposeDraft, Contact, FolderId, Message, Space, SpaceId, Thread } from "./types";

/** Partiel : un espace nouveau n'a pas encore de clé, et `?? []` est la lecture. */
type RecentMap = Partial<Record<SpaceId, string[]>>;

export type MailState = {
  spaceId: SpaceId;
  folderId: FolderId;
  selectedThreadId: string | null;
  /** Reading pane next to the list (Arc split view) or full width. */
  splitView: boolean;
  unreadOnly: boolean;
  commandOpen: boolean;
  /** Mobile only: the sidebar drawer. */
  sidebarOpen: boolean;
  /** Desktop only: the sidebar folded away, the window kept. */
  sidebarCollapsed: boolean;
  /** The attachment being looked at, `null` when none; it lives in the open thread. */
  previewId: string | null;
  dark: boolean;
  /** Everything loaded so far, every space and folder; selectors slice it. */
  threads: Thread[];
  /** Spaces being read for the first time — nothing to show yet. Per space: a switch mid-read must not lie about the other one. */
  loading: Partial<Record<SpaceId, boolean>>;
  /** The last failed read of a space, for the list to show with a retry; cleared by the next successful read. */
  error: string | null;
  /** Why the last send failed, shown in the composer next to « Réessayer »; the message itself is back in `compose`. */
  sendError: string | null;
  /** Threads opened recently, per space — the "Today" tabs of Arc. */
  recent: RecentMap;
  /** The composer, `null` when closed. Its fields are the live form state. */
  compose: ComposeDraft | null;
  /** Hue chosen for a space, when the user changed its colour. */
  themes: Partial<Record<SpaceId, number>>;
  /**
   * Les espaces à afficher : ceux des comptes branchés, ou les trois de la
   * maquette tant qu'aucun compte ne l'est. Dans le store et non plus une
   * constante de module, parce qu'ils viennent maintenant du serveur.
   */
  spaces: Space[];

  /** Read every folder of a space from its provider and replace what we had. */
  /** Lit **un** dossier d'un espace. Le reste vient quand on y va. */
  loadSpace: (id?: SpaceId, folder?: FolderId) => Promise<void>;
  setSpace: (id: SpaceId) => void;
  setFolder: (id: FolderId) => void;
  selectThread: (id: string | null) => void;
  toggleStar: (id: string) => void;
  toggleUnread: (id: string) => void;
  moveThread: (id: string, folder: FolderId) => void;
  removeRecent: (id: string) => void;
  clearRecent: () => void;
  toggleSplit: () => void;
  setUnreadOnly: (value: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  /** Posé une fois par `SpacesInit`, avec ce que le serveur a lu. */
  setSpaces: (spaces: Space[]) => void;
  toggleSidebarCollapsed: () => void;
  setPreview: (attachmentId: string | null) => void;
  toggleDark: () => void;
  /**
   * Answers a thread. `to` narrows the recipients (répondre à une seule
   * personne) ; left out, everyone on the last message gets it.
   * Resolves `false` when the provider refused: the caller gives the text back.
   */
  reply: (threadId: string, body: string, to?: Contact[]) => Promise<boolean>;

  openCompose: (initial?: Partial<ComposeDraft>) => void;
  openDraft: (threadId: string) => void;
  updateCompose: (patch: Partial<ComposeDraft>) => void;
  /** Closes the composer, keeping the text as a draft unless it is blank. */
  closeCompose: () => void;
  sendMail: () => void;
  deleteDraft: (threadId: string) => void;
  setSpaceHue: (id: SpaceId, hue: number | null) => void;
  renameSpace: (id: SpaceId, patch: { name: string; icon: Space["icon"] }) => Promise<void>;
};

const MAX_RECENT = 8;
const NO_SUBJECT = "(sans objet)";

const patchThread = (threads: Thread[], id: string, patch: (t: Thread) => Thread) =>
  threads.map((t) => (t.id === id ? patch(t) : t));

/**
 * L'espace, lu dans l'état courant et jamais deviné : une écriture sur le
 * mauvais compte réel serait pire qu'une écriture manquée.
 */
const spaceOf = (spaceId: SpaceId): Space => {
  const space = useMail.getState().spaces.find((sp) => sp.id === spaceId);
  if (!space) throw new Error(`Espace inconnu « ${spaceId} »`);
  return space;
};

const accountOf = (spaceId: SpaceId) => spaceOf(spaceId).account;

/** Qui écrit depuis cet espace. Porté par l'espace, pas par une table d'adresses. */
const identityOf = (spaceId: SpaceId): Contact => spaceOf(spaceId).identity;

/** One thread as it was, put back in place — or back at the top when it had been removed. */
const restoreThread = (threads: Thread[], before: Thread) =>
  threads.some((t) => t.id === before.id) ? threads.map((t) => (t.id === before.id ? before : t)) : [before, ...threads];

/** Reads in flight, one counter per space: a response that is not the latest is dropped. */
const loadTokens = new Map<SpaceId, number>();

/** The people a reply goes to: everyone on the last message but us, or its sender alone. */
export function replyRecipients(t: Thread): Contact[] {
  const me = identityOf(t.spaceId);
  const last = t.messages[t.messages.length - 1];
  const seen = new Set<string>();
  const recipients = [last.from, ...last.to, ...(last.cc ?? [])].filter((c) => {
    if (c.email === me.email || seen.has(c.email)) return false;
    seen.add(c.email);
    return true;
  });
  return recipients.length ? recipients : [last.from];
}

/**
 * Le tampon d'espace, posé à la réception.
 *
 * Un fournisseur ne sait pas de quel espace on parle — un compte iCloud en
 * portera trois — donc il rend des fils sans espace et c'est ici qu'ils en
 * reçoivent un. Un seul endroit, celui qui sait.
 */
const stamp = (spaceId: SpaceId, threads: Thread[]): Thread[] =>
  threads.map((t) => (t.spaceId === spaceId ? t : { ...t, spaceId }));

const stampOne = (spaceId: SpaceId, thread: Thread): Thread =>
  thread.spaceId === spaceId ? thread : { ...thread, spaceId };

/**
 * Le fil de la liste, complété par ce que le fournisseur vient de lire.
 *
 * On ne le remplace pas : la liste a regroupé plusieurs messages en un fil,
 * la lecture n'en rend qu'un — remplacer perdrait les autres. On verse donc
 * les corps et les pièces jointes dans les messages qui portent le même
 * identifiant, et rien d'autre ne bouge.
 */
const hydrate = (before: Thread, full: Thread): Thread => ({
  ...before,
  snippet: full.snippet || before.snippet,
  messages: before.messages.map((m) => {
    const filled = full.messages.find((x) => x.id === m.id);
    return filled
      ? {
          ...m,
          body: filled.body,
          html: filled.html,
          blockedImages: filled.blockedImages,
          attachments: filled.attachments,
        }
      : m;
  }),
});

/**
 * Le contenu d'**un dossier** remplacé par une lecture fraîche ; le reste ne
 * bouge pas.
 *
 * Favoris fait exception : ce n'est pas un dossier mais une vue sur un
 * drapeau, et ses fils vivent ailleurs. On les fond dans ce qu'on a plutôt que
 * de remplacer une tranche qui n'existe pas — sans quoi ouvrir Favoris
 * effacerait la réception.
 */
const replaceFolder = (threads: Thread[], spaceId: SpaceId, folder: FolderId, fresh: Thread[]) => {
  const seen = new Set<string>();
  const kept = fresh.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
  const ids = new Set(kept.map((t) => t.id));
  if (folder === "starred") {
    return [...kept, ...threads.filter((t) => !ids.has(t.id))];
  }
  return [
    ...kept,
    ...threads.filter((t) => !ids.has(t.id) && !(t.spaceId === spaceId && t.folder === folder)),
  ];
};

const describe = (err: unknown) => (err instanceof Error ? err.message : String(err));

const isBlank = (d: ComposeDraft) => {
  const signature = useMail.getState().spaces.find((sp) => sp.id === d.spaceId)?.signature ?? "";
  const body = (signature ? d.body.replace(`— ${signature}`, "") : d.body).trim();
  return d.to.length === 0 && d.cc.length === 0 && d.bcc.length === 0 && !d.subject.trim() && !body;
};

/** Known contacts across every thread, so a typed address gets its display name back. */
function contactBook(threads: Thread[]): Map<string, Contact> {
  const book = new Map<string, Contact>();
  for (const t of threads) {
    for (const m of t.messages) {
      for (const c of [m.from, ...m.to, ...(m.cc ?? []), ...(m.bcc ?? [])]) {
        if (!book.has(c.email)) book.set(c.email, c);
      }
    }
  }
  return book;
}

/** Une table indexée par espace, dont une clé change de nom. */
function renomme<T>(table: Partial<Record<SpaceId, T>>, de: SpaceId, vers: SpaceId) {
  if (!(de in table)) return table;
  const suite = { ...table };
  suite[vers] = suite[de];
  delete suite[de];
  return suite;
}

function toContacts(emails: string[], book: Map<string, Contact>): Contact[] {
  return emails.map((email) => book.get(email) ?? { name: email, email });
}

/**
 * Le stockage des préférences, qui **ne se laisse écrire qu'après avoir été
 * lu**.
 *
 * `skipHydration` retarde la lecture jusqu'après le montage, mais pas
 * l'écriture : zustand enregistre à *chaque* `set`. Or `SpacesInit` pose les
 * espaces venus du serveur **pendant le rendu**, donc avant cette lecture — et
 * cet enregistrement-là repartait des valeurs par défaut, écrasant dans
 * `localStorage` la teinte choisie et le thème sombre. Symptôme : tout
 * revenait à zéro à chaque rechargement, et seulement une fois un compte
 * branché (sans compte, `SpacesInit` ne se rend pas).
 *
 * Mesuré sur le vrai middleware : `setSpaces` avant `rehydrate()` réduisait
 * `{"themes":{"s1":210},"dark":true}` à `{"themes":{},"dark":false}`.
 *
 * Le garde-fou est ici plutôt que dans les composants parce que c'est la règle
 * qui compte : rien ne s'enregistre tant qu'on n'a pas lu ce qui existait.
 */
const preferences = createJSONStorage(() => {
  /* Lever ici sur le serveur, comme le défaut de zustand : la persistance
     reste inerte au lieu de faire tomber le rendu au premier `set`. */
  const local = localStorage;
  let lu = false;
  return {
    getItem: (nom) => {
      lu = true;
      return local.getItem(nom);
    },
    setItem: (nom, valeur) => {
      if (lu) local.setItem(nom, valeur);
    },
    removeItem: (nom) => local.removeItem(nom),
  };
});

export const useMail = create<MailState>()(
  persist(
    (set, get) => {
  /**
   * Optimistic writes: the interface has already changed, the provider is
   * told afterwards, and only a failure puts *that thread* back as it was —
   * not the whole list, which would undo every write that succeeded in the
   * meantime (three gestures in two seconds is normal, and IMAP answers in
   * one or two). The failure is said out loud, in a toast, because the
   * thread silently returning would read as a glitch. With the mock nothing
   * fails; with IMAP this is where a dropped connection lands.
   */
  const commit = (before: Thread, run: () => Promise<unknown>, undone: string) =>
    run().catch((err: unknown) => {
      set((s) => ({ threads: restoreThread(s.threads, before) }));
      toast.error(undone, { description: describe(err) });
    });

  return {
  spaceId: SPACES[0].id,
  folderId: "inbox",
  selectedThreadId: null,
  splitView: true,
  unreadOnly: false,
  commandOpen: false,
  sidebarOpen: false,
  sidebarCollapsed: false,
  previewId: null,
  dark: false,
  threads: [],
  loading: {},
  error: null,
  sendError: null,
  recent: { perso: [], pro: [], side: [] },
  compose: null,
  themes: {},
  spaces: SPACES,

  loadSpace: async (id, folderId) => {
    const spaceId = id ?? get().spaceId;
    const folder = folderId ?? get().folderId;
    const account = accountOf(spaceId);
    const token = (loadTokens.get(spaceId) ?? 0) + 1;
    loadTokens.set(spaceId, token);
    /* `loading` only while there is nothing to show: a refresh of a space we
       already have keeps the list on screen and swaps it when the read lands. */
    if (!get().threads.some((t) => t.spaceId === spaceId && threadMatchesFolder(t, folder)))
      set((s) => ({ loading: { ...s.loading, [spaceId]: true } }));
    const done = (patch: Partial<MailState>) =>
      set((s) => ({ ...patch, loading: { ...s.loading, [spaceId]: false } }));
    try {
      /* Un seul dossier, celui qu'on regarde. Les six en parallèle, c'étaient
         six connexions IMAP et six ouvertures de session pour afficher une
         seule liste ; le reste arrive quand on y va. Le prix : les compteurs
         de non-lus des autres dossiers attendent `listFolders`. */
      const fresh = await providerFor(account).listThreads(account, {
        folder,
        /* Quel dossier tient lieu de « Réception » **pour cet espace** : un
           compte iCloud en porte plusieurs, une par domaine. */
        inboxPath: spaceOf(spaceId).inboxPath,
      });
      /* Two reads of the same space can cross; only the latest one may land. */
      if (loadTokens.get(spaceId) !== token) return;
      set((s) => ({
        threads: replaceFolder(s.threads, spaceId, folder, stamp(spaceId, fresh)),
        loading: { ...s.loading, [spaceId]: false },
        error: null,
      }));
    } catch (err) {
      if (loadTokens.get(spaceId) !== token) return;
      done({ error: describe(err) });
    }
  },

  setSpace: (spaceId) => set({ spaceId, folderId: "inbox", selectedThreadId: null, unreadOnly: false }),

  setFolder: (folderId) => set({ folderId, selectedThreadId: null }),

  selectThread: (id) => {
    if (id === null) {
      set({ selectedThreadId: null, previewId: null });
      return;
    }
    const { spaceId, recent, threads } = get();
    const list = [id, ...(recent[spaceId] ?? []).filter((r) => r !== id)].slice(0, MAX_RECENT);
    const target = threads.find((t) => t.id === id);
    set((s) => ({
      selectedThreadId: id,
      previewId: null,
      recent: { ...recent, [spaceId]: list },
      threads: patchThread(s.threads, id, (t) => ({ ...t, unread: false })),
    }));
    if (!target) return;
    const account = accountOf(target.spaceId);

    if (target.unread) {
      commit(target, () => providerFor(account).modify(account, id, { unread: false }), "Impossible de marquer comme lu");
    }

    /* Une liste ne rapporte que des enveloppes : lire soixante corps pour en
       afficher un serait payer soixante fois trop. Le corps arrive donc à
       l'ouverture, et seulement s'il manque — le mock, lui, rend tout d'un
       coup et ne repasse jamais ici. */
    if (target.messages.every((m) => !m.body)) {
      providerFor(account)
        .getThread(account, id)
        .then((full) => {
          if (!full) return;
          set((s) => ({ threads: patchThread(s.threads, id, (t) => hydrate(t, full)) }));
        })
        .catch((err: unknown) => {
          toast.error("Impossible d'ouvrir ce message", { description: describe(err) });
        });
    }
  },

  toggleStar: (id) => {
    const before = get().threads;
    const t = before.find((x) => x.id === id);
    if (!t) return;
    set({ threads: patchThread(before, id, (x) => ({ ...x, starred: !x.starred })) });
    const account = accountOf(t.spaceId);
    commit(t, () => providerFor(account).modify(account, id, { starred: !t.starred }), t.starred ? "Toujours en favori" : "Impossible d'ajouter aux favoris");
  },

  toggleUnread: (id) => {
    const before = get().threads;
    const t = before.find((x) => x.id === id);
    if (!t) return;
    set({ threads: patchThread(before, id, (x) => ({ ...x, unread: !x.unread })) });
    const account = accountOf(t.spaceId);
    commit(t, () => providerFor(account).modify(account, id, { unread: !t.unread }), "Impossible de changer l'état de lecture");
  },

  moveThread: (id, folder) => {
    const before = get().threads;
    const t = before.find((x) => x.id === id);
    if (!t) return;
    set((s) => ({
      threads: patchThread(before, id, (x) => ({ ...x, folder })),
      selectedThreadId: s.selectedThreadId === id ? null : s.selectedThreadId,
    }));
    const account = accountOf(t.spaceId);
    const undone = { archive: "Archivage impossible, la conversation est de retour", trash: "Suppression impossible, la conversation est de retour" }[folder as string]
      ?? "Déplacement impossible, la conversation est de retour";
    commit(t, () => providerFor(account).modify(account, id, { folder }), undone);
  },

  removeRecent: (id) =>
    set((s) => ({
      recent: { ...s.recent, [s.spaceId]: (s.recent[s.spaceId] ?? []).filter((r) => r !== id) },
    })),

  clearRecent: () => set((s) => ({ recent: { ...s.recent, [s.spaceId]: [] } })),

  toggleSplit: () => set((s) => ({ splitView: !s.splitView })),
  setUnreadOnly: (unreadOnly) => set({ unreadOnly }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  setSpaces: (spaces) =>
    set((s) => {
      if (spaces.length === 0) return {};
      /* L'espace retenu au dernier passage peut ne plus exister : « perso »
         de la maquette n'est pas l'identifiant d'un compte. On retombe alors
         sur le premier, sinon toute lecture lèverait « espace inconnu ». */
      const spaceId = spaces.some((sp) => sp.id === s.spaceId) ? s.spaceId : spaces[0].id;
      return { spaces, spaceId, threads: [], selectedThreadId: null };
    }),
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setPreview: (previewId) => set({ previewId }),
  toggleDark: () => set((s) => ({ dark: !s.dark })),

  reply: async (threadId, body, only) => {
    const before = get().threads;
    const t = before.find((x) => x.id === threadId);
    if (!t) return false;
    const me = identityOf(t.spaceId);
    const to = only?.length ? only : replyRecipients(t);
    set({
      threads: patchThread(before, threadId, (x) => ({
        ...x,
        snippet: firstLine(body),
        messages: [...x.messages, { id: `msg-local-${Date.now()}`, from: me, to, date: new Date().toISOString(), body }],
      })),
    });
    const account = accountOf(t.spaceId);
    try {
      const sent = await providerFor(account).send(account, {
        from: me, to, subject: t.subject, body, replyTo: threadId,
      });
      /* On **complète** le fil, on ne le remplace pas. Le mock rend le fil
         entier, IMAP rend la copie rangée dans « Envoyés » : la remplacer
         perdrait les messages précédents, et surtout l'identifiant du fil
         deviendrait celui de la copie — les drapeaux suivants iraient écrire
         dans « Envoyés » au lieu de la réception. */
      const ecrit = sent.messages.at(-1);
      set((s) => ({
        threads: patchThread(s.threads, threadId, (x) => ({
          ...x,
          messages: ecrit ? [...x.messages.slice(0, -1), ecrit] : x.messages,
        })),
      }));
      return true;
    } catch (err) {
      /* The thread goes back to what it was; the text goes back to the box
         (the caller keeps it), so nothing typed is lost. */
      set((s) => ({ threads: restoreThread(s.threads, t) }));
      toast.error("L'envoi de la réponse a échoué, votre texte est conservé", { description: describe(err) });
      return false;
    }
  },

  // ───────────── Composer ─────────────

  openCompose: (initial) =>
    set((s) => {
      const spaceId = initial?.spaceId ?? s.spaceId;
      const signature = s.spaces.find((sp) => sp.id === spaceId)?.signature ?? "";
      /* Les deux lignes vides ne servent qu'à **séparer** ce qu'on va écrire
         de ce qui suit — la signature, le message transféré. Sans rien après,
         elles laissaient un champ qui n'est pas vide : le repère « Écris ton
         message… » ne s'affichait pas, et le curseur tombait deux lignes plus
         bas que là où on écrit. Un compte réel n'a pas de signature tant qu'on
         ne l'a pas demandée, donc c'est le cas courant, pas le cas rare.
         Pas de tiret orphelin non plus, pour la même raison. */
      const body = `${signature ? `\n\n— ${signature}` : ""}${initial?.body ?? ""}`;
      return {
        compose: { spaceId, to: [], cc: [], bcc: [], subject: "", ...initial, body },
        sidebarOpen: false,
        commandOpen: false,
      };
    }),

  openDraft: (threadId) => {
    const t = get().threads.find((x) => x.id === threadId);
    if (!t) return;
    const m = t.messages[0];
    set({
      compose: {
        draftId: t.id,
        spaceId: t.spaceId,
        to: m.to.map((c) => c.email),
        cc: (m.cc ?? []).map((c) => c.email),
        bcc: (m.bcc ?? []).map((c) => c.email),
        subject: t.subject === NO_SUBJECT ? "" : t.subject,
        body: m.body,
      },
      sidebarOpen: false,
    });
  },

  updateCompose: (patch) => set((s) => (s.compose ? { compose: { ...s.compose, ...patch } } : {})),

  closeCompose: () => {
    const d = get().compose;
    if (!d) return;
    const before = get().threads;
    const account = accountOf(d.spaceId);
    const provider = providerFor(account);
    if (isBlank(d)) {
      const draft = d.draftId ? before.find((t) => t.id === d.draftId) : undefined;
      set({ compose: null, sendError: null, threads: draft ? before.filter((t) => t.id !== draft.id) : before });
      if (draft) commit(draft, () => provider.deleteDraft(account, draft.id), "Impossible de supprimer le brouillon");
      return;
    }
    /* The composer closes now; the draft appears when the provider hands it
       back, which with the mock is the same tick and with IMAP a moment later. */
    set({ compose: null, sendError: null });
    const book = contactBook(before);
    provider
      .saveDraft(account, {
        id: d.draftId,
        from: identityOf(d.spaceId),
        to: toContacts(d.to, book),
        cc: d.cc.length ? toContacts(d.cc, book) : undefined,
        bcc: d.bcc.length ? toContacts(d.bcc, book) : undefined,
        subject: d.subject,
        body: d.body,
      })
      .then((saved) => {
        const draft = stampOne(d.spaceId, saved);
        set((s) => ({
          threads: d.draftId ? patchThread(s.threads, d.draftId, () => draft) : [draft, ...s.threads],
        }));
      })
      .catch((err: unknown) => {
        /* Nothing on screen to put back: the composer is closed and the old
           draft, if any, is still in the list. The text is not lost either —
           the composer reopens with it, which is the one honest outcome. */
        set({ compose: d });
        toast.error("Impossible d'enregistrer le brouillon, il est de retour dans le composeur", { description: describe(err) });
      });
  },

  sendMail: () => {
    const d = get().compose;
    if (!d || d.to.length === 0) return;
    const before = get().threads;
    const account = accountOf(d.spaceId);
    const provider = providerFor(account);
    const book = contactBook(before);
    const draft = d.draftId ? before.find((t) => t.id === d.draftId) : undefined;
    set({ compose: null, sendError: null, threads: draft ? before.filter((t) => t.id !== draft.id) : before });
    provider
      .send(account, {
        from: identityOf(d.spaceId),
        to: toContacts(d.to, book),
        cc: d.cc.length ? toContacts(d.cc, book) : undefined,
        bcc: d.bcc.length ? toContacts(d.bcc, book) : undefined,
        subject: d.subject,
        body: d.body,
      })
      .then(
        (sent) => {
          set((s) => ({ threads: [stampOne(d.spaceId, sent), ...s.threads] }));
          /* The send is final from here: a draft that will not delete is a
             leftover to warn about, never a reason to reopen the composer —
             that would be the second send waiting to happen. */
          if (draft)
            provider.deleteDraft(account, draft.id).catch((err: unknown) => {
              set((s) => ({ threads: restoreThread(s.threads, draft) }));
              toast.error("Envoyé, mais le brouillon n'a pas pu être supprimé", { description: describe(err) });
            });
        },
        (err: unknown) => {
          /* Nothing written is lost: the message comes back in the composer,
             with the reason, and the draft it came from is back in its folder. */
          set((s) => ({ threads: draft ? restoreThread(s.threads, draft) : s.threads, compose: d, sendError: describe(err) }));
        },
      );
  },

  deleteDraft: (threadId) => {
    const before = get().threads;
    const t = before.find((x) => x.id === threadId);
    if (!t) return;
    set((s) => ({
      threads: before.filter((x) => x.id !== threadId),
      compose: s.compose?.draftId === threadId ? null : s.compose,
      selectedThreadId: s.selectedThreadId === threadId ? null : s.selectedThreadId,
    }));
    const account = accountOf(t.spaceId);
    commit(t, () => providerFor(account).deleteDraft(account, threadId), "Impossible de supprimer le brouillon, il est de retour");
  },

  setSpaceHue: (id, hue) =>
    set((s) => {
      const themes = { ...s.themes };
      if (hue === null) delete themes[id];
      else themes[id] = hue;
      return { themes };
    }),

  /**
   * Renommer un espace, ou lui changer d'icône.
   *
   * L'affichage change tout de suite et le serveur apprend après, comme toute
   * écriture ici ; un échec remet les espaces tels qu'ils étaient et le dit.
   *
   * **La maquette n'écrit nulle part** : ses espaces n'ont pas de ligne, et
   * un toast d'erreur à chaque renommage ferait passer une démo pour une
   * panne. Le changement vit alors le temps de la session, comme le reste du
   * mock.
   *
   * **Un identifiant peut changer.** Tant qu'un compte n'a aucune vue, ses
   * espaces portent l'identifiant du compte ; le premier renommage crée la
   * ligne qui manquait, et tout ce qui désignait l'espace — les fils déjà
   * chargés, la teinte choisie, les conversations récentes — doit suivre,
   * sinon la liste se viderait sous les yeux.
   */
  renameSpace: async (id, patch) => {
    const before = get().spaces;
    const space = before.find((sp) => sp.id === id);
    if (!space) return;
    set({ spaces: before.map((sp) => (sp.id === id ? { ...sp, ...patch } : sp)) });
    if (space.account.kind === "mock") return;

    const reponse = await renommerEspace(id, patch);
    if (!reponse.ok) {
      set({ spaces: before });
      toast.error("L'espace n'a pas pu être enregistré", { description: reponse.message });
      return;
    }
    if (reponse.id !== id) {
      set((s) => ({
        spaces: s.spaces.map((sp) => (sp.id === id ? { ...sp, id: reponse.id } : sp)),
        spaceId: s.spaceId === id ? reponse.id : s.spaceId,
        threads: s.threads.map((th) => (th.spaceId === id ? { ...th, spaceId: reponse.id } : th)),
        themes: renomme(s.themes, id, reponse.id),
        recent: renomme(s.recent, id, reponse.id),
      }));
    }
  },
  };
    },
    {
      name: "arc-mail",
      storage: preferences,
      /* Bumped with every change to what is persisted, so an old shape is
         migrated rather than read as is. Version 1 changed nothing in the
         shape: the migration only keeps what an earlier install saved, which
         zustand would otherwise drop with a console error. */
      version: 1,
      migrate: (persisted) =>
        persisted as Pick<MailState, "themes" | "dark" | "splitView" | "sidebarCollapsed" | "recent">,
      /* Only what should survive a reload: the mail itself is mock and reloads
         fresh; the composer is transient. */
      partialize: (s) => ({
        themes: s.themes,
        dark: s.dark,
        splitView: s.splitView,
        sidebarCollapsed: s.sidebarCollapsed,
        recent: s.recent,
      }),
      /* Rehydrated from `AppShell` after mount so the server and first client
         render agree; see `useMail.persist.rehydrate()`. */
      skipHydration: true,
    },
  ),
);

// ───────────── Selectors ─────────────

export function threadMatchesFolder(t: Thread, folderId: FolderId): boolean {
  if (folderId === "starred") return t.starred && t.folder !== "trash";
  return t.folder === folderId;
}

export function lastMessageDate(t: Thread): string {
  return t.messages[t.messages.length - 1].date;
}

export function sortByDate(threads: Thread[]): Thread[] {
  return [...threads].sort((a, b) => lastMessageDate(b).localeCompare(lastMessageDate(a)));
}

type Preview = { attachment: Attachment; message: Message };

function findPreview(threads: Thread[], threadId: string | null, previewId: string | null): Preview | null {
  if (!previewId) return null;
  const thread = threads.find((t) => t.id === threadId);
  for (const message of thread?.messages ?? []) {
    const attachment = message.attachments?.find((a) => a.id === previewId);
    if (attachment) return { attachment, message };
  }
  return null;
}

/**
 * The attachment being looked at, with the message it hangs off. Memoised for
 * the same reason as `useVisibleThreads`: a selector that builds a fresh
 * object every call makes `useSyncExternalStore` loop forever.
 */
export function usePreview(): Preview | null {
  const previewId = useMail((s) => s.previewId);
  const threads = useMail((s) => s.threads);
  const selectedThreadId = useMail((s) => s.selectedThreadId);
  return useMemo(
    () => findPreview(threads, selectedThreadId, previewId),
    [threads, selectedThreadId, previewId],
  );
}

/** True while the current space is being read for the first time — nothing to show yet. */
export const selectLoading = (s: MailState) => s.loading[s.spaceId] === true;

/** Every space with the colour the user gave it; memoised on the overrides. */
export function useSpaces(): Space[] {
  const themes = useMail((s) => s.themes);
  const spaces = useMail((s) => s.spaces);
  return useMemo(() => spaces.map((sp) => resolveSpace(sp, themes[sp.id])), [spaces, themes]);
}

/** The current space, coloured as the user wants it. */
export function useSpace(): Space {
  const spaces = useSpaces();
  const spaceId = useMail((s) => s.spaceId);
  return spaces.find((sp) => sp.id === spaceId) ?? spaces[0];
}
export const selectFolder = (s: MailState) => FOLDERS.find((f) => f.id === s.folderId) ?? FOLDERS[0];
export const selectSelectedThread = (s: MailState) => s.threads.find((t) => t.id === s.selectedThreadId);

/** Pure version used outside React (keyboard shortcuts). */
export function selectVisibleThreads(s: MailState): Thread[] {
  return sortByDate(
    s.threads.filter(
      (t) => t.spaceId === s.spaceId && threadMatchesFolder(t, s.folderId) && (!s.unreadOnly || t.unread),
    ),
  );
}

export function selectUnreadCount(s: MailState, spaceId: SpaceId, folderId: FolderId): number {
  return s.threads.filter((t) => t.spaceId === spaceId && t.unread && threadMatchesFolder(t, folderId)).length;
}

/** Everyone we have exchanged with, for recipient suggestions. */
export function selectContacts(threads: Thread[]): Contact[] {
  const mine = new Set(useMail.getState().spaces.map((sp) => sp.identity.email));
  return [...contactBook(threads).values()]
    .filter((c) => !mine.has(c.email))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/**
 * Les conversations des onglets « Aujourd'hui », dans l'ordre où on les a
 * ouvertes. Memoïsée, et une seule fois : la sidebar et le menu la
 * reconstruisaient chacun de leur côté.
 */
export function useRecentThreads(): Thread[] {
  const threads = useMail((s) => s.threads);
  const recent = useMail((s) => s.recent[s.spaceId]);
  return useMemo(
    () =>
      (recent ?? [])
        .map((id) => threads.find((t) => t.id === id))
        .filter((t): t is Thread => t !== undefined),
    [threads, recent],
  );
}

/** Memoised list for components — a fresh array from the selector would re-render forever. */
export function useVisibleThreads(): Thread[] {
  const threads = useMail((s) => s.threads);
  const spaceId = useMail((s) => s.spaceId);
  const folderId = useMail((s) => s.folderId);
  const unreadOnly = useMail((s) => s.unreadOnly);
  return useMemo(
    () => selectVisibleThreads({ threads, spaceId, folderId, unreadOnly } as MailState),
    [threads, spaceId, folderId, unreadOnly],
  );
}
