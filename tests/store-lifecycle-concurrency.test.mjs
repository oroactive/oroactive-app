import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import pg from "pg";

const [schema, migration, server] = await Promise.all([
  readFile(new URL("../schema.sql", import.meta.url), "utf8"),
  readFile(new URL("../migrations/20260730_store_soft_delete.sql", import.meta.url), "utf8"),
  readFile(new URL("../server.js", import.meta.url), "utf8")
]);

function blockBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `Blocco non trovato: ${startMarker}`);
  return source.slice(start, end);
}

const schemaGuard = blockBetween(
  schema,
  "CREATE OR REPLACE FUNCTION oroactive_require_active_store()",
  "\nDO $$"
);

test("il guard comune prende FOR SHARE e rifiuta anche le sedi disattivate", () => {
  for (const source of [schemaGuard, migration]) {
    assert.match(source, /deleted_at IS NULL\s+AND COALESCE\(attivo, TRUE\) = TRUE[\s\S]{0,320}FOR SHARE/);
    assert.doesNotMatch(source, /FOR KEY SHARE/);
  }
  for (const trigger of [
    "utenti_active_store_guard",
    "atti_vendita_active_store_guard",
    "fusion_lots_active_store_guard",
    "approval_requests_active_store_guard"
  ]) {
    assert.match(schemaGuard, new RegExp(`CREATE TRIGGER ${trigger}`));
  }
});

test("entrambi i gate sede bloccano la riga prima dei conteggi dipendenti", () => {
  const updateStore = blockBetween(server, "async function updateStore", "async function deleteStore");
  const deleteStore = blockBetween(server, "async function deleteStore", "async function visibleStoreWhere");

  for (const gate of [updateStore, deleteStore]) {
    const rowLock = gate.indexOf("FOR UPDATE");
    const firstDependentCount = gate.search(/SELECT COUNT\(\*\)::int AS count FROM utenti|SELECT COUNT\(\*\)::int AS count\s+FROM utenti/);
    assert.ok(rowLock >= 0, "manca il lock esclusivo della sede");
    assert.ok(firstDependentCount > rowLock, "i conteggi devono avvenire dopo il lock della sede");
  }
});

const integrationDatabaseUrl = process.env.OROACTIVE_STORE_LOCK_TEST_DATABASE_URL || "";

if (integrationDatabaseUrl) {
  test("PostgreSQL serializza disattivazione e writer nei due ordini", async () => {
    const { Client } = pg;
    const gate = new Client({ connectionString: integrationDatabaseUrl });
    const writer = new Client({ connectionString: integrationDatabaseUrl });
    const schemaName = `oroactive_store_lock_${process.pid}_${Date.now()}`;
    const quotedSchema = `"${schemaName}"`;
    const writers = [
      { table: "utenti", storeColumn: "negozio_id", insert: "INSERT INTO utenti (negozio_id, attivo) VALUES (1, TRUE)" },
      { table: "atti_vendita", storeColumn: "negozio_id", insert: "INSERT INTO atti_vendita (negozio_id) VALUES (1)" },
      { table: "fusion_lots", storeColumn: "negozio_id", insert: "INSERT INTO fusion_lots (negozio_id) VALUES (1)" },
      { table: "approval_requests", storeColumn: "store_id", insert: "INSERT INTO approval_requests (store_id) VALUES (1)" }
    ];

    function tracked(queryPromise) {
      let settled = false;
      const promise = queryPromise.then(
        (value) => {
          settled = true;
          return value;
        },
        (error) => {
          settled = true;
          throw error;
        }
      );
      return { promise, isSettled: () => settled };
    }

    async function assertStillWaiting(pending, label) {
      await new Promise((resolve) => setTimeout(resolve, 80));
      assert.equal(pending.isSettled(), false, label);
    }

    await gate.connect();
    await writer.connect();
    try {
      await gate.query(`CREATE SCHEMA ${quotedSchema}`);
      for (const client of [gate, writer]) {
        await client.query(`SET search_path TO ${quotedSchema}`);
      }
      await gate.query(`
        CREATE TABLE negozi (id BIGINT PRIMARY KEY, attivo BOOLEAN DEFAULT TRUE, deleted_at TIMESTAMPTZ);
        CREATE TABLE utenti (id BIGSERIAL PRIMARY KEY, negozio_id BIGINT, attivo BOOLEAN DEFAULT TRUE);
        CREATE TABLE atti_vendita (id BIGSERIAL PRIMARY KEY, negozio_id BIGINT);
        CREATE TABLE fusion_lots (id BIGSERIAL PRIMARY KEY, negozio_id BIGINT);
        CREATE TABLE approval_requests (id BIGSERIAL PRIMARY KEY, store_id BIGINT);
        INSERT INTO negozi (id, attivo) VALUES (1, TRUE);
      `);
      await gate.query(schemaGuard);

      for (const currentWriter of writers) {
        await gate.query(`TRUNCATE utenti, atti_vendita, fusion_lots, approval_requests RESTART IDENTITY`);
        await gate.query("UPDATE negozi SET attivo = TRUE, deleted_at = NULL WHERE id = 1");

        // Ordine 1: la disattivazione è già in corso. FOR SHARE deve attendere
        // il suo UPDATE e poi respingere il writer sulla versione inattiva.
        await gate.query("BEGIN");
        await gate.query("SET LOCAL lock_timeout = '2s'");
        await gate.query("UPDATE negozi SET attivo = FALSE WHERE id = 1");
        await writer.query("BEGIN");
        await writer.query("SET LOCAL lock_timeout = '2s'");
        const insertAfterGate = tracked(writer.query(currentWriter.insert));
        await assertStillWaiting(insertAfterGate, `${currentWriter.table}: il writer non ha atteso la disattivazione`);
        await gate.query("COMMIT");
        await assert.rejects(
          insertAfterGate.promise,
          (error) => error?.code === "23503" && error?.constraint === "oroactive_active_store_required"
        );
        await writer.query("ROLLBACK");

        // Ordine 2: il writer detiene già FOR SHARE. Il gate FOR UPDATE attende
        // il commit, quindi il conteggio successivo vede la nuova dipendenza.
        await gate.query("UPDATE negozi SET attivo = TRUE WHERE id = 1");
        await writer.query("BEGIN");
        await writer.query("SET LOCAL lock_timeout = '2s'");
        await writer.query(currentWriter.insert);
        await gate.query("BEGIN");
        await gate.query("SET LOCAL lock_timeout = '2s'");
        const gateRowLock = tracked(gate.query("SELECT id FROM negozi WHERE id = 1 FOR UPDATE"));
        await assertStillWaiting(gateRowLock, `${currentWriter.table}: il gate non ha atteso il writer`);
        await writer.query("COMMIT");
        await gateRowLock.promise;
        const dependent = await gate.query(`SELECT COUNT(*)::int AS count FROM ${currentWriter.table} WHERE ${currentWriter.storeColumn} = 1`);
        assert.equal(dependent.rows[0]?.count, 1, `${currentWriter.table}: il gate non vede il writer committato`);
        await gate.query("ROLLBACK");
      }
    } finally {
      await gate.query("ROLLBACK").catch(() => {});
      await writer.query("ROLLBACK").catch(() => {});
      await gate.query(`DROP SCHEMA IF EXISTS ${quotedSchema} CASCADE`).catch(() => {});
      await gate.end().catch(() => {});
      await writer.end().catch(() => {});
    }
  });
}
