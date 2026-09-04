import type { Contact, FolderId, SpaceId, Thread } from "../types";

/**
 * Where a space's mail comes from. One account can back several spaces (an
 * iCloud account with a custom domain per space); the mock gives each space
 * its own, since they are three different addresses.
 */
export type ProviderKind = "mock" | "imap" | "gmail";

export type AccountRef = {
  id: string;
  kind: ProviderKind;
};

export type ThreadQuery = {
  /** Our folder vocabulary; each provider maps it to its own (IMAP path, Gmail label). */
  folder: FolderId;
  limit?: number;
};

/** What the interface can change on a thread, in its own words — the provider translates. */
export type ThreadPatch = {
  unread?: boolean;
  starred?: boolean;
  folder?: FolderId;
};

export type OutgoingMessage = {
  /** The space it is sent from: stamps the thread and, later, picks the identity. */
  spaceId: SpaceId;
  from: Contact;
  to: Contact[];
  cc?: Contact[];
  bcc?: Contact[];
  subject: string;
  body: string;
  /** Thread this answers; the message joins it instead of opening a new one. */
  replyTo?: string;
};

export type DraftInput = Omit<OutgoingMessage, "replyTo"> & {
  /** Set when the draft already exists and is being updated. */
  id?: string;
};

/**
 * Everything the interface needs from a mailbox, and nothing about how it is
 * done. The mock is the first implementation; IMAP (iCloud) and Gmail follow
 * behind the same six calls.
 */
export interface MailProvider {
  /** Threads of one folder, newest first. */
  listThreads(account: AccountRef, query: ThreadQuery): Promise<Thread[]>;
  /** One thread with all its messages — a list may carry less than that. */
  getThread(account: AccountRef, id: string): Promise<Thread | null>;
  /** Flags and moves. */
  modify(account: AccountRef, id: string, patch: ThreadPatch): Promise<void>;
  /** Send. A reply lands in its thread; anything else opens one in Sent. */
  send(account: AccountRef, message: OutgoingMessage): Promise<Thread>;
  /** Create or update a draft; the returned thread is what Drafts shows. */
  saveDraft(account: AccountRef, draft: DraftInput): Promise<Thread>;
  deleteDraft(account: AccountRef, id: string): Promise<void>;
}
