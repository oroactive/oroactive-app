const STATIC_CACHE = "oroactive-static-v20260528-state-separation-1";
const STATIC_ASSETS = [
  "/index.html",
  "/styles.css?v=20260528-state-separation-1",
  "/app.js?v=20260528-state-separation-1",
  "/manifest.json",
  "/manifest.webmanifest",
  "/oroactive-logo.png",
  "/icons/apple-touch-icon-180.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];
const SENSITIVE_PATHS = [
  "/api/",
  "/uploads/",
  "/documents/",
  "/pdf/",
  "/firme/",
  "/contabili/",
  "/atti/",
  "/clienti/",
  "/backups/"
];

function isSensitiveRequest(requestUrl) {
  const path = requestUrl.pathname.toLowerCase();
  return SENSITIVE_PATHS.some((prefix) => path.startsWith(prefix))
    || path.includes("codice-fiscale")
    || path.includes("documento")
    || path.includes("firma")
    || path.includes("contabile")
    || path.includes("pdf")
    || path.includes("cliente");
}

function isStaticAsset(requestUrl) {
  if (requestUrl.origin !== self.location.origin) return false;
  return STATIC_ASSETS.some((asset) => {
    const assetUrl = new URL(asset, self.location.origin);
    return requestUrl.pathname === assetUrl.pathname;
  });
}

function networkFirst(request) {
  return fetch(request).then((response) => {
    if (response.ok) {
      const clone = response.clone();
      caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
    }
    return response;
  }).catch(() => caches.match(request));
}

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

  if (event.request.method !== "GET" || isSensitiveRequest(requestUrl)) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isStaticAsset(requestUrl)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
        const clone = response.clone();
        if (response.ok) caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
        return response;
      }))
    );
    return;
  }

  event.respondWith(fetch(event.request));
});
