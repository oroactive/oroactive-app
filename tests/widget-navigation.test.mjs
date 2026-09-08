import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const navigationSource = app.slice(app.indexOf("const OROACTIVE_NAVIGATION_ROUTES ="), app.indexOf("function menuButtonMarkup"));

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} deve esistere`);
  const body = app.indexOf("{", app.indexOf(")", start));
  let depth = 0;
  for (let index = body; index < app.length; index += 1) {
    if (app[index] === "{") depth += 1;
    if (app[index] === "}" && --depth === 0) {
      return `${app.slice(Math.max(0, start - 6), start) === "async " ? "async " : ""}${app.slice(start, index + 1)}`;
    }
  }
  throw new Error(`Funzione incompleta: ${name}`);
}

function makeContext(options = {}) {
  const active = new Set();
  const screens = new Map(["practice", "coinEncyclopedia", "gemLab", "quotazione", "assistant"].map((id) => [id, {
    id,
    hidden: true,
    classList: { contains: (name) => name === "active-screen" && active.has(id) }
  }]));
  const context = {
    console: { info() {}, warn() {}, error() {} },
    URL,
    state: {
      authToken: options.authenticated === false ? "" : "private-session-never-expose",
      currentUser: options.authenticated === false ? null : { id: "operator", ruolo: "commesso" },
      sessionGeneration: 1,
      editingPracticeNumber: null,
      editingDirty: false
    },
    window: {
      location: { href: options.url || "https://app.oroactive.it/" },
      history: {
        state: null,
        replaceState(_state, _title, href) {
          context.window.location.href = new URL(href, context.window.location.href).href;
        }
      },
      setTimeout(callback, delay) { context.timers.push({ callback, delay }); }
    },
    document: {
      getElementById(id) { return id === "mainMenuScreen" ? context.mainMenuScreen : screens.get(id); },
      querySelector() { return [...screens.values()].find((screen) => !screen.hidden && active.has(screen.id)) || null; }
    },
    mainMenuScreen: { hidden: false },
    appShell: { hidden: true },
    aurumChatPanel: { hidden: true },
    MENU_GROUPS: [{ items: ["practice", "coinEncyclopedia", "gemLab", "quotazione"].map((section) => ({ section })) }],
    isMenuItemVisible(item) { return !context.denied.has(item.section); },
    shouldShowAurumMascot: () => context.mascotEnabled,
    openAurumChat() { context.aurumChatPanel.hidden = false; context.calls.push("aurum"); },
    openMainMenuCleanly() {
      context.mainMenuScreen.hidden = false;
      context.appShell.hidden = true;
      active.clear();
      context.calls.push("menu");
    },
    setScreen(id) {
      if (context.blockedScreens.has(id)) return;
      context.calls.push(id);
      active.clear();
      active.add(id);
      screens.forEach((screen) => { screen.hidden = screen.id !== id; });
      context.mainMenuScreen.hidden = true;
      context.appShell.hidden = false;
    },
    isPracticeFormEmpty: () => !context.practiceData,
    teardownGemLabZoom() { context.zoomOpen = false; },
    showToast(message) { context.toasts.push(message); },
    reportFrontendFailure() {},
    showMainMenuShell() { context.recoveries += 1; context.mainMenuScreen.hidden = false; },
    renderMainMenuMinimum() {},
    showBootRecoveryNotice() {},
    forceShowMainMenuAfterLogin() { context.recoveries += 1; context.mainMenuScreen.hidden = false; },
    calls: [], toasts: [], timers: [], recoveries: 0,
    denied: new Set(), blockedScreens: new Set(), mascotEnabled: true,
    practiceData: "", zoomOpen: false
  };
  context.window.currentUser = context.state.currentUser;
  vm.createContext(context);
  vm.runInContext(navigationSource, context);
  vm.runInContext(`oroActiveNavigationState.startupComplete = ${options.startupComplete !== false};`, context);
  if (options.ready !== false && context.state.currentUser) {
    vm.runInContext("oroActiveNavigationState.authenticatedGeneration = state.sessionGeneration;", context);
  }
  vm.runInContext("installOroActiveNavigationBridge();", context);
  return context;
}

const plain = (value) => JSON.parse(JSON.stringify(value));

test("bridge widget si installa senza navigare e apre soltanto le sei azioni consentite", () => {
  const destinations = { home: "menu", quote: "quotazione", "new-act": "practice", coins: "coinEncyclopedia", gems: "gemLab", aurum: "aurum" };
  for (const [action, destination] of Object.entries(destinations)) {
    const context = makeContext();
    assert.deepEqual(context.calls, []);
    const result = context.window.OroActiveNavigation.openAction(action);
    assert.equal(result.status, "opened");
    assert.equal(result.destination, destination);
    assert.deepEqual(context.calls, [destination]);
    assert.doesNotMatch(JSON.stringify(result), /private-session|operator|token/i);
  }
});

test("input arbitrari e nomi ereditati non navigano e non sostituiscono un’azione pendente", () => {
  const context = makeContext({ authenticated: false });
  assert.equal(context.window.OroActiveNavigation.openAction("coins").status, "pending");
  for (const action of [null, undefined, 1, {}, [], "", "__proto__", "constructor", "toString", " quote", "QUOTE", "users", "https://evil.invalid/", "coins&token=secret"]) {
    assert.deepEqual(plain(context.window.OroActiveNavigation.openAction(action)), { status: "blocked", reason: "invalid-action" });
  }
  assert.deepEqual(context.calls, []);
  assert.equal(vm.runInContext("oroActiveNavigationState.pendingAction", context), "coins");
});

test("azione HTTPS resta pendente attraverso login e splash, poi viene consumata una volta", () => {
  const context = makeContext({ authenticated: false, startupComplete: false, ready: false, url: "https://app.oroactive.it/?action=gems#catalogo" });
  assert.deepEqual(context.calls, []);
  context.state.authToken = "private-session-never-expose";
  context.state.currentUser = { ruolo: "commesso" };
  context.window.currentUser = context.state.currentUser;
  assert.equal(context.finishOroActiveNavigationBoot(1).status, "pending");
  assert.deepEqual(context.calls, []);
  vm.runInContext("oroActiveNavigationState.startupComplete = true;", context);
  assert.equal(context.consumePendingOroActiveNavigation().status, "opened");
  assert.deepEqual(context.calls, ["gemLab"]);
  assert.equal(context.window.location.href, "https://app.oroactive.it/#catalogo");
  assert.equal(context.consumePendingOroActiveNavigation().status, "blocked");
  assert.deepEqual(context.calls, ["gemLab"]);
});

test("bridge conserva l’ultima scelta valida durante autenticazione e attende il boot corrente", () => {
  const context = makeContext({ authenticated: false, ready: false });
  context.window.OroActiveNavigation.openAction("coins");
  assert.equal(context.window.OroActiveNavigation.openAction("aurum").reason, "authentication");
  context.state.authToken = "private-session-never-expose";
  context.state.currentUser = { ruolo: "commesso" };
  context.state.sessionGeneration = 2;
  assert.equal(context.finishOroActiveNavigationBoot(1).reason, "session-changed");
  assert.deepEqual(context.calls, []);
  assert.equal(context.finishOroActiveNavigationBoot(2).status, "opened");
  assert.deepEqual(context.calls, ["aurum"]);
});

test("URL duplicati, non HTTPS, con credenziali o percorso diverso non avviano azioni", () => {
  for (const url of [
    "https://app.oroactive.it/?action=coins&action=gems",
    "http://app.oroactive.it/?action=coins",
    "https://name:secret@app.oroactive.it/?action=coins",
    "https://app.oroactive.it/other?action=coins",
    "https://app.oroactive.it/?action=users"
  ]) {
    const context = makeContext({ url });
    assert.deepEqual(context.calls, []);
    assert.equal(vm.runInContext("oroActiveNavigationState.pendingAction", context), "");
  }
});

test("Nuovo Atto riprende campi e modifica esistenti senza cancellazioni", () => {
  for (const existing of ["fields", "editing", "dirty"]) {
    const context = makeContext();
    if (existing === "fields") context.practiceData = "Dati cliente e foto già inseriti";
    if (existing === "editing") context.state.editingPracticeNumber = "2026/42";
    if (existing === "dirty") context.state.editingDirty = true;
    const result = context.window.OroActiveNavigation.openAction("new-act");
    assert.equal(result.status, "opened");
    assert.equal(result.resumed, true);
    assert.deepEqual(context.calls, ["practice"]);
    assert.match(context.toasts[0], /senza cancellare i dati/);
    if (existing === "fields") assert.equal(context.practiceData, "Dati cliente e foto già inseriti");
    if (existing === "editing") assert.equal(context.state.editingPracticeNumber, "2026/42");
    if (existing === "dirty") assert.equal(context.state.editingDirty, true);
  }
});

test("Aurum disabilitato come mascotte apre la pagina assistente", () => {
  const context = makeContext();
  context.mascotEnabled = false;
  const result = context.window.OroActiveNavigation.openAction("aurum");
  assert.equal(result.status, "opened");
  assert.equal(result.destination, "assistant");
  assert.deepEqual(context.calls, ["assistant"]);
  assert.equal(context.mascotEnabled, false);
});

test("un’azione nativa su app già aperta chiude l’immagine HD prima di mostrare Aurum", () => {
  const context = makeContext();
  context.setScreen("gemLab");
  context.zoomOpen = true;
  assert.equal(context.window.OroActiveNavigation.openAction("aurum").status, "opened");
  assert.equal(context.zoomOpen, false);
  assert.equal(context.aurumChatPanel.hidden, false);
});

test("permessi menu e rifiuto di setScreen rimangono vincolanti", () => {
  const context = makeContext();
  context.denied.add("quotazione");
  assert.deepEqual(plain(context.window.OroActiveNavigation.openAction("quote")), { status: "blocked", action: "quote", reason: "permissions" });
  assert.deepEqual(context.calls, []);
  context.blockedScreens.add("gemLab");
  assert.equal(context.window.OroActiveNavigation.openAction("gems").status, "blocked");
  assert.deepEqual(context.calls, []);
});

test("guardiani 800 e 1200 ms rispettano una destinazione aperta dopo login", () => {
  const context = makeContext();
  vm.runInContext(`${extractFunction("startBootWatchdog")}\n${extractFunction("schedulePostLoginMenuGuard")}`, context);
  context.startBootWatchdog();
  context.schedulePostLoginMenuGuard("login");
  context.window.OroActiveNavigation.openAction("coins");
  assert.deepEqual(context.timers.map((timer) => timer.delay).sort(), [1200, 800]);
  context.timers.forEach((timer) => timer.callback());
  assert.equal(context.recoveries, 0);
  assert.equal(context.document.getElementById("coinEncyclopedia").hidden, false);
});

test("guardiani riparano una schermata vuota e ignorano una sessione successiva", () => {
  for (const changedSession of [false, true]) {
    const context = makeContext();
    vm.runInContext(`${extractFunction("startBootWatchdog")}\n${extractFunction("schedulePostLoginMenuGuard")}`, context);
    context.mainMenuScreen.hidden = true;
    context.startBootWatchdog();
    context.schedulePostLoginMenuGuard("login");
    if (changedSession) context.state.sessionGeneration += 1;
    context.timers.forEach((timer) => timer.callback());
    assert.equal(context.recoveries, changedSession ? 0 : 1);
  }
});

test("integrazione boot consuma la destinazione solo dopo dati critici e mantiene il login normale", async () => {
  const context = makeContext({ ready: false });
  context.window.OroActiveNavigation.openAction("new-act");
  const stages = [];
  Object.assign(context, {
    startBootWatchdog() {}, ensureAuthenticatedUser() {}, resetSessionTimeout() {},
    localStorage: { getItem: () => "true" }, tutorialStorageKey: () => "tutorial",
    startMainMenuClock() {}, maybeShowInstallHint() {}, markBootStage() {},
    async loadCriticalUserDataSafely() { stages.push("critical"); assert.deepEqual(context.calls, []); },
    renderMainMenu() {}, startNonCriticalModulesSafely() { stages.push("modules"); },
    renderMainMenuRecoveryError() {}, showBootRecoveryPanel() {}
  });
  context.state.tutorial = {};
  vm.runInContext(extractFunction("bootAuthenticatedApp"), context);
  await context.bootAuthenticatedApp("login");
  assert.deepEqual(stages, ["critical", "modules"]);
  assert.deepEqual(context.calls, ["practice"]);
});

test("integrazione restore aspetta il completamento dello splash prima di aprire la destinazione", async () => {
  const context = makeContext({ ready: false, startupComplete: false, url: "https://app.oroactive.it/?action=quote" });
  const noop = () => {};
  Object.assign(context, {
    registerServiceWorker: noop, startAppVersionChecker: noop, removeLegacySearchMenu: noop,
    removeFooterBuildMetadata: noop, upgradeProvinceFields: noop, populateAutocompleteLists: noop,
    markAurumAvoidElements: noop, startMainMenuClock: noop, registerAppLifecycleListeners: noop,
    withSessionRestoreTimeout: (promise) => promise, loadStoredAuthToken: async () => true,
    showStartupSplash: noop, maybeShowInstallHint: noop, showStartupSplashError: (error) => { throw error; },
    async restoreSession() { context.finishOroActiveNavigationBoot(1); return true; },
    async completeStartupSplash(target) {
      assert.equal(target, "main");
      assert.deepEqual(context.calls, []);
      context.openMainMenuCleanly();
    }
  });
  vm.runInContext(extractFunction("initializeApp"), context);
  await context.initializeApp();
  assert.deepEqual(context.calls, ["menu", "quotazione"]);
  assert.equal(context.window.location.href, "https://app.oroactive.it/");
});
