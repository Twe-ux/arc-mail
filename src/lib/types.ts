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
