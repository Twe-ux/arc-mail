/**
 * L'identifiant d'un espace. Une chaîne, pas trois valeurs littérales : les
 * espaces viennent des comptes branchés dès qu'il y en a, et un identifiant
 * de base n'est pas « perso ». Tout ce qui indexe par espace est donc partiel
 * et se lit avec un repli.
 */
export type SpaceId = string;

export type FolderId =
  | "inbox"
  | "starred"
  | "snoozed"
  | "sent"
  | "drafts"
  | "archive"
  | "trash";

export type SpaceTheme = {
  /** Tailwind-free CSS gradient used as the window backdrop, like an Arc space tint. */
  gradient: string;
  /** Solid accent used for badges, active rows and the space dot. */
  accent: string;
};

export type Space = {
  id: SpaceId;
  name: string;
  email: string;
  /** L'expéditeur quand on écrit depuis cet espace — un domaine peut avoir la sienne. */
  identity: Contact;
  icon: "house" | "briefcase" | "flask";
  /** Appended to new messages, Apple Mail style. */
  signature: string;
  theme: SpaceTheme;
  /** Where its mail lives. Several spaces may share one (a mailbox with several domains). */
  account: import("./mail/provider").AccountRef;
};

export type Contact = {
  name: string;
  email: string;
};

/**
 * A file hanging off a message. `url` is what the preview loads: a `data:`
 * URI with the mock, our own route once a provider is branched (IMAP hands
 * back bytes, never a public link). Absent when nothing can be shown.
 */
export type Attachment = {
  id: string;
  name: string;
  /** MIME type as the provider gives it. */
  mime: string;
  /** Bytes. */
  size: number;
  url?: string;
};

export type Message = {
  id: string;
  from: Contact;
  to: Contact[];
  cc?: Contact[];
  bcc?: Contact[];
  /** ISO date string. */
  date: string;
  body: string;
  attachments?: Attachment[];
};

export type Thread = {
  id: string;
  spaceId: SpaceId;
  folder: FolderId;
  subject: string;
  snippet: string;
  labels: string[];
  unread: boolean;
  starred: boolean;
  messages: Message[];
};

export type Folder = {
  id: FolderId;
  name: string;
};

/** The live state of the composer; also what a draft thread is built from. */
export type ComposeDraft = {
  /** Set when editing an existing thread from the Drafts folder. */
  draftId?: string;
  spaceId: SpaceId;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
};
