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
  type Chrono,
} from "@/lib/mail/imap";
import type { DraftInput, OutgoingMessage, RepereEnvoyes } from "@/lib/mail/provider";
import { dossiersDe, versImap } from "@/lib/search/imap";
import { parse } from "@/lib/search/parse";
import { deleteDraftMessage, saveDraftMessage, sendMessage } from "@/lib/mail/smtp";
import { currentUser } from "@/lib/supabase/server";
import type { FolderId, Thread, DossierCible } from "@/lib/types";

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
  | {
      op: "listThreads";
      accountId: string;
      folder: FolderId;
      inboxPath?: string;
      limit?: number;
      deja?: number;
      /** Où en était « Envoyés » pour le client : s'il n'a pas bougé, on ne l'ouvre pas. */
      envoyes?: RepereEnvoyes;
    }
  | { op: "getThread"; accountId: string; id: string; messageIds?: string[] }
  | { op: "getThreads"; accountId: string; ids: string[] }
  | {
      op: "modify";
      accountId: string;
      id: string;
      patch: { unread?: boolean; starred?: boolean; folder?: FolderId; labels?: string[] };
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

  /* **Chaque appel se nomme et se chronomètre.** Le panneau de Vercel donne la
     durée d'une invocation sans dire de quelle opération il s'agit : une
     lecture de liste et un préchargement de dix corps y ont la même tête, et
     l'un bloque l'écran quand l'autre travaille derrière. Une ligne par appel,
     l'opération et le total ; aucun contenu. */
  const debutAppel = Date.now();
  const compte = () => `${Date.now() - debutAppel} ms`;

  try {
    /* `accountCredentials` relit le compte avec les droits de la personne
       connectée : un identifiant qui n'est pas le sien ne rend rien. */
    const { account, password } = await accountCredentials(body.accountId);
    const apresCompte = Date.now() - debutAppel;

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
      if (body.op === "folderCounts") return unreadByFolder(client, body.inboxPath);

      if (body.op === "listThreads") {
        /* La « Réception » d'un espace n'est pas forcément `INBOX` : pour un
           domaine personnalisé c'est le dossier où la règle iCloud range son
           courrier. Le fournisseur ne connaît pas les espaces, il reçoit le
           chemin. */
        const reception = body.inboxPath || "INBOX";

        /* Favoris n'est pas un dossier mais un drapeau : on cherche les
           messages marqués dans la réception plutôt que d'ouvrir un chemin
           qui n'existe pas. */
        /* **Nos réponses vivent dans « Envoyés ».** On les fond dans les fils
           de la boîte qu'on lit, sinon un fil rouvert après rechargement ne
           montre que sa moitié reçue. Le chemin passe par `paths()` — un LIST
           de plus, mis en cache pour la requête. Inutile quand on lit
           « Envoyés » lui-même. */
        /* **On mesure où passe le temps d'une lecture** (9 sept.). Les journaux
           du tour de relève ont montré qu'un aller-retour vers iCloud coûte
           trois à six dixièmes de seconde : une lecture en fait cinq (le `LIST`
           des chemins, `SELECT` + `FETCH` du dossier, les deux mêmes pour
           « Envoyés »), et c'est probablement là qu'est le temps — pas dans les
           soixante enveloppes rapportées. Trois nombres, aucun contenu, une
           ligne par lecture : de quoi décider si une lecture incrémentale
           gagnerait quelque chose avant de l'écrire. */
        const chrono: Chrono = {};
        const debut = Date.now();
        /* **Et si on saute « Envoyés », le `LIST` ne sert plus à rien.**
           Mesuré sur la vraie boîte, une fois le saut en place : `chemins
           312 ms · envoyés sautés · total 535 ms` — le `LIST` était devenu
           **plus de la moitié** de la lecture. Or il ne servait qu'à trouver
           le chemin d'« Envoyés » : la réception, elle, connaît le sien
           d'avance. Un quatrième aller-retour qui disparaît. Les autres
           dossiers en ont toujours besoin pour se résoudre eux-mêmes, et le
           demandent plus bas. */
        const saut = !!body.envoyes;
        const envoyes = body.folder === "sent" || saut ? undefined : (await paths()).sent;
        chrono.chemins = Date.now() - debut;
        /* **Le client décide, pas nous.** Il connaît le repère d'« Envoyés »
           par `listFolders`, qui tourne en parallèle de la lecture et ne coûte
           rien de plus ; le comparer ici demanderait un aller-retour, ce qui
           annulerait la moitié du gain. Son repère a donc l'âge de la lecture
           d'avant : une réponse écrite ailleurs entre-temps arrive une lecture
           plus tard, et un envoi depuis Arc Mail efface le repère. */
        const dire = () =>
          console.log(
            `lecture : ${body.folder} · chemins ${chrono.chemins} ms · dossier ${chrono.dossier ?? "?"} ms` +
              (chrono.select === undefined
                ? ""
                : ` (select ${chrono.select} · fetch ${chrono.fetch ?? "?"})`) +
              (chrono.envoyes === undefined
                ? saut
                  ? " · envoyés sautés"
                  : ""
                : ` · envoyés ${chrono.envoyes} ms`) +
              ` · ${chrono.fils ?? 0} fils · total ${Date.now() - debut} ms`,
          );

        if (body.folder === "starred") {
          /* Ils gardent « inbox » comme dossier : ce sont les mêmes messages,
             et les marquer « starred » les ferait disparaître de la réception
             (`threadMatchesFolder` lit `t.folder`). */
          const favoris = await readFolder(client, reception, "inbox", {
            flaggedOnly: true,
            limit: body.limit,
            deja: body.deja,
            moi: account.email,
            sentPath: envoyes,
            sautEnvoyes: saut,
            chrono,
          });
          dire();
          return { threads: favoris, sautEnvoyes: saut };
        }
        /* **« En pause » ne se demande pas au serveur.** Ce n'est pas un
           dossier — aucune boîte n'en a un —, c'est un état que le store tient
           tout seul : la liste vient de `pauses`, pas d'IMAP. La demande ne
           devrait jamais arriver ici ; si elle arrive, elle est vide. */
        if (body.folder === "snoozed") return { threads: [] };
        const path = body.folder === "inbox" ? reception : (await paths())[body.folder];
        /* Un dossier absent — les indésirables sur une boîte qui n'en a pas —
           est une liste vide, pas une erreur. */
        if (!path) return { threads: [] };
        /* Notre adresse est des deux côtés de tout notre courrier : sans elle,
           la reprise par l'objet croirait voir un correspondant commun entre
           deux messages qui n'en ont aucun (`groupIntoThreads`). */
        const threads = await readFolder(client, path, body.folder, {
          limit: body.limit,
          deja: body.deja,
          moi: account.email,
          sentPath: envoyes,
          sautEnvoyes: saut,
          chrono,
        });
        dire();
        return { threads, sautEnvoyes: saut };
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
          /* « En pause » n'est pas un dossier : il n'y a rien à y chercher, la
             liste vient du store. */
          if (cible === "snoozed") continue;
          const path = flagged
            ? reception
            : cible === "inbox"
              ? reception
              : (await paths())[cible];
          /* Un dossier absent — les indésirables sur une boîte qui n'en a pas —
             est une liste vide. */
          if (!path) continue;
          threads.push(
            ...(await searchFolder(
              client,
              path,
              flagged ? "inbox" : cible,
              flagged ? { ...critere, flagged: true } : critere,
              body.limit,
              account.email,
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
          labels: body.patch.labels,
          path: cible,
        });
        return { id: apres };
      }

      /* L'identifiant d'un fil porte son chemin : on retrouve le dossier en
         renversant la table, pour que le fil hydraté garde le sien. */
      const path = parseThreadId(body.id)?.path;
      const folder =
        (Object.entries(await paths()).find(([, p]) => p === path)?.[0] as DossierCible | undefined) ??
        "inbox";
      return { thread: await readThread(client, body.id, folder, body.messageIds) };
    });

    console.log(`appel : ${body.op} · compte ${apresCompte} ms · total ${compte()}`);
    return NextResponse.json(result);
  } catch (error) {
    /* Le message d'IMAP tel quel : « Invalid credentials », « Mailbox does
       not exist » disent exactement quoi corriger, et le bandeau de la liste
       les montre. Rien de secret n'y transite. */
    const message = error instanceof Error ? error.message : String(error);
    console.log(`appel : ${body.op} · échec après ${compte()} — ${message}`);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
