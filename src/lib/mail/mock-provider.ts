import { firstLine } from "../format";
import { THREADS } from "../mock-data";
import { dossiersDe } from "../search/imap";
import { correspond } from "../search/match";
import { parse } from "../search/parse";
import type { Thread } from "../types";
import type {
  AccountRef,
  DraftInput,
  FolderUnread,
  MailProvider,
  OutgoingMessage,
  SearchQuery,
  ThreadPatch,
  ThreadQuery,
} from "./provider";

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

  /* Le mock a tout en mémoire : il compte ce que le vrai serveur compterait,
     Favoris compris — ce qui, chez lui, ne coûte rien. */
  async listFolders(account: AccountRef): Promise<FolderUnread> {
    const spaceId = spaceOf(account);
    const comptes: FolderUnread = {};
    for (const t of this.threads) {
      if (t.spaceId !== spaceId || !t.unread) continue;
      comptes[t.folder] = (comptes[t.folder] ?? 0) + 1;
      if (t.starred && t.folder !== "trash") comptes.starred = (comptes.starred ?? 0) + 1;
    }
    return comptes;
  }

  /**
   * Le mock a tout en mémoire : sa « recherche serveur » est le compilateur
   * mémoire, appliqué à **tous** ses fils et non aux seuls chargés. C'est
   * exactement le rapport qu'entretiennent les deux compilateurs sur une vraie
   * boîte, et ça permet de vérifier le chemin de bout en bout sans IMAP.
   */
  async search(account: AccountRef, query: SearchQuery): Promise<Thread[]> {
    const spaceId = spaceOf(account);
    const arbre = parse(query.q);
    const dossiers = dossiersDe(arbre);
    return this.threads
      .filter((t) => t.spaceId === spaceId)
      .filter((t) => (dossiers.length ? dossiers.includes(t.folder) : true))
      .filter((t) => correspond(arbre, t))
      .sort((a, b) => (a.messages.at(-1)!.date < b.messages.at(-1)!.date ? 1 : -1))
      .slice(0, query.limit ?? 40);
  }

  async getThread(_account: AccountRef, id: string): Promise<Thread | null> {
    return this.threads.find((t) => t.id === id) ?? null;
  }

  async getThreads(_account: AccountRef, ids: string[]): Promise<Thread[]> {
    return this.threads.filter((t) => ids.includes(t.id));
  }

  /* Le mock range par un champ, pas par un dossier IMAP : déplacer n'y change
     aucun identifiant, et il rend donc toujours le même. */
  async modify(_account: AccountRef, id: string, patch: ThreadPatch): Promise<string | null> {
    this.patch(id, (t) => ({
      ...t,
      unread: patch.unread ?? t.unread,
      starred: patch.starred ?? t.starred,
      folder: patch.folder ?? t.folder,
    }));
    return id;
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
