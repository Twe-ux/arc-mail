import type { Thread } from "../types";
import type { AccountRef, MailProvider, ThreadQuery } from "./provider";

/**
 * Le fournisseur du navigateur pour un compte réel : il ne parle pas IMAP, il
 * parle à `/api/mail`, qui le parle pour lui.
 *
 * C'est ce que l'interface `MailProvider` permettait depuis le début — le
 * store ne sait pas ce qu'il y a derrière `providerFor(account)`. Rien du
 * secret ne descend ici : le client envoie l'identifiant du compte, le
 * serveur retrouve le mot de passe et se connecte.
 */
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
    return thread;
  }

  /*
   * L'écriture n'est pas branchée : ces quatre-là lèvent, et le store montre
   * le message. Rendre `void` en silence serait pire — l'interface aurait
   * déjà changé, et le serveur n'aurait rien appris.
   */
  async modify(): Promise<void> {
    throw new Error("Marquer, mettre en favori et déplacer arrivent avec l'écriture IMAP.");
  }

  async send(): Promise<Thread> {
    throw new Error("L'envoi arrive avec SMTP.");
  }

  async saveDraft(): Promise<Thread> {
    throw new Error("Les brouillons arrivent avec l'écriture IMAP.");
  }

  async deleteDraft(): Promise<void> {
    throw new Error("Les brouillons arrivent avec l'écriture IMAP.");
  }
}
