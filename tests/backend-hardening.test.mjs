import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [serverSource, schemaSource] = await Promise.all([
  readFile(path.join(repoRoot, "server.js"), "utf8"),
  readFile(path.join(repoRoot, "schema.sql"), "utf8")
]);

function sourceBlock(startMarker, endMarker) {
  const start = serverSource.indexOf(startMarker);
  const end = serverSource.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `Blocco mancante: ${startMarker}`);
  assert.notEqual(end, -1, `Fine blocco mancante: ${endMarker}`);
  return serverSource.slice(start, end);
}

test("backend applica confini statici, header di sicurezza e limiti bounded separati prima del parser", () => {
  const rateLimitBlock = sourceBlock("function requestRateLimitClass", "function auditApiRequest");
  assert.doesNotMatch(serverSource, /express\.static\(__dirname/);
  assert.match(serverSource, /publicRootStaticFiles = new Set/);
  assert.match(serverSource, /blockedStaticPathPrefixes = \[/);
  assert.match(serverSource, /"\/private_uploads"/);
  assert.match(serverSource, /isBlockedPath \|\| path\.posix\.extname\(requestPath\)/);
  assert.match(serverSource, /app\.disable\("x-powered-by"\)/);
  assert.match(serverSource, /Strict-Transport-Security/);
  assert.match(serverSource, /X-Content-Type-Options/);
  assert.match(serverSource, /frame-ancestors 'none'/);
  assert.match(serverSource, /Referrer-Policy/);
  assert.match(serverSource, /Permissions-Policy/);
  assert.ok(rateLimitBlock.includes('.replace(/\\/+$/, "")'));
  assert.match(rateLimitBlock, /name: "password-login"/);
  assert.match(rateLimitBlock, /name: "passkey-options"/);
  assert.match(rateLimitBlock, /name: "passkey-verify"/);
  assert.match(rateLimitBlock, /name: "ai"/);
  assert.match(rateLimitBlock, /apiRateBucketMaxEntries/);
  assert.doesNotMatch(rateLimitBlock, /headers\.authorization|request\.headers\.authorization/);
  assert.match(serverSource, /app\.set\("trust proxy", process\.env\.TRUST_PROXY \|\| "loopback, linklocal, uniquelocal"\)/);
  assert.ok(serverSource.indexOf("app.use(apiRateLimit)") < serverSource.indexOf("app.use(express.json"));
});

test("readiness interroga davvero il database e OpenAI ha timeout, retry e abort client", () => {
  const healthBlock = sourceBlock("async function checkDatabaseReadiness", "app.get(\"/api/version\"");
  assert.match(healthBlock, /SELECT 1 AS ready/);
  assert.match(healthBlock, /response\.status\(databaseReady \? 200 : 503\)/);
  assert.match(healthBlock, /runtimeStatus\.initializationComplete/);
  assert.match(healthBlock, /initialization: initializationReady \? "ready"/);
  assert.match(healthBlock, /app\.get\("\/api\/live"/);
  assert.match(serverSource, /connectionTimeoutMillis: databaseConnectionTimeoutMs/);
  assert.match(serverSource, /query_timeout: databaseQueryTimeoutMs/);
  assert.match(serverSource, /statement_timeout: databaseQueryTimeoutMs/);
  assert.match(serverSource, /new OpenAI\(\{ apiKey: process\.env\.OPENAI_API_KEY, timeout: openaiTimeoutMs, maxRetries: openaiMaxRetries \}\)/);
  assert.match(serverSource, /function createRequestAbortContext/);
  assert.match(serverSource, /response\.once\("close", abortOnClosedResponse\)/);
  assert.match(serverSource, /options\.signal \? \{ signal: options\.signal \} : undefined/);
});

test("salvataggio atti e limite contanti condividono transazione e lock per cliente", () => {
  const cashBlock = sourceBlock("function cashTransactionLockKeys", "function compactActPayload");
  const saveBlock = sourceBlock("async function saveAct", "async function updateAct");
  const updateBlock = sourceBlock("async function updateAct", "async function deleteAct");
  assert.match(serverSource, /async function withDatabaseTransaction/);
  assert.match(serverSource, /await client\.query\("BEGIN"\)/);
  assert.match(serverSource, /await client\.query\("ROLLBACK"\)/);
  assert.match(cashBlock, /pg_advisory_xact_lock\(hashtext\(\$1::text\)\)/);
  assert.match(cashBlock, /const result = await db\.query/);
  assert.match(saveBlock, /withDatabaseTransaction\(async \(db\) =>/);
  assert.match(saveBlock, /lockCashTransactionIdentity\(db, act, existing\)/);
  assert.match(saveBlock, /enforceCashAntiMoneyLaundering\(act, user, existing,[\s\S]*db/);
  assert.match(saveBlock, /saveDocumentIntegrityLog\(act, result\.rows\[0\]\.id, user, \{ db, strict: true \}\)/);
  assert.match(updateBlock, /findExisting\(existing\.id, db, \{ forUpdate: true \}\)/);
  assert.match(updateBlock, /lockedExisting\.row_version/);
  assert.match(updateBlock, /concurrentActEditError\(\)/);
  assert.match(updateBlock, /lockCashTransactionIdentity\(db, act, lockedExisting\)/);
  assert.match(updateBlock, /upsertClientFromAct\(\{ \.\.\.act, payload: act\.payload \}, db\)/);
});

test("ricerca atti usa un indice di soli metadati e non scandisce allegati o firme nel payload", () => {
  const searchBlock = sourceBlock("function buildActsQuery", "function queryLimit");
  assert.match(searchBlock, /search_text LIKE/);
  assert.doesNotMatch(searchBlock, /payload::text/);
  assert.match(schemaSource, /CREATE EXTENSION IF NOT EXISTS pg_trgm/);
  assert.match(schemaSource, /atti_vendita_search_text_trigger/);
  assert.match(schemaSource, /atti_vendita_search_text_trgm_idx/);
  assert.doesNotMatch(
    schemaSource.match(/CREATE OR REPLACE FUNCTION oroactive_refresh_atto_search_text[\s\S]*?\$\$;/)?.[0] || "",
    /payload/
  );
});

test("migrazioni hanno timeout dedicato e readiness attende la loro conclusione", () => {
  const initBlock = sourceBlock("async function runDatabaseMigration", "function backupTimestamp");
  assert.match(initBlock, /databaseMigrationTimeoutMs/);
  assert.match(initBlock, /set_config\('statement_timeout'/);
  assert.match(initBlock, /runDatabaseMigration\(schema/);
  assert.match(initBlock, /runDatabaseMigration\(gemologicalEncyclopediaMigration/);
  assert.match(serverSource, /runtimeStatus\.initializationComplete = true/);
  assert.match(serverSource, /runtimeStatus\.initializationError = error/);
});

test("polling GET riuscito non scrive audit e lo schema supporta retention mirata", () => {
  const auditBlock = sourceBlock("function auditApiRequest", "app.use(apiRateLimit)");
  assert.match(auditBlock, /\["GET", "HEAD", "OPTIONS"\]\.includes\(method\) && response\.statusCode < 400/);
  assert.match(serverSource, /async function cleanupLegacyPollingAuditLogs/);
  assert.match(serverSource, /LIMIT 10000/);
  assert.match(schemaSource, /audit_logs_action_created_idx/);
  assert.match(schemaSource, /audit_logs_error_created_idx/);
  assert.match(schemaSource, /audit_logs_polling_retention_idx/);
});

test("dettaglio Academy carica moduli lezioni e materiali con query aggregate", () => {
  const academyBlock = sourceBlock("async function getAcademyCourse", "async function createAcademyCourse");
  assert.match(academyBlock, /Promise\.all\(\[/);
  assert.match(academyBlock, /WHERE course_id = \$1::bigint AND active = TRUE/);
  assert.match(academyBlock, /materialsByLesson/);
  assert.match(academyBlock, /lessonsByModule/);
  assert.doesNotMatch(academyBlock, /await listAcademyLessons\(module\.id\)/);
  assert.doesNotMatch(academyBlock, /await listAcademyMaterials\(lesson\.id\)/);
});

async function unusedLocalPort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.listen(0, "127.0.0.1", resolve).once("error", reject));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForLive(baseUrl, child, stderr) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Backend terminato prima dell'avvio: ${stderr.value}`);
    try {
      const response = await fetch(`${baseUrl}/api/live`);
      if (response.ok) return;
    } catch {
      // Il socket può non essere ancora pronto.
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Backend non avviato entro il timeout: ${stderr.value}`);
}

test("runtime serve solo risorse pubbliche, restituisce 404 ai file interni e 503 senza DB", { timeout: 20000 }, async () => {
  const port = await unusedLocalPort();
  const stderr = { value: "" };
  const child = spawn(process.execPath, ["server.js"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://invalid:invalid@127.0.0.1:1/oroactive_test",
      DATABASE_CONNECTION_TIMEOUT_MS: "1000",
      HEALTH_CHECK_TIMEOUT_MS: "600",
      REQUIRE_DATABASE_ON_START: "false",
      COMPETITOR_AUTO_SYNC_ENABLED: "false",
      COMPETITOR_AUTO_SYNC_ON_STARTUP: "false"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stderr.on("data", (chunk) => {
    stderr.value += String(chunk).slice(-4000);
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForLive(baseUrl, child, stderr);
    const home = await fetch(`${baseUrl}/`);
    assert.equal(home.status, 200);
    assert.equal(home.headers.get("x-powered-by"), null);
    assert.equal(home.headers.get("x-content-type-options"), "nosniff");
    assert.equal(home.headers.get("x-frame-options"), "DENY");
    assert.match(home.headers.get("content-security-policy") || "", /frame-ancestors 'none'/);
    assert.match(home.headers.get("strict-transport-security") || "", /max-age=31536000/);

    const icon = await fetch(`${baseUrl}/icons/icon-192.png`);
    assert.equal(icon.status, 200);
    for (const pathname of ["/server.js", "/schema.sql", "/package.json", "/private_uploads/customer.pdf", "/assets/academy/courses/corso-base-oro-oroactive.pdf", "/missing.js"]) {
      const response = await fetch(`${baseUrl}${pathname}`);
      assert.equal(response.status, 404, `${pathname} deve essere bloccato`);
      assert.match(response.headers.get("content-type") || "", /application\/json/);
    }

    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 503);
    const healthPayload = await health.json();
    assert.equal(healthPayload.database, "unavailable");
    assert.notEqual(healthPayload.initialization, "ready");

    const unknownApi = await fetch(`${baseUrl}/api/not-a-real-endpoint`);
    assert.equal(unknownApi.status, 401);
    assert.match(unknownApi.headers.get("content-type") || "", /application\/json/);
  } finally {
    if (child.exitCode === null) child.kill("SIGTERM");
    await Promise.race([
      once(child, "exit"),
      new Promise((resolve) => setTimeout(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
        resolve();
      }, 2000))
    ]);
  }
});
