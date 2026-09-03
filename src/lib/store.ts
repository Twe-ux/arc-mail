import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { firstLine } from "./format";
import { FOLDERS, ME, SPACES, THREADS } from "./mock-data";
import { resolveSpace } from "./theme";
import type { ComposeDraft, Contact, FolderId, Message, Space, SpaceId, Thread } from "./types";

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
  threads: Thread[];
  /** Threads opened recently, per space — the "Today" tabs of Arc. */
  recent: RecentMap;
  /** The composer, `null` when closed. Its fields are the live form state. */
  compose: ComposeDraft | null;
  /** Hue chosen for a space, when the user changed its colour. */
  themes: Partial<Record<SpaceId, number>>;

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
  reply: (threadId: string, body: string) => void;

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

function draftMessage(d: ComposeDraft, book: Map<string, Contact>, id: string): Message {
  return {
    id,
    from: ME[d.spaceId],
    to: toContacts(d.to, book),
    cc: d.cc.length ? toContacts(d.cc, book) : undefined,
    bcc: d.bcc.length ? toContacts(d.bcc, book) : undefined,
    date: new Date().toISOString(),
    body: d.body,
  };
}

export const useMail = create<MailState>()(
  persist(
    (set, get) => ({
  spaceId: SPACES[0].id,
  folderId: "inbox",
  selectedThreadId: null,
  splitView: true,
  unreadOnly: false,
  commandOpen: false,
  sidebarOpen: false,
  dark: false,
  threads: THREADS,
  recent: { perso: [], pro: [], side: [] },
  compose: null,
  themes: {},

  setSpace: (spaceId) => set({ spaceId, folderId: "inbox", selectedThreadId: null, unreadOnly: false }),

  setFolder: (folderId) => set({ folderId, selectedThreadId: null }),

  selectThread: (id) => {
    if (id === null) {
      set({ selectedThreadId: null });
      return;
    }
    const { spaceId, recent } = get();
    const list = [id, ...recent[spaceId].filter((r) => r !== id)].slice(0, MAX_RECENT);
    set((s) => ({
      selectedThreadId: id,
      recent: { ...recent, [spaceId]: list },
      threads: patchThread(s.threads, id, (t) => ({ ...t, unread: false })),
    }));
  },

  toggleStar: (id) =>
    set((s) => ({ threads: patchThread(s.threads, id, (t) => ({ ...t, starred: !t.starred })) })),

  toggleUnread: (id) =>
    set((s) => ({ threads: patchThread(s.threads, id, (t) => ({ ...t, unread: !t.unread })) })),

  moveThread: (id, folder) =>
    set((s) => ({
      threads: patchThread(s.threads, id, (t) => ({ ...t, folder })),
      selectedThreadId: s.selectedThreadId === id ? null : s.selectedThreadId,
    })),

  removeRecent: (id) =>
    set((s) => ({
      recent: { ...s.recent, [s.spaceId]: s.recent[s.spaceId].filter((r) => r !== id) },
    })),

  clearRecent: () => set((s) => ({ recent: { ...s.recent, [s.spaceId]: [] } })),

  toggleSplit: () => set((s) => ({ splitView: !s.splitView })),
  setUnreadOnly: (unreadOnly) => set({ unreadOnly }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleDark: () => set((s) => ({ dark: !s.dark })),

  reply: (threadId, body) => {
    const { spaceId } = get();
    const me = ME[spaceId];
    set((s) => ({
      threads: patchThread(s.threads, threadId, (t) => {
        const last = t.messages[t.messages.length - 1];
        const recipients = [last.from, ...last.to].filter((c) => c.email !== me.email);
        return {
          ...t,
          snippet: firstLine(body),
          messages: [
            ...t.messages,
            {
              id: `msg-local-${Date.now()}`,
              from: me,
              to: recipients.length ? recipients : [last.from],
              date: new Date().toISOString(),
              body,
            },
          ],
        };
      }),
    }));
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
    if (isBlank(d)) {
      set((s) => ({ compose: null, threads: d.draftId ? s.threads.filter((t) => t.id !== d.draftId) : s.threads }));
      return;
    }
    const book = contactBook(get().threads);
    const subject = d.subject.trim() || NO_SUBJECT;
    if (d.draftId) {
      set((s) => ({
        compose: null,
        threads: patchThread(s.threads, d.draftId!, (t) => ({
          ...t,
          spaceId: d.spaceId,
          subject,
          snippet: firstLine(d.body),
          messages: [draftMessage(d, book, t.messages[0].id)],
        })),
      }));
      return;
    }
    const stamp = Date.now();
    const thread: Thread = {
      id: `thr-draft-${stamp}`,
      spaceId: d.spaceId,
      folder: "drafts",
      subject,
      snippet: firstLine(d.body),
      labels: [],
      unread: false,
      starred: false,
      messages: [draftMessage(d, book, `msg-draft-${stamp}`)],
    };
    set((s) => ({ compose: null, threads: [thread, ...s.threads] }));
  },

  sendMail: () => {
    const d = get().compose;
    if (!d || d.to.length === 0) return;
    const book = contactBook(get().threads);
    const stamp = Date.now();
    const thread: Thread = {
      id: `thr-sent-${stamp}`,
      spaceId: d.spaceId,
      folder: "sent",
      subject: d.subject.trim() || NO_SUBJECT,
      snippet: firstLine(d.body),
      labels: [],
      unread: false,
      starred: false,
      messages: [draftMessage(d, book, `msg-sent-${stamp}`)],
    };
    set((s) => ({
      compose: null,
      threads: [thread, ...s.threads.filter((t) => t.id !== d.draftId)],
    }));
  },

  deleteDraft: (threadId) =>
    set((s) => ({
      threads: s.threads.filter((t) => t.id !== threadId),
      compose: s.compose?.draftId === threadId ? null : s.compose,
      selectedThreadId: s.selectedThreadId === threadId ? null : s.selectedThreadId,
    })),

  setSpaceHue: (id, hue) =>
    set((s) => {
      const themes = { ...s.themes };
      if (hue === null) delete themes[id];
      else themes[id] = hue;
      return { themes };
    }),
    }),
    {
      name: "arc-mail",
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

export const selectSpace = (s: MailState) =>
  resolveSpace(SPACES.find((sp) => sp.id === s.spaceId) ?? SPACES[0], s.themes[s.spaceId]);

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
