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
  /**
   * Combien de messages ont **déjà** été lus dans ce dossier, pour aller
   * chercher les suivants.
   *
   * Une lecture rend les `limit` derniers messages ; sans cette borne, tout ce
   * qui est plus ancien était hors d'atteinte — une boîte qui n'en montre que
   * soixante sans le dire. `deja: 60` demande donc les soixante d'avant.
   *
   * **Un compte, pas un curseur d'identifiant.** IMAP sait dire « les n
   * derniers » par numéro de séquence sans rien chercher ; un curseur d'UID
   * demanderait un `SEARCH` qui rapporte toute la boîte en nombres. Le prix est
   * qu'un message arrivé entre deux pages décale la fenêtre — la frontière peut
   * se répéter, et le store dédoublonne.
   */
  deja?: number;
};

/** What the interface can change on a thread, in its own words — the provider translates. */
/**
 * Combien de non-lus dans chacun de nos dossiers.
 *
 * Une lecture ne rapporte qu'**un** dossier — celui qu'on regarde —, et
 * compter ce qu'on a en mémoire donnait donc zéro partout ailleurs : la
 * réception affichait son chiffre, Archive et Corbeille annonçaient zéro tant
 * qu'on n'y était pas allé. Ce n'est pas un compte manquant, c'est un compte
 * **faux**.
 *
 * Partiel, et c'est voulu : Favoris est un drapeau et « En pause » n'existe
 * pas encore côté serveur. Un dossier absent de la réponse garde le compte
 * local, qui est juste pour celui qu'on a chargé.
 */
export type FolderUnread = Partial<Record<FolderId, number>>;

export type ThreadPatch = {
  unread?: boolean;
  starred?: boolean;
  folder?: FolderId;
};

/**
 * Un fichier qu'on joint, tel qu'il traverse la frontière navigateur → serveur.
 *
 * En **base64**, pas en `File` : le message part en JSON vers `/api/mail`, et
 * un `File` ne survit pas à `JSON.stringify`. C'est aussi la forme que
 * `MailComposer` attend, donc rien ne se reconvertit en route.
 */
export type OutgoingAttachment = {
  name: string;
  mime: string;
  /** Octets du fichier d'origine, avant encodage — ce qu'on montre à l'écran. */
  size: number;
  /** Le contenu, encodé en base64 et sans préfixe `data:`. */
  data: string;
};

export type OutgoingMessage = {
  /** Qui envoie. C'est l'identité de l'espace, et elle suffit : le fournisseur n'a pas à savoir lequel. */
  from: Contact;
  to: Contact[];
  cc?: Contact[];
  bcc?: Contact[];
  subject: string;
  /**
   * Le message en **texte simple**. Toujours écrit, même quand `html` l'est
   * aussi : c'est la partie que lit un client qui refuse le HTML, un lecteur
   * d'écran en mode texte, ou la recherche du serveur.
   */
  body: string;
  /**
   * Le même message **mis en forme**, quand il l'est.
   *
   * Les deux voyagent ensemble (`multipart/alternative`) et disent la même
   * chose : `MailComposer` s'en charge dès qu'on lui donne les deux. Envoyer le
   * HTML seul, c'est un message vide pour qui ne l'affiche pas.
   */
  html?: string;
  attachments?: OutgoingAttachment[];
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
/**
 * Une recherche posée au fournisseur.
 *
 * Elle porte la **requête telle qu'elle est tapée**, pas l'arbre : c'est le
 * fournisseur qui sait la compiler — IMAP en `SEARCH`, le mock en filtre
 * mémoire —, et une chaîne traverse HTTP sans qu'on ait à versionner la forme
 * de l'arbre entre le navigateur et la route.
 */
export type SearchQuery = {
  /** Ce qui a été tapé dans ⌘K, syntaxe comprise (`de:`, `est:non-lu`…). */
  q: string;
  /** Où chercher quand la requête ne nomme aucun dossier : celui qu'on regarde. */
  folder: FolderId;
  /** Comme dans `ThreadQuery` : la « Réception » de cet espace. */
  inboxPath?: string;
  limit?: number;
};

export interface MailProvider {
  /** Threads of one folder, newest first. */
  listThreads(account: AccountRef, query: ThreadQuery): Promise<Thread[]>;
  /**
   * Les non-lus de **tous** les dossiers, en un appel.
   *
   * `inboxPath` pour la même raison que dans `ThreadQuery` : la « Réception »
   * d'un espace-vue est un autre dossier, et c'est son compte qu'il faut.
   */
  listFolders(account: AccountRef, opts?: { inboxPath?: string }): Promise<FolderUnread>;
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
  /**
   * Drapeaux et déplacements — et **ce que le fil devient**.
   *
   * Un déplacement IMAP change l'UID du message, donc l'identifiant du fil :
   * celui qu'on avait en main ne désigne plus rien. L'écriture rend donc le
   * nouvel identifiant, et le store renomme le fil au lieu de le garder sous un
   * nom mort — sans quoi la relecture du dossier d'arrivée en ramenait un
   * second exemplaire, et toute action sur l'ancien visait un UID disparu.
   *
   * Trois réponses possibles, et il faut les trois :
   * - **le même identifiant** — rien n'a bougé de place (un simple « lu ») ;
   * - **un autre** — le message a été déplacé et le serveur a dit où (`UIDPLUS`,
   *   qu'iCloud et Gmail annoncent tous les deux) ;
   * - **`null`** — déplacé, mais le serveur n'a pas dit où : le fil n'est plus
   *   adressable, et c'est la prochaine lecture du dossier qui le retrouvera.
   */
  modify(account: AccountRef, id: string, patch: ThreadPatch): Promise<string | null>;
  /** Send. A reply lands in its thread; anything else opens one in Sent. */
  send(account: AccountRef, message: OutgoingMessage): Promise<Thread>;
  /** Create or update a draft; the returned thread is what Drafts shows. */
  saveDraft(account: AccountRef, draft: DraftInput): Promise<Thread>;
  deleteDraft(account: AccountRef, id: string): Promise<void>;
  /**
   * Chercher **au-delà de ce qui est chargé**.
   *
   * ⌘K filtre en mémoire — immédiat, mais borné aux enveloppes descendues. Ceci
   * pose la même question au serveur, donc à toute la boîte. Les fils rendus
   * n'ont que leurs enveloppes, comme ceux d'une liste : le corps arrive à
   * l'ouverture.
   */
  search(account: AccountRef, query: SearchQuery): Promise<Thread[]>;
}
