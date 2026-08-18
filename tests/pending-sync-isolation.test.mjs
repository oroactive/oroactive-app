import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const start = appSource.indexOf('const PENDING_SYNC_LEGACY_KEY = "oroactive-pending-sync"');
const end = appSource.indexOf("async function saveActRecord", start);
assert.ok(start >= 0 && end > start, "Blocco coda offline non trovato");

function createHarness() {
  const storage = new Map();
  const apiCalls = [];
  const state = {
    currentUser: null,
    pendingSync: [],
    syncingPending: false,
    authToken: "token",
    sessionGeneration: 1
  };
  let apiImplementation = async (path, options) => {
    apiCalls.push({ path, options });
    return {};
  };
  const context = vm.createContext({
    state,
    navigator: { onLine: true },
    console,
    Date,
    JSON,
    Promise,
    setTimeout,
    clearTimeout,
    userSeesAllStores(user) {
      return ["founder", "supervisore"].includes(String(user?.ruolo || "").toLowerCase());
    },
    async loadDeviceStorage(key) {
      return storage.get(key) || "";
    },
    async saveDeviceStorage(key, value) {
      if (value) storage.set(key, value);
      else storage.delete(key);
    },
    async apiRequest(path, options) {
      return apiImplementation(path, options);
    },
    sanitizeForSave(value) {
      return value;
    },
    mergeActsIntoCache() {}
  });
  vm.runInContext(`${appSource.slice(start, end)}\nthis.pendingSyncApi = { persistPendingSync, loadPendingSyncQueue, flushPendingSync };`, context);
  return {
    state,
    storage,
    apiCalls,
    api: context.pendingSyncApi,
    setApiImplementation(fn) {
      apiImplementation = fn;
    }
  };
}

test("la coda offline resta separata per utente e sede su dispositivo condiviso", async () => {
  const harness = createHarness();
  const userA = { id: 10, ruolo: "commesso", negozio_id: 1 };
  const userB = { id: 20, ruolo: "commesso", negozio_id: 2 };

  harness.state.currentUser = userA;
  harness.state.pendingSync = [{
    id: "pending-a",
    method: "POST",
    act: { practiceNumber: "A-1" },
    owner_user_id: "10",
    owner_store_id: "1"
  }];
  harness.api.persistPendingSync();

  harness.state.currentUser = userB;
  await harness.api.loadPendingSyncQueue();
  assert.deepEqual(harness.state.pendingSync, []);
  await harness.api.flushPendingSync();
  assert.equal(harness.apiCalls.length, 0);

  harness.state.currentUser = userA;
  await harness.api.loadPendingSyncQueue();
  assert.equal(harness.state.pendingSync.length, 1);
  assert.equal(harness.state.pendingSync[0].act.practiceNumber, "A-1");
});

test("un flush iniziato da A non può sovrascrivere la coda di B dopo il login", async () => {
  const harness = createHarness();
  let releaseRequest;
  harness.setApiImplementation((path, options) => {
    harness.apiCalls.push({ path, options });
    return new Promise((resolve) => {
      releaseRequest = resolve;
    });
  });
  harness.state.currentUser = { id: 10, ruolo: "commesso", negozio_id: 1 };
  harness.state.pendingSync = [{
    id: "pending-a",
    method: "POST",
    act: { practiceNumber: "A-1" },
    owner_user_id: "10",
    owner_store_id: "1"
  }];
  harness.api.persistPendingSync();

  const flushA = harness.api.flushPendingSync();
  await Promise.resolve();
  harness.state.sessionGeneration = 2;
  harness.state.currentUser = { id: 20, ruolo: "commesso", negozio_id: 2 };
  harness.state.pendingSync = [{
    id: "pending-b",
    method: "POST",
    act: { practiceNumber: "B-1" },
    owner_user_id: "20",
    owner_store_id: "2"
  }];
  releaseRequest({});
  await flushA;

  assert.equal(harness.state.pendingSync[0]?.act.practiceNumber, "B-1");
  assert.equal(harness.storage.has("oroactive-pending-sync:user:20"), false);
  assert.equal(JSON.parse(harness.storage.get("oroactive-pending-sync:user:10") || "[]").length, 0);
});

test("la vecchia coda senza proprietario viene messa in quarantena e mai inviata", async () => {
  const harness = createHarness();
  harness.storage.set("oroactive-pending-sync", JSON.stringify([{ method: "POST", act: { practiceNumber: "LEGACY-1" } }]));
  harness.state.currentUser = { id: 20, ruolo: "commesso", negozio_id: 2 };

  await harness.api.loadPendingSyncQueue();
  await harness.api.flushPendingSync();

  assert.deepEqual(harness.state.pendingSync, []);
  assert.equal(harness.apiCalls.length, 0);
  assert.equal(harness.storage.has("oroactive-pending-sync"), false);
  const quarantine = JSON.parse(harness.storage.get("oroactive-pending-sync-quarantine") || "[]");
  assert.equal(quarantine[0]?.quarantine_reason, "legacy_owner_unknown");
});
