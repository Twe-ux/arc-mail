"use server";

import { revalidatePath } from "next/cache";

import { accountCredentials, deleteAccount, saveImapAccount } from "@/lib/accounts/server";
import { readFolder, withImap } from "@/lib/mail/imap";
import { currentUser } from "@/lib/supabase/server";

/** Ce que le formulaire reçoit en retour : un état, jamais une exception. */
export type Etat =
  | { statut: "vide" }
  | { statut: "ok"; message: string }
  | { statut: "erreur"; message: string };

const ICLOUD = { imapHost: "imap.mail.me.com", imapPort: 993, smtpHost: "smtp.mail.me.com", smtpPort: 587 };

const texte = (form: FormData, nom: string) => (form.get(nom) ?? "").toString().trim();

/**
 * Brancher une boîte : on essaie **avant** d'enregistrer.
 *
 * Un mot de passe rangé sans avoir servi est une panne différée — on la
 * découvrirait à la première lecture, sans savoir si c'est l'adresse, le mot
 * de passe ou l'hôte. Ici la connexion est la validation, et le message
 * d'IMAP est rendu tel quel : « Invalid credentials » dit quoi corriger.
 */
export async function ajouterCompte(_precedent: Etat, form: FormData): Promise<Etat> {
  const user = await currentUser();
  if (!user) return { statut: "erreur", message: "Personne n'est connecté." };

  const email = texte(form, "email").toLowerCase();
  const password = texte(form, "password");
  const label = texte(form, "label") || (email.split("@")[1] ?? "Compte");
  const imapHost = texte(form, "imapHost") || ICLOUD.imapHost;
  const imapPort = Number(texte(form, "imapPort")) || ICLOUD.imapPort;
  const smtpHost = texte(form, "smtpHost") || ICLOUD.smtpHost;
  const smtpPort = Number(texte(form, "smtpPort")) || ICLOUD.smtpPort;

  if (!email.includes("@")) return { statut: "erreur", message: "Il faut une adresse complète." };
  if (!password) return { statut: "erreur", message: "Il faut le mot de passe d'application." };

  const compte = {
    id: "verification",
    kind: "imap" as const,
    label,
    email,
    imapHost,
    imapPort,
    smtpHost,
    smtpPort,
  };

  let apercu = "";
  try {
    apercu = await withImap(compte, password, async (client) => {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const boite = client.mailbox;
        const total = typeof boite === "object" ? boite.exists : 0;
        return `${total} message${total > 1 ? "s" : ""} dans la réception`;
      } finally {
        lock.release();
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { statut: "erreur", message: `Connexion refusée : ${message}` };
  }

  try {
    await saveImapAccount({ label, email, password, imapHost, imapPort, smtpHost, smtpPort });
  } catch (error) {
    return { statut: "erreur", message: error instanceof Error ? error.message : String(error) };
  }

  revalidatePath("/comptes");
  return { statut: "ok", message: `Connecté à ${email} — ${apercu}.` };
}

export async function retirerCompte(id: string): Promise<void> {
  await deleteAccount(id);
  revalidatePath("/comptes");
}

/** Ce qu'une lecture rapporte vraiment, pour le vérifier de ses yeux. */
export type Apercu = { sujet: string; de: string; date: string; nonLu: boolean };

/**
 * Lit les derniers fils de la réception et les rend tels quels.
 *
 * C'est le test qui compte : il traverse toute la chaîne — le secret
 * déchiffré, la connexion, la découverte des dossiers, les enveloppes, le
 * regroupement en fils.
 */
export async function lireDerniers(id: string): Promise<{ apercus: Apercu[] } | { erreur: string }> {
  try {
    const { account, password } = await accountCredentials(id);
    const fils = await withImap(account, password, (client) =>
      readFolder(client, "INBOX", "inbox", { limit: 10 }),
    );
    return {
      apercus: fils.slice(0, 8).map((t) => ({
        sujet: t.subject,
        de: t.messages.at(-1)?.from.name || t.messages.at(-1)?.from.email || "",
        date: t.messages.at(-1)?.date ?? "",
        nonLu: t.unread,
      })),
    };
  } catch (error) {
    return { erreur: error instanceof Error ? error.message : String(error) };
  }
}
