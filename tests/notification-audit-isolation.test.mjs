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

const normalizeRole = new Function(
  `${extractFunction(serverSource, "normalizeRole")}; return normalizeRole;`
)();

const addNotificationVisibilityWhere = new Function(
  "normalizeRole",
  `${extractFunction(serverSource, "addNotificationVisibilityWhere")}; return addNotificationVisibilityWhere;`
)(normalizeRole);

const addAuditVisibilityWhere = new Function(
  "normalizeRole",
  `${extractFunction(serverSource, "addAuditVisibilityWhere")}; return addAuditVisibilityWhere;`
)(normalizeRole);

test("le notifiche legacy operative richiedono ruolo e ID della stessa sede", () => {
  for (const role of ["responsabile", "commesso", "aiuto_commesso"]) {
    const where = [];
    const values = [];
    addNotificationVisibilityWhere({ id: 31, ruolo: role, negozio_id: 17 }, where, values, "n");

    assert.deepEqual(values, [31, 17, role]);
    assert.equal(where.length, 2);
    assert.match(where[0], /^\(n\.user_id = \$1::bigint OR /);
    assert.match(
      where[0],
      /n\.user_id IS NULL AND n\.store_id = \$2::bigint AND LOWER\(COALESCE\(n\.target_role, ''\)\) = \$3::text/
    );
    assert.equal(where[0].match(/n\.user_id IS NULL/g)?.length, 1);
  }
});

test("senza un ID sede valido il fallback legacy operativo resta chiuso", () => {
  for (const actor of [
    { id: 31, ruolo: "responsabile", negozio_id: null },
    { id: 31, ruolo: "commesso", negozio_id: "" },
    { id: 31, ruolo: "aiuto_commesso", negozio_id: "altra-sede" },
    { id: 31, ruolo: "ruolo_sconosciuto", negozio_id: 17 }
  ]) {
    const where = [];
    const values = [];
    addNotificationVisibilityWhere(actor, where, values, "n");

    assert.deepEqual(values, [31]);
    assert.equal(where[0], "(n.user_id = $1::bigint)");
    assert.doesNotMatch(where[0], /target_role|store_id|severity/);
  }
});

test("Founder e Supervisore mantengono solo i fallback legacy previsti dalla policy", () => {
  const founderWhere = [];
  const founderValues = [];
  addNotificationVisibilityWhere({ id: 1, ruolo: "founder" }, founderWhere, founderValues, "n");
  assert.deepEqual(founderValues, [1]);
  assert.equal(
    founderWhere[0],
    "(n.user_id = $1::bigint OR (n.user_id IS NULL AND (LOWER(COALESCE(n.target_role, '')) = 'founder' OR n.severity = 'critical')))"
  );

  const supervisorWhere = [];
  const supervisorValues = [];
  addNotificationVisibilityWhere({ id: 2, ruolo: "supervisore" }, supervisorWhere, supervisorValues, "n");
  assert.deepEqual(supervisorValues, [2]);
  assert.equal(
    supervisorWhere[0],
    "(n.user_id = $1::bigint OR (n.user_id IS NULL AND LOWER(COALESCE(n.target_role, '')) = 'supervisore'))"
  );
});

function userActivityHarness({ actor, target = { id: 55 }, canView = true } = {}) {
  const queries = [];
  const listUserActivitiesForActor = new Function(
    "findUserRawById",
    "canViewUserActivity",
    "addAuditVisibilityWhere",
    "pool",
    "publicAuditLog",
    `${extractFunction(serverSource, "listUserActivitiesForActor")}; return listUserActivitiesForActor;`
  )(
    async () => target,
    () => canView,
    addAuditVisibilityWhere,
    {
      async query(sql, values) {
        queries.push({ sql, values });
        return { rows: [] };
      }
    },
    (row) => row
  );
  return {
    queries,
    run: () => listUserActivitiesForActor(target.id, actor)
  };
}

test("la cronologia vista dal Responsabile applica anche ruolo e sede alle righe audit", async () => {
  const harness = userActivityHarness({
    actor: { id: 7, ruolo: "responsabile", negozio_id: 9, negozio: "Sede Nove" }
  });
  await harness.run();

  assert.equal(harness.queries.length, 1);
  const [{ sql, values }] = harness.queries;
  assert.deepEqual(values, [55, "55", ["commesso", "aiuto_commesso"], 7, 9, "Sede Nove"]);
  assert.match(
    sql,
    /WHERE \(al\.user_id = \$1::bigint[\s\S]*metadata->>'target_user_id'\) = \$2::text\)\s+AND \(al\.user_id = \$4::bigint/
  );
  assert.match(sql, /al\.store_id = \$5::bigint/);
  assert.match(sql, /al\.store_id IS NULL AND al\.store_name = \$6::text/);
  assert.match(sql, /COALESCE\(al\.user_role, ''\) = ANY\(\$3::text\[\]\)/);
});

test("la cronologia preserva le policy audit di Founder e Supervisore", async () => {
  const founder = userActivityHarness({ actor: { id: 1, ruolo: "founder" } });
  await founder.run();
  assert.deepEqual(founder.queries[0].values, [55, "55"]);
  assert.doesNotMatch(founder.queries[0].sql, /user_role|store_id/);

  const supervisor = userActivityHarness({ actor: { id: 2, ruolo: "supervisore" } });
  await supervisor.run();
  assert.deepEqual(supervisor.queries[0].values, [55, "55"]);
  assert.match(supervisor.queries[0].sql, /COALESCE\(al\.user_role, ''\) <> 'founder'/);
  assert.doesNotMatch(supervisor.queries[0].sql, /al\.store_id =/);
});

test("un operatore vede nella propria cronologia solo audit attribuiti a se stesso", async () => {
  for (const role of ["commesso", "aiuto_commesso"]) {
    const harness = userActivityHarness({ actor: { id: 55, ruolo: role, negozio_id: 9 } });
    await harness.run();
    assert.deepEqual(harness.queries[0].values, [55, "55", 55]);
    assert.match(harness.queries[0].sql, /\)\s+AND al\.user_id = \$3::bigint/);
    assert.doesNotMatch(harness.queries[0].sql, /al\.store_id =/);
  }
});
