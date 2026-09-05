import type { Thread } from "../types";
import type {
  AccountRef,
  DraftInput,
  MailProvider,
  OutgoingMessage,
  ThreadPatch,
  ThreadQuery,
} from "./provider";

/**
 * Le fournisseur du navigateur pour un compte réel : il ne parle pas IMAP, il
 * parle à `/api/mail`, qui le parle pour lui.
 *
 * C'est ce que l'interface `MailProvider` permettait depuis le début — le
 * store ne sait pas ce qu'il y a derrière `providerFor(account)`. Rien du
 * secret ne descend ici : le client envoie l'identifiant du compte, le
 * serveur retrouve le mot de passe et se connecte.
 */
/**
 * L'adresse où le navigateur ira chercher une pièce jointe.
 *
 * Elle se fabrique **ici** et pas côté serveur : l'identifiant de la pièce
 * contient déjà tout ce qu'il faut (dossier, UID, rang), et le compte est ce
 * que ce fournisseur sait par définition. Le serveur n'a donc rien à ajouter à
 * ce qu'il rend, et la couche IMAP continue d'ignorer qu'il existe des URL.
 */
const avecPieces = (account: AccountRef, threads: Thread[]): Thread[] =>
  threads.map((t) => ({
    ...t,
    messages: t.messages.map((m) =>
      m.attachments?.length
        ? {
            ...m,
            attachments: m.attachments.map((a) => ({
              ...a,
              url: `/api/mail/piece?compte=${encodeURIComponent(account.id)}&piece=${encodeURIComponent(a.id)}`,
            })),
          }
        : m,
    ),
  }));

export class HttpProvider implements MailProvider {
  private async call<T>(payload: Record<string, unknown>): Promise<T> {
    const response = await fetch("/api/mail", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) throw new Error(data.error ?? `Le serveur a répondu ${response.status}.`);
    return data;
  }

  async listThreads(account: AccountRef, query: ThreadQuery): Promise<Thread[]> {
    const { threads } = await this.call<{ threads: Thread[] }>({
      op: "listThreads",
      accountId: account.id,
      folder: query.folder,
      inboxPath: query.inboxPath,
      limit: query.limit,
    });
    return threads;
  }

  async getThread(account: AccountRef, id: string): Promise<Thread | null> {
    const { thread } = await this.call<{ thread: Thread | null }>({
      op: "getThread",
      accountId: account.id,
      id,
    });
    return thread ? avecPieces(account, [thread])[0] : null;
  }

  async getThreads(account: AccountRef, ids: string[]): Promise<Thread[]> {
    const { threads } = await this.call<{ threads: Thread[] }>({
      op: "getThreads",
      accountId: account.id,
      ids,
    });
    return avecPieces(account, threads);
  }

  async modify(account: AccountRef, id: string, patch: ThreadPatch): Promise<void> {
    await this.call({ op: "modify", accountId: account.id, id, patch });
  }

  async send(account: AccountRef, message: OutgoingMessage): Promise<Thread> {
    const { thread } = await this.call<{ thread: Thread }>({
      op: "send",
      accountId: account.id,
      message,
    });
    return thread;
  }

  async saveDraft(account: AccountRef, draft: DraftInput): Promise<Thread> {
    const { thread } = await this.call<{ thread: Thread }>({
      op: "saveDraft",
      accountId: account.id,
      draft,
    });
    return thread;
  }

  async deleteDraft(account: AccountRef, id: string): Promise<void> {
    await this.call({ op: "deleteDraft", accountId: account.id, id });
  }
}
