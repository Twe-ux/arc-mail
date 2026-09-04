import { NextResponse, type NextRequest } from "next/server";

import { accountCredentials } from "@/lib/accounts/server";
import {
  folderPaths,
  parseThreadId,
  readFolder,
  readThread,
  withImap,
  writeThread,
} from "@/lib/mail/imap";
import { currentUser } from "@/lib/supabase/server";
import type { FolderId } from "@/lib/types";

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
  | { op: "listThreads"; accountId: string; folder: FolderId; limit?: number }
  | { op: "getThread"; accountId: string; id: string }
  | {
      op: "modify";
      accountId: string;
      id: string;
      patch: { unread?: boolean; starred?: boolean; folder?: FolderId };
    }
  | { op: "folders"; accountId: string };

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
      const paths = await folderPaths(client);

      if (body.op === "folders") return { paths };

      if (body.op === "listThreads") {
        /* Favoris n'est pas un dossier mais un drapeau : on cherche les
           messages marqués dans la réception plutôt que d'ouvrir un chemin
           qui n'existe pas. */
        if (body.folder === "starred") {
          /* Ils gardent « inbox » comme dossier : ce sont les mêmes messages,
             et les marquer « starred » les ferait disparaître de la réception
             (`threadMatchesFolder` lit `t.folder`). */
          return {
            threads: await readFolder(client, "INBOX", "inbox", {
              flaggedOnly: true,
              limit: body.limit,
            }),
          };
        }
        const path = paths[body.folder];
        /* Une boîte iCloud n'a pas d'« En pause » : un dossier absent est une
           liste vide, pas une erreur. */
        if (!path) return { threads: [] };
        return { threads: await readFolder(client, path, body.folder, { limit: body.limit }) };
      }

      if (body.op === "modify") {
        const cible = body.patch.folder ? paths[body.patch.folder] : undefined;
        if (body.patch.folder && !cible) {
          throw new Error(`Cette boîte n'a pas de dossier « ${body.patch.folder} ».`);
        }
        await writeThread(client, body.id, {
          unread: body.patch.unread,
          starred: body.patch.starred,
          path: cible,
        });
        return { ok: true };
      }

      /* L'identifiant d'un fil porte son chemin : on retrouve le dossier en
         renversant la table, pour que le fil hydraté garde le sien. */
      const path = parseThreadId(body.id)?.path;
      const folder =
        (Object.entries(paths).find(([, p]) => p === path)?.[0] as FolderId | undefined) ?? "inbox";
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
