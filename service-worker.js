const BUILD_ID = "20260806-hardening-performance-20";
const SHELL_CACHE_NAME = `oroactive-shell-${BUILD_ID}`;
const IMAGE_CACHE_NAME = `oroactive-images-${BUILD_ID}`;
const IMAGE_CACHE_MAX_ENTRIES = 96;
const ACTIVE_CACHE_NAMES = new Set([SHELL_CACHE_NAME, IMAGE_CACHE_NAME]);
const LEGACY_CACHE_PREFIXES = ["oroactive-", "oroactive-cache-", "oroactive-static-", "oroactive-assets-", "static-", "asset-", "pwa-"];
const SHELL_ASSETS = [
  "/",
  `/styles.css?v=${BUILD_ID}`,
  `/frontend-config.js?v=${BUILD_ID}`,
  `/shared/aurum-policy.js?v=${BUILD_ID}`,
  `/app.js?v=${BUILD_ID}`,
  "/oroactive-logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon-180.png"
];
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
  "/service-worker.js",
  "/sw.js",
  "/manifest.json",
  "/manifest.webmanifest",
  "/version.json"
];
const HASHED_ASSET_PATTERN = /[.-][a-f0-9]{8,}\.(?:js|css|png|jpe?g|webp|svg|woff2?)$/i;
const CACHEABLE_FILE_PATTERN = /\.(?:js|css|png|jpe?g|webp|svg|woff2?)$/i;
const ASSET_IMAGE_PATTERN = /\.(?:png|jpe?g|webp|avif|gif|svg)$/i;
const OFFLINE_FALLBACK = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OroActive offline</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0907;color:#fff4df;font:16px system-ui}.card{max-width:32rem;margin:1rem;padding:2rem;border:1px solid #a95a18;border-radius:1rem;background:#17100a}h1{color:#ff9b43}</style></head><body><main class="card"><h1>OroActive non è connessa</h1><p>Riconnettiti a Internet e riapri l’app. Nessun dato operativo è disponibile o conservato in questa schermata offline.</p></main></body></html>`;

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
  return LEGACY_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)) && !ACTIVE_CACHE_NAMES.has(key);
}

function isStaticAssetImage(url) {
  return url.pathname.startsWith("/assets/") && ASSET_IMAGE_PATTERN.test(url.pathname);
}

function canonicalAssetRequest(request) {
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";
  return new Request(url.toString(), {
    method: "GET",
    credentials: "same-origin",
    mode: "same-origin"
  });
}

function shouldCacheVersionedAsset(url) {
  return HASHED_ASSET_PATTERN.test(url.pathname)
    || (url.searchParams.get("v") === BUILD_ID && CACHEABLE_FILE_PATTERN.test(url.pathname));
}

async function fetchNoStore(request) {
  return fetch(request, { cache: "no-store" });
}

async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE_NAME);
  await Promise.allSettled(SHELL_ASSETS.map(async (asset) => {
    const response = await fetch(asset, { cache: "reload" });
    if (response.ok) await cache.put(asset, response);
  }));
}

async function networkFirstNavigation(request) {
  try {
    return await fetchNoStore(request);
  } catch {
    const cache = await caches.open(SHELL_CACHE_NAME);
    const shell = await cache.match("/", { ignoreSearch: true });
    return shell || new Response(OFFLINE_FALLBACK, {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
}

async function cacheFirstVersionedAsset(request) {
  const cache = await caches.open(SHELL_CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function cacheFirstAssetImage(request) {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  const cacheKey = canonicalAssetRequest(request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    try {
      await cache.put(cacheKey, response.clone());
      const keys = await cache.keys();
      const overflow = keys.length - IMAGE_CACHE_MAX_ENTRIES;
      if (overflow > 0) await Promise.all(keys.slice(0, overflow).map((key) => cache.delete(key)));
    } catch {
      // Un limite quota non deve impedire la visualizzazione della risposta di rete.
    }
  }
  return response;
}

self.addEventListener("install", (event) => {
  // La nuova versione resta in attesa: il client la attiva soltanto dopo avere
  // verificato che non esistano pratiche o acquisizioni non salvate.
  event.waitUntil(precacheShell());
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
    event.source?.postMessage({ type: "OROACTIVE_SW_VERSION", buildId: BUILD_ID, cacheName: SHELL_CACHE_NAME });
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (shouldNeverCache(url)) {
    event.respondWith(fetchNoStore(request));
    return;
  }

  if (isStaticAssetImage(url)) {
    event.respondWith(cacheFirstAssetImage(request));
    return;
  }

  if (shouldCacheVersionedAsset(url)) {
    event.respondWith(cacheFirstVersionedAsset(request));
    return;
  }

  event.respondWith(fetchNoStore(request));
});
