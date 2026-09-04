import { firstLine } from "../format";
import { THREADS } from "../mock-data";
import type { Thread } from "../types";
import type { AccountRef, DraftInput, MailProvider, OutgoingMessage, ThreadPatch, ThreadQuery } from "./provider";

const NO_SUBJECT = "(sans objet)";

/** `mock:perso` → `perso`: the account id carries the space it stands for (see `mockAccount`). */
const spaceOf = (account: AccountRef): string => account.id.slice("mock:".length);

/**
 * The dataset in `mock-data.ts`, behind the provider interface. Holds its own
 * copy for the session so flags, moves, drafts and sends stick until reload —
 * exactly what the store used to do to the array directly. Every call is
 * asynchronous like the real ones will be, with no latency added: the point is
 * the seam, not a simulation.
 */
export class MockProvider implements MailProvider {
  private threads: Thread[] = THREADS;

  private patch(id: string, fn: (t: Thread) => Thread) {
    this.threads = this.threads.map((t) => (t.id === id ? fn(t) : t));
  }

  async listThreads(account: AccountRef, query: ThreadQuery): Promise<Thread[]> {
    const spaceId = spaceOf(account);
    const inFolder = (t: Thread) =>
      query.folder === "starred" ? t.starred && t.folder !== "trash" : t.folder === query.folder;
    const list = this.threads.filter((t) => t.spaceId === spaceId && inFolder(t));
    return query.limit ? list.slice(0, query.limit) : list;
  }

  async getThread(_account: AccountRef, id: string): Promise<Thread | null> {
    return this.threads.find((t) => t.id === id) ?? null;
  }

  async modify(_account: AccountRef, id: string, patch: ThreadPatch): Promise<void> {
    this.patch(id, (t) => ({
      ...t,
      unread: patch.unread ?? t.unread,
      starred: patch.starred ?? t.starred,
      folder: patch.folder ?? t.folder,
    }));
  }

  async send(account: AccountRef, message: OutgoingMessage): Promise<Thread> {
    const stamp = Date.now();
    const msg = {
      id: `msg-sent-${stamp}`,
      from: message.from,
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      date: new Date().toISOString(),
      body: message.body,
    };
    if (message.replyTo) {
      const existing = this.threads.find((t) => t.id === message.replyTo);
      if (existing) {
        const next = { ...existing, snippet: firstLine(message.body), messages: [...existing.messages, msg] };
        this.patch(existing.id, () => next);
        return next;
      }
    }
    const thread: Thread = {
      id: `thr-sent-${stamp}`,
      spaceId: spaceOf(account),
      folder: "sent",
      subject: message.subject.trim() || NO_SUBJECT,
      snippet: firstLine(message.body),
      labels: [],
      unread: false,
      starred: false,
      messages: [msg],
    };
    this.threads = [thread, ...this.threads];
    return thread;
  }

  async saveDraft(account: AccountRef, draft: DraftInput): Promise<Thread> {
    const subject = draft.subject.trim() || NO_SUBJECT;
    const existing = draft.id ? this.threads.find((t) => t.id === draft.id) : undefined;
    const stamp = Date.now();
    const msg = {
      id: existing?.messages[0].id ?? `msg-draft-${stamp}`,
      from: draft.from,
      to: draft.to,
      cc: draft.cc,
      bcc: draft.bcc,
      date: new Date().toISOString(),
      body: draft.body,
    };
    if (existing) {
      const next = { ...existing, subject, snippet: firstLine(draft.body), messages: [msg] };
      this.patch(existing.id, () => next);
      return next;
    }
    const thread: Thread = {
      id: `thr-draft-${stamp}`,
      spaceId: spaceOf(account),
      folder: "drafts",
      subject,
      snippet: firstLine(draft.body),
      labels: [],
      unread: false,
      starred: false,
      messages: [msg],
    };
    this.threads = [thread, ...this.threads];
    return thread;
  }

  async deleteDraft(_account: AccountRef, id: string): Promise<void> {
    this.threads = this.threads.filter((t) => t.id !== id);
  }
}
