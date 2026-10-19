import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [server, schema, migration] = await Promise.all([
  readFile(path.join(repoRoot, "server.js"), "utf8"),
  readFile(path.join(repoRoot, "schema.sql"), "utf8"),
  readFile(path.join(repoRoot, "migrations/20260818_crm_store_isolation.sql"), "utf8")
]);

function sourceBlock(startMarker, endMarker) {
  const start = server.indexOf(startMarker);
  const end = server.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `Blocco mancante: ${startMarker}`);
  assert.notEqual(end, -1, `Fine blocco mancante: ${endMarker}`);
  return server.slice(start, end);
}

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

test("il profilo CRM è univoco per codice fiscale e sede, inclusa la migrazione dati", () => {
  for (const sql of [schema, migration]) {
    assert.match(sql, /DROP CONSTRAINT IF EXISTS clienti_codice_fiscale_key/);
    assert.match(sql, /DROP INDEX IF EXISTS clienti_codice_fiscale_unique/);
    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS clienti_codice_fiscale_store_unique[\s\S]*UPPER\(codice_fiscale\), negozio_id/);
    assert.match(sql, /UPDATE atti_vendita a[\s\S]*SET cliente_id = c\.id[\s\S]*c\.negozio_id = a\.negozio_id/);
    assert.match(sql, /client_notes_cliente_fk/);
    assert.match(sql, /client_tags_cliente_fk/);
    assert.match(sql, /client_reminders_cliente_fk/);
    assert.match(sql, /client_communications_cliente_fk/);
    const migrationMarkers = sql.match(/migration_key = '20260818_crm_store_isolation_v2'/g) || [];
    assert.ok(migrationMarkers.length >= 3, "snapshot e backfill CRM devono essere protetti dal marker one-shot");
    const ownerRanking = sql.match(/WITH ranked_owner AS \([\s\S]*?\)\nUPDATE clienti c/)?.[0] || "";
    const actRanking = sql.match(/WITH ranked_acts AS \([\s\S]*?\), latest_store_acts AS/)?.[0] || "";
    for (const ranking of [ownerRanking, actRanking]) {
      assert.match(ranking, /COALESCE\(a\.status, ''\) ILIKE 'completed'/);
      assert.match(ranking, /COALESCE\(a\.status, ''\) ILIKE 'archived_completed'/);
      assert.doesNotMatch(ranking, /NOT ILIKE 'deleted'/);
    }
    assert.match(sql, /UPDATE atti_vendita a\s+SET cliente_id = NULL\s+FROM clienti c[\s\S]*a\.negozio_id IS DISTINCT FROM c\.negozio_id/);
  }
  assert.doesNotMatch(schema, /codice_fiscale TEXT UNIQUE/);
});

test("l'upsert cliente seleziona e aggiorna soltanto il profilo della stessa sede", () => {
  const block = sourceBlock("async function upsertClientFromAct", "async function getClientByFiscalCode");
  assert.match(block, /negozio_id IS NOT DISTINCT FROM \$2::bigint/);
  assert.match(block, /\[fiscalCode, storeId\]/);
  assert.doesNotMatch(block, /SELECT id FROM clienti WHERE UPPER\(codice_fiscale\) = \$1::text LIMIT 1 FOR UPDATE/);
  assert.match(block, /negozio_id = COALESCE\(\$7::bigint, negozio_id\)/);
});

test("lista e dettaglio CRM non riassociano un profilo agli atti di un'altra sede", () => {
  const listBlock = sourceBlock("async function crmClients", "async function crmClientDetail");
  const detailBlock = sourceBlock("async function crmClientDetail", "async function addClientNote");
  assert.match(listBlock, /visibleClientWhere\(user, values, "c"/);
  assert.match(listBlock, /a\.negozio_id IS NOT DISTINCT FROM c\.negozio_id/);
  assert.match(detailBlock, /visibleClientWhere\(user, clientValues, "c"/);
  assert.match(detailBlock, /a\.cliente_id = \$1::bigint/);
  assert.ok(detailBlock.indexOf("visibleClientWhere") < detailBlock.indexOf("SELECT c.*"));
});

test("il Trust Pack risolve il cliente solo nella sede dell'atto", () => {
  const block = sourceBlock("async function customerTrustPackClientForAct", "function customerTrustPackEligibilityError");
  assert.match(block, /c\.id = \$1::bigint[\s\S]*\$2::text = '' OR UPPER\(c\.codice_fiscale\) = \$2::text/);
  assert.match(block, /c\.negozio_id = \$3::bigint/);
  assert.match(block, /\$3::bigint IS NULL[\s\S]*c\.negozio_id IS NULL/);
  assert.match(block, /legacy_act\.negozio_id IS NULL[\s\S]*legacy_act\.store = \$4::text/);
  assert.doesNotMatch(block, /ORDER BY/);
});

test("una sede dinamica usa il codice DB prima di cercare o riscrivere l'atto", async () => {
  const source = extractFunction(server, "enforceActStore");
  const enforceActStore = new Function(
    "roleSeesAllStores",
    "storeForUser",
    `${source}; return enforceActStore;`
  )(
    () => false,
    async () => ({ id: 9, nome: "Milano Centro", codice: "MILANO" })
  );
  const result = await enforceActStore(
    { practiceNumber: "OA-MILANO-2026-000001", store: "Milano Centro" },
    { ruolo: "responsabile", negozio_id: 9, negozio: "Nome storico" }
  );
  assert.equal(result.practiceNumber, "OA-MILANO-2026-000001");
  assert.equal(result.storeCode, "MILANO");
  assert.equal(result.store, "Milano Centro");

  const saveBlock = sourceBlock("async function saveAct", "async function updateAct");
  assert.match(saveBlock, /const protectedInput = await enforceActStore\(input, user\)/);
  assert.ok(saveBlock.indexOf("await enforceActStore") < saveBlock.indexOf("findExisting"));
});

test("updateUser rifiuta una password breve prima di hash e UPDATE", () => {
  const block = sourceBlock("async function updateUser", "async function listUsers");
  const validation = block.indexOf("La password deve avere almeno 8 caratteri");
  const hash = block.indexOf("bcrypt.hash");
  const update = block.indexOf("UPDATE utenti SET");
  assert.ok(validation >= 0);
  assert.ok(hash > validation);
  assert.ok(update > validation);
  assert.match(block.slice(0, hash), /input\.password !== undefined[\s\S]*password\.length > 0[\s\S]*password\.length < 8/);
});

test("produzione rifiuta placeholder segreti e il bootstrap non ruota la password Founder", () => {
  assert.match(server, /assertProductionSecret\("JWT_SECRET", configuredJwtSecret, 32\)/);
  assert.match(server, /assertProductionSecret\("POSTGRES_PASSWORD", configuredDatabasePassword\(\), 12\)/);
  const bootstrap = sourceBlock("async function bootstrapAdminUser", "async function storeByCodeOrName");
  assert.match(bootstrap, /withDatabaseTransaction[\s\S]*pg_advisory_xact_lock/);
  assert.match(bootstrap, /LOWER\(TRIM\(ruolo\)\) = 'founder'[\s\S]*if \(founders\.rowCount\) \{\s*return;[\s\S]*const password = process\.env\.ADMIN_PASSWORD/);
  assert.match(bootstrap, /Identità Founder configurata già assegnata a un utente non Founder/);
  assert.match(bootstrap, /ADMIN_PASSWORD obbligatoria per creare il primo account Founder/);
  assert.match(bootstrap, /assertProductionSecret\("ADMIN_PASSWORD", password, 8\)/);
  assert.match(server, /inserisci\|placeholder\|example/);

  const existingBranch = bootstrap.slice(bootstrap.indexOf("const founders"), bootstrap.indexOf("const password ="));
  assert.doesNotMatch(existingBranch, /bcrypt\.(?:compare|hash)/);
  assert.doesNotMatch(existingBranch, /password_hash\s*=/);
  assert.match(bootstrap.slice(bootstrap.indexOf("const passwordHash")), /bcrypt\.hash\(password, 12\)/);
});

test("l'approvazione è vincolata all'impronta dei dati decisionali", () => {
  assert.match(schema, /ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS decision_fingerprint TEXT/);
  const hardeningMigration = path.join(repoRoot, "migrations/20260818_security_reliability_hardening.sql");
  return readFile(hardeningMigration, "utf8").then((hardening) => {
    assert.match(hardening, /ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS decision_fingerprint TEXT/);
    const helperSource = [
      "approvalFingerprintText",
      "approvalFingerprintNumber",
      "approvalFingerprintDigest",
      "approvalFingerprintAttachment",
      "approvalDecisionSnapshot",
      "approvalDecisionFingerprint"
    ].map((name) => extractFunction(server, name)).join("\n");
    const fingerprint = new Function(
      "crypto",
      "normalizeFiscalCode",
      `${helperSource}; return approvalDecisionFingerprint;`
    )(crypto, (value) => String(value || "").replace(/\s+/g, "").toUpperCase());
    const base = {
      fiscalCode: "RSSMRA80A01H501U",
      name: "Mario",
      surname: "Rossi",
      amount: 900,
      weight: 20,
      paymentMethod: "Bonifico",
      iban: "IT60X0542811101000000123456",
      negozioId: 42,
      materials: [
        { metal: "Oro", title: "18 kt", weight: 12 },
        { metal: "Argento", title: "925", weight: 8 }
      ],
      address: "Via Roma 1",
      documentIssueDate: "2024-01-10",
      captureAttachments: [{ key: "document-front", type: "image/jpeg", dataUrl: "data:image/jpeg;base64,Zm90by1h" }],
      signatureImages: ["data:image/png;base64,ZmlybWEtYQ=="]
    };
    assert.equal(fingerprint(base), fingerprint({ ...base, materials: [...base.materials].reverse() }));
    assert.notEqual(fingerprint(base), fingerprint({ ...base, amount: 901 }));
    assert.notEqual(fingerprint(base), fingerprint({ ...base, fiscalCode: "VRDLGI80A01H501Z" }));
    assert.notEqual(fingerprint(base), fingerprint({ ...base, negozioId: 43 }));
    assert.notEqual(fingerprint(base), fingerprint({ ...base, address: "Via Milano 2" }));
    assert.notEqual(fingerprint(base), fingerprint({ ...base, documentIssueDate: "2024-01-11" }));
    assert.notEqual(fingerprint(base), fingerprint({
      ...base,
      captureAttachments: [{ key: "document-front", type: "image/jpeg", dataUrl: "data:image/jpeg;base64,Zm90by1i" }]
    }));
    assert.notEqual(fingerprint(base), fingerprint({ ...base, signatureImages: ["data:image/png;base64,ZmlybWEtYg=="] }));

    const create = sourceBlock("async function createApprovalRequest", "async function reviewApprovalRequest");
    const review = sourceBlock("async function reviewApprovalRequest", "async function rowWithAurumShield");
    const approved = sourceBlock("async function findApprovedApprovalForAct", "async function assertApprovalAllowsFinalSave");
    assert.match(create, /decision_fingerprint/);
    assert.match(create, /approvalFingerprintMatches/);
    assert.match(review, /approvalDecisionFingerprint\(rowToAct\(approvalAct\)\)/);
    assert.match(review, /APPROVAL_REQUIRED/);
    assert.match(approved, /status = 'cancelled'/);
  });
});

test("createApprovalRequest allinea i 12 bind SQL senza duplicare l'utente", async () => {
  const functionSource = extractFunction(server, "createApprovalRequest");
  let insertCall = null;
  const deed = {
    id: 77,
    negozio_id: 9,
    practice_number: "OA-MILANO-2026-000077",
    cliente_nome: "Mario",
    cliente_cognome: "Rossi",
    store: "Milano Centro"
  };
  const db = {
    async query(sql, values = []) {
      if (/INSERT INTO approval_requests/.test(sql)) {
        insertCall = { sql, values };
        const placeholders = [...sql.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]));
        assert.equal(Math.max(...placeholders), values.length);
        return { rowCount: 1, rows: [{ id: 501, status: "pending" }] };
      }
      if (/FROM approval_requests ar/.test(sql)) return { rowCount: 0, rows: [] };
      if (/UPDATE atti_vendita/.test(sql)) return { rowCount: 1, rows: [] };
      throw new Error(`Query inattesa nel test: ${sql.slice(0, 80)}`);
    }
  };
  const createApprovalRequest = new Function(
    "findExisting",
    "canAccessAct",
    "canEditAct",
    "normalizeRole",
    "withDatabaseTransaction",
    "approvalDecisionFingerprint",
    "rowToAct",
    "validateQualityChecklist",
    "calculateAurumShieldRisk",
    "isCashPaymentMethod",
    "cashAntiMoneyLaunderingCheck",
    "approvalReasonsFromQualityShield",
    "approvalRequestSelectSql",
    "approvalRequestJoinSql",
    "approvalFingerprintMatches",
    "storeByCodeOrName",
    "sanitizeForPostgres",
    "createNotification",
    "writeAuditLog",
    "approvalRequestRowToPublic",
    "actsTable",
    `${functionSource}; return createApprovalRequest;`
  )(
    async () => deed,
    () => true,
    () => true,
    (role) => String(role || "").toLowerCase(),
    async (callback) => callback(db),
    () => "a".repeat(64),
    (row) => row,
    async () => ({ status: "attenzione", aurum_shield: { score: 42, risk_level: "alto" } }),
    async () => ({ score: 42, risk_level: "alto" }),
    () => false,
    async () => null,
    () => [{ type: "risk", severity: "high" }],
    () => "ar.*",
    () => "FROM approval_requests ar",
    () => false,
    async () => null,
    (value) => value,
    async () => {},
    async () => {},
    (row) => row,
    "atti_vendita"
  );
  const reasons = [{ type: "risk", severity: "high" }];
  const quality = { status: "attenzione", aurum_shield: { score: 42, risk_level: "alto" } };
  const shield = { score: 42, risk_level: "alto" };
  await createApprovalRequest(
    {
      sale_deed_id: deed.id,
      reasons: [],
      quality_check: { status: "completabile" },
      aurum_shield: { score: 0, risk_level: "basso" },
      risk_score: 0,
      requester_note: "Verificare"
    },
    { id: 15, ruolo: "commesso", negozio_id: 9 }
  );

  assert.ok(insertCall);
  assert.equal(insertCall.values.length, 12);
  assert.deepEqual(insertCall.values.map((value, index) => index === 7 ? JSON.parse(value) : value), [
    77,
    15,
    "commesso",
    "responsabile_founder",
    9,
    42,
    "alto",
    reasons,
    quality,
    shield,
    "Verificare",
    "a".repeat(64)
  ]);
});
