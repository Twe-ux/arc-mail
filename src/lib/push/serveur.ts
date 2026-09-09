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
/** Qui contacter si un relais a un problème avec nos envois. La RFC veut un `mailto:`. */
const SUJET = process.env.VAPID_SUBJECT || "mailto:contact@arc-mail.app";

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
export async function pousser(abonnement: Abonnement, charge: Charge): Promise<boolean> {
  if (!pushConfigure()) return false;
  configurer();
  try {
    await webpush.sendNotification(
      {
        endpoint: abonnement.endpoint,
        keys: { p256dh: abonnement.p256dh, auth: abonnement.auth },
      },
      JSON.stringify(charge),
      { TTL: 3600 },
    );
    return true;
  } catch (error) {
    const code = (error as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) {
      await supabaseAdmin().from("push_subscriptions").delete().eq("id", abonnement.id);
    }
    return false;
  }
}
