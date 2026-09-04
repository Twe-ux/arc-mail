import "server-only";

import { seal, unseal } from "@/lib/secret";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { currentUser, supabaseServer } from "@/lib/supabase/server";

/** Un compte tel que l'interface a le droit de le voir : jamais son secret. */
export type StoredAccount = {
  id: string;
  kind: "imap" | "gmail";
  label: string;
  email: string;
  imapHost: string | null;
  imapPort: number | null;
  smtpHost: string | null;
  smtpPort: number | null;
};

type Row = {
  id: string;
  kind: "imap" | "gmail";
  label: string;
  email: string;
  imap_host: string | null;
  imap_port: number | null;
  smtp_host: string | null;
  smtp_port: number | null;
};

const toAccount = (r: Row): StoredAccount => ({
  id: r.id,
  kind: r.kind,
  label: r.label,
  email: r.email,
  imapHost: r.imap_host,
  imapPort: r.imap_port,
  smtpHost: r.smtp_host,
  smtpPort: r.smtp_port,
});

const COLUMNS = "id, kind, label, email, imap_host, imap_port, smtp_host, smtp_port";

/** Les comptes de la personne connectée. Le client de session suffit : RLS fait le tri. */
export async function listAccounts(): Promise<StoredAccount[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("accounts").select(COLUMNS).order("created_at");
  if (error) throw new Error(`Lecture des comptes impossible : ${error.message}`);
  return (data as Row[]).map(toAccount);
}

export type NewImapAccount = {
  label: string;
  email: string;
  password: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
};

/**
 * Enregistre un compte et son mot de passe, dans cet ordre : la ligne
 * d'abord, parce que son identifiant fait partie de ce que le chiffrement
 * authentifie. Si le second écrit échoue, la ligne est retirée — un compte
 * sans secret ne servirait qu'à faire échouer chaque lecture.
 */
export async function saveImapAccount(input: NewImapAccount): Promise<StoredAccount> {
  const user = await currentUser();
  if (!user) throw new Error("Personne n'est connecté.");

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: user.id,
      kind: "imap",
      label: input.label,
      email: input.email,
      imap_host: input.imapHost,
      imap_port: input.imapPort,
      smtp_host: input.smtpHost,
      smtp_port: input.smtpPort,
    })
    .select(COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505") throw new Error(`Ce compte est déjà branché (${input.email}).`);
    throw new Error(`Enregistrement du compte impossible : ${error.message}`);
  }

  const account = toAccount(data as Row);
  const sealed = seal(input.password, { accountId: account.id, userId: user.id });
  const { error: secretError } = await supabaseAdmin()
    .from("account_secrets")
    .upsert({ account_id: account.id, sealed, updated_at: new Date().toISOString() });

  if (secretError) {
    await supabase.from("accounts").delete().eq("id", account.id);
    throw new Error(`Enregistrement du mot de passe impossible : ${secretError.message}`);
  }
  return account;
}

export async function deleteAccount(id: string): Promise<void> {
  const supabase = await supabaseServer();
  /* `account_secrets` part avec, par la clé étrangère `on delete cascade`. */
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw new Error(`Suppression impossible : ${error.message}`);
}

/**
 * Le compte **et** son mot de passe en clair, pour la durée d'une requête.
 *
 * Le seul endroit de l'app où le secret existe déchiffré. Deux gardes : le
 * compte est relu par le client de session (donc RLS confirme qu'il est bien
 * à la personne connectée), et le déchiffrement authentifie la paire
 * `utilisateur:compte` — un secret déplacé d'une ligne à l'autre ne s'ouvre
 * pas.
 */
export async function accountCredentials(id: string): Promise<{ account: StoredAccount; password: string }> {
  const user = await currentUser();
  if (!user) throw new Error("Personne n'est connecté.");

  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("accounts").select(COLUMNS).eq("id", id).single();
  if (error || !data) throw new Error("Compte introuvable.");
  const account = toAccount(data as Row);

  const { data: secret, error: secretError } = await supabaseAdmin()
    .from("account_secrets")
    .select("sealed")
    .eq("account_id", id)
    .single();
  if (secretError || !secret) throw new Error("Mot de passe introuvable pour ce compte.");

  return {
    account,
    password: unseal(secret.sealed as string, { accountId: account.id, userId: user.id }),
  };
}
