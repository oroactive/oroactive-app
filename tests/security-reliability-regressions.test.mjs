import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [server, app, schema, index, styles, compose, envExample] = await Promise.all([
  readFile(new URL("server.js", root), "utf8"),
  readFile(new URL("app.js", root), "utf8"),
  readFile(new URL("schema.sql", root), "utf8"),
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("styles.css", root), "utf8"),
  readFile(new URL("docker-compose.yml", root), "utf8"),
  readFile(new URL(".env.example", root), "utf8")
]);

test("lo scoping negozio usa l'id e limita il fallback ai soli record legacy", () => {
  assert.match(server, /negozio_id IS NULL AND[^\n]*(?:store|negozio) =/);
  assert.doesNotMatch(server, /return ` AND \(\$\{alias\}\.negozio_id = [^`]+ OR \$\{alias\}\.store =/);
  assert.doesNotMatch(server, /row\?\.store === user\?\.negozio/);
  assert.match(schema, /CREATE UNIQUE INDEX IF NOT EXISTS negozi_nome_normalized_unique/);
  assert.match(schema, /HAVING COUNT\(\*\) > 1[\s\S]*UPDATE negozi[\s\S]*' #', n\.id/);
  const storeSchemaStart = schema.indexOf("CREATE TABLE IF NOT EXISTS negozi");
  const storeSchemaEnd = schema.indexOf("CREATE TABLE IF NOT EXISTS clienti", storeSchemaStart);
  assert.ok(storeSchemaStart >= 0 && storeSchemaEnd > storeSchemaStart);
  assert.doesNotMatch(schema.slice(storeSchemaStart, storeSchemaEnd), /duplicate\.position > 1/);
  assert.match(server, /UPDATE utenti[\s\S]*negozio_id = \$1::bigint/);
  assert.match(server, /UPDATE atti_vendita[\s\S]*negozio_id = \$1::bigint/);
  assert.match(server, /async function assertUserHasActiveStore/);
  assert.match(server, /COALESCE\(attivo, TRUE\) = TRUE LIMIT 1/);
  assert.match(schema, /deleted_at IS NULL\s+AND COALESCE\(attivo, TRUE\) = TRUE[\s\S]{0,320}FOR SHARE/);
  assert.doesNotMatch(schema, /FOR KEY SHARE/);
  assert.match(server, /store_mismatch/);
  assert.match(server, /store_id IS DISTINCT FROM a\.negozio_id/);
  assert.match(server, /row\.store_id != null && String\(row\.store_id\) !== String\(row\.negozio_id \?\? ""\)/);
  assert.doesNotMatch(server, /row\.store_id && row\.negozio_id && String\(row\.store_id\) !== String\(row\.negozio_id\)/);
  assert.match(server, /sede non può essere cambiata finché esiste una richiesta di autorizzazione pendente/);
  assert.match(schema, /CREATE UNIQUE INDEX IF NOT EXISTS approval_requests_one_pending_per_act/);
  const suspendedVisibilityStart = server.indexOf("async function addSuspendedPracticeVisibilityWhere");
  const suspendedVisibilityEnd = server.indexOf("function suspendedPracticeSelectSql", suspendedVisibilityStart);
  const suspendedVisibility = server.slice(suspendedVisibilityStart, suspendedVisibilityEnd);
  assert.match(suspendedVisibility, /\["responsabile", "commesso", "aiuto_commesso"\]/);
  assert.match(suspendedVisibility, /a\.negozio_id = \$\{storeIdParam\}[\s\S]*AND a\.operatore_id/);
  assert.doesNotMatch(suspendedVisibility, /\)\) OR a\.operatore_id/);
  const approvalCreateStart = server.indexOf("async function createApprovalRequest");
  const approvalReviewStart = server.indexOf("async function reviewApprovalRequest", approvalCreateStart);
  const approvalEnd = server.indexOf("async function rowWithAurumShield", approvalReviewStart);
  assert.match(server.slice(approvalCreateStart, approvalReviewStart), /withDatabaseTransaction[\s\S]*FOR UPDATE OF ar/);
  assert.match(server.slice(approvalReviewStart, approvalEnd), /withDatabaseTransaction[\s\S]*WHERE id = \$1::bigint AND status = 'pending'/);
});

test("i corpi grandi vengono letti solo dopo autenticazione", () => {
  assert.match(server, /PUBLIC_JSON_BODY_LIMIT/);
  assert.match(server, /PROTECTED_JSON_BODY_LIMIT/);
  assert.match(server, /isPublicApiRequest/);
  assert.match(server, /isLargeProtectedApiRequest/);
  assert.match(server, /authenticate\(request, response, \(error\) =>/);
  assert.match(server, /isLargeProtectedApiRequest\(request\)\) return parseProtectedLargeJson/);
  assert.match(server, /protectedLargeJsonParser/);
  assert.match(server, /name: "large-body", limit: 8/);
  assert.match(server, /protectedLargeBodiesInFlight >= protectedLargeBodyMaxInFlight/);
  assert.doesNotMatch(server, /app\.use\(express\.json\(\{ limit: jsonBodyLimit \}\)\)/);
});

test("logout e cambio password revocano i token precedenti", () => {
  assert.match(schema, /session_version INTEGER NOT NULL DEFAULT 0/);
  assert.match(server, /session_version/);
  assert.match(server, /session_version = COALESCE\(session_version, 0\) \+ 1/);
  assert.match(server, /decoded\.sv/);
  const bootstrapStart = server.indexOf("async function bootstrapAdminUser");
  const bootstrapEnd = server.indexOf("async function storeByCodeOrName", bootstrapStart);
  const bootstrapBlock = server.slice(bootstrapStart, bootstrapEnd);
  assert.match(bootstrapBlock, /withDatabaseTransaction[\s\S]*pg_advisory_xact_lock/);
  assert.match(bootstrapBlock, /LOWER\(TRIM\(ruolo\)\) = 'founder'[\s\S]*if \(founders\.rowCount\) \{\s*return;/);
  assert.match(bootstrapBlock, /configuredIdentity\.rowCount > 1/);
  assert.doesNotMatch(bootstrapBlock, /UPDATE utenti SET/);
  const apiStart = app.indexOf("async function apiRequest");
  const apiEnd = app.indexOf("function mergeActsIntoCache", apiStart);
  const apiBlock = app.slice(apiStart, apiEnd);
  assert.match(apiBlock, /const requestGeneration = state\.sessionGeneration/);
  assert.match(apiBlock, /sessionAbortController[\s\S]*sessionSupersededError/);
  assert.match(apiBlock, /requestGeneration !== state\.sessionGeneration/);
  const saveActStart = app.indexOf("async function saveActRecord");
  const saveActEnd = app.indexOf("async function getActRecord", saveActStart);
  const saveActBlock = app.slice(saveActStart, saveActEnd);
  assert.match(saveActBlock, /!error\?\.isSessionSuperseded && \(error\?\.isConnectionError \|\| !navigator\.onLine/);
  const resetStart = app.indexOf("function resetAuthenticatedSessionData");
  const resetEnd = app.indexOf("function showLogin", resetStart);
  const resetBlock = app.slice(resetStart, resetEnd);
  assert.match(resetBlock, /rotateSessionGeneration\(\)/);
  assert.match(resetBlock, /captureFiles\.forEach\(revokeCaptureUrl\)/);
  assert.match(resetBlock, /resetAuthenticatedFormFields\(appShell\)/);
  const formReset = app.slice(app.indexOf("function resetAuthenticatedFormFields"), resetStart);
  assert.match(formReset, /root\?\.querySelectorAll\("input, textarea"\)/);
  assert.match(formReset, /field\.value = field\.defaultValue \|\| ""/);
  assert.match(resetBlock, /demoActs\.splice\(0, demoActs\.length\)/);
  assert.match(app, /async function expireSessionForInactivity[\s\S]*archiveCurrentPractice\("Bozza"[\s\S]*\/auth\/logout/);
  assert.match(server, /code: "USER_INACTIVE"/);
  assert.match(server, /error\.code = "STORE_INACTIVE"/);
  assert.match(app, /function isSessionFatalApiError[\s\S]*USER_INACTIVE[\s\S]*STORE_INACTIVE/);
  assert.match(app, /function shouldReturnToLoginOnUnauthorized[\s\S]*return true/);
  assert.match(resetBlock, /window\.currentUser = null/);
  const watchdogStart = app.indexOf("function startBootWatchdog");
  const watchdogEnd = app.indexOf("async function bootAuthenticatedApp", watchdogStart);
  const watchdog = app.slice(watchdogStart, watchdogEnd);
  assert.match(watchdog, /const watchdogGeneration = state\.sessionGeneration/);
  assert.match(watchdog, /watchdogGeneration !== state\.sessionGeneration/);
  assert.match(watchdog, /state\.authToken[\s\S]*window\.currentUser === state\.currentUser/);
});

test("spostamento utente aggiorna insieme id, nome sede e sessione", () => {
  const updateStart = server.indexOf("async function updateUser");
  const updateEnd = server.indexOf("async function listUsers", updateStart);
  const updateBlock = server.slice(updateStart, updateEnd);
  assert.match(updateBlock, /const assignmentTouched =/);
  assert.match(updateBlock, /const assignmentChanged =/);
  assert.match(updateBlock, /negozio = \$\$\{values\.length\}::text/);
  assert.match(updateBlock, /negozio_id = \$\$\{values\.length\}::bigint/);
  assert.match(updateBlock, /assignmentChanged[\s\S]*session_version = COALESCE\(session_version, 0\) \+ 1/);
  assert.match(updateBlock, /withDatabaseTransaction[\s\S]*FOR UPDATE/);
  assert.doesNotMatch(updateBlock, /const allowed = \[[^\]]*"negozio"/);
  const createStart = server.indexOf("async function createUser");
  const createEnd = server.indexOf("async function findUserRawById", createStart);
  const createBlock = server.slice(createStart, createEnd);
  assert.ok(createBlock.indexOf("managedRolesForActor") < createBlock.indexOf("bcrypt.hash"));
  assert.ok(createBlock.indexOf("Email/username già presente") < createBlock.indexOf("bcrypt.hash"));
  const deleteStart = server.indexOf("async function deleteUser");
  const deleteEnd = server.indexOf("async function loginUser", deleteStart);
  assert.match(server.slice(deleteStart, deleteEnd), /withDatabaseTransaction[\s\S]*LOWER\(COALESCE\(ruolo[\s\S]*ORDER BY id[\s\S]*FOR UPDATE/);
  assert.match(server, /name: "user-mutation", limit: 30, windowMs: 60_000/);
});

test("verifica e restore usano il contenuto estratto dall'archivio scaricabile", () => {
  assert.match(server, /extractVerifiedBackupArchive/);
  assert.match(server, /extracted\.databaseDumpPath/);
  assert.doesNotMatch(server, /pgRestorePath[^\n]+backup\.metadata\.database_dump_path/);
  assert.match(server, /fs\.rm\([^\n]+recursive: true/);
  assert.match(server, /const missingTables = tables\.filter/);
  assert.doesNotMatch(server, /tableResult\.rowCount >= 3/);
});

test("la creazione backup è singola, Founder-only e ripulisce ogni artefatto parziale", () => {
  assert.match(server, /app\.post\("\/api\/backups\/create", requireFounder/);
  assert.doesNotMatch(server, /app\.post\("\/api\/backups\/run"/);
  assert.match(server, /pg_try_advisory_lock/);
  assert.match(server, /manualBackupCreationInProgress/);
  assert.match(server, /BACKUP_ALREADY_RUNNING/);
  assert.match(server, /fs\.statfs\(backupDirectory\)/);
  assert.match(server, /backupSourceStats\(\)/);
  assert.match(server, /estimatedStagingBytes \* 2/);
  assert.match(server, /BACKUP_STORAGE_INSUFFICIENT/);
  assert.match(server, /BACKUP_RETENTION_LIMIT/);
  const createStart = server.indexOf("async function createManualBackupUnlocked");
  const createEnd = server.indexOf("async function archiveEntries", createStart);
  const createBlock = server.slice(createStart, createEnd);
  assert.match(createBlock, /Promise\.allSettled[\s\S]*fs\.rm\(archivePath[\s\S]*fs\.rm\(backupDir/);
  assert.match(createBlock, /partial_artifacts_removed/);
  const completedUpdate = createBlock.indexOf("SET status = 'completed'");
  const stagingRemoval = createBlock.indexOf("await fs.rm(backupDir", completedUpdate);
  assert.ok(completedUpdate >= 0 && stagingRemoval > completedUpdate, "il record completed deve precedere la pulizia staging");
  assert.match(createBlock, /cleanup_pending: \[backupDir\]/);
  assert.match(createBlock, /staging_removed: false/);
  assert.match(server, /async function recoverInterruptedBackupRows/);
  assert.match(server, /async function cleanupPendingBackupArtifacts[\s\S]*WHERE status <> 'running'/);
  assert.match(server, /async function cleanupUntrackedBackupArtifacts/);
  assert.match(server, /name: "backup-create", limit: 2, windowMs: 60 \* 60_000/);
  assert.match(index, /id="runBackupNow"[^>]*founder-only|founder-only[^>]*id="runBackupNow"/);
});

test("il limite contanti resta inderogabile anche con autorizzazione interna", () => {
  const enforceStart = server.indexOf("async function enforceCashAntiMoneyLaundering");
  const enforceEnd = server.indexOf("function compactActPayload", enforceStart);
  const enforceBlock = server.slice(enforceStart, enforceEnd);
  assert.match(enforceBlock, /!isDraftLikeStatus\(act\.status\) && !check\.ok/);
  assert.doesNotMatch(enforceBlock, /allowApproved/);
  assert.match(enforceBlock, /CASH_LIMIT_HARD_BLOCK/);
  const approvalStart = server.indexOf("async function createApprovalRequest");
  const approvalEnd = server.indexOf("async function reviewApprovalRequest", approvalStart);
  assert.match(server.slice(approvalStart, approvalEnd), /amlCheck\?\.ok === false[\s\S]*CASH_LIMIT_HARD_BLOCK/);
  const reviewEnd = server.indexOf("async function rowWithAurumShield", approvalEnd);
  assert.match(server.slice(approvalEnd, reviewEnd), /currentAmlCheck[\s\S]*!currentAmlCheck\.ok[\s\S]*CASH_LIMIT_HARD_BLOCK/);
});

test("lotto fusione, atti e progressivo DDT sono atomici lato server", () => {
  const routeStart = server.indexOf('app.post("/api/fusioni/lotti"');
  const routeEnd = server.indexOf("function pdfFormatEuro", routeStart);
  const route = server.slice(routeStart, routeEnd);
  assert.match(route, /withDatabaseTransaction/);
  assert.match(route, /FOR UPDATE/);
  assert.match(route, /pg_advisory_xact_lock/);
  assert.match(route, /jsonb_set[\s\S]*'\{fusion\}'/);
  assert.match(route, /existingLotCodes[\s\S]*idempotent/);
  assert.match(route, /\(data_atto \+ 10\) > CURRENT_DATE/);
  assert.match(route, /FUSION_LEGAL_HOLD/);
  const uiStart = app.indexOf("async function confirmSelectedFusion");
  const uiEnd = app.indexOf("function fusionActRows", uiStart);
  const ui = app.slice(uiStart, uiEnd);
  assert.doesNotMatch(ui, /saveActRecord/);
  assert.doesNotMatch(app, /function nextFusionDdtNumber/);
  assert.match(app, /selectedStoreMatchesAct\(store, cachedAct\)/);
  const fusionRenderStart = app.indexOf("function renderFusionGroups");
  const fusionRenderEnd = app.indexOf("function bindFusion", fusionRenderStart);
  const fusionRender = app.slice(fusionRenderStart, fusionRenderEnd);
  assert.match(fusionRender, /const storesByKey = new Map/);
  assert.match(fusionRender, /acts\.forEach[\s\S]*storesByKey\.set/);
});

test("i PDF ufficiali vengono ricostruiti soltanto da atti autorizzati nel database", () => {
  const routeStart = server.indexOf('app.post("/api/pdf/act"');
  const routeEnd = server.indexOf("function customerTrustPackFilename", routeStart);
  const routes = server.slice(routeStart, routeEnd);
  assert.match(server, /async function authorizedPdfActs/);
  assert.match(routes, /authorizedPdfActs\(identifiers, request\.user\)/);
  assert.match(routes, /requestedPdfActIdentifiers/);
  assert.doesNotMatch(routes, /request\.body\.act\s*\|\|\s*\{\}/);
  assert.doesNotMatch(routes, /acts:\s*Array\.isArray\(request\.body\.acts\)/);
  const authorizationStart = server.indexOf("async function authorizedPdfActs");
  const authorizationEnd = server.indexOf("function pdfExportSubtitle", authorizationStart);
  const authorization = server.slice(authorizationStart, authorizationEnd);
  assert.match(authorization, /completed_at IS NOT NULL/);
  assert.match(authorization, /realCompletedStatusSql\(\)/);
  assert.match(authorization, /PDF_BULK_MAX_ACTS/);
  assert.match(authorization, /octet_length\(payload::text\)/);
  assert.match(authorization, /PDF_EXPORT_MAX_PAYLOAD_BYTES/);
  assert.match(authorization, /FOR SHARE/);
  assert.match(routes, /if \(!canReviewActs\(request\.user\)\)/);
  assert.match(routes, /authorizedPdfActs\(identifiers, request\.user, \{ bulk: true \}\)/);
  assert.match(server, /name: "pdf-bulk-export", limit: 3, windowMs: 60_000/);
  assert.match(app, /\/pdf\/act"[\s\S]{0,260}atto:\s*act\.id \|\| act\.practiceNumber/);
  assert.match(app, /\/pdf\/acts"[\s\S]{0,300}atti:\s*dayActs\.map/);
});

test("Academy e Trust Pack persistono tra i deploy e rientrano nel backup", () => {
  assert.match(compose, /PRIVATE_UPLOAD_DIR:\s*\/app\/private_uploads/);
  assert.match(compose, /REQUIRE_PERSISTENT_UPLOAD_STORAGE:\s*"true"/);
  assert.match(compose, /REQUIRE_PERSISTENT_BACKUP_STORAGE:\s*"true"/);
  assert.match(compose, /oroactive-private-uploads:\/app\/private_uploads/);
  assert.match(compose, /oroactive-private-uploads:/);
  assert.match(envExample, /PRIVATE_UPLOAD_DIR=\/app\/private_uploads/);
  assert.match(envExample, /REQUIRE_PERSISTENT_UPLOAD_STORAGE=true/);
  assert.match(envExample, /REQUIRE_PERSISTENT_BACKUP_STORAGE=true/);
  assert.match(server, /const privateUploadDirectory = process\.env\.PRIVATE_UPLOAD_DIR/);
  assert.match(server, /source: privateUploadDirectory, target: "private_uploads"/);
  assert.match(server, /function resolveBackupSourcePath[\s\S]*path\.isAbsolute/);
  assert.match(server, /async function assertPersistentWritableStorage[\s\S]*\/proc\/self\/mountinfo[\s\S]*_NOT_MOUNTED/);
  assert.match(server, /async function assertPersistentUploadStorage[\s\S]*PRIVATE_UPLOAD_STORAGE/);
  assert.match(server, /async function assertPersistentBackupStorage[\s\S]*BACKUP_STORAGE/);
  assert.match(server, /persistent_upload_storage: runtimeStatus\.uploadStorageReady \? "ready" : "unavailable"/);
  assert.match(server, /persistent_backup_storage: runtimeStatus\.backupStorageReady \? "ready" : "unavailable"/);
  assert.match(server, /await assertPersistentUploadStorage\(\);[\s\S]*await assertPersistentBackupStorage\(\);/);
  const statsStart = server.indexOf("async function backupSourceStats");
  const copyStart = server.indexOf("async function copyBackupFileSources");
  assert.match(server.slice(statsStart, copyStart), /resolveBackupSourcePath\(item\.source\)/);
  assert.match(server.slice(copyStart, server.indexOf("async function writeVerifiableManifest", copyStart)), /resolveBackupSourcePath\(item\.source\)/);
});

test("fetch esterni e previsioni mutanti sono protetti", () => {
  assert.match(server, /safeExternalFetch/);
  const bullionStart = server.indexOf("async function fetchBullionVaultPrice");
  const bullionEnd = server.indexOf("function normalizePredictionMetal", bullionStart);
  assert.doesNotMatch(server.slice(bullionStart, bullionEnd), /fetchImpl:\s*fetch/);
  assert.doesNotMatch(server, /\bfetch\s*\(/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/gold-prediction\/run"[\s\S]{0,260}canSyncGoldPriceHistory/);
  assert.match(server, /app\.post\("\/api\/quotazioni\/metals\/predict"[\s\S]{0,260}canSyncGoldPriceHistory/);
});

test("alert antifrode e Aurum Shield rispettano la sede dell'atto", () => {
  const antifraudStart = server.indexOf("async function scanAntifraud");
  const shieldStart = server.indexOf("async function aurumShieldRiskLevel", antifraudStart);
  const antifraudBlock = server.slice(antifraudStart, shieldStart);
  assert.match(antifraudBlock, /scansione antifrode di rete è riservata a Founder e Supervisore/);
  assert.match(antifraudBlock, /async function updateAntifraudAlert[\s\S]*withDatabaseTransaction[\s\S]*FOR UPDATE OF af[\s\S]*canAccessAct/);

  const shieldReviewStart = server.indexOf("async function reviewAurumShieldAlert");
  const shieldReviewEnd = server.indexOf("async function dashboardAurumShieldStats", shieldReviewStart);
  const shieldReviewBlock = server.slice(shieldReviewStart, shieldReviewEnd);
  assert.match(shieldReviewBlock, /withDatabaseTransaction[\s\S]*FOR UPDATE OF al[\s\S]*canAccessAct/);
});

test("CSP, favicon e pulsanti login rispettano il baseline corretto", () => {
  assert.doesNotMatch(server, /script-src 'self' 'unsafe-inline'/);
  assert.match(server, /app\.get\("\/favicon\.ico"/);
  assert.match(styles, /\.login-privacy-links button\s*\{[\s\S]*min-height:\s*44px/);
  assert.doesNotMatch(index, /<script>\s*\(\(\) =>/);
  const serviceWorkerStart = app.indexOf("function registerServiceWorker");
  const serviceWorkerEnd = app.indexOf("async function refreshApp", serviceWorkerStart);
  const serviceWorkerRegistration = app.slice(serviceWorkerStart, serviceWorkerEnd);
  assert.match(serviceWorkerRegistration, /let hadController = Boolean\(navigator\.serviceWorker\.controller\)/);
  assert.match(serviceWorkerRegistration, /controllerchange[\s\S]*if \(!hadController\)[\s\S]*return/);
});
