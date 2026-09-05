import "server-only";

import type { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer";

import type { StoredAccount } from "@/lib/accounts/server";
import type { Contact, FolderId, Thread } from "@/lib/types";
import { parseThreadId, threadId } from "./imap";
import type { DraftInput, OutgoingMessage } from "./provider";

/**
 * Envoyer, et garder une trace de ce qu'on a envoyé.
 *
 * SMTP ne fait qu'une chose : remettre le message. Il ne range rien — la copie
 * dans « Envoyés » est un `APPEND` IMAP que nous faisons nous-mêmes, et sans
 * lui un message envoyé n'existerait nulle part une fois la page rechargée.
 * C'est pourquoi ce module reçoit la connexion IMAP déjà ouverte : un envoi,
 * c'est **deux protocoles**, et la route les tient tous les deux.
 *
 * Le message est composé **une fois** et le même octet part sur SMTP et
 * s'écrit dans « Envoyés ». Recomposer pour la copie donnerait deux messages
 * légèrement différents — deux `Message-ID`, deux dates — et le fil se
 * dédoublerait à la relecture.
 */

/** Le SMTP de Google, qui archive lui-même ce qu'il envoie. */
const gmail = (account: StoredAccount) => /gmail|googlemail/i.test(account.smtpHost ?? "");

/** Ce que le message porte pour se ranger dans un fil existant. */
type Fil = { messageId?: string; references?: string };

const adresse = (c: Contact) => (c.name ? { name: c.name, address: c.email } : c.email);
const adresses = (list: Contact[] | undefined) => (list ?? []).map(adresse);

/**
 * Le transporteur du compte.
 *
 * `secure` suit le port et non l'inverse : 465 chiffre dès la poignée de main,
 * 587 commence en clair et monte en TLS (`STARTTLS`). `requireTLS` interdit
 * de rester en clair si le serveur ne propose pas la montée — sans lui, un
 * mot de passe d'application partirait en clair le jour où le serveur est mal
 * configuré.
 */
function transporteur(account: StoredAccount, password: string) {
  const port = account.smtpPort ?? 587;
  return nodemailer.createTransport({
    host: account.smtpHost ?? "smtp.mail.me.com",
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: account.email, pass: password },
  });
}

/**
 * Les en-têtes qui rattachent une réponse à son fil.
 *
 * Un client de messagerie ne relie pas par l'objet mais par `In-Reply-To` et
 * `References` ; sans eux, la réponse ouvrirait un fil parallèle chez la
 * personne d'en face. On va donc chercher le `Message-ID` du message auquel on
 * répond — le connaître demande de le relire, il n'est pas dans notre modèle.
 */
async function filDeReponse(client: ImapFlow, id: string): Promise<Fil> {
  const parsed = parseThreadId(id);
  if (!parsed) return {};
  const lock = await client.getMailboxLock(parsed.path);
  try {
    const message = await client.fetchOne(
      String(parsed.uid),
      { envelope: true, headers: ["references"] },
      { uid: true },
    );
    if (!message) return {};
    const messageId = message.envelope?.messageId;
    /* `References` est la chaîne complète du fil : on ajoute le maillon
       plutôt que de la remplacer, sinon les clients qui replient par elle
       perdent tout ce qui précède. */
    const precedentes = message.headers?.toString().match(/^references:\s*([\s\S]*?)$/im)?.[1];
    const chaine = [precedentes?.replace(/\s+/g, " ").trim(), messageId].filter(Boolean).join(" ");
    return { messageId, references: chaine || undefined };
  } finally {
    lock.release();
  }
}

/** Le message tel qu'il partira : composé une fois, en octets. */
async function composer(message: OutgoingMessage, fil: Fil, brouillon = false): Promise<Buffer> {
  return new MailComposer({
    from: adresse(message.from),
    to: adresses(message.to),
    cc: message.cc?.length ? adresses(message.cc) : undefined,
    bcc: message.bcc?.length ? adresses(message.bcc) : undefined,
    subject: message.subject || "(sans objet)",
    text: message.body,
    /* `MailComposer` sait lire du base64 : les octets ne repassent pas par un
       Buffer intermédiaire, et le même message compilé sert à SMTP et à
       l'`APPEND` dans « Envoyés ». */
    attachments: message.attachments?.map((piece) => ({
      filename: piece.name,
      contentType: piece.mime,
      content: piece.data,
      encoding: "base64" as const,
    })),
    inReplyTo: fil.messageId,
    references: fil.references,
    /* Un brouillon garde sa date au moment où on le range ; l'envoi la posera
       à nouveau. */
    date: brouillon ? new Date() : undefined,
  })
    .compile()
    .build();
}

/** Le fil rendu à l'interface pour un message qu'on vient d'écrire. */
function filEcrit(
  message: OutgoingMessage | DraftInput,
  id: string,
  folder: FolderId,
  unread = false,
): Thread {
  return {
    id,
    spaceId: "",
    folder,
    subject: message.subject || "(sans objet)",
    snippet: message.body.split("\n").find((l) => l.trim())?.slice(0, 140) ?? "",
    labels: [],
    unread,
    starred: false,
    messages: [
      {
        id,
        from: message.from,
        to: message.to,
        cc: message.cc?.length ? message.cc : undefined,
        bcc: message.bcc?.length ? message.bcc : undefined,
        date: new Date().toISOString(),
        body: message.body,
      },
    ],
  };
}

/**
 * Ranger une copie dans un dossier, et rendre son identifiant.
 *
 * `APPEND` répond l'UID écrit quand le serveur annonce UIDPLUS (iCloud et
 * Gmail le font). Sans lui on ne saurait pas nommer ce qu'on vient d'écrire :
 * on rend alors un identifiant local, et la relecture du dossier donnera le
 * vrai.
 */
async function ranger(
  client: ImapFlow,
  path: string | undefined,
  raw: Buffer,
  flags: string[],
): Promise<string | null> {
  if (!path) return null;
  const ecrit = await client.append(path, raw, flags);
  return ecrit && ecrit.uid ? threadId(path, ecrit.uid) : null;
}

/**
 * Envoyer.
 *
 * L'ordre compte : **SMTP d'abord**. Si la remise échoue, rien n'a été rangé
 * et le composeur récupère le texte avec la raison ; l'inverse laisserait une
 * copie dans « Envoyés » d'un message que personne n'a reçu — le mensonge le
 * plus difficile à rattraper.
 *
 * Une copie qui échoue après une remise réussie n'est **pas** une erreur
 * d'envoi : le message est parti. On rend le fil avec un identifiant local
 * plutôt que de faire croire à l'échec.
 */
export async function sendMessage(
  client: ImapFlow,
  account: StoredAccount,
  password: string,
  sentPath: string | undefined,
  message: OutgoingMessage,
): Promise<Thread> {
  const fil = message.replyTo ? await filDeReponse(client, message.replyTo) : {};
  const raw = await composer(message, fil);

  await transporteur(account, password).sendMail({
    envelope: {
      /* L'enveloppe porte l'adresse de l'espace : répondre depuis un domaine
         personnalisé doit partir de ce domaine, même si la session SMTP est
         ouverte avec le compte principal. Le serveur exige que l'alias lui
         appartienne — c'est lui qui refuse, et son message est rendu tel quel. */
      from: message.from.email,
      to: [...message.to, ...(message.cc ?? []), ...(message.bcc ?? [])].map((c) => c.email),
    },
    raw,
  });

  let id: string | null = null;
  try {
    /* Gmail range lui-même ce qui part par son SMTP : y ajouter notre copie
       donnerait deux fois le même message dans « Envoyés ». iCloud, lui, ne
       range rien — d'où la copie, et d'où cette exception. */
    id = await ranger(client, gmail(account) ? undefined : sentPath, raw, ["\\Seen"]);
  } catch {
    /* Volontairement muet : le message est remis, et prévenir d'un échec de
       rangement ferait recomposer — donc renvoyer. */
  }
  return filEcrit(message, id ?? `sent-${Date.now()}`, "sent");
}

/**
 * Enregistrer un brouillon.
 *
 * IMAP ne sait pas modifier un message : on écrit le nouveau, puis on retire
 * l'ancien. Dans cet ordre — si le rangement échoue, l'ancien brouillon est
 * toujours là, et rien de ce qui était écrit n'est perdu.
 */
export async function saveDraftMessage(
  client: ImapFlow,
  draftsPath: string | undefined,
  trashPath: string | undefined,
  draft: DraftInput,
): Promise<Thread> {
  if (!draftsPath) throw new Error("Cette boîte n'a pas de dossier « Brouillons ».");
  const raw = await composer(draft, {}, true);
  const id = await ranger(client, draftsPath, raw, ["\\Draft", "\\Seen"]);
  if (draft.id) await deleteDraftMessage(client, trashPath, draft.id);
  return filEcrit(draft, id ?? `draft-${Date.now()}`, "drafts");
}

/**
 * Retirer un brouillon : à la corbeille, pas au néant.
 *
 * Un brouillon abandonné par erreur se récupère ; `\Deleted` + `EXPUNGE` ne se
 * récupère pas. On ne supprime vraiment que si la boîte n'a pas de corbeille.
 */
export async function deleteDraftMessage(
  client: ImapFlow,
  trashPath: string | undefined,
  id: string,
): Promise<void> {
  const parsed = parseThreadId(id);
  if (!parsed) return;
  const lock = await client.getMailboxLock(parsed.path);
  try {
    if (trashPath && trashPath !== parsed.path) {
      await client.messageMove([parsed.uid], trashPath, { uid: true });
    } else {
      await client.messageDelete([parsed.uid], { uid: true });
    }
  } finally {
    lock.release();
  }
}
