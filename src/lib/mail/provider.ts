import type { Contact, FolderId, Thread } from "../types";

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
  /**
   * Le chemin qui tient lieu de « Réception » pour l'espace qui demande.
   *
   * Un compte, plusieurs boîtes : le fournisseur ne connaît pas les espaces,
   * mais il a besoin de savoir quel dossier ouvrir quand on lui dit « inbox ».
   * Absent : le vrai `INBOX`.
   */
  inboxPath?: string;
  limit?: number;
};

/** What the interface can change on a thread, in its own words — the provider translates. */
export type ThreadPatch = {
  unread?: boolean;
  starred?: boolean;
  folder?: FolderId;
};

export type OutgoingMessage = {
  /** Qui envoie. C'est l'identité de l'espace, et elle suffit : le fournisseur n'a pas à savoir lequel. */
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
 *
 * **Un fournisseur ne connaît pas les espaces.** Il rend des fils tamponnés
 * d'un `spaceId` vide ; c'est le store qui les marque, parce qu'un même
 * compte iCloud porte trois espaces et que le fournisseur n'a aucun moyen de
 * savoir lequel demande.
 */
export interface MailProvider {
  /** Threads of one folder, newest first. */
  listThreads(account: AccountRef, query: ThreadQuery): Promise<Thread[]>;
  /** One thread with all its messages — a list may carry less than that. */
  getThread(account: AccountRef, id: string): Promise<Thread | null>;
  /**
   * Plusieurs d'un coup, pour précharger.
   *
   * Pas une commodité : c'est **une seule requête, une seule connexion**. En
   * demandant trois messages par trois appels, chacun repart de zéro — sur du
   * serverless, trois instances froides et trois sessions IMAP ouvertes pour
   * rien, et le préchargement arrive après le doigt.
   */
  getThreads(account: AccountRef, ids: string[]): Promise<Thread[]>;
  /** Flags and moves. */
  modify(account: AccountRef, id: string, patch: ThreadPatch): Promise<void>;
  /** Send. A reply lands in its thread; anything else opens one in Sent. */
  send(account: AccountRef, message: OutgoingMessage): Promise<Thread>;
  /** Create or update a draft; the returned thread is what Drafts shows. */
  saveDraft(account: AccountRef, draft: DraftInput): Promise<Thread>;
  deleteDraft(account: AccountRef, id: string): Promise<void>;
}
