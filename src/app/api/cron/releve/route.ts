import { NextResponse, type NextRequest } from "next/server";

import { comptesARelever, personnesAbonnees } from "@/lib/accounts/releve";
import { nouveautes, withImap, type Nouveaute } from "@/lib/mail/imap";
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
        for (const chemin of cible.chemins) {
          dossiers += 1;
          const { data: repere } = await db
            .from("mail_watermarks")
            .select("uidvalidity, uidnext")
            .eq("account_id", cible.account.id)
            .eq("path", chemin)
            .maybeSingle();

          const vu = await nouveautes(
            client,
            chemin,
            repere ? { uidvalidity: Number(repere.uidvalidity), uidnext: Number(repere.uidnext) } : null,
          );

          /* Le repère avance **même quand rien n'est poussé** : un premier
             passage, une boîte renumérotée ou un envoi raté ne doivent pas
             faire raconter la même chose au tour suivant. */
          await db.from("mail_watermarks").upsert(
            {
              account_id: cible.account.id,
              path: chemin,
              uidvalidity: vu.uidvalidity,
              uidnext: vu.uidnext,
              seen_at: new Date().toISOString(),
            },
            { onConflict: "account_id,path" },
          );

          if (vu.messages.length === 0) {
            /* Le cas le plus courant, et celui qu'on confond avec une panne :
               le premier passage pose le repère sans rien annoncer. */
            dire(
              repere
                ? `${cible.account.label} · ${chemin} : rien de neuf (uidnext ${vu.uidnext})`
                : `${cible.account.label} · ${chemin} : repère posé à ${vu.uidnext}, premier passage`,
            );
            continue;
          }
          const appareils = parPersonne.get(cible.userId) ?? [];
          dire(
            `${cible.account.label} · ${chemin} : ${vu.messages.length} message(s) neufs, ${appareils.length} appareil(s)`,
          );
          for (const abonnement of appareils) {
            const envoi = await pousser(abonnement, charge(vu.messages, cible.account.label));
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

  dire(`fin — ${comptes} compte(s), ${dossiers} dossier(s), ${notifications} notification(s)`);
  return NextResponse.json({ comptes, dossiers, notifications });
}

/**
 * Ce que l'écran verrouillé montre.
 *
 * Un message : qui, et quoi. Deux : les deux noms. Au-delà, le compte — une
 * pile de sept notifications pour une infolettre du matin est ce qui fait
 * couper les notifications d'une app.
 */
function charge(messages: Nouveaute[], boite: string) {
  if (messages.length === 1)
    return { titre: messages[0].nom, corps: messages[0].objet };
  if (messages.length <= DETAIL_MAX)
    return {
      titre: `${messages.length} nouveaux messages`,
      corps: messages.map((m) => m.nom).join(", "),
    };
  return {
    titre: `${messages.length} nouveaux messages`,
    corps: `${messages
      .slice(0, DETAIL_MAX)
      .map((m) => m.nom)
      .join(", ")} et ${messages.length - DETAIL_MAX} autres · ${boite}`,
  };
}
