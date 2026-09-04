import { useMemo } from "react";
import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { firstLine } from "./format";
import { providerFor } from "./mail";
import { FOLDERS, ME, SPACES } from "./mock-data";
import { resolveSpace } from "./theme";
import type { ComposeDraft, Contact, FolderId, Space, SpaceId, Thread } from "./types";

type RecentMap = Record<SpaceId, string[]>;

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

  /** Read every folder of a space from its provider and replace what we had. */
  loadSpace: (id?: SpaceId) => Promise<void>;
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
  toggleDark: () => void;
  /** Resolves `false` when the provider refused: the caller gives the text back. */
  reply: (threadId: string, body: string) => Promise<boolean>;

  openCompose: (initial?: Partial<ComposeDraft>) => void;
  openDraft: (threadId: string) => void;
  updateCompose: (patch: Partial<ComposeDraft>) => void;
  /** Closes the composer, keeping the text as a draft unless it is blank. */
  closeCompose: () => void;
  sendMail: () => void;
  deleteDraft: (threadId: string) => void;
  setSpaceHue: (id: SpaceId, hue: number | null) => void;
};

const MAX_RECENT = 8;
const NO_SUBJECT = "(sans objet)";

const patchThread = (threads: Thread[], id: string, patch: (t: Thread) => Thread) =>
  threads.map((t) => (t.id === id ? patch(t) : t));

/** Throws rather than guessing: a write on the wrong real account would be worse than no write. */
const accountOf = (spaceId: SpaceId) => {
  const space = SPACES.find((sp) => sp.id === spaceId);
  if (!space) throw new Error(`Espace inconnu « ${spaceId} »`);
  return space.account;
};

/** One thread as it was, put back in place — or back at the top when it had been removed. */
const restoreThread = (threads: Thread[], before: Thread) =>
  threads.some((t) => t.id === before.id) ? threads.map((t) => (t.id === before.id ? before : t)) : [before, ...threads];

/** Reads in flight, one counter per space: a response that is not the latest is dropped. */
const loadTokens = new Map<SpaceId, number>();

/** The people a reply goes to: everyone on the last message but us, or its sender alone. */
export function replyRecipients(t: Thread): Contact[] {
  const me = ME[t.spaceId];
  const last = t.messages[t.messages.length - 1];
  const seen = new Set<string>();
  const recipients = [last.from, ...last.to, ...(last.cc ?? [])].filter((c) => {
    if (c.email === me.email || seen.has(c.email)) return false;
    seen.add(c.email);
    return true;
  });
  return recipients.length ? recipients : [last.from];
}

/** Folders a provider is asked for: every real one. Favoris is a view over the flag. */
const REAL_FOLDERS = FOLDERS.map((f) => f.id).filter((id) => id !== "starred");

/** One space's threads replaced by a fresh read, the other spaces untouched. */
const replaceSpace = (threads: Thread[], spaceId: SpaceId, fresh: Thread[]) => {
  const seen = new Set<string>();
  const kept = fresh.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
  return [...kept, ...threads.filter((t) => t.spaceId !== spaceId)];
};

const describe = (err: unknown) => (err instanceof Error ? err.message : String(err));

const isBlank = (d: ComposeDraft) => {
  const signature = SPACES.find((sp) => sp.id === d.spaceId)?.signature ?? "";
  const body = d.body.replace(`— ${signature}`, "").trim();
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

function toContacts(emails: string[], book: Map<string, Contact>): Contact[] {
  return emails.map((email) => book.get(email) ?? { name: email, email });
}

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
  dark: false,
  threads: [],
  loading: {},
  error: null,
  sendError: null,
  recent: { perso: [], pro: [], side: [] },
  compose: null,
  themes: {},

  loadSpace: async (id) => {
    const spaceId = id ?? get().spaceId;
    const account = accountOf(spaceId);
    const token = (loadTokens.get(spaceId) ?? 0) + 1;
    loadTokens.set(spaceId, token);
    /* `loading` only while there is nothing to show: a refresh of a space we
       already have keeps the list on screen and swaps it when the read lands. */
    if (!get().threads.some((t) => t.spaceId === spaceId))
      set((s) => ({ loading: { ...s.loading, [spaceId]: true } }));
    const done = (patch: Partial<MailState>) =>
      set((s) => ({ ...patch, loading: { ...s.loading, [spaceId]: false } }));
    try {
      const provider = providerFor(account);
      const perFolder = await Promise.all(
        REAL_FOLDERS.map((folder) => provider.listThreads(account, { folder })),
      );
      /* Two reads of the same space can cross; only the latest one may land. */
      if (loadTokens.get(spaceId) !== token) return;
      set((s) => ({
        threads: replaceSpace(s.threads, spaceId, perFolder.flat()),
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
      set({ selectedThreadId: null });
      return;
    }
    const { spaceId, recent, threads } = get();
    const list = [id, ...(recent[spaceId] ?? []).filter((r) => r !== id)].slice(0, MAX_RECENT);
    const target = threads.find((t) => t.id === id);
    set((s) => ({
      selectedThreadId: id,
      recent: { ...recent, [spaceId]: list },
      threads: patchThread(s.threads, id, (t) => ({ ...t, unread: false })),
    }));
    if (target?.unread) {
      const account = accountOf(target.spaceId);
      commit(target, () => providerFor(account).modify(account, id, { unread: false }), "Impossible de marquer comme lu");
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
  toggleDark: () => set((s) => ({ dark: !s.dark })),

  reply: async (threadId, body) => {
    const before = get().threads;
    const t = before.find((x) => x.id === threadId);
    if (!t) return false;
    const me = ME[t.spaceId];
    const to = replyRecipients(t);
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
        spaceId: t.spaceId, from: me, to, subject: t.subject, body, replyTo: threadId,
      });
      set((s) => ({ threads: patchThread(s.threads, threadId, () => sent) }));
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
      const signature = SPACES.find((sp) => sp.id === spaceId)?.signature ?? "";
      const body = `\n\n— ${signature}${initial?.body ?? ""}`;
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
        spaceId: d.spaceId,
        from: ME[d.spaceId],
        to: toContacts(d.to, book),
        cc: d.cc.length ? toContacts(d.cc, book) : undefined,
        bcc: d.bcc.length ? toContacts(d.bcc, book) : undefined,
        subject: d.subject,
        body: d.body,
      })
      .then((saved) =>
        set((s) => ({
          threads: d.draftId ? patchThread(s.threads, d.draftId, () => saved) : [saved, ...s.threads],
        })),
      )
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
        spaceId: d.spaceId,
        from: ME[d.spaceId],
        to: toContacts(d.to, book),
        cc: d.cc.length ? toContacts(d.cc, book) : undefined,
        bcc: d.bcc.length ? toContacts(d.bcc, book) : undefined,
        subject: d.subject,
        body: d.body,
      })
      .then(
        (sent) => {
          set((s) => ({ threads: [sent, ...s.threads] }));
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
  };
    },
    {
      name: "arc-mail",
      /* Bumped with every change to what is persisted, so an old shape is
         migrated rather than read as is. Version 1 changed nothing in the
         shape: the migration only keeps what an earlier install saved, which
         zustand would otherwise drop with a console error. */
      version: 1,
      migrate: (persisted) => persisted as Pick<MailState, "themes" | "dark" | "splitView" | "recent">,
      /* Only what should survive a reload: the mail itself is mock and reloads
         fresh; the composer is transient. */
      partialize: (s) => ({ themes: s.themes, dark: s.dark, splitView: s.splitView, recent: s.recent }),
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

/** True while the current space is being read for the first time — nothing to show yet. */
export const selectLoading = (s: MailState) => s.loading[s.spaceId] === true;

/** Every space with the colour the user gave it; memoised on the overrides. */
export function useSpaces(): Space[] {
  const themes = useMail((s) => s.themes);
  return useMemo(() => SPACES.map((sp) => resolveSpace(sp, themes[sp.id])), [themes]);
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
  const mine = new Set(Object.values(ME).map((c) => c.email));
  return [...contactBook(threads).values()]
    .filter((c) => !mine.has(c.email))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
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
