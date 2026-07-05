const BUILD_ID = "20260705-messico-libertad-oro-1-oz-1";
const CACHE_NAME = `oroactive-cache-${BUILD_ID}`;
const LEGACY_CACHE_PREFIXES = ["oroactive-", "oroactive-cache-", "oroactive-static-", "oroactive-assets-", "static-", "asset-", "pwa-"];
const NEVER_CACHE_PREFIXES = [
  "/api/",
  "/auth/",
  "/uploads/",
  "/documents/",
  "/pdf/",
  "/firme/",
  "/contabili/",
  "/atti/",
  "/clienti/",
  "/backups/"
];
const NEVER_CACHE_PATHS = [
  "/",
  "/app",
  "/index.html",
  "/service-worker.js",
  "/sw.js",
  "/manifest.json",
  "/manifest.webmanifest",
  "/version.json"
];
const HASHED_ASSET_PATTERN = /[.-][a-f0-9]{8,}\.(?:js|css|png|jpe?g|webp|svg|woff2?)$/i;

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function shouldNeverCache(url) {
  const path = url.pathname.toLowerCase();
  return NEVER_CACHE_PATHS.includes(path)
    || NEVER_CACHE_PREFIXES.some((prefix) => path.startsWith(prefix))
    || path.endsWith(".html")
    || path.includes("service-worker")
    || path.includes("manifest")
    || path.includes("codice-fiscale")
    || path.includes("documento")
    || path.includes("firma")
    || path.includes("contabile")
    || path.includes("cliente");
}

function shouldDeleteCache(key) {
  return LEGACY_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)) && key !== CACHE_NAME;
}

async function fetchNoStore(request) {
  return fetch(request, { cache: "no-store" });
}

async function cacheFirstHashedAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter(shouldDeleteCache).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (event.data?.type === "GET_VERSION") {
    event.source?.postMessage({ type: "OROACTIVE_SW_VERSION", buildId: BUILD_ID, cacheName: CACHE_NAME });
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;

  if (request.mode === "navigate" || shouldNeverCache(url)) {
    event.respondWith(fetchNoStore(request));
    return;
  }

  if (HASHED_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(cacheFirstHashedAsset(request));
    return;
  }

  event.respondWith(fetchNoStore(request));
});
