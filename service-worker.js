const STATIC_CACHE = "oroactive-static-v20260523-1";
const STATIC_ASSETS = [
  "/index.html",
  "/styles.css?v=20260523-22",
  "/app.js?v=20260523-29",
  "/manifest.json",
  "/manifest.webmanifest",
  "/oroactive-logo.png",
  "/icons/apple-touch-icon-180.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  const isSensitive =
    requestUrl.pathname.startsWith("/api/")
    || requestUrl.pathname.includes("pdf")
    || requestUrl.pathname.includes("document")
    || requestUrl.pathname.includes("backup");

  if (event.request.method !== "GET" || isSensitive) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (requestUrl.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
        if (response.ok && STATIC_ASSETS.some((asset) => requestUrl.pathname === new URL(asset, self.location.origin).pathname)) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }))
    );
  }
});
