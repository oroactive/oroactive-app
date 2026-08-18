import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const serverSource = await readFile(path.join(repoRoot, "server.js"), "utf8");

function extractFunction(source, name) {
  const asyncStart = source.indexOf(`async function ${name}`);
  const start = asyncStart >= 0 ? asyncStart : source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `Funzione ${name} non trovata`);
  const bodyStart = source.indexOf(") {", start) + 2;
  assert.ok(bodyStart > 1, `Corpo della funzione ${name} non trovato`);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Funzione ${name} incompleta`);
}

test("lo scope cliente e atto usa ID-first e parametri legacy senza collisioni", async () => {
  const source = extractFunction(serverSource, "visibleClientWhere");
  const visibleClientWhere = new Function(
    "roleSeesAllStores",
    "storeForUser",
    "actsTable",
    `${source}; return visibleClientWhere;`
  )(
    (role) => ["founder", "supervisore"].includes(role),
    async (_user, db) => {
      assert.equal(db, "transaction-db");
      return { id: 42, nome: "Sede Centro" };
    },
    "atti_vendita"
  );

  const founderValues = ["RSSMRA80A01H501U"];
  assert.equal(await visibleClientWhere({ ruolo: "founder" }, founderValues, "c", "transaction-db"), "");
  assert.deepEqual(founderValues, ["RSSMRA80A01H501U"]);

  const values = [99, 7, "Nota"];
  const where = await visibleClientWhere({ ruolo: "responsabile", negozio_id: 42 }, values, "c", "transaction-db");
  assert.deepEqual(values, [99, 7, "Nota", 42, "Sede Centro"]);
  assert.match(where, /c\.negozio_id = \$4::bigint/);
  assert.match(where, /c\.negozio_id IS NULL[\s\S]*client_scope_act\.negozio_id = \$4::bigint/);
  assert.match(where, /client_scope_act\.negozio_id IS NULL[\s\S]*client_scope_act\.store = \$5::text/);
});

test("lookup cliente non carica payload o allegati di una sede non autorizzata", async () => {
  const source = extractFunction(serverSource, "getClientByFiscalCode");
  const calls = [];
  const actor = { id: 7, ruolo: "responsabile", negozio_id: 42 };
  const pool = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (calls.length === 1) return { rowCount: 0, rows: [] };
      if (calls.length === 2) return { rowCount: 1, rows: [{ id: 123 }] };
      throw new Error("Il lookup non deve proseguire dopo aver trovato un cliente di un'altra sede");
    }
  };
  const getClientByFiscalCode = new Function(
    "normalizeFiscalCode",
    "pool",
    "actsTable",
    "realCompletedStatusSql",
    "visibleClientWhere",
    "visibleStoreWhere",
    "rowToAct",
    "upsertClientFromAct",
    "lookupStoreForActor",
    "roleSeesAllStores",
    "singleCompletedActStoreForFiscalCode",
    `${source}; return getClientByFiscalCode;`
  )(
    (value) => String(value || "").trim().toUpperCase(),
    pool,
    "atti_vendita",
    () => "TRUE",
    async (user, values) => {
      assert.equal(user, actor);
      values.push(42, "Sede Centro");
      return " AND c.negozio_id = $2::bigint";
    },
    async () => {
      throw new Error("Non deve essere cercato alcun atto dopo il rifiuto del cliente");
    },
    (row) => row,
    async () => {
      throw new Error("Non deve essere creato o aggiornato alcun cliente");
    },
    async () => ({ id: 42, nome: "Sede Centro", codice: "CENTRO" }),
    () => false,
    async () => {
      throw new Error("La sede dell'atto non deve essere risolta per un utente assegnato");
    }
  );

  assert.equal(await getClientByFiscalCode("rssmra80a01h501u", actor), null);
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /SELECT c\.\* FROM clienti c/);
  assert.deepEqual(calls[0].values, ["RSSMRA80A01H501U", 42, "Sede Centro"]);
  assert.match(calls[1].sql, /^SELECT id FROM clienti/);
  assert.doesNotMatch(calls[1].sql, /payload|\*/i);
});

test("entrambe le rotte di lookup inoltrano l'attore autenticato", () => {
  const routesStart = serverSource.indexOf('app.get("/api/clienti/:codiceFiscale"');
  const routesEnd = serverSource.indexOf('app.get("/api/giacenza"', routesStart);
  assert.notEqual(routesStart, -1);
  assert.notEqual(routesEnd, -1);
  const routes = serverSource.slice(routesStart, routesEnd);
  assert.equal(
    routes.match(/getClientByFiscalCode\(request\.params\.codiceFiscale, request\.user, request\.query\.negozio_id \|\| ""\)/g)?.length,
    2
  );
});

test("una nota cross-store viene rifiutata dall'INSERT SELECT nella stessa transazione", async () => {
  const source = extractFunction(serverSource, "addClientNote");
  const queries = [];
  let auditCalls = 0;
  let transactionCalls = 0;
  const db = {
    async query(sql, values) {
      queries.push({ sql, values });
      if (queries.length === 1) return { rowCount: 0, rows: [] };
      return { rowCount: 1, rows: [{ id: 123 }] };
    }
  };
  const addClientNote = new Function(
    "withDatabaseTransaction",
    "visibleClientWhere",
    "writeAuditLog",
    `${source}; return addClientNote;`
  )(
    async (work) => {
      transactionCalls += 1;
      return work(db);
    },
    async (_user, values, alias, queryDb) => {
      assert.equal(alias, "c");
      assert.equal(queryDb, db);
      values.push(42, "Sede Centro");
      return " AND c.negozio_id = $4::bigint";
    },
    async () => {
      auditCalls += 1;
    }
  );

  await assert.rejects(
    addClientNote(123, { note: "Non consentita" }, { id: 7, ruolo: "responsabile", negozio_id: 42 }),
    (error) => error?.status === 403 && /Non autorizzato/.test(error.message)
  );
  assert.equal(transactionCalls, 1);
  assert.equal(auditCalls, 0);
  assert.equal(queries.length, 2);
  assert.match(queries[0].sql, /INSERT INTO client_notes[\s\S]*SELECT c\.id/);
  assert.deepEqual(queries[0].values, [123, 7, "Non consentita", 42, "Sede Centro"]);
  assert.match(queries[1].sql, /^SELECT 1 FROM clienti/);
});
