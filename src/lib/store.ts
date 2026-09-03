import { useMemo } from "react";
import { create } from "zustand";
import { FOLDERS, ME, SPACES, THREADS } from "./mock-data";
import type { FolderId, SpaceId, Thread } from "./types";

type RecentMap = Record<SpaceId, string[]>;

export type MailState = {
  spaceId: SpaceId;
  folderId: FolderId;
  selectedThreadId: string | null;
  /** Reading pane next to the list (Arc split view) or full width. */
  splitView: boolean;
  unreadOnly: boolean;
  commandOpen: boolean;
  composeOpen: boolean;
  /** Mobile only: the sidebar drawer. */
  sidebarOpen: boolean;
  dark: boolean;
  threads: Thread[];
  /** Threads opened recently, per space — the "Today" tabs of Arc. */
  recent: RecentMap;

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
  setComposeOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDark: () => void;
  sendMail: (input: { to: string; subject: string; body: string }) => void;
  reply: (threadId: string, body: string) => void;
};

const MAX_RECENT = 8;

const patchThread = (threads: Thread[], id: string, patch: (t: Thread) => Thread) =>
  threads.map((t) => (t.id === id ? patch(t) : t));

export const useMail = create<MailState>((set, get) => ({
  spaceId: SPACES[0].id,
  folderId: "inbox",
  selectedThreadId: null,
  splitView: true,
  unreadOnly: false,
  commandOpen: false,
  composeOpen: false,
  sidebarOpen: false,
  dark: false,
  threads: THREADS,
  recent: { perso: [], pro: [], side: [] },

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
  setComposeOpen: (composeOpen) => set({ composeOpen }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleDark: () => set((s) => ({ dark: !s.dark })),

  sendMail: ({ to, subject, body }) => {
    const { spaceId } = get();
    const stamp = Date.now();
    const thread: Thread = {
      id: `thr-local-${stamp}`,
      spaceId,
      folder: "sent",
      subject: subject.trim() || "(sans objet)",
      snippet: body.split("\n")[0].slice(0, 140),
      labels: [],
      unread: false,
      starred: false,
      messages: [
        {
          id: `msg-local-${stamp}`,
          from: ME[spaceId],
          to: [{ name: to, email: to }],
          date: new Date(stamp).toISOString(),
          body,
        },
      ],
    };
    set((s) => ({ threads: [thread, ...s.threads], composeOpen: false }));
  },

  reply: (threadId, body) => {
    const { spaceId } = get();
    const me = ME[spaceId];
    set((s) => ({
      threads: patchThread(s.threads, threadId, (t) => {
        const last = t.messages[t.messages.length - 1];
        const recipients = [last.from, ...last.to].filter((c) => c.email !== me.email);
        return {
          ...t,
          snippet: body.split("\n")[0].slice(0, 140),
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
}));

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

export const selectSpace = (s: MailState) => SPACES.find((sp) => sp.id === s.spaceId) ?? SPACES[0];
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
