"use client";

/**
 * S'abonner aux notifications, depuis le navigateur.
 *
 * Rien ici ne décide **quand** notifier : c'est le tour de relève qui le fait.
 * Ce fichier ne sait que trois choses — cet appareil en est-il capable, la
 * personne a-t-elle dit oui, et où faut-il pousser.
 */

/**
 * Ce que l'interface a besoin de distinguer. Quatre états, pas un booléen :
 * « ce n'est pas allumé » et « ce navigateur ne sait pas le faire » demandent
 * deux phrases différentes, et un interrupteur qu'on ne peut pas lever ment.
 */
export type EtatPush =
  /** Pas encore lu. L'état demande une lecture asynchrone, et l'afficher avant
      qu'elle rende ferait clignoter une phrase fausse. */
  | "inconnu"
  /** Le navigateur n'a pas l'API. Sur iPhone, c'est Safari hors app installée. */
  | "impossible"
  /** L'API est là, le service worker pas encore : au tout premier chargement,
      et en développement où il ne s'enregistre pas du tout. */
  | "sans-worker"
  /** Refusé au niveau du système : nous ne pouvons plus rien demander. */
  | "refuse"
  | "eteint"
  | "allume";

export const pushPossible = (): boolean =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

/** iOS n'expose le push **que** dans l'app installée : le dire vaut mieux que se taire. */
export const surIphone = (): boolean =>
  typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

export const installee = (): boolean =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true);

const CLE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export const pushDisponible = (): boolean => pushPossible() && CLE.length > 0;

/** La clé VAPID voyage en base64url ; `subscribe` veut des octets. */
function octets(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const brut = atob(base64);
  const sortie = new Uint8Array(new ArrayBuffer(brut.length));
  for (let i = 0; i < brut.length; i += 1) sortie[i] = brut.charCodeAt(i);
  return sortie;
}

const cle = (souscription: PushSubscription, nom: "p256dh" | "auth"): string => {
  const brut = souscription.getKey(nom);
  if (!brut) return "";
  return btoa(String.fromCharCode(...new Uint8Array(brut)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

/**
 * Le service worker, **s'il est là**.
 *
 * `navigator.serviceWorker.ready` est un piège : il ne se résout *jamais* tant
 * qu'aucun worker n'est enregistré — pas de rejet, pas de délai. Une lecture
 * d'état calée dessus reste en attente pour toujours, et l'interface garde son
 * état de départ en le donnant pour vrai. Mesuré en développement, où le
 * worker ne s'enregistre pas (`pwa-register` est en production seulement).
 *
 * `getRegistration()` répond toujours, `undefined` compris.
 */
async function enregistrement(): Promise<ServiceWorkerRegistration | null> {
  if (!pushDisponible()) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

export async function etatPush(): Promise<EtatPush> {
  if (!pushDisponible()) return "impossible";
  if (Notification.permission === "denied") return "refuse";
  const reg = await enregistrement();
  if (!reg) return "sans-worker";
  const deja = await reg.pushManager.getSubscription();
  return deja ? "allume" : "eteint";
}

/**
 * Allumer : la permission **puis** la souscription, dans cet ordre.
 *
 * `requestPermission()` doit partir d'un geste — un navigateur refuse une
 * demande qui ne vient pas d'un clic, et iOS la refuse définitivement.
 */
export async function allumerPush(): Promise<EtatPush> {
  if (!pushDisponible()) return "impossible";
  const reponse = await Notification.requestPermission();
  if (reponse !== "granted") return reponse === "denied" ? "refuse" : "eteint";

  const reg = await enregistrement();
  if (!reg) return "impossible";

  const souscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      /* Sans ça le relais accepterait des envois anonymes : la RFC le permet,
         Chrome ne le permet pas, et nous n'en voulons pas non plus. */
      userVisibleOnly: true,
      applicationServerKey: octets(CLE),
    }));

  const reponseServeur = await fetch("/api/push", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      op: "abonner",
      endpoint: souscription.endpoint,
      p256dh: cle(souscription, "p256dh"),
      auth: cle(souscription, "auth"),
      appareil: navigator.userAgent.slice(0, 200),
    }),
  });
  if (!reponseServeur.ok) {
    /* Une souscription que le serveur ne connaît pas est un appareil qui
       croit être prévenu et ne le sera jamais. On la défait. */
    await souscription.unsubscribe().catch(() => {});
    const { error } = (await reponseServeur.json().catch(() => ({}))) as { error?: string };
    throw new Error(error || "L'appareil n'a pas pu être enregistré.");
  }
  return "allume";
}

/** Éteindre des deux côtés : le navigateur d'abord, notre table ensuite. */
export async function eteindrePush(): Promise<EtatPush> {
  const reg = await enregistrement();
  const souscription = await reg?.pushManager.getSubscription();
  if (souscription) {
    await fetch("/api/push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "desabonner", endpoint: souscription.endpoint }),
    }).catch(() => {});
    await souscription.unsubscribe().catch(() => {});
  }
  return "eteint";
}
