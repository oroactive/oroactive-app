import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const file = (name) => readFile(new URL(name, root), "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} deve esistere`);
  const paramsStart = source.indexOf("(", start);
  let paramsDepth = 0;
  let paramsEnd = -1;
  for (let index = paramsStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") paramsDepth += 1;
    if (char === ")") paramsDepth -= 1;
    if (paramsDepth === 0) {
      paramsEnd = index;
      break;
    }
  }
  const bodyStart = source.indexOf("{", paramsEnd);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Impossibile estrarre ${name}`);
}

function makeElement(id, classNames = []) {
  const classes = new Set(classNames);
  return {
    id,
    hidden: false,
    style: {},
    dataset: {},
    removeAttribute(name) {
      if (name === "hidden") this.hidden = false;
    },
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      toggle: (name, force) => {
        const shouldAdd = force === undefined ? !classes.has(name) : Boolean(force);
        if (shouldAdd) classes.add(name);
        else classes.delete(name);
        return shouldAdd;
      },
      contains: (name) => classes.has(name)
    }
  };
}

function makeDomContext(app) {
  const mainMenuScreen = makeElement("mainMenuScreen", ["main-menu-screen"]);
  const appShell = makeElement("appShell", ["app-shell"]);
  const splashScreen = makeElement("splashScreen", ["splash-screen"]);
  const practice = makeElement("practice", ["screen"]);
  const archive = makeElement("archive", ["screen"]);
  const screens = [practice, archive];
  const bodyClasses = new Set(["main-menu-active", "authenticated"]);

  return {
    console,
    state: {},
    mainMenuScreen,
    appShell,
    splashScreen,
    screens,
    navItems: [],
    renderNavigationError: () => {},
    syncNotificationPlacement: () => {},
    getComputedStyle: (element) => ({ display: element.style.display || "block" }),
    document: {
      body: {
        classList: {
          add: (...names) => names.forEach((name) => bodyClasses.add(name)),
          remove: (...names) => names.forEach((name) => bodyClasses.delete(name)),
          contains: (name) => bodyClasses.has(name)
        }
      },
      getElementById(id) {
        return { mainMenuScreen, splashScreen, practice, archive }[id] || null;
      }
    },
    resolveSectionRoute(section = "") {
      return section === "giacenza" ? { screen: "fusion", fusionView: "stock" } : { screen: section };
    },
    __bodyClasses: bodyClasses,
    __appSource: app
  };
}

test("navigation manager apre Operatività → Nuovo atto di vendita su #practice", async () => {
  const app = await file("app.js");
  const openAppScreenSource = extractFunction(app, "openAppScreen");
  const context = makeDomContext(app);

  vm.runInNewContext(`${openAppScreenSource}; openAppScreen("practice", { source: "smoke" });`, context);

  assert.equal(context.mainMenuScreen.hidden, true);
  assert.equal(context.mainMenuScreen.style.display, "none");
  assert.equal(context.appShell.hidden, false);
  assert.equal(context.appShell.style.visibility, "visible");
  assert.equal(context.document.getElementById("practice").hidden, false);
  assert.equal(context.document.getElementById("practice").classList.contains("active-screen"), true);
  assert.equal(context.document.getElementById("archive").hidden, true);
  assert.equal(context.__bodyClasses.has("main-menu-active"), false);
  assert.equal(context.__bodyClasses.has("app-active"), true);
});

test("click su voce Nuovo atto di vendita apre il target practice", async () => {
  const app = await file("app.js");
  const bindHandlersSource = extractFunction(app, "bindGlobalNavigationHandlers");
  let openedSection = "";
  let clickHandler = null;
  const button = {
    getAttribute: (name) => (name === "data-menu-target" ? "practice" : null),
    closest: (selector) => (selector === "[data-menu-target]" ? button : null),
    textContent: "Nuovo atto di vendita"
  };
  const event = {
    defaultPrevented: false,
    target: button,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.stopped = true;
    }
  };
  const context = {
    console,
    window: {},
    document: {
      addEventListener(type, handler) {
        if (type === "click") clickHandler = handler;
      }
    },
    enterSectionFromMainMenu(section) {
      openedSection = section;
    },
    handleLogout() {},
    setScreen() {},
    returnToMainMenu() {}
  };

  vm.runInNewContext(`${bindHandlersSource}; bindGlobalNavigationHandlers();`, context);
  assert.equal(typeof clickHandler, "function");

  clickHandler(event);

  assert.equal(event.defaultPrevented, true);
  assert.equal(event.stopped, true);
  assert.equal(openedSection, "practice");
});

test("returnToMainMenu usa la shell menu e nasconde le sezioni interne", async () => {
  const app = await file("app.js");
  const showMainMenuSource = extractFunction(app, "showMainMenuNavigationShell");
  const context = makeDomContext(app);
  context.document.getElementById("practice").classList.add("active-screen");
  context.document.getElementById("practice").hidden = false;

  vm.runInNewContext(`${showMainMenuSource}; showMainMenuNavigationShell();`, context);

  assert.equal(context.mainMenuScreen.hidden, false);
  assert.equal(context.mainMenuScreen.style.display, "block");
  assert.equal(context.appShell.hidden, true);
  assert.equal(context.document.getElementById("practice").hidden, true);
  assert.equal(context.__bodyClasses.has("main-menu-active"), true);
  assert.equal(context.__bodyClasses.has("app-active"), false);
});

test("tutti i target principali del menu hanno una schermata o alias valido", async () => {
  const [app, index] = await Promise.all([file("app.js"), file("index.html")]);
  const ids = new Set([...index.matchAll(/<section[^>]+id="([^"]+)"/g)].map((match) => match[1]));
  const menuStart = app.indexOf("const MENU_GROUPS = [");
  const menuEnd = app.indexOf("const MAIN_MENU_SEARCH_SHORTCUTS", menuStart);
  const menuSource = app.slice(menuStart, menuEnd);
  const aliases = new Map([
    ["inventory", "fusion"],
    ["stock", "fusion"],
    ["giacenza", "fusion"],
    ["fusioni", "fusion"],
    ["melting", "fusion"],
    ["quotes", "quotazione"],
    ["academy", "training"]
  ]);
  const sections = new Set([...menuSource.matchAll(/section:\s*"([^"]+)"/g)].map((match) => match[1]));

  for (const section of sections) {
    const screenId = aliases.get(section) || section;
    assert.ok(ids.has(screenId), `Target menu senza schermata reale: ${section} → ${screenId}`);
  }

  assert.match(app, /const OROACTIVE_SCREEN_TARGETS = \{/);
  assert.match(app, /function openAppScreen\(screenId, options = \{\}\)/);
  assert.match(app, /function bindGlobalNavigationHandlers\(\)/);
  assert.match(app, /function returnToMainMenu\(\)/);
  assert.match(app, /function auditDeadNavigationButtons\(\)/);
  assert.match(app, /data-menu-target="\$\{escapeHtml\(item\.section\)\}"/);
  assert.match(app, /const target = button\.dataset\.menuTarget \|\| button\.dataset\.screenTarget \|\| button\.dataset\.section/);
});

test("boot renderizza il menu prima dei moduli secondari", async () => {
  const app = await file("app.js");
  const bootStart = app.indexOf("async function bootAuthenticatedApp");
  const showShell = app.indexOf("showMainMenuShell();", bootStart);
  const minimumMenu = app.indexOf("renderMainMenuMinimum();", bootStart);
  const modules = app.indexOf("startNonCriticalModulesSafely();", bootStart);

  assert.ok(bootStart !== -1);
  assert.ok(showShell > bootStart);
  assert.ok(minimumMenu > showShell);
  assert.ok(modules > minimumMenu);
});
