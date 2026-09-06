import { NextResponse, type NextRequest } from "next/server";

import { accountCredentials } from "@/lib/accounts/server";
import {
  folderPaths,
  parseThreadId,
  readFolder,
  readThread,
  readThreads,
  searchFolder,
  unreadByFolder,
  withImap,
  writeThread,
} from "@/lib/mail/imap";
import type { DraftInput, OutgoingMessage } from "@/lib/mail/provider";
import { dossiersDe, versImap } from "@/lib/search/imap";
import { parse } from "@/lib/search/parse";
import { deleteDraftMessage, saveDraftMessage, sendMessage } from "@/lib/mail/smtp";
import { currentUser } from "@/lib/supabase/server";
import type { FolderId, Thread } from "@/lib/types";

/**
 * La seule porte entre le navigateur et une boîte mail.
 *
 * Une route et pas six : elle épouse `MailProvider` appel pour appel, et il
 * n'y a donc qu'un endroit où vérifier qui demande. Le mot de passe ne quitte
 * jamais ce processus — le client envoie un identifiant de compte, le serveur
 * le résout, s'y connecte, ferme.
 *
 * IMAP a besoin de Node : ni le runtime Edge, ni un rendu statique.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body =
  | { op: "listThreads"; accountId: string; folder: FolderId; inboxPath?: string; limit?: number }
  | { op: "getThread"; accountId: string; id: string }
  | { op: "getThreads"; accountId: string; ids: string[] }
  | {
      op: "modify";
      accountId: string;
      id: string;
      patch: { unread?: boolean; starred?: boolean; folder?: FolderId };
    }
  | { op: "send"; accountId: string; message: OutgoingMessage }
  | { op: "saveDraft"; accountId: string; draft: DraftInput }
  | { op: "deleteDraft"; accountId: string; id: string }
  | { op: "folders"; accountId: string }
  | { op: "folderCounts"; accountId: string; inboxPath?: string }
  | { op: "search"; accountId: string; q: string; folder: FolderId; inboxPath?: string; limit?: number };

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Requête illisible." }, { status: 400 });
  }

  try {
    /* `accountCredentials` relit le compte avec les droits de la personne
       connectée : un identifiant qui n'est pas le sien ne rend rien. */
    const { account, password } = await accountCredentials(body.accountId);

    const result = await withImap(account, password, async (client) => {
      /* **Paresseux, et pour une raison mesurable** : `folderPaths` est un
         `LIST` complet, un aller-retour de plus sur une connexion qui n'en
         fait que quelques-uns. Or la lecture la plus fréquente — la réception
         d'un espace — n'en a aucun besoin : son chemin est connu d'avance. On
         ne le demande donc que quand il sert. */
      let cache: Partial<Record<FolderId, string>> | null = null;
      const paths = async () => (cache ??= await folderPaths(client));

      if (body.op === "folders") return { paths: await paths() };

      /* Les non-lus de tous les dossiers, en un `LIST` avec `STATUS`. C'est
         le seul appel qui parle de dossiers qu'on ne regarde pas, et il ne
         sert qu'à ça : la lecture d'une liste, elle, n'en a pas besoin. */
      if (body.op === "folderCounts")
        return { counts: await unreadByFolder(client, body.inboxPath) };

      if (body.op === "listThreads") {
        /* La « Réception » d'un espace n'est pas forcément `INBOX` : pour un
           domaine personnalisé c'est le dossier où la règle iCloud range son
           courrier. Le fournisseur ne connaît pas les espaces, il reçoit le
           chemin. */
        const reception = body.inboxPath || "INBOX";

        /* Favoris n'est pas un dossier mais un drapeau : on cherche les
           messages marqués dans la réception plutôt que d'ouvrir un chemin
           qui n'existe pas. */
        if (body.folder === "starred") {
          /* Ils gardent « inbox » comme dossier : ce sont les mêmes messages,
             et les marquer « starred » les ferait disparaître de la réception
             (`threadMatchesFolder` lit `t.folder`). */
          return {
            threads: await readFolder(client, reception, "inbox", {
              flaggedOnly: true,
              limit: body.limit,
            }),
          };
        }
        const path = body.folder === "inbox" ? reception : (await paths())[body.folder];
        /* Une boîte iCloud n'a pas d'« En pause » : un dossier absent est une
           liste vide, pas une erreur. */
        if (!path) return { threads: [] };
        return { threads: await readFolder(client, path, body.folder, { limit: body.limit }) };
      }

      if (body.op === "search") {
        const arbre = parse(body.q);
        const critere = versImap(arbre);
        const reception = body.inboxPath || "INBOX";

        /* **`dans:` dit où chercher, pas quoi chercher** : IMAP interroge la
           boîte sélectionnée, donc un dossier nommé est une sélection et non un
           critère. Rien de nommé : on cherche là où l'on regarde. Plusieurs
           dossiers : plusieurs `SEARCH`, IMAP n'en sélectionne qu'un à la fois. */
        const demandes = dossiersDe(arbre);
        const cibles = demandes.length ? demandes : [body.folder];

        const threads: Thread[] = [];
        for (const cible of cibles) {
          /* Favoris est un drapeau, pas un dossier : on le cherche dans la
             réception, comme `listThreads`, et le critère porte déjà
             `flagged` si la requête l'a demandé. */
          const flagged = cible === "starred";
          const path = flagged
            ? reception
            : cible === "inbox"
              ? reception
              : (await paths())[cible];
          /* Un dossier absent — « En pause » sur iCloud — est une liste vide. */
          if (!path) continue;
          threads.push(
            ...(await searchFolder(
              client,
              path,
              flagged ? "inbox" : cible,
              flagged ? { ...critere, flagged: true } : critere,
              body.limit,
            )),
          );
        }
        /* Plusieurs dossiers rendent plusieurs paquets déjà triés : le mélange
           doit l'être aussi, sinon Archive se poserait en bloc après Réception. */
        threads.sort((a, b) => (a.messages.at(-1)!.date < b.messages.at(-1)!.date ? 1 : -1));
        return { threads: threads.slice(0, body.limit ?? 40) };
      }

      if (body.op === "send") {
        /* Un envoi, c'est SMTP **et** IMAP : remettre le message, puis en
           ranger la copie. La connexion déjà ouverte sert aux deux. */
        const sent = (await paths()).sent;
        return { thread: await sendMessage(client, account, password, sent, body.message) };
      }

      if (body.op === "saveDraft") {
        const p = await paths();
        return { thread: await saveDraftMessage(client, p.drafts, p.trash, body.draft) };
      }

      if (body.op === "deleteDraft") {
        await deleteDraftMessage(client, (await paths()).trash, body.id);
        return { ok: true };
      }

      if (body.op === "getThreads") {
        /* Le préchargement : plusieurs messages, une ouverture de dossier, un
           `FETCH`. Le dossier rendu est « inbox » — ces fils viennent de la
           liste qu'on regarde, et le store ne s'en sert que pour remplir des
           corps, jamais pour les ranger. */
        return { threads: await readThreads(client, body.ids.slice(0, 12), "inbox") };
      }

      if (body.op === "modify") {
        /* Un simple « lu » ne déplace rien : inutile d'aller chercher les
           chemins pour lui, et c'est l'écriture la plus fréquente de toutes. */
        const cible = body.patch.folder ? (await paths())[body.patch.folder] : undefined;
        if (body.patch.folder && !cible) {
          throw new Error(`Cette boîte n'a pas de dossier « ${body.patch.folder} ».`);
        }
        /* L'identifiant d'après : le même, un autre si le message a changé de
           dossier, `null` si le serveur n'a pas dit où il a atterri. */
        const apres = await writeThread(client, body.id, {
          unread: body.patch.unread,
          starred: body.patch.starred,
          path: cible,
        });
        return { id: apres };
      }

      /* L'identifiant d'un fil porte son chemin : on retrouve le dossier en
         renversant la table, pour que le fil hydraté garde le sien. */
      const path = parseThreadId(body.id)?.path;
      const folder =
        (Object.entries(await paths()).find(([, p]) => p === path)?.[0] as FolderId | undefined) ??
        "inbox";
      return { thread: await readThread(client, body.id, folder) };
    });

    return NextResponse.json(result);
  } catch (error) {
    /* Le message d'IMAP tel quel : « Invalid credentials », « Mailbox does
       not exist » disent exactement quoi corriger, et le bandeau de la liste
       les montre. Rien de secret n'y transite. */
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
