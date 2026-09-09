import "server-only";

import { unseal } from "@/lib/secret";
import { supabaseAdmin } from "@/lib/supabase/admin";

import type { StoredAccount } from "./server";

/**
 * Ce que le **tour de relève** a le droit de lire, et rien de plus.
 *
 * C'est le seul endroit de l'app où un secret est déchiffré **sans personne en
 * face**. Partout ailleurs, `accountCredentials` est en aval d'un `getUser()`
 * : la clé de service n'y sert qu'à répondre à quelqu'un qui vient de prouver
 * qui il est. Ici il n'y a personne à qui répondre — d'où trois bornes
 * écrites dans le code plutôt que promises dans une fiche :
 *
 * 1. **on part des appareils, pas des comptes.** La liste des personnes à
 *    relever est celle qui a une souscription push : s'abonner **est** le
 *    consentement à la relève de fond, et se désabonner y met fin le tour
 *    suivant. Un compte dont personne n'a demandé de notification n'est jamais
 *    ouvert ici ;
 * 2. **le lien reste lié à sa ligne.** L'AAD (`userId:accountId`) est
 *    reconstruit depuis la ligne du compte, pas depuis un paramètre : un
 *    secret déplacé d'une ligne à l'autre ne se déchiffre pas ;
 * 3. **rien ne sort.** Cette fonction rend un mot de passe à un appelant qui
 *    tourne dans le même processus ; la route de relève, elle, ne répond
 *    jamais qu'avec des nombres.
 */
export type CompteARelever = {
  userId: string;
  account: StoredAccount;
  password: string;
  /** Les dossiers qui tiennent lieu de réception. Un espace-vue en ajoute un. */
  chemins: string[];
};

type Row = {
  id: string;
  user_id: string;
  kind: "imap" | "gmail";
  label: string;
  email: string;
  imap_host: string | null;
  imap_port: number | null;
  smtp_host: string | null;
  smtp_port: number | null;
};

/** Les personnes qui ont au moins un appareil abonné. */
export async function personnesAbonnees(): Promise<string[]> {
  const { data, error } = await supabaseAdmin().from("push_subscriptions").select("user_id");
  if (error) throw new Error(`Lecture des abonnements impossible : ${error.message}`);
  return [...new Set((data as { user_id: string }[]).map((r) => r.user_id))];
}

/**
 * Les comptes de ces personnes, prêts à être ouverts.
 *
 * Un compte dont le secret manque ou ne se déchiffre pas est **sauté sans
 * bruit** : le tour suivant réessaiera, et une clé changée n'est pas une
 * urgence de nuit.
 */
export async function comptesARelever(userIds: string[]): Promise<CompteARelever[]> {
  if (userIds.length === 0) return [];
  const db = supabaseAdmin();

  const { data: comptes, error } = await db
    .from("accounts")
    .select("id, user_id, kind, label, email, imap_host, imap_port, smtp_host, smtp_port")
    .in("user_id", userIds);
  if (error) throw new Error(`Lecture des comptes impossible : ${error.message}`);
  const lignes = (comptes ?? []) as Row[];
  if (lignes.length === 0) return [];

  const ids = lignes.map((r) => r.id);
  const { data: secrets } = await db
    .from("account_secrets")
    .select("account_id, sealed")
    .in("account_id", ids);
  const scelles = new Map(
    ((secrets ?? []) as { account_id: string; sealed: string }[]).map((s) => [s.account_id, s.sealed]),
  );

  const { data: espaces } = await db
    .from("mail_spaces")
    .select("account_id, inbox_path")
    .in("account_id", ids);
  const parCompte = new Map<string, Set<string>>();
  for (const e of (espaces ?? []) as { account_id: string; inbox_path: string }[]) {
    const set = parCompte.get(e.account_id) ?? new Set<string>();
    set.add(e.inbox_path || "INBOX");
    parCompte.set(e.account_id, set);
  }

  const prets: CompteARelever[] = [];
  for (const r of lignes) {
    const scelle = scelles.get(r.id);
    if (!scelle) continue;
    let password: string;
    try {
      password = unseal(scelle, { accountId: r.id, userId: r.user_id });
    } catch {
      continue;
    }
    /* Un compte sans espace enregistré a quand même une réception : c'est le
       cas le plus courant, et l'oublier serait ne prévenir personne. */
    const chemins = [...(parCompte.get(r.id) ?? new Set(["INBOX"]))];
    prets.push({
      userId: r.user_id,
      account: {
        id: r.id,
        kind: r.kind,
        label: r.label,
        email: r.email,
        imapHost: r.imap_host,
        imapPort: r.imap_port,
        smtpHost: r.smtp_host,
        smtpPort: r.smtp_port,
      },
      password,
      chemins,
    });
  }
  return prets;
}
