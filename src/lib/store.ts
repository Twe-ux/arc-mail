import { useMemo } from "react";
import { toast } from "sonner";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { renommerEspace } from "./accounts/actions";
import { enregistrerPause, oublierPause, relirePauses } from "@/app/pause-actions";
import { fait } from "./folders";
import { libellePause, type Pause } from "./pause";
import { firstLine, formatFullDate } from "./format";
import { providerFor } from "./mail";
import { garderCorps, lireCorps } from "./mail/corps";
import type { FolderUnread } from "./mail/provider";
import { FOLDERS, SPACES } from "./mock-data";
import { resolveSpace } from "./theme";
import { couperCitation } from "./fil";
import { echapper, htmlDe } from "./riche";
import { texteLibre } from "./search/ast";
import { dossiersDe } from "./search/imap";
import { correspond } from "./search/match";
import { parse } from "./search/parse";
import type { Attachment, ComposeDraft, Contact, DossierCible, Folder, FolderId, Message, Space, SpaceId, Thread, Vue } from "./types";

/** Partiel : un espace nouveau n'a pas encore de clé, et `?? []` est la lecture. */
type RecentMap = Partial<Record<SpaceId, string[]>>;

/**
 * Les trois états de la barre latérale du bureau.
 *
 * `sidebarCollapsed` n'en avait que deux, et il en manquait un : à 1440 px,
 * barre + liste + conversation + troisième volet ne laissaient que 309 px à la
 * colonne qu'on lit — trois ou quatre mots par ligne. Le rail de 52 px garde
 * les espaces et les dossiers à l'écran pour le prix d'une icône.
 */
export type SidebarMode = "full" | "rail" | "hidden";

/**
 * Ce que porte le troisième volet — **un message ou un fichier**, jamais les
 * deux, et jamais la même clé que sa largeur : le handoff signale le piège, et
 * il est réel. Une seule clé pour les deux, et tirer la poignée faisait
 * basculer le volet de « pièce jointe » à « message ».
 */
export type Third =
  | { kind: "message"; messageId: string }
  | { kind: "file"; attachmentId: string };

export type MailState = {
  spaceId: SpaceId;
  folderId: FolderId;
  selectedThreadId: string | null;
  /** Reading pane next to the list (Arc split view) or full width. */
  splitView: boolean;
  unreadOnly: boolean;
  /**
   * **L'étiquette regardée**, ou `null`.
   *
   * Elle filtre **le dossier ouvert**, comme « Non lus » et pour la même
   * raison : c'est le seul dont on ait tous les fils. Un filtre qui
   * prétendrait ramasser une étiquette dans toute la boîte ne rendrait que ce
   * que les dossiers déjà visités ont laissé en mémoire — donc autre chose
   * selon l'endroit d'où on l'a ouvert, ce que la fiche des vues interdit
   * déjà. Jamais persistée : elle décrit un écran, pas un goût.
   */
  etiquette: string | null;
  setEtiquette: (nom: string | null) => void;
  commandOpen: boolean;
  /** Mobile only: the sidebar drawer. */
  sidebarOpen: boolean;
  /**
   * Téléphone : la feuille de personnalisation (teinte, thème, comptes).
   *
   * Une feuille par intention, et **jamais deux à la fois** : l'ouvrir ferme
   * l'autre. Deux cartes de 36 px empilées sur 390 px ne se lisent plus.
   */
  settingsOpen: boolean;
  /** Desktop only: the sidebar folded away, the window kept. */
  sidebarMode: SidebarMode;
  /** Bureau : la hauteur d'une rangée de liste. */
  listDensity: "confort" | "compact";
  /**
   * Le fond du bureau — **deux, au choix**.
   *
   * `degrade` : le dégradé d'espace sous un aplat sombre, le langage d'Arc, et
   * le défaut. `voile` : le halo doux du téléphone, pour qui trouve le premier
   * trop présent sur 1280 px. L'encre de la barre latérale suit le choix, elle
   * n'est pas réglable à part — blanche sur le dégradé, encre du thème sur le
   * voile ; l'un sans l'autre serait illisible.
   */
  fondBureau: "degrade" | "voile";
  /** Largeur de la liste en vue partagée, sur bureau, en pixels. */
  listWidth: number;
  /** The attachment being looked at, `null` when none; it lives in the open thread. */
  /** Le troisième volet, en fenêtre détachée. `null` : il n'est pas là. */
  third: Third | null;
  /** Sa largeur, mémorisée — mais **remise à 460 à chaque ouverture**. */
  thirdWidth: number;
  /**
   * Comment la liste range : par fil (le défaut) ou par correspondant.
   *
   * Par fil, c'est ce qu'est un e-mail — un objet, des réponses. Par
   * correspondant, c'est « tout ce que cette personne m'a écrit », ce que le
   * courrier ne dit pas de lui-même mais qu'on cherche parfois.
   */
  groupBy: "fil" | "correspondant";
  /** La personne ouverte dans la vue par correspondant. Passager, jamais persisté. */
  correspondent: string | null;
  /**
   * Les **vues enregistrées** : des requêtes nommées, à côté des dossiers.
   *
   * Communes aux espaces, et non rangées par boîte : une requête est une
   * question, pas un classement. « est:non-lu avec:piece » se pose aussi bien
   * dans Perso que dans Pro, et la même question copiée trois fois dérive à la
   * première correction.
   */
  vues: Vue[];
  /**
   * La vue ouverte, `null` quand on regarde un dossier. Passagère comme
   * `folderId` : rouvrir l'app sur une liste filtrée sans l'avoir demandé,
   * c'est une boîte qui ment sur ce qu'elle contient.
   */
  vueId: string | null;
  dark: boolean;
  /** Everything loaded so far, every space and folder; selectors slice it. */
  threads: Thread[];
  /** Spaces being read for the first time — nothing to show yet. Per space: a switch mid-read must not lie about the other one. */
  loading: Partial<Record<SpaceId, boolean>>;
  /**
   * **Où en était « Envoyés »**, par espace, tel que la dernière lecture l'a
   * appris. Persisté : c'est à l'ouverture de l'app que la lecture est la plus
   * lente, et c'est donc là que sauter un dossier compte le plus — les
   * enveloppes gardées (`enMemoire`) portent déjà les messages envoyés qu'on
   * recollera.
   */
  envoyes: Partial<Record<SpaceId, { uidvalidity: number; uidnext: number }>>;
  /**
   * Les non-lus **du serveur**, par espace puis par dossier.
   *
   * Une lecture ne rapporte qu'un dossier : compter ce qu'on a en mémoire
   * donnait zéro pour tous les autres, ce qui n'est pas un compte manquant
   * mais un compte faux. `listFolders` les demande tous d'un coup, et
   * `selectUnreadCount` s'en sert pour ceux qu'on ne regarde pas.
   */
  folderCounts: Partial<Record<SpaceId, FolderUnread>>;
  /**
   * Quelles **boîtes** cet espace possède vraiment, par espace.
   *
   * Un dossier absent n'est pas un dossier vide : `\Junk` peut ne pas exister,
   * et « Indésirable » est le seul dossier qui se cache dans ce cas plutôt que
   * de s'afficher vide (voir `FolderId`). La réponse vient de `listFolders` —
   * les clés de ses comptes *sont* la liste des boîtes, parce qu'elles sont
   * bâties sur le `LIST` du serveur et non sur ce qu'on a en mémoire.
   *
   * **Persisté, à la différence des comptes.** Un compte périme en une minute
   * et le garder serait un mensonge ; l'existence d'un dossier, non. Ce qu'il
   * évite, c'est **d'attendre le réseau** à chaque visite : sur un vrai compte
   * la réponse vaut un `LIST` + `STATUS`.
   *
   * Ce qu'il n'évite pas, et c'est mesuré : la rangée n'est pas là à la
   * première peinture. Le store se réhydrate **après le montage**
   * (`skipHydration`, pour que le premier rendu client soit celui du serveur),
   * donc elle arrive un battement plus tard — 380 ms au lieu de 490 sur le
   * mock, dont la lecture est pourtant instantanée. C'est le même battement
   * que toutes les préférences persistées (densité, état de la barre) ; seul
   * le thème est posé avant, par le script inline de `layout.tsx`, parce qu'un
   * écran blanc qui devient noir coûte plus qu'une rangée qui s'ajoute.
   */
  boites: Partial<Record<SpaceId, FolderId[]>>;
  /** The last failed read of a space, for the list to show with a retry; cleared by the next successful read. */
  error: string | null;
  /**
   * Combien d'écritures attendent le retour du réseau.
   *
   * Le compte seul : la file elle-même est faite de fonctions, qui n'ont rien
   * à faire dans un état persisté. C'est ce nombre que la tête de liste
   * annonce — un geste qui n'est pas parti et que rien ne dit est un geste
   * qu'on croit fait.
   */
  enAttente: number;
  /**
   * Combien de messages ont été demandés pour un couple espace + dossier, et
   * si le serveur n'a plus rien à donner.
   *
   * La clé est `espace|dossier` : chaque liste pagine pour son compte, et
   * revenir dans un dossier ne doit pas hériter du défilement d'un autre.
   */
  pages: Record<string, { demandes: number; fin: boolean }>;
  /** Une page suivante est en route : la sentinelle n'en redemande pas trois. */
  chargeSuite: boolean;
  /** Why the last send failed, shown in the composer next to « Réessayer »; the message itself is back in `compose`. */
  sendError: string | null;
  /** Threads opened recently, per space — the "Today" tabs of Arc. */
  recent: RecentMap;
  /** The composer, `null` when closed. Its fields are the live form state. */
  compose: ComposeDraft | null;
  /** Hue chosen for a space, when the user changed its colour. */
  themes: Partial<Record<SpaceId, number>>;
  /**
   * Les espaces à afficher : ceux des comptes branchés, ou les trois de la
   * maquette tant qu'aucun compte ne l'est. Dans le store et non plus une
   * constante de module, parce qu'ils viennent maintenant du serveur.
   */
  spaces: Space[];

  /** Read every folder of a space from its provider and replace what we had. */
  /** Lit **un** dossier d'un espace. Le reste vient quand on y va. */
  loadSpace: (id?: SpaceId, folder?: FolderId) => Promise<void>;
  setSpace: (id: SpaceId) => void;
  setFolder: (id: FolderId) => void;
  selectThread: (id: string | null) => void;
  /** Demande le corps d'un fil sans l'ouvrir : l'attente passe avant le geste. */
  prefetchThread: (id: string) => void;
  /** Le lot suivant, quand le défilement s'en approche. Une requête pour tous. */
  prefetchThreads: (ids: string[]) => void;
  /* `silencieux` : ne pas proposer d'annuler. C'est l'annulation elle-même qui
     s'en sert — un « Annuler » sur un « Annulé » n'aurait plus de fin. */
  /**
   * Ce que le **serveur** a rendu pour la dernière recherche lancée.
   *
   * Hors de `threads` exprès : ce sont des fils qu'on n'a pas chargés, souvent
   * d'un autre dossier que celui qu'on regarde, et les verser dans la liste les
   * ferait apparaître dans une réception où ils ne sont pas. Ils vivent le
   * temps de la palette.
   */
  serverResults: Thread[];
  serverQuery: string;
  searching: boolean;
  searchError: string | null;
  /** Poser la question à la boîte entière. Une chaîne vide efface les résultats. */
  searchOnServer: (q: string) => void;
  toggleStar: (id: string, silencieux?: boolean) => void;
  toggleUnread: (id: string, silencieux?: boolean) => void;
  moveThread: (id: string, folder: DossierCible, silencieux?: boolean) => void;

  /**
   * **La sélection multiple.** Elle décrit un écran, pas un goût : elle ne se
   * persiste pas, et elle se vide dès qu'on change de dossier, d'espace ou de
   * vue — une sélection qui survivrait à un changement de liste agirait sur
   * des fils qu'on ne voit plus.
   *
   * `selectionOn` est un **mode explicite**, pas `selection.length > 0` : sur
   * bureau on entre dans le mode sans rien avoir coché encore (le bouton de la
   * tête de liste), et sur téléphone « Terminé » doit pouvoir sortir d'une
   * sélection vide sans que le mode s'éteigne tout seul sous le doigt.
   */
  selection: string[];
  selectionOn: boolean;
  /** D'où part une plage Maj-clic. `null` = aucune, le geste vaut alors une bascule. */
  ancreSelection: string | null;
  /** Entrer dans le mode, en cochant au passage la rangée qui l'a déclenché. */
  ouvrirSelection: (id?: string) => void;
  basculerSelection: (id: string) => void;
  /** Maj-clic : de la dernière rangée touchée jusqu'à celle-ci, dans l'ordre affiché. */
  etendreSelection: (id: string) => void;
  toutSelectionner: () => void;
  finSelection: () => void;
  /** Le même déplacement pour n fils, **un seul** toast et une seule annulation. */
  moveThreads: (ids: string[], folder: DossierCible) => void;

  /**
   * **Les pauses en cours**, par identifiant de fil : quand il revient, et d'où
   * il vient. Persisté — c'est la seule mémoire d'une promesse faite à
   * quelqu'un, et la perdre au rechargement laisserait le fil dans « En pause »
   * pour toujours, ce qui était l'état d'avant.
   */
  pauses: Record<string, Pause>;
  /** Mettre en pause jusqu'à une date, en gardant le dossier de départ. */
  snoozeThread: (id: string, wake: Date) => void;
  /** Sortir un fil de la pause tout de suite. */
  reprendre: (id: string) => void;
  /**
   * Oublier les promesses dont l'heure est passée — les fils reparaissent là
   * où ils sont restés. Appelé au montage et au retour sur l'onglet : il n'y a
   * pas de serveur à nous pour le faire à la seconde dite.
   */
  reveiller: () => Promise<void>;
  /** Poser l'état de lecture d'un groupe — poser, pas basculer : un groupe n'a pas d'état commun. */
  marquerLus: (ids: string[], unread: boolean) => void;

  /**
   * **Les étiquettes d'un fil, la liste entière.**
   *
   * Pas d'ajout ni de retrait : c'est le fournisseur qui sait ce que le message
   * porte déjà (y compris les mots-clés des autres clients, auxquels on ne
   * touche pas) et qui calcule la différence.
   *
   * Pas de toast non plus : cocher une étiquette se défait en la décochant, et
   * un « Annuler » pour un geste qui est déjà son propre inverse serait du
   * bruit. Un refus du serveur, lui, se voit — `commit` ramène le fil.
   */
  setLabels: (id: string, labels: string[]) => void;
  removeRecent: (id: string) => void;
  clearRecent: () => void;
  toggleSplit: () => void;
  setUnreadOnly: (value: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  /** L'espace suivant dans la rangée, en boucle : la case d'espace de la barre. */
  cycleSpace: (direction?: 1 | -1) => void;
  /** Posé une fois par `SpacesInit`, avec ce que le serveur a lu. */
  setSpaces: (spaces: Space[]) => void;
  /** Rejoue la file au retour du réseau. Posé par `AppShell` sur l'événement. */
  viderFile: () => Promise<void>;
  /** La page suivante du dossier ouvert — le courrier plus ancien. */
  chargerPlus: () => Promise<void>;
  /** Ouvre un fil que le serveur a rendu et que la liste n'a pas. */
  ouvrirResultat: (thread: Thread) => void;
  setGroupBy: (mode: MailState["groupBy"]) => void;
  setCorrespondent: (email: string | null) => void;
  /** Garde une requête. Rend la vue créée — ou celle qui portait déjà la même. */
  enregistrerVue: (q: string) => Vue;
  /** Récrit la requête d'une vue. La vue ouverte se relit aussitôt. */
  modifierVue: (id: string, q: string) => void;
  supprimerVue: (id: string) => void;
  ouvrirVue: (id: string) => void;
  setListWidth: (px: number) => void;
  /** Cas particulier d'`openThird` : la pièce jointe. `null` referme. */
  setPreview: (attachmentId: string | null) => void;
  openThird: (third: Third) => void;
  closeThird: () => void;
  setThirdWidth: (px: number) => void;
  setSidebarMode: (mode: SidebarMode) => void;
  setListDensity: (d: MailState["listDensity"]) => void;
  setFondBureau: (f: MailState["fondBureau"]) => void;
  /** ⌘B : attachée → rail → masquée → attachée. */
  cycleSidebarMode: () => void;
  toggleDark: () => void;
  /**
   * Answers a thread. `to` narrows the recipients (répondre à une seule
   * personne) ; left out, everyone on the last message gets it.
   * Resolves `false` when the provider refused: the caller gives the text back.
   */
  reply: (threadId: string, body: string, to?: Contact[]) => Promise<boolean>;

  openCompose: (initial?: Partial<ComposeDraft>) => void;
  /** Répondre à un fil : le composeur s'ouvre, et le message cité s'affiche en tête. */
  repondre: (threadId: string, to: Contact[]) => void;
  openDraft: (threadId: string) => void;
  updateCompose: (patch: Partial<ComposeDraft>) => void;
  /** Closes the composer, keeping the text as a draft unless it is blank. */
  closeCompose: () => void;
  sendMail: () => void;
  /** Honore le `mailto:` de `List-Unsubscribe` : un message, par notre SMTP. */
  desabonner: (threadId: string, messageId: string) => void;
  deleteDraft: (threadId: string) => void;
  setSpaceHue: (id: SpaceId, hue: number | null) => void;
  /** Le nom, l'icône, et la signature qu'un message emporte. `signature` absente = inchangée. */
  renameSpace: (id: SpaceId, patch: { name: string; icon: Space["icon"]; signature?: string }) => Promise<void>;
};

const MAX_RECENT = 8;

/**
 * Une page de liste, en **messages** — c'est l'unité d'IMAP, pas le fil.
 *
 * Soixante, comme la première lecture : la fenêtre par défaut du fournisseur.
 * Les regrouper en fils en rend moins, et c'est très bien — une page se juge à
 * ce qu'elle coûte au serveur, pas à ce qu'elle affiche.
 */
const PAGE = 60;

/** La clé de pagination d'une liste : chaque dossier de chaque espace pagine seul. */
const clePage = (spaceId: SpaceId, folder: FolderId) => `${spaceId}|${folder}`;
const NO_SUBJECT = "(sans objet)";

const patchThread = (threads: Thread[], id: string, patch: (t: Thread) => Thread) =>
  threads.map((t) => (t.id === id ? patch(t) : t));

/**
 * L'espace, lu dans l'état courant et jamais deviné : une écriture sur le
 * mauvais compte réel serait pire qu'une écriture manquée.
 */
/* Le jeton de la recherche serveur : deux demandes lancées coup sur coup
   peuvent revenir dans le désordre, et la première ne doit pas écraser la
   seconde. Même mécanique que les jetons de `loadSpace`. */
let recherche = 0;

const spaceOf = (spaceId: SpaceId): Space => {
  const space = useMail.getState().spaces.find((sp) => sp.id === spaceId);
  if (!space) throw new Error(`Espace inconnu « ${spaceId} »`);
  return space;
};

const accountOf = (spaceId: SpaceId) => spaceOf(spaceId).account;

/** Qui écrit depuis cet espace. Porté par l'espace, pas par une table d'adresses. */
const identityOf = (spaceId: SpaceId): Contact => spaceOf(spaceId).identity;

/**
 * Le fil sous son nouveau nom, après un déplacement.
 *
 * Tout ce qui dérive de l'identifiant d'un fil est **bâti sur lui** : le
 * message hydraté porte le même (`chemin uid`), et une pièce jointe y ajoute
 * son rang (`chemin uid 0`). Un remplacement de préfixe les renomme donc tous
 * les trois d'un coup, et rien ne reste accroché à l'UID disparu. Les messages
 * plus anciens d'un fil à plusieurs gardent le leur : ils ne servent qu'à viser
 * une réponse à l'écran, jamais à adresser le serveur.
 */
const renommerFil = (threads: Thread[], ancien: string, nouveau: string): Thread[] =>
  threads.map((t) =>
    t.id !== ancien
      ? t
      : {
          ...t,
          id: nouveau,
          messages: t.messages.map((m) =>
            m.id.startsWith(ancien)
              ? {
                  ...m,
                  id: nouveau + m.id.slice(ancien.length),
                  attachments: m.attachments?.map((a) =>
                    a.id.startsWith(ancien) ? { ...a, id: nouveau + a.id.slice(ancien.length) } : a,
                  ),
                }
              : m,
          ),
        },
  );

/** Les récents suivent le renommage, ou perdent le fil s'il n'a plus de nom. */
const retirerRecent = (recent: RecentMap, ancien: string, nouveau: string | null): RecentMap =>
  Object.fromEntries(
    Object.entries(recent).map(([space, ids]) => [
      space,
      nouveau ? (ids ?? []).map((r) => (r === ancien ? nouveau : r)) : (ids ?? []).filter((r) => r !== ancien),
    ]),
  );

/** One thread as it was, put back in place — or back at the top when it had been removed. */
const restoreThread = (threads: Thread[], before: Thread) =>
  threads.some((t) => t.id === before.id) ? threads.map((t) => (t.id === before.id ? before : t)) : [before, ...threads];

/** Reads in flight, one counter per space: a response that is not the latest is dropped. */
const loadTokens = new Map<SpaceId, number>();

/**
 * **Les écritures que le réseau n'a pas laissées partir**, dans l'ordre.
 *
 * Hors du store exprès, comme les jetons de lecture : ce sont des fonctions,
 * elles ne se sérialisent pas et n'ont rien à faire dans un état persisté. Le
 * store n'en garde que le **nombre**, qui est ce que l'interface montre.
 *
 * Elle ne survit pas à un rechargement, et c'est assumé : au rechargement la
 * boîte est relue depuis le serveur, donc ce qui n'était pas parti réapparaît
 * tel qu'il est là-bas. Perdre la file, c'est revenir à la vérité — pas mentir.
 */
const file: { rejouer: () => Promise<boolean> }[] = [];

/**
 * Pas de réseau — la seule chose que le navigateur sache dire de sûr.
 *
 * `navigator.onLine` est optimiste : il vaut `true` derrière un portail captif
 * qui n'ouvre rien. C'est pour ça qu'on ne s'en sert que **par la négative** —
 * `false` veut vraiment dire « aucune interface réseau ». Une requête qui rate
 * alors que le navigateur se dit en ligne est un vrai refus, et se traite comme
 * tel.
 */
const horsLigne = () => typeof navigator !== "undefined" && navigator.onLine === false;

/** Une adresse se compare **lavée** : les en-têtes portent volontiers la casse
 *  d'origine (« T.Milone@CoworkingCafe.fr »), et c'est la même boîte. */
export const memeAdresse = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * **Toutes nos adresses, pas seulement celle de l'espace regardé.**
 *
 * Un compte porte plusieurs espaces-vues, chacun avec son identité : un message
 * adressé à la fois à `moi@me.com` et à `moi@societe.fr` nous a atteints deux
 * fois, et « répondre à tous » nous écrivait dans l'autre boîte. Signalé sur une
 * vraie conversation — l'adresse qui recevait était dans les destinataires.
 */
function nosAdresses(): string[] {
  return useMail.getState().spaces.map((sp) => sp.identity.email);
}

/** Est-ce **notre** adresse ? Exporté : la recherche s'en sert pour ne pas
 *  rendre toute la boîte quand on tape son propre prénom. */
export const cestNous = (email: string) => nosAdresses().some((mien) => memeAdresse(mien, email));

/**
 * **La cible par défaut d'une réponse : l'expéditeur, seul.**
 *
 * C'était tout le monde. Sur une infolettre ou un courrier de service, « tout le
 * monde » comprend les adresses en copie et, quand un espace-vue reçoit sur une
 * adresse à nous, notre propre boîte : répondre, c'était s'écrire. Élargir reste
 * à un appui — « Répondre à tous » —, et il ne s'affiche que s'il y a vraiment
 * quelqu'un d'autre.
 */
export function replyDefault(t: Thread): Contact[] {
  return [t.messages[t.messages.length - 1].from];
}

/** Tout le monde sur le dernier message, **nous exclus**, dédoublonné. */
export function replyRecipients(t: Thread): Contact[] {
  const last = t.messages[t.messages.length - 1];
  const vus = new Set<string>();
  const recipients = [last.from, ...last.to, ...(last.cc ?? [])].filter((c) => {
    const cle = c.email.trim().toLowerCase();
    if (cestNous(c.email) || vus.has(cle)) return false;
    vus.add(cle);
    return true;
  });
  return recipients.length ? recipients : [last.from];
}

/**
 * Le tampon d'espace, posé à la réception.
 *
 * Un fournisseur ne sait pas de quel espace on parle — un compte iCloud en
 * portera trois — donc il rend des fils sans espace et c'est ici qu'ils en
 * reçoivent un. Un seul endroit, celui qui sait.
 */
const stamp = (spaceId: SpaceId, threads: Thread[]): Thread[] =>
  threads.map((t) => (t.spaceId === spaceId ? t : { ...t, spaceId }));

const stampOne = (spaceId: SpaceId, thread: Thread): Thread =>
  thread.spaceId === spaceId ? thread : { ...thread, spaceId };

/**
 * Le fil de la liste, complété par ce que le fournisseur vient de lire.
 *
 * On ne le remplace pas : la liste a regroupé plusieurs messages en un fil,
 * la lecture n'en rend qu'un — remplacer perdrait les autres. On verse donc
 * les corps et les pièces jointes dans les messages qui portent le même
 * identifiant, et rien d'autre ne bouge.
 */
const hydrate = (before: Thread, full: Thread): Thread => ({
  ...before,
  snippet: full.snippet || before.snippet,
  messages: before.messages.map((m) => {
    const filled = full.messages.find((x) => x.id === m.id);
    return filled
      ? {
          ...m,
          body: filled.body,
          html: filled.html,
          blockedImages: filled.blockedImages,
          desabonnement: filled.desabonnement,
          attachments: filled.attachments,
        }
      : m;
  }),
});

/**
 * Le contenu d'**un dossier** remplacé par une lecture fraîche ; le reste ne
 * bouge pas.
 *
 * Favoris fait exception : ce n'est pas un dossier mais une vue sur un
 * drapeau, et ses fils vivent ailleurs. On les fond dans ce qu'on a plutôt que
 * de remplacer une tranche qui n'existe pas — sans quoi ouvrir Favoris
 * effacerait la réception.
 */
/**
 * **Une lecture ne peut retirer que de la boîte qu'elle a lue.**
 *
 * Quand la lecture a sauté « Envoyés » (son compteur n'avait pas bougé), les
 * fils qu'elle rend n'ont que leur moitié reçue. Ce n'est pas « ces messages
 * ont disparu », c'est « je n'ai pas regardé là » — et le client, lui, les a
 * encore. On les recolle donc, et on retrie par date.
 *
 * Le chemin du dossier lu **se lit sur le fil lui-même** : son identifiant est
 * `chemin uid`, celui du dossier qu'on vient de lire. Rien à faire descendre
 * depuis la route, et « ceux qui ne viennent pas d'ici » se reconnaissent sans
 * rien deviner.
 */
const recoller = (frais: Thread, avant: Thread): Thread => {
  /* `slice(0, -1)` sur un identifiant **sans espace** rendrait le nom amputé
     de sa dernière lettre — un chemin qui ne correspond à rien, donc tous les
     messages recollés. Un fournisseur qui ne nomme pas ses dossiers (le mock)
     n'a de toute façon rien à recoller. */
  const coupe = frais.id.lastIndexOf(" ");
  if (coupe <= 0) return frais;
  const chemin = frais.id.slice(0, coupe);
  const siens = new Set(frais.messages.map((m) => m.id));
  const ailleurs = avant.messages.filter((m) => !siens.has(m.id) && !m.id.startsWith(`${chemin} `));
  if (ailleurs.length === 0) return frais;
  return {
    ...frais,
    messages: [...frais.messages, ...ailleurs].sort((a, b) => (a.date < b.date ? -1 : 1)),
  };
};

const replaceFolder = (
  threads: Thread[],
  spaceId: SpaceId,
  folder: FolderId,
  fresh: Thread[],
  /** La lecture a sauté « Envoyés » : ce qui vient d'ailleurs a survécu. */
  recollerAilleurs?: boolean,
) => {
  const seen = new Set<string>();
  const uniques = fresh.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));

  /* **Une relecture ne jette pas les corps déjà là.** Une lecture de dossier ne
     rapporte que des enveloppes ; remplacer la tranche telle quelle effaçait
     tout ce que le préchargement venait de descendre, à chaque tirage pour
     rafraîchir et à chaque retour dans un dossier. Un identifiant IMAP porte
     son dossier et son UID : le même identifiant, c'est le même message, donc
     son corps est encore bon. */
  const connus = new Map(threads.map((t) => [t.id, t]));
  const kept = uniques.map((t) => {
    const avant = connus.get(t.id);
    if (!avant) return t;
    const complet = recollerAilleurs ? recoller(t, avant) : t;
    return avant.messages.some((m) => m.body) ? hydrate(complet, avant) : complet;
  });
  const ids = new Set(kept.map((t) => t.id));
  if (folder === "starred") {
    return [...kept, ...threads.filter((t) => !ids.has(t.id))];
  }
  return [
    ...kept,
    ...threads.filter((t) => !ids.has(t.id) && !(t.spaceId === spaceId && t.folder === folder)),
  ];
};

/**
 * **Une page de plus, ajoutée à ce qu'on a déjà.**
 *
 * `replaceFolder` remplace la tranche du dossier — c'est ce qu'il faut pour une
 * relecture, où le serveur redit la vérité. Une pagination fait l'inverse :
 * elle complète. Les fils déjà connus gagnent au dédoublonnage (ils portent
 * peut-être un corps), et un fil qu'une page ancienne redonne — la fenêtre de
 * séquence a pu glisser si du courrier est arrivé entre-temps — ne se compte
 * pas deux fois.
 */
const ajouterPage = (threads: Thread[], fresh: Thread[]) => {
  const connus = new Set(threads.map((t) => t.id));
  return [...threads, ...fresh.filter((t) => !connus.has(t.id))];
};

/**
 * La citation d'une réponse, **rebâtie à l'envoi**.
 *
 * Deux versions, et elles ne disent pas la même chose de la même façon : le
 * texte porte un niveau de chevrons — la convention que tous les clients lisent
 * et que `couperCitation` sait replier —, le HTML porte un `blockquote`. On ne
 * cite que **ce que le message dit**, pas la pile qu'il traîne : un chevron par
 * tour donnait `> >> ` au quatrième échange.
 */
function citationDe(threads: Thread[], d: ComposeDraft): { texte: string; html: string } | null {
  if (!d.replyTo || !d.citeMessage) return null;
  const t = threads.find((x) => x.id === d.replyTo);
  const m = t?.messages.find((x) => x.id === d.citeMessage);
  if (!m) return null;
  const dit = couperCitation(m.body).visible;
  if (!dit.trim()) return null;
  const attribution = `Le ${formatFullDate(m.date)}, ${m.from.name} <${m.from.email}> a écrit :`;
  return {
    texte: `${attribution}\n${dit.split("\n").map((l) => `> ${l}`).join("\n")}`,
    html: `<div><br></div><div>${echapper(attribution)}</div><blockquote>${htmlDe(dit)}</blockquote>`,
  };
}

const describe = (err: unknown) => (err instanceof Error ? err.message : String(err));

const isBlank = (d: ComposeDraft) => {
  const signature = useMail.getState().spaces.find((sp) => sp.id === d.spaceId)?.signature ?? "";
  const body = (signature ? d.body.replace(`— ${signature}`, "") : d.body).trim();
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

/**
 * Combien de fils survivent à un rechargement. De quoi remplir une liste et
 * son défilement, pas de quoi remplir le stockage du navigateur.
 */
const MEMOIRE = 150;

/**
 * Ce qu'on garde d'un fil entre deux sessions : **de quoi dessiner la liste**,
 * et rien de plus.
 *
 * Une lecture IMAP coûte une connexion, une session et quelques allers-retours
 * — une à deux secondes, et c'est le prix du serverless. La première ouverture
 * les passait devant une carte vide. En gardant les enveloppes, elle montre la
 * boîte telle qu'on l'a laissée, puis la remplace quand la lecture arrive.
 *
 * Les corps, le HTML et les pièces jointes sont **retirés** : c'est ce qui pèse,
 * ça se relit à l'ouverture d'un message (`selectThread` redemande dès qu'un
 * corps manque), et ça n'apparaît pas dans la liste. L'aperçu, lui, est déjà
 * sur le fil.
 *
 * Ce sont des objets et des expéditeurs rangés en clair sur l'appareil : la
 * déconnexion les efface (`SignOut`), comme la session.
 */
/**
 * Décale d'un cran le compteur d'un dossier, s'il en a un.
 *
 * `undefined` reste `undefined` : un dossier dont le serveur n'a pas parlé
 * retombe sur le compte local, et celui-là est déjà juste — lui écrire un 1
 * par-dessus le fausserait.
 */
const bouger = (
  counts: Partial<Record<SpaceId, FolderUnread>>,
  spaceId: SpaceId,
  folder: FolderId,
  delta: number,
): Partial<Record<SpaceId, FolderUnread>> => {
  const actuel = counts[spaceId]?.[folder];
  if (actuel === undefined) return counts;
  return {
    ...counts,
    [spaceId]: { ...counts[spaceId], [folder]: Math.max(0, actuel + delta) },
  };
};

const enMemoire = (threads: Thread[]): Thread[] =>
  threads.slice(0, MEMOIRE).map((t) => ({
    ...t,
    messages: t.messages.map((m) => ({
      ...m,
      body: "",
      html: undefined,
      blockedImages: undefined,
      desabonnement: undefined,
      attachments: undefined,
    })),
  }));

/** Les corps déjà demandés, pour ne pas les demander deux fois. */
const enVol = new Set<string>();

/**
 * La liste en vue partagée : sa largeur, et ce qu'elle ne dépasse pas.
 *
 * En dessous de 300 px, l'objet et l'expéditeur se tronquent tous les deux et
 * la rangée ne dit plus rien ; au-delà de 640, c'est le message qu'on lit qui
 * n'a plus la place d'une ligne confortable.
 */
export const LISTE_MIN = 300;
export const LISTE_MAX = 640;
export const LISTE_DEFAUT = 360;

/** Le troisième volet : 460 à l'ouverture, 320 au plancher. */
export const TIERS_DEFAUT = 460;
export const TIERS_MIN = 320;
/** Ce qu'on garde à la conversation, quoi qu'il arrive. */
export const LECTURE_MIN = 420;

export const borne = (px: number) => Math.round(Math.min(LISTE_MAX, Math.max(LISTE_MIN, px)));

/** Combien de fils par lot : à peu près un écran de liste. */
export const LOT = 10;

/** Ceux qu'on ouvre en premier, demandés à part pour qu'ils arrivent d'abord. */
const TETE = 3;

/**
 * **Les promesses, relues.**
 *
 * `mail_pauses` suit le compte, mais elle n'était lue **qu'au chargement de la
 * page** : une pause posée sur le téléphone n'apparaissait sur le bureau
 * qu'après un rechargement complet — donc jamais, dans l'usage. Signalé au
 * premier test croisé. On relit au retour sur l'onglet, là où le réveil local
 * regarde déjà.
 *
 * **La base fait autorité sur ce qui existe**, sinon une pause reprise sur un
 * autre appareil reviendrait d'entre les morts à chaque synchronisation. Mais
 * un geste fait **pendant** la lecture ne doit pas être écrasé : on compte les
 * écritures locales avant et après, et on ne remplace en bloc que si personne
 * n'a rien fait entre-temps.
 */
let ecrituresPause = 0;
/**
 * **Une écriture ratée retire son autorité à la base.**
 *
 * Sans ça, la règle ci-dessus se retournait : une pause que le serveur n'avait
 * pas pu enregistrer disparaissait à la première synchronisation — la promesse
 * était **perdue**, alors que le fallback promettait « locale, dégradée,
 * jamais cassée ». Tant qu'une écriture est en échec, la base complète au lieu
 * de remplacer ; une écriture réussie lui rend la main.
 */
let pausesDesyncees = false;

export async function synchroniserPauses(): Promise<void> {
  const avant = ecrituresPause;
  let base: Record<string, Pause>;
  try {
    base = await relirePauses();
  } catch {
    /* Hors ligne, ou pas de compte : ce qu'on a en mémoire reste vrai. */
    return;
  }
  useMail.setState((s) =>
    ecrituresPause === avant && !pausesDesyncees
      ? { pauses: base }
      : { pauses: { ...base, ...s.pauses } },
  );
}

/**
 * **Ce que le cache sait déjà, posé sans réseau.**
 *
 * Les corps vivent dans IndexedDB d'une session à l'autre (`mail/corps.ts`) :
 * un message est immuable, le relire au serveur à chaque ouverture de l'app
 * était la moitié de « il recharge tout ». On remplit donc d'abord avec ce
 * qu'on a, et le réseau ne sert plus qu'à ce qui manque.
 *
 * Muet et sans conséquence : un cache absent ou refusé rend une table vide et
 * tout continue comme avant.
 */
async function depuisCache(ids: string[]): Promise<void> {
  const vises = new Set(ids);
  const manquants = useMail
    .getState()
    .threads.filter((t) => vises.has(t.id))
    .flatMap((t) => t.messages.filter((m) => !m.body));
  if (manquants.length === 0) return;
  const connus = await lireCorps(manquants);
  if (connus.size === 0) return;
  useMail.setState((s) => ({
    threads: s.threads.map((t) =>
      !vises.has(t.id) || !t.messages.some((m) => connus.has(m.id))
        ? t
        : { ...t, messages: t.messages.map((m) => ({ ...m, ...(connus.get(m.id) ?? {}) })) },
    ),
  }));
}

/**
 * Garder les corps **tels qu'ils sont dans la liste**, pas tels que le
 * fournisseur les a rendus.
 *
 * `hydrate` verse les corps dans les enveloppes déjà là et garde leur date et
 * leur expéditeur : ce sont ceux-là que la relecture comparera. Enregistrer la
 * version du fournisseur ferait échouer la vérification à chaque fois — un
 * cache qui n'aurait jamais rien à rendre.
 */
function garder(ids: string[]): void {
  const vises = new Set(ids);
  for (const t of useMail.getState().threads) {
    if (vises.has(t.id)) garderCorps(t.messages.filter((m) => m.body));
  }
}

/**
 * Ce que le cache connaît des fils déjà à l'écran, au réveil de l'app.
 *
 * Appelé après la réhydratation : les enveloppes sont revenues, les corps
 * peuvent les rejoindre avant même que la lecture IMAP ne parte. C'est ce qui
 * fait qu'un message lu hier s'ouvre sans attendre, et hors ligne.
 */
export async function reprendreCorps(): Promise<void> {
  const état = useMail.getState();
  const ids = état.threads
    .filter((t) => t.spaceId === état.spaceId && threadMatchesFolder(t, état.folderId, état.pauses))
    .slice(0, LOT)
    .map((t) => t.id);
  await depuisCache(ids);
}

/**
 * Va chercher le corps d'un fil, une seule fois.
 *
 * `bruyant` distingue les deux appelants : l'ouverture d'un message doit dire
 * si elle échoue, un préchargement doit se taire — il n'a été demandé par
 * personne, et un toast pour un message qu'on n'a pas ouvert serait
 * incompréhensible.
 */
async function remplir(id: string, bruyant: boolean): Promise<void> {
  const cible = useMail.getState().threads.find((t) => t.id === id);
  if (!cible || enVol.has(id)) return;
  /* **Tous les corps, pas un seul.** C'était `some` : un fil dont le dernier
     message avait été préchargé ne repassait jamais ici, et ses messages
     précédents gardaient leur squelette pour toujours. */
  if (cible.messages.every((m) => m.body)) return;

  enVol.add(id);
  try {
    await depuisCache([id]);
    const connu = useMail.getState().threads.find((t) => t.id === id);
    if (connu?.messages.every((m) => m.body)) return;
    const account = accountOf(cible.spaceId);
    /* Le fournisseur ne connaît que l'identifiant du fil, qui est celui de son
       dernier message : on lui dit lesquels il porte. */
    const full = await providerFor(account).getThread(account, id, cible.messages.map((m) => m.id));
    if (full) {
      useMail.setState((s) => ({ threads: patchThread(s.threads, id, (t) => hydrate(t, full)) }));
      garder([id]);
    }
  } catch (err: unknown) {
    if (bruyant) toast.error("Impossible d'ouvrir ce message", { description: describe(err) });
  } finally {
    enVol.delete(id);
  }
}

/**
 * Précharger plusieurs fils **en une seule requête**.
 *
 * C'est tout le sujet. Demander trois corps par trois appels, c'est trois
 * requêtes HTTP : sur du serverless, trois instances possiblement froides et
 * trois sessions IMAP ouvertes pour rien — le préchargement arrivait après le
 * doigt, donc ne servait à rien. Un seul appel, une connexion, un `FETCH`.
 *
 * Muet, comme tout préchargement : personne ne l'a demandé.
 */
async function precharger(ids: string[]): Promise<void> {
  /* Le cache d'abord : ce qu'il rend ne sera pas demandé au serveur. */
  await depuisCache(ids);
  const état = useMail.getState();
  const cibles = ids
    .map((id) => état.threads.find((t) => t.id === id))
    .filter((t): t is Thread => !!t && !enVol.has(t.id) && t.messages.every((m) => !m.body));
  if (cibles.length === 0) return;

  /* Économiseur de données activé : on ne descend rien que personne n'a
     demandé. La lecture à l'ouverture, elle, reste. */
  const lien = (navigator as { connection?: { saveData?: boolean } }).connection;
  if (lien?.saveData) return;

  for (const t of cibles) enVol.add(t.id);
  try {
    /* Tous d'un même dossier, donc d'un même compte : ils viennent de la
       lecture qui vient d'arriver. */
    const account = accountOf(cibles[0].spaceId);
    const pleins = await providerFor(account).getThreads(
      account,
      cibles.map((t) => t.id),
    );
    useMail.setState((s) => ({
      threads: pleins.reduce(
        (liste, full) => patchThread(liste, full.id, (t) => hydrate(t, full)),
        s.threads,
      ),
    }));
    garder(pleins.map((t) => t.id));
  } catch {
    /* La vraie ouverture réessaiera, et parlera, elle. */
  } finally {
    for (const t of cibles) enVol.delete(t.id);
  }
}

/** Une table indexée par espace, moins une clé. */
function oublier<T>(table: Partial<Record<SpaceId, T>>, cle: SpaceId): Partial<Record<SpaceId, T>> {
  if (!(cle in table)) return table;
  const suite = { ...table };
  delete suite[cle];
  return suite;
}

/** Une table indexée par espace, dont une clé change de nom. */
function renomme<T>(table: Partial<Record<SpaceId, T>>, de: SpaceId, vers: SpaceId) {
  if (!(de in table)) return table;
  const suite = { ...table };
  suite[vers] = suite[de];
  delete suite[de];
  return suite;
}

function toContacts(emails: string[], book: Map<string, Contact>): Contact[] {
  return emails.map((email) => book.get(email) ?? { name: email, email });
}

/**
 * Le stockage des préférences, qui **ne se laisse écrire qu'après avoir été
 * lu**.
 *
 * `skipHydration` retarde la lecture jusqu'après le montage, mais pas
 * l'écriture : zustand enregistre à *chaque* `set`. Or `SpacesInit` pose les
 * espaces venus du serveur **pendant le rendu**, donc avant cette lecture — et
 * cet enregistrement-là repartait des valeurs par défaut, écrasant dans
 * `localStorage` la teinte choisie et le thème sombre. Symptôme : tout
 * revenait à zéro à chaque rechargement, et seulement une fois un compte
 * branché (sans compte, `SpacesInit` ne se rend pas).
 *
 * Mesuré sur le vrai middleware : `setSpaces` avant `rehydrate()` réduisait
 * `{"themes":{"s1":210},"dark":true}` à `{"themes":{},"dark":false}`.
 *
 * Le garde-fou est ici plutôt que dans les composants parce que c'est la règle
 * qui compte : rien ne s'enregistre tant qu'on n'a pas lu ce qui existait.
 */
const preferences = createJSONStorage(() => {
  /* Lever ici sur le serveur, comme le défaut de zustand : la persistance
     reste inerte au lieu de faire tomber le rendu au premier `set`. */
  const local = localStorage;
  let lu = false;
  return {
    getItem: (nom) => {
      lu = true;
      return local.getItem(nom);
    },
    setItem: (nom, valeur) => {
      if (lu) local.setItem(nom, valeur);
    },
    removeItem: (nom) => local.removeItem(nom),
  };
});

export const useMail = create<MailState>()(
  persist(
    (set, get) => {
  /**
   * Optimistic writes: the interface has already changed, the provider is
   * told afterwards, and only a failure puts *that thread* back as it was —
   * not the whole list, which would undo every write that succeeded in the
   * meantime (three gestures in two seconds is normal, and IMAP answers in
   * one or two). The failure is said out loud, in a toast, because the
   * thread silently returning would read as a glitch. With the mock nothing
   * fails; with IMAP this is where a dropped connection lands.
   */
  /* `apres` reçoit ce que l'écriture a rendu — pour `modify`, l'identifiant du
     fil après coup. Deux branches d'un seul `then` plutôt qu'un `.then().catch()` :
     une erreur dans `apres` ne doit pas déclencher le retour arrière, qui dirait
     que l'écriture a échoué alors qu'elle a réussi. */
  /* Il **rend s'il a écrit** : l'annulation en dépend. Défaire une action qui
     n'a pas eu lieu, c'est en faire une nouvelle — le fil est déjà revenu tout
     seul par le retour arrière ci-dessous, et le « déplacer en sens inverse »
     l'enverrait cette fois pour de bon. */
  /**
   * Une écriture optimiste, et ce qu'on fait quand elle rate.
   *
   * **Deux échecs, deux réponses.** Un refus du serveur — un dossier absent,
   * un droit manquant — est définitif : le fil revient et le toast dit
   * pourquoi. Une coupure de réseau ne l'est pas : le geste était bon, il n'a
   * simplement pas pu partir. Le défaire serait punir l'utilisateur d'être
   * entré dans un tunnel, et lui faire refaire à la main les cinq archivages
   * qu'il vient de faire.
   *
   * Hors ligne, l'écriture entre donc dans la **file** et l'optimiste tient.
   * `commit` rend `true` — c'est ce que « Annuler » attend pour savoir que
   * l'état affiché est celui qui compte.
   */
  const commit = <T>(
    before: Thread,
    run: () => Promise<T>,
    undone: string,
    apres?: (resultat: T) => void,
  ): Promise<boolean> =>
    run().then(
      (resultat) => {
        apres?.(resultat);
        return true;
      },
      (err: unknown) => {
        if (horsLigne()) {
          file.push({ rejouer: () => commit(before, run, undone, apres) });
          set({ enAttente: file.length });
          /* **Une fois, à la première.** Chaque geste porte déjà son toast
             (« Archivé ») ; en empiler un second à chaque archivage du tunnel
             ferait une colonne d'avertissements pour une seule nouvelle. Le
             compte de la tête de liste, lui, reste à l'écran. */
          if (file.length === 1) {
            toast("Hors ligne", { description: "Ce qui est fait ici partira au retour du réseau." });
          }
          return true;
        }
        set((s) => ({ threads: restoreThread(s.threads, before) }));
        toast.error(undone, { description: describe(err) });
        return false;
      },
    );

  /**
   * Le toast qui porte « Annuler ».
   *
   * **Une seule définition, au lieu d'un cas par appelant.** Neuf endroits
   * archivent, jettent ou marquent — la liste, son balayage, le mail ouvert,
   * ses deux feuilles, le troisième volet, l'en-tête du bureau, deux
   * raccourcis clavier — et deux seulement disaient ce qu'ils venaient de
   * faire. Le geste appartient au store, donc son récit aussi.
   *
   * L'annulation **attend l'écriture** avant de partir : un déplacement change
   * l'identifiant du fil, et défaire trop tôt viserait celui d'avant. Et si
   * l'écriture a échoué, elle ne fait rien — le fil est déjà revenu, et le
   * message d'échec le dit.
   */
  const annulable = (libelle: string, ecriture: Promise<boolean>, inverse: () => void) => {
    const id = toast(libelle, {
      action: { label: "Annuler", onClick: () => void ecriture.then((ok) => ok && inverse()) },
    });
    /* Deux toasts pour un geste raté — « Archivé » puis « Archivage impossible »
       — se contrediraient l'un l'autre. Le premier s'efface. */
    void ecriture.then((ok) => {
      if (!ok) toast.dismiss(id);
    });
  };

  /**
   * **Un déplacement, sans son récit.** Extrait de `moveThread` le jour de la
   * sélection multiple : trois fils archivés d'un coup doivent poser **un**
   * toast, pas trois, et une seule annulation doit tous les ramener. Le geste
   * et son récit sont donc deux choses — `deplacer` fait, `moveThread` et
   * `moveThreads` racontent.
   *
   * Il rend de quoi défaire : le dossier de départ, la promesse d'écriture
   * (`true` si elle est passée ou si elle attend le réseau), et un **lecteur**
   * de l'identifiant d'après. Un lecteur et non une valeur : l'identifiant
   * change au déplacement et n'est connu qu'au retour du serveur.
   */
  const deplacer = (
    id: string,
    folder: DossierCible,
  ): { depuis: DossierCible; ok: Promise<boolean>; courant: () => string } | null => {
    const before = get().threads;
    const t = before.find((x) => x.id === id);
    if (!t) return null;
    const depuis = t.folder;
    /* **L'annulation vise l'identifiant d'après.** Il change au déplacement, et
       il n'est connu qu'une fois le serveur revenu : la fermeture le relit
       plutôt que de le capturer. */
    let courant = id;
    set((s) => ({
      threads: patchThread(before, id, (x) => ({ ...x, folder })),
      selectedThreadId: s.selectedThreadId === id ? null : s.selectedThreadId,
      /* Le compteur du dossier d'arrivée suit tout de suite. Celui du départ
         n'a rien à faire : c'est le dossier ouvert, donc le compte local, et
         le fil vient d'en sortir. On ne touche qu'un compte **déjà connu** —
         inventer un 1 là où le serveur n'a rien dit écraserait le compte local,
         qui est juste. */
      /* Le dossier de **départ** perd son non-lu autant que celui d'arrivée le
         gagne. On ne le faisait pas : le départ était toujours le dossier
         ouvert, dont le compte est local et se recalcule seul. Une annulation
         casse cette hypothèse — elle ramène le fil depuis Archive, qu'on ne
         regarde pas —, et sans cette ligne Archive gardait son +1 pour de bon.
         `bouger` ne touche qu'un compte déjà connu, donc le dossier ouvert n'y
         perd rien. */
      folderCounts: t.unread
        ? bouger(bouger(s.folderCounts, t.spaceId, folder, +1), t.spaceId, depuis, -1)
        : s.folderCounts,
    }));
    const account = accountOf(t.spaceId);
    const undone = {
      archive: "Archivage impossible, la conversation est de retour",
      trash: "Suppression impossible, la conversation est de retour",
      junk: "Signalement impossible, la conversation est de retour",
    }[folder as string] ?? "Déplacement impossible, la conversation est de retour";
    const ecriture = commit(
      t,
      () => providerFor(account).modify(account, id, { folder }),
      undone,
      (apres) => {
        if (apres) courant = apres;
        if (apres === id) return;
        set((s) => ({
          threads: apres
            ? renommerFil(s.threads, id, apres)
            : s.threads.filter((x) => x.id !== id),
          recent: retirerRecent(s.recent, id, apres),
          third: s.third?.kind === "message" && s.third.messageId.startsWith(id)
            ? null
            : s.third,
        }));
      },
    );
    return { depuis, ok: ecriture, courant: () => courant };
  };

  return {
  spaceId: SPACES[0].id,
  folderId: "inbox",
  selectedThreadId: null,
  selection: [],
  selectionOn: false,
  ancreSelection: null,
  pauses: {},
  splitView: true,
  unreadOnly: false,
  etiquette: null,
  commandOpen: false,
  sidebarOpen: false,
  settingsOpen: false,
  sidebarMode: "full",
  listDensity: "confort",
  fondBureau: "degrade",
  listWidth: LISTE_DEFAUT,
  groupBy: "fil",
  vues: [],
  vueId: null,
  correspondent: null,
  third: null,
  thirdWidth: TIERS_DEFAUT,
  dark: false,
  threads: [],
  loading: {},
  envoyes: {},
  folderCounts: {},
  boites: {},
  serverResults: [],
  serverQuery: "",
  searching: false,
  searchError: null,
  error: null,
  enAttente: 0,
  pages: {},
  chargeSuite: false,
  sendError: null,
  recent: { perso: [], pro: [], side: [] },
  compose: null,
  themes: {},
  spaces: SPACES,

  loadSpace: async (id, folderId) => {
    const spaceId = id ?? get().spaceId;
    const folder = folderId ?? get().folderId;
    /* **« En pause » ne se lit pas** : ce n'est pas un dossier, c'est `pauses`.
       Aller le demander au serveur, c'était l'aller-retour qui répondait
       « Cette boîte n'a pas de dossier « snoozed » ». */
    if (folder === "snoozed") {
      set((s) => ({ loading: { ...s.loading, [spaceId]: false }, error: null }));
      return;
    }
    const account = accountOf(spaceId);
    const token = (loadTokens.get(spaceId) ?? 0) + 1;
    loadTokens.set(spaceId, token);
    /* `loading` only while there is nothing to show: a refresh of a space we
       already have keeps the list on screen and swaps it when the read lands. */
    if (!get().threads.some((t) => t.spaceId === spaceId && threadMatchesFolder(t, folder)))
      set((s) => ({ loading: { ...s.loading, [spaceId]: true } }));
    const done = (patch: Partial<MailState>) =>
      set((s) => ({ ...patch, loading: { ...s.loading, [spaceId]: false } }));
    try {
      /* Un seul dossier, celui qu'on regarde. Les six en parallèle, c'étaient
         six connexions IMAP et six ouvertures de session pour afficher une
         seule liste ; le reste arrive quand on y va. Les compteurs des autres
         dossiers, eux, viennent de `listFolders` juste en dessous — un `LIST`
         avec `STATUS`, pas six lectures. */
      const page = await providerFor(account).listThreads(account, {
        folder,
        /* Quel dossier tient lieu de « Réception » **pour cet espace** : un
           compte iCloud en porte plusieurs, une par domaine. */
        inboxPath: spaceOf(spaceId).inboxPath,
        limit: PAGE,
        /* **Ce qu'on sait d'« Envoyés »**, appris du `listFolders` de la
           lecture d'avant. S'il n'a pas bougé, le serveur ne l'ouvre pas :
           deux allers-retours et 1 239 ms de moins, mesurés.

           **Et seulement si on a de quoi recoller** : sauter la lecture d'un
           dossier dont on n'a rien en mémoire, ce n'est pas économiser un
           aller-retour, c'est perdre la moitié envoyée des fils sans rien pour
           la remettre. C'est exactement le cas d'un cache vidé. */
        envoyes: get().threads.some((t) => t.spaceId === spaceId)
          ? get().envoyes[spaceId]
          : undefined,
      });
      const fresh = page.threads;
      /* Two reads of the same space can cross; only the latest one may land. */
      if (loadTokens.get(spaceId) !== token) return;
      set((s) => ({
        threads: replaceFolder(s.threads, spaceId, folder, stamp(spaceId, fresh), page.sautEnvoyes),
        loading: { ...s.loading, [spaceId]: false },
        error: null,
        /* **Une relecture repart de la première page.** Le serveur vient de
           redire ce qu'il a de plus récent ; garder le compte d'avant ferait
           sauter la page suivante par-dessus tout ce qu'on vient de jeter. */
        pages: { ...s.pages, [clePage(spaceId, folder)]: { demandes: PAGE, fin: fresh.length === 0 } },
      }));
      /* **Les compteurs des autres dossiers, en parallèle.** Un `LIST` avec
         `STATUS` chez le fournisseur, et il ne retarde pas la liste : elle est
         déjà à l'écran. Un échec ne se voit pas — un compteur qui ne bouge pas
         vaut mieux qu'un bandeau d'erreur pour un chiffre. */
      void providerFor(account)
        .listFolders(account, { inboxPath: spaceOf(spaceId).inboxPath })
        .then(({ counts, envoyes }) => {
          if (loadTokens.get(spaceId) !== token) return;
          set((s) => ({
            folderCounts: { ...s.folderCounts, [spaceId]: counts },
            /* Les clés, pas les valeurs : c'est la liste des boîtes. */
            boites: { ...s.boites, [spaceId]: Object.keys(counts) as FolderId[] },
            /* Le repère pour la **prochaine** lecture. Il a donc l'âge de
               celle-ci — c'est le prix de ne pas payer un aller-retour pour le
               vérifier, et une réponse écrite ailleurs arrive une lecture plus
               tard. */
            envoyes: envoyes ? { ...s.envoyes, [spaceId]: envoyes } : s.envoyes,
          }));
        })
        .catch(() => {});

      /* **La tête d'abord, le reste ensuite.** Dix messages mettent plusieurs
         secondes à revenir — plus longtemps qu'il n'en faut pour toucher le
         premier de la liste, qui est celui qu'on ouvre. On demande donc les
         trois premiers, qui arrivent vite, puis les sept autres derrière. Un
         seul lot de dix arrivait après le doigt, ce qui revenait à ne rien
         précharger du tout. */
      const ids = fresh.map((t) => t.id);
      void precharger(ids.slice(0, TETE)).then(() => precharger(ids.slice(TETE, LOT)));
    } catch (err) {
      if (loadTokens.get(spaceId) !== token) return;
      done({ error: describe(err) });
    }
  },

  setSpace: (spaceId) =>
    set({ spaceId, folderId: "inbox", selectedThreadId: null, unreadOnly: false, vueId: null, etiquette: null, selection: [], selectionOn: false, ancreSelection: null }),

  /* **Choisir un dossier, c'est quitter la vue.** Les deux occupent la même
     liste : la laisser filtrée par une question qu'on ne voit plus, c'est une
     réception qui cache la moitié de son courrier sans le dire. */
  /* **Changer de liste vide la sélection.** Elle désigne des rangées visibles ;
     gardée d'un dossier à l'autre, le prochain « Supprimer » aurait frappé
     des fils qu'on ne voit plus. Même raison pour l'espace et pour une vue. */
  setFolder: (folderId) =>
    set({ folderId, selectedThreadId: null, vueId: null, etiquette: null, selection: [], selectionOn: false, ancreSelection: null }),

  selectThread: (id) => {
    if (id === null) {
      set({ selectedThreadId: null, third: null });
      return;
    }
    const { spaceId, recent, threads } = get();
    const list = [id, ...(recent[spaceId] ?? []).filter((r) => r !== id)].slice(0, MAX_RECENT);
    const target = threads.find((t) => t.id === id);
    set((s) => ({
      selectedThreadId: id,
      third: null,
      recent: { ...recent, [spaceId]: list },
      threads: patchThread(s.threads, id, (t) => ({ ...t, unread: false })),
    }));
    if (!target) return;
    const account = accountOf(target.spaceId);

    if (target.unread) {
      commit(target, () => providerFor(account).modify(account, id, { unread: false }), "Impossible de marquer comme lu");
    }

    /* Une liste ne rapporte que des enveloppes : lire soixante corps pour en
       afficher un serait payer soixante fois trop. Le corps arrive donc à
       l'ouverture, et seulement s'il manque — le mock, lui, rend tout d'un
       coup et ne repasse jamais ici. Le plus souvent il est déjà là, demandé
       dès que le doigt s'est posé (`prefetchThread`). */
    void remplir(id, true);
  },

  /**
   * Commencer la lecture d'un message **avant** qu'on l'ouvre.
   *
   * Le corps arrive par une requête, et cette requête commençait au moment du
   * clic : l'attente était entièrement devant les yeux. Un appui dure 100 à
   * 300 ms avant que la vue ne s'ouvre, et une liste qui vient d'arriver dit
   * déjà lequel on lira en premier — autant s'en servir.
   *
   * Silencieux par construction : un préchargement raté ne se dit pas, la
   * vraie ouverture réessaiera et parlera, elle.
   */
  prefetchThread: (id) => {
    void remplir(id, false);
  },

  prefetchThreads: (ids) => {
    void precharger(ids);
  },

  /**
   * La recherche côté serveur.
   *
   * Elle ne part **jamais toute seule** : ⌘K filtre la mémoire à chaque frappe,
   * ce qui ne coûte rien ; interroger IMAP à chaque lettre coûterait une
   * session par caractère. C'est donc un geste — on demande, on attend.
   *
   * Le jeton (`recherche`) sert au même que celui de `loadSpace` : deux
   * demandes lancées coup sur coup peuvent revenir dans le désordre, et la
   * première ne doit pas écraser la seconde.
   */
  searchOnServer: (q) => {
    const requete = q.trim();
    if (!requete) {
      set({ serverResults: [], serverQuery: "", searching: false, searchError: null });
      return;
    }
    const s = get();
    const space = s.spaces.find((x) => x.id === s.spaceId);
    if (!space) return;
    const jeton = ++recherche;
    set({ searching: true, searchError: null, serverQuery: requete });
    providerFor(space.account)
      .search(space.account, { q: requete, folder: s.folderId, inboxPath: space.inboxPath })
      .then(
        (trouves) => {
          if (jeton !== recherche) return;
          set({ serverResults: stamp(space.id, trouves), searching: false });
        },
        (err: unknown) => {
          if (jeton !== recherche) return;
          set({ searching: false, searchError: describe(err), serverResults: [] });
        },
      );
  },

  /* **Une bascule est son propre inverse** : annuler, c'est rappeler la même
     action — en silence, pour ne pas proposer d'annuler l'annulation. */
  toggleStar: (id, silencieux) => {
    const before = get().threads;
    const t = before.find((x) => x.id === id);
    if (!t) return;
    set({ threads: patchThread(before, id, (x) => ({ ...x, starred: !x.starred })) });
    const account = accountOf(t.spaceId);
    const ecriture = commit(t, () => providerFor(account).modify(account, id, { starred: !t.starred }), t.starred ? "Toujours en favori" : "Impossible d'ajouter aux favoris");
    if (silencieux) return;
    annulable(t.starred ? "Retiré des favoris" : "Ajouté aux favoris", ecriture, () => {
      get().toggleStar(id, true);
      toast("Annulé");
    });
  },

  toggleUnread: (id, silencieux) => {
    const before = get().threads;
    const t = before.find((x) => x.id === id);
    if (!t) return;
    set({ threads: patchThread(before, id, (x) => ({ ...x, unread: !x.unread })) });
    const account = accountOf(t.spaceId);
    const ecriture = commit(t, () => providerFor(account).modify(account, id, { unread: !t.unread }), "Impossible de changer l'état de lecture");
    if (silencieux) return;
    annulable(t.unread ? "Marqué comme lu" : "Marqué comme non lu", ecriture, () => {
      get().toggleUnread(id, true);
      toast("Annulé");
    });
  },

  /* **Déplacer change l'identifiant du fil.** Sur IMAP, l'UID d'un message
     appartient à son dossier : le message qui arrive dans « Archive » en reçoit
     un nouveau, et l'ancien ne désigne plus rien. Le garder faisait deux dégâts
     — un fil fantôme sur lequel toute action visait un UID disparu, et un
     second exemplaire dès qu'on relisait le dossier d'arrivée. Le fournisseur
     rend donc le nom d'après, et on renomme ; s'il ne le sait pas (`null`), on
     retire le fil de la liste et la prochaine lecture le retrouvera. */
  moveThread: (id, folder, silencieux) => {
    const d = deplacer(id, folder);
    if (!d || silencieux) return;
    annulable(fait(folder, 1), d.ok, () => {
      get().moveThread(d.courant(), d.depuis, true);
      toast("Annulé");
    });
  },

  /**
   * **Le même déplacement pour n fils, un seul toast.**
   *
   * Chacun garde son propre dossier de départ : une sélection peut venir d'une
   * vue ou d'une recherche, où les fils ne sont pas tous dans la même boîte —
   * et « l'inverse d'archiver » n'existe pas dans l'absolu, c'est la règle de
   * la fiche « Annuler ».
   *
   * L'annulation ne défait que **ce qui est passé** : un fil dont l'écriture a
   * échoué est déjà revenu tout seul (`commit` l'a restauré), et lui envoyer le
   * déplacement inverse ferait un vrai déplacement au lieu d'un retour.
   *
   * La sélection se vide tout de suite : les fils qu'elle désignait viennent de
   * quitter la liste.
   */
  moveThreads: (ids, folder) => {
    const faits = ids.map((id) => deplacer(id, folder)).filter((d) => d !== null);
    if (faits.length === 0) return;
    set({ selection: [], selectionOn: false, ancreSelection: null });
    /* `some` et non `every` : si une seule écriture est passée, « Annuler » a
       quelque chose à défaire. */
    const tout = Promise.all(faits.map((d) => d.ok)).then((oks) => oks.some(Boolean));
    annulable(fait(folder, faits.length), tout, () => {
      faits.forEach((d) => void d.ok.then((ok) => ok && get().moveThread(d.courant(), d.depuis, true)));
      toast("Annulé");
    });
  },

  /**
   * **Poser** l'état de lecture d'un groupe, ne pas le basculer : dix fils dont
   * six sont lus n'ont pas d'état commun à inverser, et une bascule en aurait
   * fait quatre lus et six non lus. Le bouton dit donc ce qu'il fait.
   */
  marquerLus: (ids, unread) => {
    const cibles = get().threads.filter((t) => ids.includes(t.id) && t.unread !== unread);
    if (cibles.length === 0) return;
    set({ selection: [], selectionOn: false, ancreSelection: null });
    cibles.forEach((t) => get().toggleUnread(t.id, true));
    const tout = Promise.resolve(true);
    annulable(
      cibles.length === 1
        ? unread
          ? "Marqué comme non lu"
          : "Marqué comme lu"
        : `${cibles.length} conversations marquées comme ${unread ? "non lues" : "lues"}`,
      tout,
      () => {
        cibles.forEach((t) => get().toggleUnread(t.id, true));
        toast("Annulé");
      },
    );
  },

  /**
   * **Mettre en pause, avec une date.**
   *
   * Le déplacement d'abord, la promesse ensuite, et dans cet ordre : un fil
   * change d'identifiant en changeant de dossier, et noter la pause sous
   * l'ancien la rendrait introuvable au réveil. `deplacer` rend justement un
   * lecteur de l'identifiant d'après.
   *
   * Le dossier de départ est gardé avec : « l'inverse de mettre en pause »
   * n'existe pas dans l'absolu — un fil mis en pause depuis Archive doit
   * revenir dans Archive.
   */
  /**
   * **Mettre en pause, sans rien déplacer.**
   *
   * La première version faisait `moveThread(id, "snoozed")`, et sur une vraie
   * boîte elle répondait « Cette boîte n'a pas de dossier « snoozed » » :
   * iCloud n'a pas de `\Snoozed` en SPECIAL-USE, et deviner un nom de dossier
   * est ce que la fiche IMAP interdit. « En pause » est un **état**, comme
   * Favoris — la fiche le disait déjà pour les compteurs, l'action ne le
   * savait pas.
   *
   * Le fil reste donc là où il est sur le serveur ; c'est `pauses` qui le
   * retire de la liste qu'on regarde et le montre dans « En pause » jusqu'à
   * l'heure dite. Rien à écrire au serveur, donc rien qui puisse échouer : le
   * geste marche sur toutes les boîtes, et son annulation est immédiate.
   */
  snoozeThread: (id, wake) => {
    const t = get().threads.find((x) => x.id === id);
    if (!t) return;
    set((s) => ({
      pauses: { ...s.pauses, [id]: { wake: wake.toISOString() } },
      selectedThreadId: s.selectedThreadId === id ? null : s.selectedThreadId,
    }));
    /* **La base suit, elle ne commande pas.** Le geste est déjà fait à
       l'écran ; l'écriture sert aux autres appareils et au tour de relève, qui
       préviendra à l'heure dite. Ratée, la pause reste locale — le
       comportement d'avant, dégradé et jamais cassé. L'enveloppe voyage avec :
       la notification doit pouvoir s'écrire sans rouvrir la boîte. */
    const dernier = t.messages[t.messages.length - 1];
    ecrituresPause += 1;
    void enregistrerPause({
      thread_id: id,
      wake: wake.toISOString(),
      titre: dernier?.from.name || dernier?.from.email,
      objet: t.subject,
    })
      .then(() => {
        pausesDesyncees = false;
      })
      .catch(() => {
        pausesDesyncees = true;
      });
    annulable(`En pause, revient ${libellePause(wake.toISOString())}`, Promise.resolve(true), () => {
      get().reprendre(id);
      toast("Annulé");
    });
  },

  /** Sortir un fil de la pause tout de suite — « Annuler », ou le réveil. */
  reprendre: (id) => {
    set((s) => {
      const reste = { ...s.pauses };
      delete reste[id];
      return { pauses: reste };
    });
    ecrituresPause += 1;
    void oublierPause([id]).catch(() => {});
  },

  /**
   * **Ramener ce dont l'heure est passée.**
   *
   * Depuis que la pause ne déplace plus rien, réveiller c'est **oublier la
   * promesse** : le fil est resté dans son dossier, il y réapparaît. Plus rien
   * à relire, plus rien à écrire, plus rien qui puisse échouer.
   *
   * Silencieux : personne ne vient de faire un geste, et neuf fils qui
   * reviennent en même temps feraient neuf toasts pour une nouvelle qui se lit
   * dans la liste.
   */
  reveiller: async () => {
    const maintenant = Date.now();
    const dus = Object.entries(get().pauses).filter(
      ([, p]) => new Date(p.wake).getTime() <= maintenant,
    );
    if (dus.length === 0) return;
    set((s) => {
      const reste = { ...s.pauses };
      dus.forEach(([id]) => delete reste[id]);
      return { pauses: reste };
    });
    /* La promesse est tenue : elle n'a plus à voyager. Le tour de relève
       pourrait la réveiller à son tour et notifier deux fois. */
    ecrituresPause += 1;
    void oublierPause(dus.map(([id]) => id)).catch(() => {});
  },

  setLabels: (id, labels) => {
    const before = get().threads;
    const t = before.find((x) => x.id === id);
    if (!t) return;
    const propres = [...new Set(labels.map((l) => l.trim()).filter(Boolean))];
    set({ threads: patchThread(before, id, (x) => ({ ...x, labels: propres })) });
    const account = accountOf(t.spaceId);
    void commit(
      t,
      () => providerFor(account).modify(account, id, { labels: propres }),
      "Étiquette impossible, la conversation est de retour",
    );
  },

  ouvrirSelection: (id) =>
    set((s) => ({
      selectionOn: true,
      selection: id ? (s.selection.includes(id) ? s.selection : [...s.selection, id]) : s.selection,
      ancreSelection: id ?? s.ancreSelection,
    })),

  /**
   * **Décocher le dernier ferme le mode.**
   *
   * Signalé à l'usage : « si je désélectionne manuellement le ou les messages,
   * il faut revenir à l'affichage d'origine sans devoir appuyer sur la croix ».
   * C'est juste — la barre d'actions n'a plus rien à viser, et laisser un mode
   * ouvert sur zéro conversation oblige à un geste de plus pour revenir à
   * l'endroit d'où l'on n'est jamais vraiment parti.
   *
   * **Ce n'est pas `selection.length > 0` pour autant** : entrer par le bouton
   * de la tête de liste ouvre le mode **sans rien cocher**, et il doit tenir —
   * c'est justement là qu'on va chercher les cases. Le mode se ferme sur un
   * geste de **décochage**, pas sur un compte à zéro.
   */
  basculerSelection: (id) =>
    set((s) => {
      const dedans = s.selection.includes(id);
      const selection = dedans ? s.selection.filter((x) => x !== id) : [...s.selection, id];
      return {
        selection,
        selectionOn: !(dedans && selection.length === 0),
        ancreSelection: dedans && selection.length === 0 ? null : id,
      };
    }),

  /**
   * Maj-clic : **de l'ancre à la rangée visée, dans l'ordre affiché**.
   *
   * L'ordre est celui de `selectVisibleThreads`, pas celui de `threads` : la
   * liste est triée et filtrée, et une plage prise sur l'ordre interne
   * cocherait des fils qui ne sont pas entre les deux à l'écran. Sans ancre —
   * premier clic de la session — le geste vaut une bascule.
   */
  etendreSelection: (id) => {
    const s = get();
    const visibles = selectVisibleThreads(s).map((t) => t.id);
    const a = s.ancreSelection ? visibles.indexOf(s.ancreSelection) : -1;
    const b = visibles.indexOf(id);
    if (a < 0 || b < 0) return get().basculerSelection(id);
    const plage = visibles.slice(Math.min(a, b), Math.max(a, b) + 1);
    set({
      selectionOn: true,
      selection: [...new Set([...s.selection, ...plage])],
    });
  },

  toutSelectionner: () => {
    const s = get();
    const visibles = selectVisibleThreads(s).map((t) => t.id);
    /* Tout coché : le bouton devient « Ne rien sélectionner ». Un bouton qui ne
       fait plus rien une fois pressé est un bouton qu'on presse deux fois.
       Le mode **reste ouvert** : on vient de presser un bouton du mode, pas de
       décocher la dernière rangée — la différence est celle de l'intention. */
    const toutes = visibles.length > 0 && visibles.every((v) => s.selection.includes(v));
    set({ selectionOn: true, selection: toutes ? [] : visibles, ancreSelection: null });
  },

  finSelection: () => set({ selectionOn: false, selection: [], ancreSelection: null }),

  removeRecent: (id) =>
    set((s) => ({
      recent: { ...s.recent, [s.spaceId]: (s.recent[s.spaceId] ?? []).filter((r) => r !== id) },
    })),

  clearRecent: () => set((s) => ({ recent: { ...s.recent, [s.spaceId]: [] } })),

  toggleSplit: () => set((s) => ({ splitView: !s.splitView })),
  /* Le filtre change la liste : une sélection gardée désignerait des rangées
     que le filtre vient de cacher. Même règle que le dossier. */
  setUnreadOnly: (unreadOnly) =>
    set({ unreadOnly, selection: [], selectionOn: false, ancreSelection: null }),

  /* Comme tout changement de liste : la sélection se vide, elle porterait
     sinon sur des fils qu'on ne voit plus. */
  setEtiquette: (etiquette) =>
    set({ etiquette, selectedThreadId: null, selection: [], selectionOn: false, ancreSelection: null }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setSidebarOpen: (sidebarOpen) => set((s) => ({ sidebarOpen, settingsOpen: sidebarOpen ? false : s.settingsOpen })),
  setSettingsOpen: (settingsOpen) => set((s) => ({ settingsOpen, sidebarOpen: settingsOpen ? false : s.sidebarOpen })),

  /* Changer d'espace sans ouvrir de feuille : la case de la barre et le
     balayage horizontal de la liste partagent ce seul chemin, sinon l'un des
     deux finirait par oublier de remettre le dossier et le fil ouvert. */
  cycleSpace: (direction = 1) => {
    const { spaces, spaceId } = get();
    if (spaces.length < 2) return;
    const i = spaces.findIndex((sp) => sp.id === spaceId);
    const suivant = spaces[(((i < 0 ? 0 : i) + direction) % spaces.length + spaces.length) % spaces.length];
    if (suivant.id === spaceId) return;
    get().setSpace(suivant.id);
  },

  /**
   * Le réseau est revenu : on rejoue, **dans l'ordre et une par une**.
   *
   * L'ordre compte — archiver puis annuler n'est pas annuler puis archiver — et
   * une seule à la fois, parce que la suivante peut viser un fil que la
   * précédente vient de renommer. Une écriture qui rate encore hors ligne est
   * remise en file par `commit` lui-même : on s'arrête là, le réseau n'est pas
   * vraiment revenu.
   */
  viderFile: async () => {
    if (file.length === 0) return;
    const nombre = file.length;
    let parties = 0;
    while (file.length > 0) {
      const suivante = file.shift()!;
      set({ enAttente: file.length });
      const avant = file.length;
      await suivante.rejouer();
      /* `commit` a remis la sienne au bout : le réseau est reparti, on laisse
         le reste pour la prochaine fois. */
      if (file.length > avant) break;
      parties++;
    }
    set({ enAttente: file.length });
    if (parties > 0) {
      toast.success(
        parties === nombre
          ? `${parties} action${parties > 1 ? "s" : ""} en attente ${parties > 1 ? "sont parties" : "est partie"}`
          : `${parties} action${parties > 1 ? "s" : ""} sur ${nombre} ${parties > 1 ? "sont parties" : "est partie"}`,
      );
    }
  },

  /**
   * **Le courrier plus ancien**, une page à la fois.
   *
   * La liste ne montrait que les soixante derniers messages du dossier, et
   * rien n'allait chercher les suivants : la sentinelle du bas ne demande que
   * les **corps** des fils déjà listés, pour que l'ouverture soit instantanée.
   * On la prenait pour une pagination — elle n'en était pas une, et une boîte
   * qui n'en montre que soixante sans le dire est une boîte qui ment.
   *
   * La page suivante **s'ajoute** au lieu de remplacer (`ajouterPage`), et un
   * fil qu'elle redonne ne se compte pas deux fois : la fenêtre de séquence
   * glisse si du courrier arrive entre deux pages, et la frontière peut se
   * répéter. Une page vide dit la fin, et la fin se retient — sans quoi la
   * sentinelle redemanderait la même page à chaque pixel de défilement.
   */
  chargerPlus: async () => {
    const { spaceId, folderId, chargeSuite, pages } = get();
    const cle = clePage(spaceId, folderId);
    const etat = pages[cle];
    if (chargeSuite || !etat || etat.fin) return;
    const account = accountOf(spaceId);
    const token = loadTokens.get(spaceId) ?? 0;
    set({ chargeSuite: true });
    try {
      const { threads: suite } = await providerFor(account).listThreads(account, {
        folder: folderId,
        inboxPath: spaceOf(spaceId).inboxPath,
        limit: PAGE,
        deja: etat.demandes,
        envoyes: get().envoyes[spaceId],
      });
      /* Une relecture a pu partir entre-temps — changement d'espace, tirage
         pour rafraîchir : sa page 1 fait autorité, la nôtre est périmée. */
      if ((loadTokens.get(spaceId) ?? 0) !== token) return;
      set((s) => ({
        threads: ajouterPage(s.threads, stamp(spaceId, suite)),
        pages: {
          ...s.pages,
          [cle]: { demandes: etat.demandes + PAGE, fin: suite.length === 0 },
        },
      }));
    } catch (err) {
      /* Une page qui ne vient pas n'efface rien : la liste garde ce qu'elle a,
         et le dire une fois vaut mieux qu'un bandeau sur une liste qui marche. */
      toast.error("Impossible de charger les messages plus anciens", { description: describe(err) });
    } finally {
      set({ chargeSuite: false });
    }
  },

  /**
   * **Ouvrir un résultat que la liste n'a pas.**
   *
   * « Toute la boîte » rend des fils qui vivent hors de `threads` — souvent
   * d'un autre dossier, souvent plus anciens que la fenêtre chargée. Les
   * sélectionner ne faisait rien : `selectThread` cherche dans `threads`, n'y
   * trouvait rien, et l'écran restait sur la liste. Un résultat qu'on ne peut
   * pas ouvrir n'est pas un résultat.
   *
   * On le verse donc dans la liste **avant** de le choisir. Ce n'est pas une
   * triche : il est bien dans ce dossier, et la prochaine lecture le gardera ou
   * l'oubliera selon qu'il est dans la fenêtre — c'est le serveur qui tranche,
   * comme partout ailleurs.
   */
  ouvrirResultat: (thread) => {
    const stampe = stampOne(get().spaceId, thread);
    set((s) => ({
      threads: s.threads.some((t) => t.id === stampe.id) ? s.threads : [stampe, ...s.threads],
      folderId: stampe.folder,
      vueId: null,
    }));
    get().selectThread(stampe.id);
  },

  setSpaces: (spaces) =>
    set((s) => {
      if (spaces.length === 0) return {};
      /* L'espace retenu au dernier passage peut ne plus exister : « perso »
         de la maquette n'est pas l'identifiant d'un compte. On retombe alors
         sur le premier, sinon toute lecture lèverait « espace inconnu ». */
      const spaceId = spaces.some((sp) => sp.id === s.spaceId) ? s.spaceId : spaces[0].id;
      /* On garde ce qui appartient encore à un espace connu : c'est la liste
         de la dernière session, et la jeter rendrait la mémoire inutile — elle
         est relue juste après, à l'effet suivant. Ce qui pend à un espace
         disparu, en revanche, ne s'afficherait jamais. */
      const connus = new Set(spaces.map((sp) => sp.id));
      const threads = s.threads.filter((t) => connus.has(t.spaceId));
      return { spaces, spaceId, threads, selectedThreadId: null };
    }),
  setSidebarMode: (sidebarMode) => set({ sidebarMode }),
  setListDensity: (listDensity) => set({ listDensity }),
  setFondBureau: (fondBureau) => set({ fondBureau }),
  cycleSidebarMode: () =>
    set((s) => ({
      sidebarMode: s.sidebarMode === "full" ? "rail" : s.sidebarMode === "rail" ? "hidden" : "full",
    })),
  setListWidth: (px) => set({ listWidth: borne(px) }),
  /* Changer de rangement referme la personne ouverte : sa liste n'a plus de
     sens dans l'autre vue, et la garder ferait revenir un écran qu'on ne
     saurait plus quitter. */
  setGroupBy: (groupBy) => set({ groupBy, correspondent: null, selection: [], selectionOn: false, ancreSelection: null }),
  setCorrespondent: (correspondent) => set({ correspondent }),

  /**
   * Garder la question.
   *
   * Une requête déjà gardée n'en fabrique pas une seconde — deux lignes
   * identiques dans la barre ne sont pas deux vues, c'est un doublon qu'on ira
   * supprimer.
   */
  enregistrerVue: (q) => {
    const requete = q.trim();
    const connue = get().vues.find((v) => v.q === requete);
    if (connue) return connue;
    const vue: Vue = { id: `vue-${Date.now().toString(36)}`, q: requete };
    set((s) => ({ vues: [...s.vues, vue] }));
    return vue;
  },

  /**
   * Récrire la requête d'une vue.
   *
   * **C'est la recherche qu'on modifie, pas une étiquette.** La rangée a porté
   * un nom séparé une demi-journée : le corriger ne changeait rien à ce que la
   * liste montrait — « quand je change le nom, la recherche reste sur la
   * précédente ». Une chose à lire, une chose à modifier.
   *
   * La vue ouverte **se relit aussitôt** : la requête peut nommer un autre
   * dossier (`dans:`), et laisser la liste sur l'ancien serait montrer la
   * réponse à la question d'avant. Une requête vide n'écrase rien — la rangée
   * redeviendrait muette.
   */
  modifierVue: (id, q) => {
    const requete = q.trim();
    if (!requete) return;
    set((s) => ({ vues: s.vues.map((v) => (v.id === id ? { ...v, q: requete } : v)) }));
    if (get().vueId === id) get().ouvrirVue(id);
  },

  supprimerVue: (id) =>
    set((s) => ({ vues: s.vues.filter((v) => v.id !== id), vueId: s.vueId === id ? null : s.vueId })),

  /**
   * Ouvrir une vue, c'est **poser une question à un dossier**.
   *
   * Le dossier est celui que la requête nomme (`dans:`), la réception sinon —
   * la même règle que côté serveur, où `dans:` sélectionne une boîte et n'est
   * pas un critère. Sans elle, une vue rendrait ce qui traîne en mémoire des
   * dossiers déjà visités : le résultat dépendrait de l'endroit d'où on l'a
   * ouverte, ce qu'aucune question ne devrait faire.
   */
  ouvrirVue: (id) => {
    const vue = get().vues.find((v) => v.id === id);
    if (!vue) return;
    const folderId = dossiersDe(parse(vue.q))[0] ?? "inbox";
    set({ vueId: id, folderId, selectedThreadId: null, correspondent: null, unreadOnly: false, etiquette: null, selection: [], selectionOn: false, ancreSelection: null });
    void get().loadSpace(get().spaceId, folderId);
  },
  setPreview: (attachmentId) =>
    attachmentId === null ? get().closeThird() : get().openThird({ kind: "file", attachmentId }),

  /* **La largeur repart de 460 à chaque ouverture.** Une glisse mémorisée qui
     rouvre un volet de 320 px sur un message qu'on vient de demander à lire
     est une surprise ; la mémoire sert pendant la session, pas d'un objet à
     l'autre. Et si la barre était attachée, elle passe en rail : trois
     colonnes utiles, pas quatre colonnes serrées. */
  /* **Le volet est pour lire.** Écrire se pose *par-dessus* la conversation
     (`compose-pane.tsx`) : les deux ne se disputent donc plus rien, et ouvrir
     une pièce jointe pendant qu'on écrit n'a plus à déplacer le brouillon. */
  openThird: (third) =>
    set((s) => ({
      third,
      thirdWidth: TIERS_DEFAUT,
      sidebarMode: s.sidebarMode === "full" ? "rail" : s.sidebarMode,
    })),

  closeThird: () => set({ third: null }),

  setThirdWidth: (px) => set({ thirdWidth: Math.max(TIERS_MIN, Math.round(px)) }),
  toggleDark: () => set((s) => ({ dark: !s.dark })),

  reply: async (threadId, body, only) => {
    const before = get().threads;
    const t = before.find((x) => x.id === threadId);
    if (!t) return false;
    const me = identityOf(t.spaceId);
    const to = only?.length ? only : replyDefault(t);
    set({
      threads: patchThread(before, threadId, (x) => ({
        ...x,
        snippet: firstLine(body),
        messages: [...x.messages, { id: `msg-local-${Date.now()}`, from: me, to, date: new Date().toISOString(), body }],
      })),
    });
    const account = accountOf(t.spaceId);
    try {
      const sent = await providerFor(account).send(account, {
        from: me, to, subject: t.subject, body, replyTo: threadId,
      });
      /* On **complète** le fil, on ne le remplace pas. Le mock rend le fil
         entier, IMAP rend la copie rangée dans « Envoyés » : la remplacer
         perdrait les messages précédents, et surtout l'identifiant du fil
         deviendrait celui de la copie — les drapeaux suivants iraient écrire
         dans « Envoyés » au lieu de la réception. */
      const ecrit = sent.messages.at(-1);
      set((s) => ({
        threads: patchThread(s.threads, threadId, (x) => ({
          ...x,
          messages: ecrit ? [...x.messages.slice(0, -1), ecrit] : x.messages,
        })),
      }));
      return true;
    } catch (err) {
      /* The thread goes back to what it was; the text goes back to the box
         (the caller keeps it), so nothing typed is lost. */
      set((s) => ({ threads: restoreThread(s.threads, t) }));
      toast.error("L'envoi de la réponse a échoué, votre texte est conservé", { description: describe(err) });
      return false;
    }
  },

  // ───────────── Composer ─────────────

  openCompose: (initial) =>
    set((s) => {
      const spaceId = initial?.spaceId ?? s.spaceId;
      const signature = s.spaces.find((sp) => sp.id === spaceId)?.signature ?? "";
      /* Les deux lignes vides ne servent qu'à **séparer** ce qu'on va écrire
         de ce qui suit — la signature, le message transféré. Sans rien après,
         elles laissaient un champ qui n'est pas vide : le repère « Écris ton
         message… » ne s'affichait pas, et le curseur tombait deux lignes plus
         bas que là où on écrit. Un compte réel n'a pas de signature tant qu'on
         ne l'a pas demandée, donc c'est le cas courant, pas le cas rare.
         Pas de tiret orphelin non plus, pour la même raison. */
      const body = `${signature ? `\n\n— ${signature}` : ""}${initial?.body ?? ""}`;
      return {
        compose: { spaceId, to: [], cc: [], bcc: [], subject: "", ...initial, body },
        sidebarOpen: false,
        settingsOpen: false,
        commandOpen: false,
      };
    }),

  /**
   * **Répondre, sans recopier ce à quoi on répond.**
   *
   * La citation ne va plus dans le champ : le message auquel on répond est
   * **montré en tête du volet**, en lecture. On écrit donc dans un champ vide,
   * avec le message sous les yeux — ce que le chevron ne donnait jamais, lui
   * qui empilait `> >> ` un niveau par tour.
   *
   * Elle part quand même : `sendMail` la rebâtit depuis `citeMessage` au moment
   * de l'envoi. Le destinataire reçoit un message conforme, on n'en lit jamais
   * les chevrons.
   */
  repondre: (threadId, to) => {
    const t = get().threads.find((x) => x.id === threadId);
    if (!t) return;
    const dernier = t.messages[t.messages.length - 1];
    get().openCompose({
      spaceId: t.spaceId,
      to: to.map((c) => c.email),
      subject: /^re\s*:/i.test(t.subject) ? t.subject : `Re: ${t.subject}`,
      replyTo: threadId,
      /* **L'identifiant, pas le contenu.** Si quelqu'un répond pendant qu'on
         écrit, citer « le dernier message » à l'envoi cite un message qu'on n'a
         pas lu. On épingle celui qu'on avait sous les yeux. */
      citeMessage: dernier.id,
    });
  },

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
        /* Rouvrir un brouillon rend le message **tel qu'on l'a laissé**, mise
           en forme comprise : sans cette ligne, un message écrit en gras
           revenait en texte simple et repartait ainsi. */
        html: m.html,
      },
      sidebarOpen: false,
    });
  },

  updateCompose: (patch) => set((s) => (s.compose ? { compose: { ...s.compose, ...patch } } : {})),

  closeCompose: () => {
    const d = get().compose;
    if (!d) return;
    const before = get().threads;
    const account = accountOf(d.spaceId);
    const provider = providerFor(account);
    if (isBlank(d)) {
      const draft = d.draftId ? before.find((t) => t.id === d.draftId) : undefined;
      set({ compose: null, sendError: null, threads: draft ? before.filter((t) => t.id !== draft.id) : before });
      if (draft) commit(draft, () => provider.deleteDraft(account, draft.id), "Impossible de supprimer le brouillon");
      return;
    }
    /* The composer closes now; the draft appears when the provider hands it
       back, which with the mock is the same tick and with IMAP a moment later. */
    set({ compose: null, sendError: null });
    const book = contactBook(before);
    provider
      .saveDraft(account, {
        id: d.draftId,
        from: identityOf(d.spaceId),
        to: toContacts(d.to, book),
        cc: d.cc.length ? toContacts(d.cc, book) : undefined,
        bcc: d.bcc.length ? toContacts(d.bcc, book) : undefined,
        subject: d.subject,
        body: d.body,
        /* Les deux parties suivent le brouillon comme elles suivent l'envoi :
           un message mis en forme, refermé puis rouvert, doit revenir tel
           qu'on l'a laissé. */
        html: d.html,
        attachments: d.attachments?.length ? d.attachments : undefined,
      })
      .then((saved) => {
        const draft = stampOne(d.spaceId, saved);
        set((s) => ({
          threads: d.draftId ? patchThread(s.threads, d.draftId, () => draft) : [draft, ...s.threads],
        }));
      })
      .catch((err: unknown) => {
        /* Nothing on screen to put back: the composer is closed and the old
           draft, if any, is still in the list. The text is not lost either —
           the composer reopens with it, which is the one honest outcome. */
        set({ compose: d });
        toast.error("Impossible d'enregistrer le brouillon, il est de retour dans le composeur", { description: describe(err) });
      });
  },

  /**
   * Se désabonner d'une liste, sans quitter l'app.
   *
   * **C'est un message, pas une page.** `List-Unsubscribe` propose souvent un
   * `mailto:` : l'honorer, c'est envoyer un courrier par notre propre SMTP —
   * le chemin qui existe déjà, aucune route de plus, et personne d'autre n'est
   * prévenu que le message a été lu. Le lien `https:` reste pour les listes qui
   * n'offrent que lui, mais il s'ouvre dans le navigateur, pas ici : poster à
   * une URL choisie par l'expéditeur depuis **notre** serveur ouvrirait une
   * porte qu'aucune infolettre ne mérite.
   *
   * La rangée disparaît à l'envoi : une demande partie ne se repropose pas. Une
   * relecture du message la ramènera si l'en-tête est toujours là — c'est la
   * vérité, on ne sait pas ce que la liste a fait.
   */
  desabonner: (threadId, messageId) => {
    const t = get().threads.find((x) => x.id === threadId);
    const m = t?.messages.find((x) => x.id === messageId);
    const adresse = m?.desabonnement?.mailto;
    if (!t || !m || !adresse) return;
    const account = accountOf(t.spaceId);
    set((s) => ({
      threads: patchThread(s.threads, threadId, (fil) => ({
        ...fil,
        messages: fil.messages.map((x) => (x.id === messageId ? { ...x, desabonnement: undefined } : x)),
      })),
    }));
    providerFor(account)
      .send(account, {
        from: identityOf(t.spaceId),
        to: [{ name: adresse, email: adresse }],
        /* L'objet que la liste réclame porte souvent le jeton qui identifie
           l'abonné : le remplacer par le nôtre ferait un désabonnement qui
           n'aboutit pas. */
        subject: m.desabonnement?.sujet ?? "unsubscribe",
        body: "unsubscribe",
      })
      .then(
        () => toast.success(`Désabonnement demandé à ${adresse}`),
        (err: unknown) => {
          /* La rangée revient avec la raison : une demande qui n'est pas partie
             ne doit pas laisser croire qu'elle l'est. */
          set((s) => ({
            threads: patchThread(s.threads, threadId, (fil) => ({
              ...fil,
              messages: fil.messages.map((x) => (x.id === messageId ? m : x)),
            })),
          }));
          toast.error("Le désabonnement n'a pas pu être envoyé", { description: describe(err) });
        },
      );
  },

  sendMail: () => {
    const d = get().compose;
    if (!d || d.to.length === 0) return;
    const before = get().threads;
    const account = accountOf(d.spaceId);
    const provider = providerFor(account);
    const book = contactBook(before);
    const draft = d.draftId ? before.find((t) => t.id === d.draftId) : undefined;
    set({ compose: null, sendError: null, threads: draft ? before.filter((t) => t.id !== draft.id) : before });
    /* **La citation n'existe qu'à l'envoi.** On ne la montre jamais dans le
       champ — le message cité est en tête du volet —, mais le destinataire doit
       la recevoir : son client la replie, et sans elle une réponse arrive nue.
       Le HTML ne la reçoit **que s'il existe déjà** : un message tapé sans mise
       en forme part en texte simple, comme le veut la règle. */
    const cite = citationDe(before, d);
    provider
      .send(account, {
        from: identityOf(d.spaceId),
        to: toContacts(d.to, book),
        cc: d.cc.length ? toContacts(d.cc, book) : undefined,
        bcc: d.bcc.length ? toContacts(d.bcc, book) : undefined,
        subject: d.subject,
        body: cite ? `${d.body}\n\n${cite.texte}` : d.body,
        /* Le fil suit le brouillon : une réponse écrite dans le volet doit
           arriver **dans sa conversation**, pas en ouvrir une neuve. */
        replyTo: d.replyTo,
        /* Les deux parties suivent le brouillon comme elles suivent l'envoi :
           un message mis en forme, refermé puis rouvert, doit revenir tel
           qu'on l'a laissé. */
        html: d.html && cite ? `${d.html}${cite.html}` : d.html,
        attachments: d.attachments?.length ? d.attachments : undefined,
      })
      .then(
        (sent) => {
          set((s) => ({
            threads: [stampOne(d.spaceId, sent), ...s.threads],
            /* **Notre propre réponse ne doit jamais manquer.** Le repère
               d'« Envoyés » sert à sauter sa relecture ; on vient d'y écrire,
               donc on l'oublie et la prochaine lecture rouvrira le dossier. */
            envoyes: oublier(s.envoyes, d.spaceId),
          }));
          /* The send is final from here: a draft that will not delete is a
             leftover to warn about, never a reason to reopen the composer —
             that would be the second send waiting to happen. */
          if (draft)
            provider.deleteDraft(account, draft.id).catch((err: unknown) => {
              set((s) => ({ threads: restoreThread(s.threads, draft) }));
              toast.error("Envoyé, mais le brouillon n'a pas pu être supprimé", { description: describe(err) });
            });
        },
        (err: unknown) => {
          /* Nothing written is lost: the message comes back in the composer,
             with the reason, and the draft it came from is back in its folder. */
          set((s) => ({ threads: draft ? restoreThread(s.threads, draft) : s.threads, compose: d, sendError: describe(err) }));
        },
      );
  },

  deleteDraft: (threadId) => {
    const before = get().threads;
    const t = before.find((x) => x.id === threadId);
    if (!t) return;
    set((s) => ({
      threads: before.filter((x) => x.id !== threadId),
      compose: s.compose?.draftId === threadId ? null : s.compose,
      selectedThreadId: s.selectedThreadId === threadId ? null : s.selectedThreadId,
    }));
    const account = accountOf(t.spaceId);
    commit(t, () => providerFor(account).deleteDraft(account, threadId), "Impossible de supprimer le brouillon, il est de retour");
  },

  setSpaceHue: (id, hue) =>
    set((s) => {
      const themes = { ...s.themes };
      if (hue === null) delete themes[id];
      else themes[id] = hue;
      return { themes };
    }),

  /**
   * Renommer un espace, ou lui changer d'icône.
   *
   * L'affichage change tout de suite et le serveur apprend après, comme toute
   * écriture ici ; un échec remet les espaces tels qu'ils étaient et le dit.
   *
   * **La maquette n'écrit nulle part** : ses espaces n'ont pas de ligne, et
   * un toast d'erreur à chaque renommage ferait passer une démo pour une
   * panne. Le changement vit alors le temps de la session, comme le reste du
   * mock.
   *
   * **Un identifiant peut changer.** Tant qu'un compte n'a aucune vue, ses
   * espaces portent l'identifiant du compte ; le premier renommage crée la
   * ligne qui manquait, et tout ce qui désignait l'espace — les fils déjà
   * chargés, la teinte choisie, les conversations récentes — doit suivre,
   * sinon la liste se viderait sous les yeux.
   */
  renameSpace: async (id, patch) => {
    const before = get().spaces;
    const space = before.find((sp) => sp.id === id);
    if (!space) return;
    set({ spaces: before.map((sp) => (sp.id === id ? { ...sp, ...patch } : sp)) });
    if (space.account.kind === "mock") return;

    const reponse = await renommerEspace(id, patch);
    if (!reponse.ok) {
      set({ spaces: before });
      toast.error("L'espace n'a pas pu être enregistré", { description: reponse.message });
      return;
    }
    if (reponse.id !== id) {
      set((s) => ({
        spaces: s.spaces.map((sp) => (sp.id === id ? { ...sp, id: reponse.id } : sp)),
        spaceId: s.spaceId === id ? reponse.id : s.spaceId,
        threads: s.threads.map((th) => (th.spaceId === id ? { ...th, spaceId: reponse.id } : th)),
        themes: renomme(s.themes, id, reponse.id),
        recent: renomme(s.recent, id, reponse.id),
      }));
    }
  },
  };
    },
    {
      name: "arc-mail",
      storage: preferences,
      /* Bumped with every change to what is persisted, so an old shape is
         migrated rather than read as is. Version 1 changed nothing in the
         shape: the migration only keeps what an earlier install saved, which
         zustand would otherwise drop with a console error. */
      /* 2 : les enveloppes des fils y sont entrées.
         3 : `sidebarCollapsed` (deux états) devient `sidebarMode` (trois). Une
         barre repliée revient en **rail** et non masquée : c'est ce que le
         bouton de repli fait désormais, et personne ne perd ses dossiers au
         rechargement. */
      /* 5 : `boites` — quelles boîtes chaque espace possède. Rien à migrer, un
            install plus ancien repart d'un objet vide et la première lecture le
            remplit ; c'est la version qui est bumpée, pas la forme. */
      /* 6 : `pauses` — le réveil d'un fil mis en pause. Rien à migrer, un
            install plus ancien repart d'un objet vide ; ses fils déjà déposés
            dans « En pause » y restent, et il n'y a rien de mieux à faire —
            personne n'a jamais dit quand ils devaient revenir. */
      version: 6,
      migrate: (persisted, version) => {
        const avant = persisted as Partial<MailState> & {
          sidebarCollapsed?: boolean;
          sidebarSide?: string;
        };
        if (version < 3) {
          avant.sidebarMode = avant.sidebarCollapsed ? "rail" : "full";
          delete avant.sidebarCollapsed;
        }
        /* 4 : la barre ne se range plus à droite. L'essai n'a jamais servi, et
           il coûtait une piste inversée dans la coque, un côté à consulter dans
           la bande de révélation, et un bouton dans une rangée qui en portait
           déjà deux. */
        if (version < 4) delete avant.sidebarSide;
        return avant as Pick<
          MailState,
          | "themes"
          | "dark"
          | "splitView"
          | "sidebarMode"
          | "listDensity"
          | "fondBureau"
          | "listWidth"
          | "thirdWidth"
          | "groupBy"
          | "vues"
          | "recent"
          | "threads"
          | "pauses"
          | "envoyes"
        >;
      },
      /* Ce qui doit survivre à un rechargement : les préférences, et de quoi
         montrer une liste tout de suite. Le composeur est passager. */
      partialize: (s) => ({
        themes: s.themes,
        dark: s.dark,
        splitView: s.splitView,
        sidebarMode: s.sidebarMode,
        listDensity: s.listDensity,
        fondBureau: s.fondBureau,
        listWidth: s.listWidth,
        thirdWidth: s.thirdWidth,
        groupBy: s.groupBy,
        vues: s.vues,
        recent: s.recent,
        boites: s.boites,
        envoyes: s.envoyes,
        /* Une pause est une **promesse faite à quelqu'un** : perdue au
           rechargement, le fil resterait dans « En pause » pour toujours — ce
           qui était exactement l'état d'avant. */
        pauses: s.pauses,
        threads: enMemoire(s.threads),
      }),
      /* Rehydrated from `AppShell` after mount so the server and first client
         render agree; see `useMail.persist.rehydrate()`. */
      skipHydration: true,
    },
  ),
);

// ───────────── Selectors ─────────────

/**
 * **« En pause » est un état, pas une destination** — comme Favoris.
 *
 * Signalé sur une vraie boîte : « pour mettre en pause j'ai un toast *Cette
 * boîte n'a pas de dossier « snoozed »* ». Et c'est vrai : iCloud n'a pas de
 * `\Snoozed` en SPECIAL-USE, il n'y a aucun dossier où déposer quoi que ce
 * soit. La fiche IMAP le disait déjà pour les compteurs — « Favoris et En
 * pause n'y sont pas : un drapeau, pas de dossier » —, mais l'action, elle,
 * appelait `moveThread(id, "snoozed")` depuis le premier jour : elle ne
 * marchait que sur le mock.
 *
 * Un fil en pause **ne bouge donc pas** : il reste dans son dossier sur le
 * serveur, et c'est la pause qui le retire de la liste qu'on regarde et le
 * pose dans « En pause » jusqu'à l'heure dite. Rien à créer côté serveur,
 * rien à deviner, et le geste marche sur toutes les boîtes.
 *
 * `pauses` est facultatif pour les appelants qui n'en ont pas (la recherche
 * compile un arbre sans état) : sans lui, la pause ne masque rien.
 */
export function threadMatchesFolder(
  t: Thread,
  folderId: FolderId,
  pauses?: Record<string, Pause>,
): boolean {
  const enPause = pauses?.[t.id] !== undefined;
  if (folderId === "snoozed") return enPause && t.folder !== "trash";
  /* Un fil en pause a quitté sa liste : le laisser dans la réception ferait
     d'une pause un simple marquage. */
  if (enPause) return false;
  if (folderId === "starred") return t.starred && t.folder !== "trash";
  return t.folder === folderId;
}

/**
 * **Les étiquettes déjà employées**, dans l'espace qu'on regarde.
 *
 * Il n'y a pas de table d'étiquettes : une étiquette existe parce qu'un
 * message la porte, comme les libellés de Gmail se découvrent en lisant. La
 * liste se construit donc sur ce qu'on a en mémoire — elle s'allonge à mesure
 * qu'on lit des dossiers, et c'est le comportement juste : proposer une
 * étiquette qu'on n'a jamais vue n'aurait aucun sens.
 */
function labelsDe(threads: Thread[], spaceId: SpaceId): string[] {
  const vues = new Set<string>();
  for (const t of threads) if (t.spaceId === spaceId) for (const l of t.labels) vues.add(l);
  return [...vues].sort((a, b) => a.localeCompare(b, "fr"));
}

/**
 * **Memoïsé, comme `useVisibleThreads`.** Un sélecteur qui fabrique un tableau
 * neuf à chaque appel rend une référence différente à chaque comparaison, et
 * `useSyncExternalStore` boucle jusqu'à « Maximum update depth exceeded ». La
 * règle est écrite dans `CLAUDE.md` ; elle vient de coûter un rendu infini au
 * premier menu d'étiquettes.
 */
export function useLabels(): string[] {
  const threads = useMail((s) => s.threads);
  const spaceId = useMail((s) => s.spaceId);
  return useMemo(() => labelsDe(threads, spaceId), [threads, spaceId]);
}

export function lastMessageDate(t: Thread): string {
  return t.messages[t.messages.length - 1].date;
}

export function sortByDate(threads: Thread[]): Thread[] {
  return [...threads].sort((a, b) => lastMessageDate(b).localeCompare(lastMessageDate(a)));
}

type Preview = { attachment: Attachment; message: Message };

function findPreview(threads: Thread[], threadId: string | null, previewId: string | null): Preview | null {
  if (!previewId) return null;
  const thread = threads.find((t) => t.id === threadId);
  for (const message of thread?.messages ?? []) {
    const attachment = message.attachments?.find((a) => a.id === previewId);
    if (attachment) return { attachment, message };
  }
  return null;
}

/**
 * The attachment being looked at, with the message it hangs off. Memoised for
 * the same reason as `useVisibleThreads`: a selector that builds a fresh
 * object every call makes `useSyncExternalStore` loop forever.
 */
/**
 * Le message que porte le troisième volet, et le fil dont il vient.
 *
 * Cherché dans **tous** les fils, pas seulement celui qui est ouvert : ranger
 * la conversation pendant qu'on lit un de ses messages ne doit pas vider le
 * volet sous les yeux.
 */
export function useThirdMessage(): { thread: Thread; message: Message } | null {
  const threads = useMail((s) => s.threads);
  const id = useMail((s) => (s.third?.kind === "message" ? s.third.messageId : null));
  return useMemo(() => findMessage(threads, id), [threads, id]);
}

/** Hors du hook, comme `findPreview` : une boucle qui sort tôt à l'intérieur
 *  d'un `useMemo` fait renoncer le compilateur React à toute la mémoïsation. */
function findMessage(threads: Thread[], id: string | null): { thread: Thread; message: Message } | null {
  if (!id) return null;
  for (const thread of threads) {
    const message = thread.messages.find((m) => m.id === id);
    if (message) return { thread, message };
  }
  return null;
}

export function usePreview(): Preview | null {
  const previewId = useMail((s) => (s.third?.kind === "file" ? s.third.attachmentId : null));
  const threads = useMail((s) => s.threads);
  const selectedThreadId = useMail((s) => s.selectedThreadId);
  return useMemo(
    () => findPreview(threads, selectedThreadId, previewId),
    [threads, selectedThreadId, previewId],
  );
}

/** Une personne, et ce qu'on a d'elle dans le dossier regardé. */
export type Correspondant = {
  email: string;
  name: string;
  threads: Thread[];
  unread: number;
  /** La date du fil le plus récent, pour trier comme la liste ordinaire. */
  date: string;
};

/**
 * Qui est en face, dans un fil.
 *
 * L'expéditeur du dernier message — sauf si c'est nous, et alors le premier
 * destinataire. Un dossier « Envoyés » rangé par expéditeur ne montrerait
 * qu'une seule personne : soi.
 */
function enFace(t: Thread, moi: string): Contact {
  const dernier = t.messages[t.messages.length - 1];
  if (dernier.from.email.toLowerCase() !== moi) return dernier.from;
  return dernier.to[0] ?? dernier.from;
}

/**
 * Les fils du dossier, rangés par personne.
 *
 * **Ce n'est pas le rangement de l'app, c'est une vue.** Un e-mail est un
 * objet et ses réponses ; regrouper par adresse fusionne deux échanges sans
 * rapport avec la même personne, et c'est exactement la dérive dont ce projet
 * est né. Mais « tout ce que cette personne m'a écrit » est une question
 * qu'on se pose, et le courrier n'y répond pas de lui-même — d'où cette vue,
 * à côté, jamais à la place.
 *
 * Les fils restent des fils : on les range, on ne les fond pas.
 */
export function useCorrespondants(): Correspondant[] {
  const threads = useVisibleThreads();
  const spaces = useMail((s) => s.spaces);
  const spaceId = useMail((s) => s.spaceId);

  return useMemo(() => {
    const moi = (spaces.find((sp) => sp.id === spaceId)?.identity.email ?? "").toLowerCase();
    const par = new Map<string, Correspondant>();

    for (const t of threads) {
      const qui = enFace(t, moi);
      const cle = qui.email.toLowerCase();
      const vu = par.get(cle);
      const date = lastMessageDate(t);
      if (!vu) {
        par.set(cle, {
          email: qui.email,
          name: qui.name || qui.email,
          threads: [t],
          unread: t.unread ? 1 : 0,
          date,
        });
      } else {
        vu.threads.push(t);
        if (t.unread) vu.unread += 1;
        if (date > vu.date) {
          vu.date = date;
          /* Le nom le plus récent gagne : les gens changent de signature. */
          vu.name = qui.name || vu.name;
        }
      }
    }

    return [...par.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [threads, spaces, spaceId]);
}

/** True while the current space is being read for the first time — nothing to show yet. */
export const selectLoading = (s: MailState) => s.loading[s.spaceId] === true;

/** Every space with the colour the user gave it; memoised on the overrides. */
export function useSpaces(): Space[] {
  const themes = useMail((s) => s.themes);
  const spaces = useMail((s) => s.spaces);
  return useMemo(() => spaces.map((sp) => resolveSpace(sp, themes[sp.id])), [spaces, themes]);
}

/** The current space, coloured as the user wants it. */
export function useSpace(): Space {
  const spaces = useSpaces();
  const spaceId = useMail((s) => s.spaceId);
  return spaces.find((sp) => sp.id === spaceId) ?? spaces[0];
}
export const selectFolder = (s: MailState) => FOLDERS.find((f) => f.id === s.folderId) ?? FOLDERS[0];

/**
 * Est-ce que cette boîte a un dossier d'indésirables ?
 *
 * Tant que `listFolders` n'a pas répondu **et** que rien n'a été gardé d'une
 * visite précédente, la réponse est non : mieux vaut une rangée qui arrive
 * qu'une rangée qui s'en va. C'est le seul dossier à poser la question — les
 * six autres se montrent toujours, un dossier absent y étant simplement une
 * liste vide (fiche IMAP).
 */
export const selectAJunk = (s: MailState) => (s.boites[s.spaceId] ?? []).includes("junk");

/**
 * Les dossiers **de cette boîte**, dans l'ordre de la liste.
 *
 * Mémoïsé, comme tout sélecteur qui construit un tableau : rendu à neuf à
 * chaque appel, `useSyncExternalStore` boucle sans fin.
 */
export function useFolders(): Folder[] {
  const aJunk = useMail(selectAJunk);
  return useMemo(() => (aJunk ? FOLDERS : FOLDERS.filter((f) => f.id !== "junk")), [aJunk]);
}

/** La vue ouverte, ou `undefined` quand on regarde un dossier. */
export const selectVue = (s: MailState) => s.vues.find((v) => v.id === s.vueId);

/**
 * Ce que la liste s'appelle : le nom de la vue, ou celui du dossier.
 *
 * Un seul endroit pour la question « qu'est-ce que je regarde ? » — la tête du
 * téléphone et celle du bureau la posaient chacune de leur côté, et une vue
 * ouverte sous le titre « Boîte de réception » serait une liste qui ment.
 */
export const selectListTitle = (s: MailState) =>
  s.etiquette ?? selectVue(s)?.q ?? selectFolder(s).name;

/**
 * Les **mots nus** de la vue ouverte, `""` quand on regarde un dossier.
 *
 * C'est ce que la rangée de la liste surligne, et ce sur quoi elle cherche sa
 * raison d'être là. Les mots nus seuls : `de:claire` n'a rien à surligner —
 * l'expéditeur est déjà écrit sur la rangée —, alors qu'un mot comme « icloud »
 * peut être trouvé dans une adresse ou un corps que la rangée ne montre pas.
 */
export const selectVueLibre = (s: MailState) => {
  const vue = selectVue(s);
  return vue ? texteLibre(arbreDe(vue.q)) : "";
};

/**
 * L'arbre d'une vue, analysé une fois par requête.
 *
 * `selectVisibleThreads` tourne à chaque rendu de la liste ; réanalyser la même
 * chaîne quatre-vingts fois par seconde pour rien serait payer l'analyseur au
 * prix du filtre.
 */
const arbres = new Map<string, ReturnType<typeof parse>>();
function arbreDe(q: string) {
  const connu = arbres.get(q);
  if (connu) return connu;
  const arbre = parse(q);
  arbres.set(q, arbre);
  return arbre;
}
export const selectSelectedThread = (s: MailState) => s.threads.find((t) => t.id === s.selectedThreadId);

/** Pure version used outside React (keyboard shortcuts). */
export function selectVisibleThreads(s: MailState): Thread[] {
  /* **Une vue est une question posée à un dossier**, pas à la mémoire entière :
     `ouvrirVue` a déjà choisi la boîte (celle que `dans:` nomme, la réception
     sinon), et le filtre s'applique dedans. Sans ce garde-fou, une vue
     ramasserait ce que les dossiers déjà visités ont laissé en mémoire, et
     rendrait donc autre chose selon l'endroit d'où on l'a ouverte. */
  const vue = selectVue(s);
  const arbre = vue ? arbreDe(vue.q) : null;
  return sortByDate(
    s.threads.filter(
      (t) =>
        t.spaceId === s.spaceId &&
        threadMatchesFolder(t, s.folderId, s.pauses) &&
        (arbre === null || correspond(arbre, t)) &&
        (!s.etiquette || t.labels.includes(s.etiquette)) &&
        (!s.unreadOnly || t.unread),
    ),
  );
}

/** Les non-lus d'une vue — **ce qu'on a en mémoire**, comme Favoris. */
export function selectVueUnread(s: MailState, vue: Vue): number {
  const arbre = arbreDe(vue.q);
  const folderId = dossiersDe(arbre)[0] ?? "inbox";
  return s.threads.filter(
    (t) => t.spaceId === s.spaceId && t.unread && threadMatchesFolder(t, folderId, s.pauses) && correspond(arbre, t),
  ).length;
}

/**
 * Les non-lus d'un dossier — **le compte local pour celui qu'on regarde, celui
 * du serveur pour les autres**.
 *
 * Le dossier ouvert est le seul dont on ait tous les fils, et le seul où une
 * écriture optimiste doit se voir tout de suite : ouvrir un message y décrémente
 * le compteur avant même que le serveur l'ait appris. Les autres n'ont en
 * mémoire que ce qu'une visite précédente y a laissé — souvent rien — et c'est
 * le compte de `listFolders` qui vaut.
 *
 * Un dossier absent de la réponse retombe sur le local : Favoris est un drapeau
 * réparti sur la boîte, « En pause » n'a pas de dossier derrière lui, et aucun
 * `STATUS` ne sait les compter.
 */
export function selectUnreadCount(s: MailState, spaceId: SpaceId, folderId: FolderId): number {
  const local = s.threads.filter(
    (t) => t.spaceId === spaceId && t.unread && threadMatchesFolder(t, folderId, s.pauses),
  ).length;
  if (spaceId === s.spaceId && folderId === s.folderId) return local;
  return s.folderCounts[spaceId]?.[folderId] ?? local;
}

/** Everyone we have exchanged with, for recipient suggestions. */
export function selectContacts(threads: Thread[]): Contact[] {
  const mine = new Set(useMail.getState().spaces.map((sp) => sp.identity.email));
  return [...contactBook(threads).values()]
    .filter((c) => !mine.has(c.email))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/**
 * Les conversations des onglets « Aujourd'hui », dans l'ordre où on les a
 * ouvertes. Memoïsée, et une seule fois : la sidebar et le menu la
 * reconstruisaient chacun de leur côté.
 */
export function useRecentThreads(): Thread[] {
  const threads = useMail((s) => s.threads);
  const recent = useMail((s) => s.recent[s.spaceId]);
  return useMemo(
    () =>
      (recent ?? [])
        .map((id) => threads.find((t) => t.id === id))
        .filter((t): t is Thread => t !== undefined),
    [threads, recent],
  );
}

/** Memoised list for components — a fresh array from the selector would re-render forever. */
export function useVisibleThreads(): Thread[] {
  const threads = useMail((s) => s.threads);
  const spaceId = useMail((s) => s.spaceId);
  const folderId = useMail((s) => s.folderId);
  const unreadOnly = useMail((s) => s.unreadOnly);
  const etiquette = useMail((s) => s.etiquette);
  const vues = useMail((s) => s.vues);
  const vueId = useMail((s) => s.vueId);
  /* **`pauses` en fait partie** : c'est lui qui retire un fil de sa liste et le
     pose dans « En pause ». Oublié dans cet état reconstruit, la liste ne
     bougeait pas d'un pouce quand on mettait un fil en pause. */
  const pauses = useMail((s) => s.pauses);
  return useMemo(
    () =>
      selectVisibleThreads({
        threads,
        spaceId,
        folderId,
        unreadOnly,
        etiquette,
        vues,
        vueId,
        pauses,
      } as MailState),
    [threads, spaceId, folderId, unreadOnly, etiquette, vues, vueId, pauses],
  );
}
