/* Arc Mail service worker: caches the app shell so the PWA opens offline.
 * Navigations are network-first (fresh HTML when online, cached shell otherwise);
 * Next.js static assets are cache-first because their URLs are content-hashed. */
const VERSION = "arc-mail-v7";
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
