import { NextResponse, type NextRequest } from "next/server";

import { comptesARelever, personnesAbonnees } from "@/lib/accounts/releve";
import { dossiersASurveiller, nouveautes, withImap, type Nouveaute } from "@/lib/mail/imap";
import { pousser, pushConfigure, type Abonnement } from "@/lib/push/serveur";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * **Le tour de relève.** Ce qui remplace le serveur qu'on n'a pas.
 *
 * IMAP sait prévenir tout seul (`IDLE`), mais il faut pour cela une connexion
 * qui reste ouverte, et une fonction serverless meurt à la fin de sa requête.
 * Un cron ne donne donc pas l'instantané ; il donne la notification, avec le
 * retard de sa période. C'est le seul modèle qui tienne ici.
 *
 * **Au moins cher** : un `STATUS` par dossier — une commande, sans `SELECT` —
 * et un `FETCH` d'enveloppes seulement si `UIDNEXT` a bougé. La plupart des
 * tours ne descendent pas un octet.
 *
 * **Séquentiel, une connexion à la fois** : iCloud plafonne les connexions
 * simultanées par compte (quatre ou cinq), et ce plafond est partagé avec
 * quelqu'un qui lirait son courrier pendant le tour.
 *
 * **Le corps ne sort jamais d'ici.** La notification porte l'expéditeur et
 * l'objet, chiffrés de bout en bout jusqu'à l'appareil ; et cette route ne
 * répond que par des nombres — un tour qui rendrait des messages serait une
 * fuite déguisée en journal.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Un tour ne doit jamais tenir la place d'un autre : Vercel le coupe avant. */
export const maxDuration = 60;

/** Au-delà, on ne raconte plus : « 7 nouveaux messages » vaut mieux que sept notifications. */
const DETAIL_MAX = 2;

export async function GET(request: NextRequest) {
  /* **Vercel signe ses appels** : `Authorization: Bearer $CRON_SECRET`. Sans
     ce secret la route n'existe pas — c'est la seule chose qui la sépare
     d'une porte ouverte sur un travail qui déchiffre des mots de passe. */
  const attendu = process.env.CRON_SECRET;
  if (!attendu) return NextResponse.json({ error: "CRON_SECRET manquant." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${attendu}`)
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  if (!pushConfigure())
    return NextResponse.json({ error: "Clés VAPID manquantes." }, { status: 503 });

  try {
    return await tour();
  } catch (error) {
    /* Un tour qui casse doit se lire dans le journal de Vercel, pas s'y
       présenter comme une page d'erreur : c'est la seule trace qu'on aura. */
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tour impossible." },
      { status: 500 },
    );
  }
}

/**
 * **Le tour dit ce qu'il a fait.** Sans ça, « aucun appareil abonné », « rien
 * de neuf » et « la boîte a refusé la connexion » rendent tous un 200 muet, et
 * on ne peut que deviner. Aucun contenu dans ces lignes : des nombres, des
 * chemins de dossiers et des raisons — jamais un expéditeur ni un objet.
 */
const dire = (message: string) => console.log(`relève : ${message}`);

async function tour() {
  const db = supabaseAdmin();
  let comptes = 0;
  let dossiers = 0;
  let notifications = 0;

  const personnes = await personnesAbonnees();
  if (personnes.length === 0) {
    dire("aucun appareil abonné — rien à relever");
    return NextResponse.json({ comptes: 0, dossiers: 0, notifications: 0 });
  }
  const aRelever = await comptesARelever(personnes);
  dire(`${personnes.length} personne(s) abonnée(s), ${aRelever.length} compte(s) à ouvrir`);
  if (aRelever.length === 0)
    dire("aucun compte lisible : soit rien de branché, soit un secret qui ne se déchiffre pas");

  /* Les appareils, une fois pour toutes : une personne en a souvent deux, et
     les relire par compte ferait une requête par boîte. */
  const { data: abos } = await db
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", personnes.length ? personnes : ["-"]);
  const parPersonne = new Map<string, Abonnement[]>();
  for (const a of (abos ?? []) as (Abonnement & { user_id: string })[]) {
    const liste = parPersonne.get(a.user_id) ?? [];
    liste.push({ id: a.id, endpoint: a.endpoint, p256dh: a.p256dh, auth: a.auth });
    parPersonne.set(a.user_id, liste);
  }

  for (const cible of aRelever) {
    comptes += 1;
    try {
      await withImap(cible.account, cible.password, async (client) => {
        /* **Tous les dossiers, en un aller-retour**, et leurs repères en une
           requête : une règle du serveur qui dépose du courrier dans un
           dossier n'était prévenue par personne, et surveiller chaque dossier
           par un `STATUS` aurait coûté un aller-retour chacun. */
        const etats = await dossiersASurveiller(client);
        if (etats.length === 0) {
          dire(`${cible.account.label} : aucun dossier à surveiller`);
          return;
        }
        const { data: lignes } = await db
          .from("mail_watermarks")
          .select("path, uidvalidity, uidnext")
          .eq("account_id", cible.account.id)
          .in("path", etats.map((e) => e.path));
        const reperes = new Map(
          ((lignes ?? []) as { path: string; uidvalidity: number; uidnext: number }[]).map((l) => [
            l.path,
            { uidvalidity: Number(l.uidvalidity), uidnext: Number(l.uidnext) },
          ]),
        );

        /* Le repère avance **même quand rien n'est poussé** : un premier
           passage, une boîte renumérotée ou un envoi raté ne doivent pas faire
           raconter la même chose au tour suivant. Tous d'un coup — ce sont
           les mêmes valeurs, qu'on ait notifié ou non. */
        const vu = new Date().toISOString();
        await db.from("mail_watermarks").upsert(
          etats.map((e) => ({
            account_id: cible.account.id,
            path: e.path,
            uidvalidity: e.uidvalidity,
            uidnext: e.uidnext,
            seen_at: vu,
          })),
          { onConflict: "account_id,path" },
        );

        const neufs = etats.filter((e) => {
          const repere = reperes.get(e.path);
          return repere && repere.uidvalidity === e.uidvalidity && e.uidnext > repere.uidnext;
        });
        dossiers += etats.length;
        if (neufs.length === 0) {
          const premiers = etats.filter((e) => !reperes.has(e.path)).length;
          dire(
            `${cible.account.label} : ${etats.length} dossier(s) surveillé(s), rien de neuf` +
              (premiers ? ` (${premiers} repère(s) posé(s), premier passage)` : ""),
          );
          return;
        }

        for (const etat of neufs) {
          const messages = await nouveautes(client, etat, reperes.get(etat.path) ?? null);
          if (messages.length === 0) {
            /* Le compteur a bougé mais rien n'est à dire : du courrier déjà lu
               ailleurs, ou un message qu'on vient d'écrire. */
            dire(`${cible.account.label} · ${etat.nom} : compteur bougé, rien de non-lu`);
            continue;
          }
          const appareils = parPersonne.get(cible.userId) ?? [];
          dire(
            `${cible.account.label} · ${etat.nom} : ${messages.length} message(s) neufs, ${appareils.length} appareil(s)`,
          );
          for (const abonnement of appareils) {
            const envoi = await pousser(abonnement, charge(messages, etat));
            if (envoi.ok) notifications += 1;
            else dire(`envoi refusé — ${envoi.raison ?? "sans raison donnée"}`);
          }
        }
      });
    } catch (error) {
      /* Une boîte injoignable ne doit pas emporter le tour des autres — mais
         elle doit se **voir** : avalée en silence, elle ressemblait trait pour
         trait à « rien de neuf ». Le repère n'a pas bougé, le tour suivant
         reprendra où celui-ci s'est arrêté. */
      dire(
        `${cible.account.label} : injoignable — ${error instanceof Error ? error.message : "erreur inconnue"}`,
      );
    }
  }

  /* **Les pauses arrivées à échéance.** C'est la moitié qui manquait à « En
     pause » : la promesse portait une date, et rien ne pouvait la tenir à
     l'heure dite — le fil ne revenait qu'à la prochaine ouverture, sur le seul
     appareil où la pause avait été posée. Le tour existe maintenant ; il n'a
     qu'à regarder. */
  const reveils = await reveiller(db, personnes, parPersonne);
  notifications += reveils;

  dire(`fin — ${comptes} compte(s), ${dossiers} dossier(s), ${notifications} notification(s)`);
  return NextResponse.json({ comptes, dossiers, notifications, reveils });
}

/**
 * Rendre les fils dont l'heure est venue.
 *
 * **Réveiller, c'est oublier la promesse** — la règle de la fiche, ici aussi :
 * la ligne est supprimée, et le fil réapparaît dans sa boîte au prochain
 * regard, sur tous les appareils. La notification n'est que le messager.
 *
 * On **supprime avant de pousser**, et c'est délibéré : un envoi qui échoue ne
 * doit pas faire redire la même chose au tour suivant. Une notification perdue
 * vaut mieux qu'une notification qui revient toutes les cinq minutes — le fil,
 * lui, est de retour dans la liste dans les deux cas.
 */
async function reveiller(
  db: ReturnType<typeof supabaseAdmin>,
  personnes: string[],
  parPersonne: Map<string, Abonnement[]>,
): Promise<number> {
  const { data, error } = await db
    .from("mail_pauses")
    .select("user_id, thread_id, titre, objet")
    .in("user_id", personnes)
    .lte("wake", new Date().toISOString());
  if (error) {
    dire(`pauses illisibles — ${error.message}`);
    return 0;
  }
  const dus = (data ?? []) as { user_id: string; thread_id: string; titre: string | null; objet: string | null }[];
  if (dus.length === 0) return 0;

  await db
    .from("mail_pauses")
    .delete()
    .in("thread_id", dus.map((p) => p.thread_id))
    .in("user_id", personnes);

  let envoyees = 0;
  for (const pause of dus) {
    dire(`pause échue : ${pause.thread_id}`);
    for (const abonnement of parPersonne.get(pause.user_id) ?? []) {
      const envoi = await pousser(abonnement, {
        titre: pause.titre ? `De retour · ${pause.titre}` : "Un message est de retour",
        corps: pause.objet || "Il était en pause",
      });
      if (envoi.ok) envoyees += 1;
      else dire(`réveil non poussé — ${envoi.raison ?? "sans raison donnée"}`);
    }
  }
  return envoyees;
}

/**
 * Ce que l'écran verrouillé montre.
 *
 * Un message : qui, et quoi. Deux : les deux noms. Au-delà, le compte — une
 * pile de sept notifications pour une infolettre du matin est ce qui fait
 * couper les notifications d'une app.
 */
function charge(messages: Nouveaute[], etat: { path: string; nom: string }) {
  /* **Le dossier n'est dit que s'il n'est pas la réception.** « INBOX » sur un
     écran verrouillé ne dit rien à personne ; « Factures » dit tout. */
  const ou = etat.path === "INBOX" ? "" : ` · ${etat.nom}`;
  if (messages.length === 1)
    return { titre: `${messages[0].nom}${ou}`, corps: messages[0].objet };
  if (messages.length <= DETAIL_MAX)
    return {
      titre: `${messages.length} nouveaux messages${ou}`,
      corps: messages.map((m) => m.nom).join(", "),
    };
  return {
    titre: `${messages.length} nouveaux messages${ou}`,
    corps: `${messages
      .slice(0, DETAIL_MAX)
      .map((m) => m.nom)
      .join(", ")} et ${messages.length - DETAIL_MAX} autres`,
  };
}
