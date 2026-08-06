import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const file = (name) => readFile(new URL(name, root), "utf8");

test("il controllo aggiornamenti e coalescato, non scarica app.js e usa un intervallo di almeno 15 minuti", async () => {
  const [app, index] = await Promise.all([file("app.js"), file("index.html")]);
  const interval = Number(app.match(/const OROACTIVE_UPDATE_INTERVAL_MS = (\d+)/)?.[1] || 0);
  const resumeMinAge = Number(app.match(/const OROACTIVE_UPDATE_RESUME_MIN_AGE_MS = (\d+)/)?.[1] || 0);

  assert.ok(interval >= 15 * 60 * 1000, `intervallo troppo breve: ${interval}ms`);
  assert.ok(resumeMinAge >= interval, `ripresa troppo frequente: ${resumeMinAge}ms`);
  assert.doesNotMatch(app, /fetchLatestClientBuildId|\/app\.js\?v=\$\{Date\.now\(\)\}/);
  assert.match(app, /appUpdateCheckPromise/);
  assert.match(app, /appVersionCheckerStarted/);
  assert.equal((app.match(/addEventListener\("focus"/g) || []).length, 1);
  assert.equal((app.match(/addEventListener\("visibilitychange"/g) || []).length, 1);
  assert.match(app, /fetchAppVersion\("\/version\.json"\)/);
  assert.doesNotMatch(index, /version\.json\?boot=\$\{Date\.now\(\)\}/);
});

test("la splash non aggiunge piu di 600ms dopo che la sessione e pronta", async () => {
  const app = await file("app.js");
  const value = (name) => Number(app.match(new RegExp(`const ${name} = (\\d+)`))?.[1] || Number.NaN);
  const firstRunBudget = value("OROACTIVE_SPLASH_MIN_MS")
    + value("OROACTIVE_SPLASH_READY_MS")
    + value("OROACTIVE_SPLASH_EXIT_MS");
  const repeatBudget = value("OROACTIVE_SPLASH_BRIEF_MS")
    + value("OROACTIVE_SPLASH_READY_MS")
    + value("OROACTIVE_SPLASH_EXIT_MS");

  assert.ok(Number.isFinite(firstRunBudget));
  assert.ok(firstRunBudget <= 600, `budget primo avvio: ${firstRunBudget}ms`);
  assert.ok(repeatBudget <= 600, `budget avvii successivi: ${repeatBudget}ms`);
});

test("le POST non vengono ritentate automaticamente e le opzioni interne non arrivano a fetch", async () => {
  const app = await file("app.js");
  const functionSource = app.match(/function resolveApiRequestAttempts[\s\S]*?\n}/)?.[0];

  assert.match(app, /function resolveApiRequestAttempts/);
  assert.match(app, /const retrySafeMethod = \["GET", "HEAD", "OPTIONS"\]\.includes\(method\)/);
  assert.match(app, /return retrySafeMethod \? API_RETRY_ATTEMPTS : 1/);
  assert.match(app, /const \{ retries, retry, timeoutMs, \.\.\.fetchOptions \} = options/);
  assert.match(app, /\.\.\.fetchOptions/);
  assert.doesNotMatch(app, /\.\.\.options,\s*signal:/);
  assert.ok(functionSource, "resolveApiRequestAttempts non trovata");

  const resolveAttempts = Function(
    "API_RETRY_ATTEMPTS",
    `"use strict"; ${functionSource}; return resolveApiRequestAttempts;`,
  )(3);
  assert.equal(resolveAttempts("/api/read"), 3);
  assert.equal(resolveAttempts("/api/write", { method: "POST" }), 1);
  assert.equal(resolveAttempts("/api/write", { method: "POST", retries: 2 }), 2);
  assert.equal(resolveAttempts("/api/read", { retry: false }), 1);
});

test("Aurum usa gli offset solo su desktop e ha un dock responsive che riserva spazio alle CTA", async () => {
  const [app, styles] = await Promise.all([file("app.js"), file("styles.css")]);

  assert.match(app, /function isAurumResponsiveDock/);
  assert.match(app, /&& !isAurumResponsiveDock\(\)/);
  assert.match(app, /classList\.toggle\("aurum-responsive-docked"/);
  assert.match(styles, /\.aurum-mascot-root\.aurum-roaming:not\(\.aurum-panel-open\)[\s\S]*var\(--aurum-x, 0px\)[\s\S]*var\(--aurum-y, 0px\)/);
  assert.match(styles, /@media \(max-width: 1100px\)[\s\S]*\.aurum-mascot-root\.aurum-responsive-docked/);
  assert.match(styles, /@media \(max-width: 1100px\)[\s\S]*\.workspace[\s\S]*padding-right:/);
});

test("la PWA conserva solo shell e immagini statiche per build, mai API o dati", async () => {
  const [sw, app] = await Promise.all([file("service-worker.js"), file("app.js")]);

  assert.match(sw, /SHELL_CACHE_NAME/);
  assert.match(sw, /IMAGE_CACHE_NAME/);
  assert.match(sw, /SHELL_ASSETS/);
  assert.match(sw, /networkFirstNavigation/);
  assert.match(sw, /const SHELL_ASSETS = \[\s*"\/"/);
  assert.match(sw, /cache\.match\("\/"/);
  assert.doesNotMatch(sw, /cache\.match\("\/index\.html"/);
  assert.match(sw, /cacheFirstAssetImage/);
  assert.match(sw, /canonicalAssetRequest/);
  assert.match(sw, /const IMAGE_CACHE_MAX_ENTRIES = 96/);
  assert.match(sw, /keys\.length - IMAGE_CACHE_MAX_ENTRIES/);
  assert.match(sw, /NEVER_CACHE_PREFIXES[\s\S]*"\/api\/"/);
  assert.match(sw, /NEVER_CACHE_PATHS[\s\S]*"\/version\.json"/);
  assert.match(sw, /request\.mode === "navigate"/);
  assert.doesNotMatch(sw, /cache\.put\(request[^\n]*Date\.now|boot=|cache-reset=/);
  assert.doesNotMatch(sw, /precacheShell\(\)\.then\(\(\) => self\.skipWaiting\(\)\)/);
  assert.match(app, /serviceWorkerActivationAuthorized/);
  assert.match(app, /if \(!state\.serviceWorkerActivationAuthorized \|\| syncDirtyState\(\)\)/);
  assert.match(app, /if \(syncDirtyState\(\)\) \{[\s\S]*Salva la pratica prima di aggiornare/);
  assert.match(app, /window\.setTimeout\(\(\) => \{[\s\S]*if \(syncDirtyState\(\)\)[\s\S]*window\.location\.reload\(\);[\s\S]*\}, 600\)/);
});

test("Elenco Monete monta 24 schede alla volta e usa thumbnail con fallback, lasciando il dettaglio HD", async () => {
  const [app, styles] = await Promise.all([file("app.js"), file("styles.css")]);

  assert.match(app, /const COIN_CATALOG_PAGE_SIZE = 24/);
  assert.match(app, /coinCatalogVisibleCount/);
  assert.match(app, /data-load-more-coins/);
  assert.match(app, /function coinThumbnailUrl/);
  assert.match(app, /\/assets\/coins\/thumbnails\/\$\{encodeURIComponent\(thumbnailSlug\)\}\.webp/);
  assert.match(app, /data-thumbnail-fallback/);
  assert.match(app, /coinMiniFacesMarkup[\s\S]*thumbnail: true/);
  assert.match(app, /function renderCoinDetail[\s\S]*coinFaceMarkup\(coin, "front"\)[\s\S]*coinFaceMarkup\(coin, "back"\)/);
  assert.match(styles, /\.coin-catalog-pagination/);
});

test("le card gemmologiche tentano una thumbnail WebP e scheda e zoom mantengono il media HD", async () => {
  const app = await file("app.js");

  assert.match(app, /function gemLabCardImageAttributes/);
  assert.match(app, /\/assets\/academy\/gems\/thumbnails\/\$\{encodeURIComponent\(slug\)\}-preview\.webp/);
  assert.match(app, /function gemLabHdMediaAttributes/);
  assert.match(app, /gem-lab-card-preview[\s\S]*gemLabCardImageAttributes\(material, media\)/);
  assert.match(app, /gem-lab-detail-media[\s\S]*gemLabHdMediaAttributes\(cover\)/);
  assert.match(app, /gem-lab-zoom[\s\S]*gemLabHdMediaAttributes\(media\)/);
});
