import "server-only";

import webpush from "web-push";

import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Pousser une notification, et oublier les appareils qui n'existent plus.
 *
 * Les clés VAPID **identifient notre serveur** auprès d'Apple et de Google ;
 * elles ne chiffrent rien. Le chiffrement, lui, se fait avec les clés
 * publiques du navigateur portées par la souscription (`p256dh`, `auth`) :
 * la charge utile part chiffrée de bout en bout, et le relais ne lit qu'un
 * bloc opaque. C'est ce qui rend l'objet d'un message acceptable dans une
 * notification.
 */

export type Abonnement = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const PUBLIQUE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const PRIVEE = process.env.VAPID_PRIVATE_KEY || "";

/**
 * Qui contacter si un relais a un problème avec nos envois.
 *
 * La RFC veut une **URL** : `mailto:` ou `https:`. Or ce qu'on tape dans une
 * variable qui s'appelle « subject » et qui attend une adresse, c'est une
 * adresse — et `web-push` la refuse alors net (« Vapid subject is not a valid
 * URL »), au premier envoi seulement. Signalé sur le déploiement : le tour
 * trouvait le message neuf, visait l'appareil, et mourait là.
 *
 * On préfixe donc ce qui est visiblement une adresse. La variable reste
 * documentée avec son `mailto:` ; ceci rattrape la faute de frappe qu'elle
 * appelle.
 */
const SUJET = (() => {
  const brut = (process.env.VAPID_SUBJECT || "").trim();
  if (!brut) return "mailto:contact@arc-mail.app";
  if (/^(mailto:|https?:\/\/)/i.test(brut)) return brut;
  return brut.includes("@") ? `mailto:${brut}` : brut;
})();

export const pushConfigure = (): boolean => PUBLIQUE.length > 0 && PRIVEE.length > 0;

let pose = false;
function configurer() {
  if (pose) return;
  webpush.setVapidDetails(SUJET, PUBLIQUE, PRIVEE);
  pose = true;
}

/** Ce qu'un appareil reçoit. Un objet, pas du texte : le service worker le lit. */
export type Charge = {
  titre: string;
  corps: string;
  /** L'espace à ouvrir au clic, quand la notification en vient d'un. */
  espace?: string;
};

/**
 * Un envoi, une souscription.
 *
 * `404` et `410` sont définitifs : l'appareil a désinstallé l'app, ou le
 * relais a jeté l'abonnement. On le retire — sinon la table grossit de
 * fantômes qu'on réessaie à chaque tour, et Apple n'envoie aucun autre signal.
 */
export async function pousser(
  abonnement: Abonnement,
  charge: Charge,
): Promise<{ ok: boolean; raison?: string }> {
  if (!pushConfigure()) return { ok: false, raison: "clés VAPID absentes" };
  try {
    /* **Dedans, pas avant.** `setVapidDetails` valide le sujet et *jette* :
       posée hors du `try`, son erreur remontait jusqu'au tour de relève, qui
       la rangeait sous « boîte injoignable » — un défaut de configuration
       accusait le serveur IMAP. */
    configurer();
    await webpush.sendNotification(
      {
        endpoint: abonnement.endpoint,
        keys: { p256dh: abonnement.p256dh, auth: abonnement.auth },
      },
      JSON.stringify(charge),
      { TTL: 3600 },
    );
    return { ok: true };
  } catch (error) {
    const code = (error as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) {
      await supabaseAdmin().from("push_subscriptions").delete().eq("id", abonnement.id);
      return { ok: false, raison: `appareil disparu (${code}), souscription retirée` };
    }
    return {
      ok: false,
      raison: error instanceof Error ? error.message : `refus du relais (${code ?? "?"})`,
    };
  }
}
