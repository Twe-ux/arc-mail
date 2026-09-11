/* Arc Mail service worker: caches the app shell so the PWA opens offline.
 * Navigations are network-first (fresh HTML when online, cached shell otherwise);
 * Next.js static assets are cache-first because their URLs are content-hashed. */
/* **Ce numero est ce qui fait arriver un correctif dans l'app installee.**
 * `versionFraiche()` (thread-list.tsx) ne recharge la page que si `update()`
 * trouve un worker a installer — donc seulement si CE fichier a change. Trois
 * correctifs de lecture sont partis sans y toucher : le deploiement etait bon,
 * le bundle neuf servi, et l'iPhone continuait de faire tourner l'ancien.
 * A bumper avec tout changement qui doit se voir sur l'appareil. */
const VERSION = "arc-mail-v30";
const SHELL = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          /* Ne garder que la vraie boîte : une redirection (vers la page de
             connexion) ou une erreur mise en cache sous « / » servirait la
             porte à quelqu'un de connecté, hors ligne, sans moyen d'en sortir.
             Et une réponse redirigée ne peut de toute façon pas être rejouée
             telle quelle. */
          if (response.ok && !response.redirected && new URL(request.url).pathname === "/") {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put("/", copy));
          }
          return response;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});

/* ── Les notifications ──────────────────────────────────────────────────
 *
 * Le tour de relève (`/api/cron/releve`) pousse une charge chiffrée de bout en
 * bout : le relais d'Apple ou de Google n'a jamais lu ce qui suit.
 *
 * **Une notification visible à chaque push, sans exception.** iOS retire la
 * permission à une app qui pousse en silence, et un `push` sans
 * `showNotification` compte pour un silence — d'où le repli, qui n'arrive que
 * si la charge est illisible. La relève, elle, ne pousse rien quand il n'y a
 * rien. */
self.addEventListener("push", (event) => {
  let charge = {};
  try {
    charge = event.data ? event.data.json() : {};
  } catch {
    charge = {};
  }
  const titre = charge.titre || "Arc Mail";
  /* **La pastille de l'icône** (Badging API). Le nombre vient du tour de
     relève, qui est le seul à connaître le total — l'app n'a en mémoire que
     l'espace ouvert. Il vaut donc « ce qui n'est pas lu au moment où on te
     prévient », et **ouvrir l'app l'efface** (`app-shell.tsx`) : un compteur
     qui resterait faux après lecture serait pire que pas de compteur.
     Facultatif partout : un navigateur sans l'API ne fait rien, sans erreur. */
  if (typeof charge.badge === "number" && self.navigator && self.navigator.setAppBadge) {
    try {
      self.navigator.setAppBadge(charge.badge);
    } catch {
      /* Refusée, ou pas d'app installée : la notification suffit. */
    }
  }
  event.waitUntil(
    self.registration.showNotification(titre, {
      body: charge.corps || "Du nouveau courrier",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      /* Une seule notification d'Arc Mail à la fois : la suivante remplace la
         précédente au lieu d'empiler une pile qu'on balaie sans lire. */
      tag: "arc-mail",
      renotify: true,
      data: { espace: charge.espace || null },
    }),
  );
});

/* Rouvrir la fenêtre déjà ouverte plutôt qu'une seconde : quelqu'un qui touche
 * la notification veut sa boîte, pas un onglet de plus. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (self.navigator && self.navigator.clearAppBadge) {
    try {
      self.navigator.clearAppBadge();
    } catch {
      /* Rien à effacer. */
    }
  }
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      for (const fenetre of fenetres) {
        if ("focus" in fenetre) return fenetre.focus();
      }
      return self.clients.openWindow("/");
    }),
  );
});
