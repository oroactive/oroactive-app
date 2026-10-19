import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

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

test("Aurum esce dal dock responsive e segue il trascinamento touch senza aprire la chat", async () => {
  const [app, styles] = await Promise.all([file("app.js"), file("styles.css")]);
  const start = app.indexOf("function handleAurumPointerDown");
  const end = app.indexOf("function shouldShowAurumMascot", start);
  assert.ok(start >= 0 && end > start, "gestori drag Aurum non trovati");
  const source = app.slice(start, end);
  const classes = new Set(["aurum-responsive-docked"]);
  const savedPositions = [];
  const state = {
    aurumDragState: null,
    aurumFloatingPosition: null,
    aurumSuppressNextClick: false
  };
  const aurumMascotRoot = {
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
      toggle: (name, force) => force ? classes.add(name) : classes.delete(name)
    },
    style: { removeProperty() {}, setProperty() {} },
    getBoundingClientRect: () => ({ left: 900, top: 400, width: 68, height: 68 }),
    setPointerCapture: (pointerId) => { aurumMascotRoot.capturedPointer = pointerId; },
    releasePointerCapture: (pointerId) => { aurumMascotRoot.releasedPointer = pointerId; }
  };
  const mascotButton = {
    setPointerCapture: (pointerId) => { mascotButton.capturedPointer = pointerId; },
    hasPointerCapture: (pointerId) => mascotButton.capturedPointer === pointerId,
    releasePointerCapture: (pointerId) => { mascotButton.releasedPointer = pointerId; }
  };
  const pointerEvent = (clientX, clientY) => ({
    pointerId: 7,
    button: 0,
    clientX,
    clientY,
    target: {
      closest: (selector) => selector === "#aurumMascotButton" ? mascotButton : null
    },
    preventDefault() {}
  });
  const context = {
    state,
    aurumMascotRoot,
    aurumChatPanel: null,
    shouldShowAurumMascot: () => true,
    isAurumResponsiveDock: () => true,
    applyAurumPosition: (position) => {
      state.aurumFloatingPosition = { ...position };
      classes.add("aurum-positioned");
    },
    constrainAurumTipToViewport() {},
    saveAurumFloatingPosition: (position) => savedPositions.push({ ...position }),
    defaultAurumPosition: () => ({ x: 0, y: 0 }),
    scheduleAurumAvoidance() {},
    window: { setTimeout() {} }
  };
  const api = vm.runInNewContext(`${source}; ({ handleAurumPointerDown, handleAurumPointerMove, handleAurumPointerUp })`, context);

  api.handleAurumPointerDown(pointerEvent(930, 430));
  assert.equal(state.aurumDragState?.element, "mascot");
  assert.equal(classes.has("aurum-responsive-docked"), true);
  assert.equal(mascotButton.capturedPointer, 7);
  assert.equal(aurumMascotRoot.capturedPointer, undefined);

  api.handleAurumPointerMove(pointerEvent(700, 260));
  assert.deepEqual(state.aurumFloatingPosition, { x: 670, y: 230 });
  assert.equal(classes.has("aurum-positioned"), true);
  assert.match(styles, /\.aurum-mascot-root\.aurum-responsive-docked:not\(\.aurum-positioned\)/);

  api.handleAurumPointerUp(pointerEvent(700, 260));
  assert.deepEqual(savedPositions, [{ x: 670, y: 230 }]);
  assert.equal(state.aurumSuppressNextClick, true);
  assert.equal(state.aurumDragState, null);
  assert.equal(mascotButton.releasedPointer, 7);

  state.aurumSuppressNextClick = false;
  state.aurumFloatingPosition = null;
  savedPositions.length = 0;
  classes.clear();
  classes.add("aurum-responsive-docked");
  api.handleAurumPointerDown(pointerEvent(930, 430));
  api.handleAurumPointerUp(pointerEvent(930, 430));
  assert.deepEqual(savedPositions, []);
  assert.equal(state.aurumSuppressNextClick, false);
  assert.equal(classes.has("aurum-positioned"), false);

  const syncStart = app.indexOf("function isAurumResponsiveDock");
  const syncEnd = app.indexOf("function safeViewportInset", syncStart);
  const syncSource = app.slice(syncStart, syncEnd);
  classes.add("aurum-positioned");
  state.aurumFloatingPosition = { x: 120, y: 160 };
  const syncWithSavedPosition = vm.runInNewContext(
    `${syncSource}; syncAurumResponsiveDock()`,
    {
      state,
      aurumMascotRoot,
      loadAurumFloatingPosition: () => ({ x: 120, y: 160 }),
      window: { innerWidth: 1024, matchMedia: () => ({ matches: true }) }
    }
  );
  assert.equal(syncWithSavedPosition, false);
  assert.equal(classes.has("aurum-positioned"), true);
});

test("la PWA conserva solo shell e immagini statiche per build, mai API o dati", async () => {
  const [sw, app] = await Promise.all([file("service-worker.js"), file("app.js")]);

  assert.match(sw, /SHELL_CACHE_NAME/);
  assert.match(sw, /IMAGE_CACHE_NAME/);
  assert.match(sw, /SHELL_CORE_ASSETS/);
  assert.match(sw, /SHELL_OPTIONAL_ASSETS/);
  assert.match(sw, /networkFirstNavigation/);
  assert.match(sw, /const SHELL_CORE_ASSETS = \[\s*"\/"/);
  assert.match(sw, /Promise\.all\(SHELL_CORE_ASSETS/);
  assert.match(sw, /Promise\.allSettled\(SHELL_OPTIONAL_ASSETS/);
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
  assert.doesNotMatch(app, /clearOldOroactiveCaches|staticCacheKeys\.map\(\(key\) => window\.caches\.delete/);
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
