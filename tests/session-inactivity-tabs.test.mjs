import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
const start = source.includes("function sessionActivityStorageKey(")
  ? source.indexOf("function sessionActivityStorageKey(")
  : source.indexOf("function resetSessionTimeout(");
const timeoutCode = source.slice(start, source.indexOf("function queryString(", start));
const idleLimit = 30 * 60 * 1000;

function browserTab(clock, storage, { token = "header.same-session.signature", practice = false, blocked = false } = {}) {
  const calls = { logout: 0, save: 0, login: 0, delay: null };
  const state = { authToken: token, expiringSession: false };
  const context = vm.createContext({
    state,
    Date: { now: () => clock.now },
    localStorage: {
      getItem(key) { if (blocked) throw Error("Storage unavailable"); return storage.get(key) ?? null; },
      setItem(key, value) { if (blocked) throw Error("Storage unavailable"); storage.set(key, value); }
    },
    window: { clearTimeout() {}, setTimeout(callback, delay) { calls.delay = delay; return 1; } },
    document: { getElementById: () => ({ classList: { contains: () => practice } }) },
    isPracticeFormEmpty: () => !practice,
    showToast() {},
    archiveCurrentPractice: async () => { calls.save++; return true; },
    apiRequest: async path => { assert.equal(path, "/auth/logout"); calls.logout++; },
    showLogin() { calls.login++; state.authToken = ""; }
  });
  vm.runInContext(timeoutCode, context);
  return { context, calls, state };
}

test("an idle tab cannot autosave or log out a session still used in another tab", async () => {
  const clock = { now: 1_000_000 }, storage = new Map();
  const oldTab = browserTab(clock, storage, { practice: true });
  const activeTab = browserTab(clock, storage);
  oldTab.context.resetSessionTimeout();
  clock.now += idleLimit - 60_000;
  activeTab.context.resetSessionTimeout();
  clock.now += 60_000;
  await oldTab.context.expireSessionForInactivity();
  assert.equal(oldTab.calls.save, 0, "background drafts must stay untouched while the session is active");
  assert.equal(oldTab.calls.logout, 0);
  assert.equal(oldTab.calls.login, 0);
  assert.equal(oldTab.calls.delay, idleLimit - 60_000);
  assert.ok(oldTab.state.authToken);
});

test("the 30 minute limit still expires after the last activity in all tabs", async () => {
  const clock = { now: 1_000_000 }, storage = new Map();
  const oldTab = browserTab(clock, storage, { practice: true });
  const activeTab = browserTab(clock, storage);
  oldTab.context.resetSessionTimeout();
  clock.now += idleLimit - 60_000;
  activeTab.context.resetSessionTimeout();
  clock.now += idleLimit;
  await oldTab.context.expireSessionForInactivity();
  assert.equal(oldTab.calls.save, 1);
  assert.equal(oldTab.calls.logout, 1);
  assert.equal(oldTab.calls.login, 1);
});

test("activity from a different login session cannot extend an old session", async () => {
  const clock = { now: 1_000_000 }, storage = new Map();
  const oldTab = browserTab(clock, storage);
  const other = browserTab(clock, storage, { token: "header.other-session.signature" });
  oldTab.context.resetSessionTimeout();
  clock.now += idleLimit - 1;
  other.context.resetSessionTimeout();
  clock.now++;
  await oldTab.context.expireSessionForInactivity();
  assert.equal(oldTab.calls.logout, 1);
});

test("restricted browser storage retains the local inactivity deadline", async () => {
  const clock = { now: 1_000_000 }, tab = browserTab(clock, new Map(), { blocked: true });
  tab.context.resetSessionTimeout();
  clock.now += idleLimit - 1;
  await tab.context.expireSessionForInactivity();
  assert.equal(tab.calls.logout, 0);
  clock.now++;
  await tab.context.expireSessionForInactivity();
  assert.equal(tab.calls.logout, 1);
});

test("a callback left after logout cannot save a form or log out again", async () => {
  const clock = { now: 1_000_000 }, tab = browserTab(clock, new Map(), { practice: true });
  tab.context.resetSessionTimeout();
  tab.state.authToken = "";
  clock.now += idleLimit;
  await tab.context.expireSessionForInactivity();
  assert.equal(tab.calls.save, 0);
  assert.equal(tab.calls.logout, 0);
});

test("shared activity metadata never stores a bearer credential", () => {
  const clock = { now: 1_000_000 }, storage = new Map();
  const token = "public-header.public-session.secret-signature";
  const tab = browserTab(clock, storage, { token });
  tab.context.resetSessionTimeout();
  assert.ok(storage.size > 0);
  assert.ok([...storage].every(([key, value]) => !key.includes(token) && !value.includes(token) && !key.includes("secret-signature")));
});

test("invalid or future shared timestamps cannot keep an idle session alive", async () => {
  for (const value of ["not a timestamp", "Infinity", "999999999999999"]) {
    const clock = { now: 1_000_000 }, storage = new Map();
    const tab = browserTab(clock, storage);
    tab.context.resetSessionTimeout();
    for (const key of storage.keys()) storage.set(key, value);
    clock.now += idleLimit;
    await tab.context.expireSessionForInactivity();
    assert.equal(tab.calls.logout, 1);
  }
});
