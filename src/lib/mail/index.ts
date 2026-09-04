import { HttpProvider } from "./http-provider";
import { MockProvider } from "./mock-provider";
import type { AccountRef, MailProvider, ProviderKind } from "./provider";

export type { AccountRef, DraftInput, MailProvider, OutgoingMessage, ThreadPatch, ThreadQuery } from "./provider";

/**
 * One provider per kind, kept for the session. IMAP and Gmail register here
 * when they exist; until then any other kind is a programming error, not a
 * runtime fallback to the mock — silently showing fake mail for a real account
 * would be worse than failing.
 */
const providers: Partial<Record<ProviderKind, MailProvider>> = {
  mock: new MockProvider(),
  /* IMAP ne tourne pas dans le navigateur : ce fournisseur-ci ne fait que
     passer par `/api/mail`, où le vrai vit. */
  imap: new HttpProvider(),
};

export function providerFor(account: AccountRef): MailProvider {
  const provider = providers[account.kind];
  if (!provider) throw new Error(`Aucun fournisseur de mail pour « ${account.kind} »`);
  return provider;
}
