const CACHE_VERSION = "20260701-auto-deploy-pwa-update-1";
const STATIC_CACHE = `oroactive-static-${CACHE_VERSION}`;
const STATIC_ASSETS = [
  "/styles.css?v=20260623-academy-form-cleanup-1",
  "/app.js?v=20260623-academy-form-cleanup-1",
  "/oroactive-logo.png",
  "/icons/apple-touch-icon-180.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];
const HTML_PATHS = ["/", "/index.html", "/manifest.json", "/manifest.webmanifest", "/version.json"];
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
  if (HTML_PATHS.includes(requestUrl.pathname)) return false;
  return STATIC_ASSETS.some((asset) => {
    const assetUrl = new URL(asset, self.location.origin);
    return requestUrl.pathname === assetUrl.pathname;
  });
}

function networkFirst(request) {
  return fetch(request, { cache: "no-store" }).catch(async () => {
    const cached = await caches.match(request);
    return cached || new Response("OroActive offline: riconnettiti per caricare l'ultima versione.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("oroactive-") && key !== STATIC_CACHE)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.method !== "GET" || isSensitiveRequest(requestUrl)) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (HTML_PATHS.includes(requestUrl.pathname)) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
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
