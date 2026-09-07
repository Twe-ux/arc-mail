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

/**
 * Les glyphes qu'un espace peut porter.
 *
 * Vingt-quatre, en trois rangées de huit. Il y en a eu trois — « maison,
 * mallette, fiole » —, qui couvraient trois espaces d'exemple et pas les
 * boîtes de quelqu'un, puis huit. Vingt-quatre parce qu'on a demandé « plus de
 * choix » : ils disent l'**usage** d'une boîte — travail, société, achats,
 * voyages, banque, études —, pas un fournisseur.
 *
 * **Pas de logo de marque.** Ni Gmail ni Apple : `lucide-react` n'en fournit
 * plus, et le nom d'un fournisseur se lit déjà sur l'adresse de l'espace,
 * juste sous son nom. Une boîte se reconnaît à ce qu'on y range.
 *
 * Toute addition ici demande une migration : la colonne `icon` de
 * `mail_spaces` porte la liste en contrainte `check`.
 */
export type SpaceIconName =
  | "house"
  | "briefcase"
  | "building"
  | "flask"
  | "code"
  | "globe"
  | "at"
  | "mail"
  | "heart"
  | "users"
  | "shopping"
  | "plane"
  | "bank"
  | "school"
  | "camera"
  | "book"
  | "music"
  | "leaf"
  | "sparkles"
  | "tag"
  | "bell"
  | "coffee"
  | "rocket"
  | "star";

export type Space = {
  id: SpaceId;
  name: string;
  email: string;
  /** L'expéditeur quand on écrit depuis cet espace — un domaine peut avoir la sienne. */
  identity: Contact;
  icon: SpaceIconName;
  /** Appended to new messages, Apple Mail style. */
  signature: string;
  theme: SpaceTheme;
  /** Where its mail lives. Several spaces may share one (a mailbox with several domains). */
  account: import("./mail/provider").AccountRef;
  /**
   * Le dossier qui **est** la réception de cet espace.
   *
   * `INBOX` pour l'espace principal ; pour un domaine personnalisé, le dossier
   * où la règle iCloud range son courrier. C'est ce qui permet à un seul compte
   * de porter plusieurs boîtes qui se comportent chacune comme une vraie.
   *
   * Un jour il pourra aussi valoir une recherche (`SEARCH TO domaine`) plutôt
   * qu'un chemin ; on commence par le chemin, qui colle aux règles déjà en
   * place chez iCloud.
   */
  inboxPath: string;
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

/**
 * Ce que l'en-tête `List-Unsubscribe` d'une infolettre propose.
 *
 * Deux chemins, et le premier vaut mieux : par `mailto:` le désabonnement est
 * un message que **notre** SMTP envoie — on ne quitte pas l'app et personne
 * d'autre n'est prévenu de la lecture. Par lien, il faut ouvrir la page de
 * l'expéditeur.
 */
export type Desabonnement = {
  mailto?: string;
  /** L'objet que la liste réclame — souvent un jeton qui l'identifie. */
  sujet?: string;
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
  /**
   * Le corps HTML, déjà lavé côté serveur et prêt pour son bac à sable.
   * Absent : le message n'avait que du texte, et `body` suffit.
   */
  html?: string;
  /** Combien d'images distantes ont été retenues, pour proposer de les montrer. */
  blockedImages?: number;
  /** Ce que `List-Unsubscribe` propose, quand l'en-tête est là. */
  desabonnement?: Desabonnement;
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

/**
 * Une **vue enregistrée** : une requête gardée, qui vit à côté des dossiers.
 *
 * Elle ne range rien et ne copie rien — c'est la question, gardée. Elle
 * découle de l'arbre de recherche sans rien lui demander de plus : le même
 * analyseur, le même compilateur mémoire que ⌘K.
 *
 * **La rangée est la requête**, il n'y a pas d'étiquette à côté. Elle en a eu
 * une une demi-journée, et c'était une erreur : la corriger ne changeait pas la
 * recherche — « quand je change le nom, la recherche reste sur la précédente ».
 * Une chose à lire, une chose à modifier.
 *
 * `q` est la requête **telle qu'elle a été tapée**, pas son arbre : un arbre
 * sérialisé se périme dès que la grammaire gagne un mot-clé, la chaîne se
 * réanalyse toujours.
 */
export type Vue = {
  id: string;
  q: string;
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
  /** Le message en texte simple — toujours à jour, même quand `html` existe. */
  body: string;
  /**
   * Le message mis en forme, quand on s'en est servi.
   *
   * Le champ d'écriture est riche et rend toujours du HTML ; `html` n'est
   * gardé que **s'il apporte quelque chose de plus que le texte**. Un message
   * tapé sans mise en forme part donc en texte simple, comme avant — le HTML
   * ne doit pas s'inviter dans un courrier qui n'en demandait pas.
   */
  html?: string;
  /**
   * Le fil auquel ce message répond.
   *
   * Il porte `In-Reply-To` et `References` jusqu'au serveur : sans lui, une
   * réponse écrite dans le volet ouvrirait un fil neuf chez le destinataire.
   * Absent pour un message d'origine.
   */
  replyTo?: string;
  /**
   * Le message qu'on cite, épinglé à l'ouverture.
   *
   * La citation n'est **pas** dans le corps : elle est montrée en tête du volet
   * et rebâtie à l'envoi. On épingle l'identifiant plutôt que de reprendre « le
   * dernier message » au moment d'envoyer — si quelqu'un répond pendant qu'on
   * écrit, on citerait un message qu'on n'a pas lu.
   */
  citeMessage?: string;
  /** Les fichiers joints, déjà lus et encodés — voir `OutgoingAttachment`. */
  attachments?: import("./mail/provider").OutgoingAttachment[];
};
