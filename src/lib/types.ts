export type SpaceId = "perso" | "pro" | "side";

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
  emoji: string;
  theme: SpaceTheme;
};

export type Contact = {
  name: string;
  email: string;
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
