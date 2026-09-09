#!/usr/bin/env node
/**
 * Fabrique la paire de clés VAPID des notifications.
 *
 * Elles identifient notre serveur auprès d'Apple et de Google ; elles ne
 * chiffrent rien (le chiffrement se fait avec les clés du navigateur). La
 * publique part dans le client, la privée reste dans Vercel — **aucune des
 * deux ne se commite**, et la privée ne se colle nulle part ailleurs.
 *
 *   node scripts/vapid.mjs
 *
 * Puis dans Vercel → Settings → Environment Variables :
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET
 *
 * Changer la paire **désabonne tous les appareils** : les souscriptions déjà
 * prises sont liées à la clé publique d'alors. Il faudra les reprendre.
 */
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}
VAPID_PRIVATE_KEY=${privateKey}
VAPID_SUBJECT=mailto:ton@adresse.fr
CRON_SECRET=${crypto.randomUUID()}

À coller dans Vercel, jamais dans le dépôt.
`);
