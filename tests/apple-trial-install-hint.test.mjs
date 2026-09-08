import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} deve esistere`);
  const body = app.indexOf("{", app.indexOf(")", start));
  let depth = 0;
  for (let index = body; index < app.length; index += 1) {
    if (app[index] === "{") depth += 1;
    if (app[index] === "}" && --depth === 0) return app.slice(start, index + 1);
  }
  throw new Error(`Funzione incompleta: ${name}`);
}

const source = ["isStandalonePwa", "isOroActiveAppleTrial", "isAppleTouchDevice", "maybeShowInstallHint"]
  .map(extractFunction).join("\n");
const ipadSafari = "Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1";
const desktopSafari = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15";

function evaluateHint(options = {}) {
  const navigator = {
    userAgent: options.userAgent || ipadSafari,
    platform: options.platform || "iPad",
    maxTouchPoints: options.maxTouchPoints ?? 5,
    standalone: options.standalone === true
  };
  const installHint = { hidden: options.initiallyHidden !== false };
  const context = {
    navigator,
    window: { navigator, matchMedia: () => ({ matches: options.displayModeStandalone === true }) },
    installHint,
    localStorage: { getItem: (key) => key === "oroactive-install-hint-dismissed" && options.dismissed ? "true" : null }
  };
  vm.runInNewContext(`${source}\nmaybeShowInstallHint();`, context);
  return installHint.hidden;
}

test("app Apple già installata non mostra il suggerimento PWA su iPad e iPhone", () => {
  for (const device of ["iPad", "iPhone"]) {
    const userAgent = `Mozilla/5.0 (${device}; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 OroActiveTrial/1.0`;
    assert.equal(evaluateHint({ userAgent, platform: device }), true);
    assert.equal(evaluateHint({ userAgent, platform: device, initiallyHidden: false }), true);
  }
});

test("Safari iPad e iPhone continuano a proporre l’installazione PWA", () => {
  assert.equal(evaluateHint(), false);
  assert.equal(evaluateHint({ userAgent: ipadSafari.replace("iPad", "iPhone"), platform: "iPhone" }), false);
});

test("Safari iPad in modalità desktop conserva il suggerimento grazie al touch", () => {
  assert.equal(evaluateHint({ userAgent: desktopSafari, platform: "MacIntel", maxTouchPoints: 5 }), false);
  assert.equal(evaluateHint({ userAgent: desktopSafari, platform: "MacIntel", maxTouchPoints: 0 }), true);
});

test("PWA standalone e suggerimento già ignorato restano nascosti", () => {
  assert.equal(evaluateHint({ standalone: true }), true);
  assert.equal(evaluateHint({ displayModeStandalone: true }), true);
  assert.equal(evaluateHint({ dismissed: true }), true);
});

test("il riconoscimento Apple Prova richiede il token completo e non altera altri browser", () => {
  assert.equal(evaluateHint({ userAgent: `${ipadSafari} NotOroActiveTrial/1.0` }), false);
  assert.equal(evaluateHint({ userAgent: `${ipadSafari} OroActiveTrial/1.0.1` }), true);
});
