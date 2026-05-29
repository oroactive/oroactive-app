import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const file = (name) => readFile(new URL(name, root), "utf8");

test("frontend usa configurazione API condivisa e login con fallback", async () => {
  const [index, app, config] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("frontend-config.js")
  ]);

  assert.match(index, /frontend-config\.js/);
  assert.match(config, /https:\/\/app\.oroactive\.it/);
  assert.match(app, /window\.OroActiveConfig/);
  assert.match(app, /apiRequest\("\/login"/);
  assert.doesNotMatch(app, /LOGIN API URL/);
  assert.doesNotMatch(app, /console\.log\("API_BASE_URL"/);
});

test("backend login accetta username e utenti migrati con email", async () => {
  const server = await file("server.js");

  assert.match(server, /LOWER\(username\) = LOWER\(\$1::text\)/);
  assert.match(server, /LOWER\(email\) = LOWER\(\$1::text\)/);
  assert.match(server, /app\.post\("\/api\/auth\/login"/);
  assert.match(server, /app\.post\("\/api\/login"/);
});

test("configurazione produzione non contiene password Founder reale", async () => {
  const envExample = await file(".env.example");
  const server = await file("server.js");

  assert.doesNotMatch(envExample, /Snoopdoggydogg/i);
  assert.match(envExample, /ADMIN_PASSWORD=INSERISCI_PASSWORD_FOUNDER/);
  assert.match(server, /JWT_SECRET obbligatorio/);
  assert.match(server, /ADMIN_PASSWORD obbligatoria/);
});

test("PWA non cachea API e dati sensibili", async () => {
  const sw = await file("service-worker.js");

  assert.match(sw, /\/api\//);
  assert.match(sw, /cache: "no-store"/);
  assert.match(sw, /\/document/i);
  assert.match(sw, /\/pdf\//);
});

test("sezione OroActive Academy e certificazioni interne presenti", async () => {
  const [index, app, server, schema] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql")
  ]);

  assert.match(app, /label: "OroActive Academy"[\s\S]*section: "training"/);
  assert.match(index, /Catalogo Academy/);
  assert.match(index, /I miei corsi/);
  assert.match(index, /Certificazioni/);
  assert.match(index, /Badge/);
  assert.match(index, /Storico formazione/);
  assert.match(index, /Gestione Academy/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_faculties/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_courses/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_lessons/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_certificates/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS academy_badges/);
  assert.match(app, /apiRequest\("\/corsi"/);
  assert.match(app, /apiRequest\("\/academy\/facolta"/);
  assert.match(server, /app\.get\("\/api\/corsi"/);
  assert.match(server, /app\.post\("\/api\/academy\/facolta"/);
  assert.match(server, /app\.put\("\/api\/academy\/facolta\/:id"/);
  assert.match(server, /app\.delete\("\/api\/academy\/facolta\/:id"/);
  assert.match(server, /app\.get\("\/api\/academy\/faculties"/);
  assert.match(server, /app\.get\("\/api\/academy\/courses"/);
  assert.match(server, /app\.post\("\/api\/academy\/modules"/);
  assert.match(server, /app\.post\("\/api\/academy\/lessons"/);
  assert.match(server, /app\.post\("\/api\/academy\/materials"/);
  assert.match(server, /app\.post\("\/api\/academy\/progress\/complete-lesson"/);
  assert.match(server, /app\.get\("\/api\/academy\/my-certificates"/);
  assert.match(server, /app\.get\("\/api\/academy\/my-badges"/);
  assert.match(server, /app\.get\("\/api\/academy\/my-level"/);
  assert.match(server, /app\.post\("\/api\/corsi\/esami"/);
  assert.match(server, /app\.delete\("\/api\/corsi\/:id"/);
  assert.match(server, /app\.delete\("\/api\/corsi\/materiali\/:id"/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS course_certificates/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS course_badges/);
});

test("CRM e Backup hanno gestione modifica eliminazione e dettagli", async () => {
  const [app, server, schema, migration, nixpacks, dockerfile] = await Promise.all([
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260527_verifiable_manual_backups.sql"),
    file("nixpacks.toml"),
    file("Dockerfile")
  ]);

  assert.match(app, /data-save-crm-client/);
  assert.match(app, /data-delete-crm-client/);
  assert.match(app, /data-view-backup/);
  assert.match(app, /data-verify-backup/);
  assert.match(app, /data-test-restore-backup/);
  assert.match(app, /data-download-backup/);
  assert.match(app, /data-delete-backup/);
  assert.match(app, /apiRequest\("\/backups\/create"/);
  assert.match(app, /async function verifyBackup/);
  assert.match(app, /async function testRestoreBackup/);
  assert.match(server, /app\.put\("\/api\/crm\/clienti\/:id"/);
  assert.match(server, /app\.delete\("\/api\/crm\/clienti\/:id"/);
  assert.match(server, /function backupToolUnavailableMessage/);
  assert.match(server, /async function createPostgresBackup/);
  assert.match(server, /backupToolUnavailableMessage\("pg_dump"\)/);
  assert.match(server, /non disponibile nel container\. Installare PostgreSQL client tools/);
  assert.match(server, /async function createManualBackup/);
  assert.match(server, /async function verifyBackup/);
  assert.match(server, /async function testRestoreBackup/);
  assert.match(server, /app\.post\("\/api\/backups\/create"/);
  assert.match(server, /app\.post\("\/api\/backups\/:id\/verify"/);
  assert.match(server, /app\.post\("\/api\/backups\/:id\/test-restore", requireFounder/);
  assert.match(server, /app\.get\("\/api\/backups\/:id"/);
  assert.match(server, /app\.get\("\/api\/backups\/:id\/download", requireFounder/);
  assert.match(server, /app\.delete\("\/api\/backups\/:id", requireFounder/);
  assert.match(server, /status = 'deleted'/);
  assert.match(server, /CREATE DATABASE \$\{quoteIdentifier\(testDatabaseName\)\}/);
  assert.match(server, /DROP DATABASE IF EXISTS \$\{quoteIdentifier\(testDatabaseName\)\}/);
  assert.match(server, /Backup automatici disabilitati/);
  assert.doesNotMatch(server, /runDailyBackupIfNeeded/);
  assert.doesNotMatch(server, /runMonthlyBackupIfNeeded/);
  assert.match(schema, /ALTER TABLE clienti ADD COLUMN IF NOT EXISTS archiviato/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS backups/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS backup_logs/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS backup_restore_tests/);
  assert.match(schema, /idx_backups_status/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS backups/);
  assert.match(migration, /idx_backup_logs_backup_id/);
  assert.match(nixpacks, /postgresql_16/);
  assert.match(dockerfile, /postgresql-client/);
});

test("quotazioni utenti copia cliente e refresh app aggiornati", async () => {
  const [index, app, server, schema] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql")
  ]);

  assert.doesNotMatch(index, /Quotazioni e andamento di oro, argento, platino e diamanti/);
  assert.doesNotMatch(index, /<span>Diamanti<\/span><strong>Da configurare<\/strong>/);
  assert.doesNotMatch(app, /Quotazione diamanti da configurare/);
  assert.doesNotMatch(index, /id="mainMenuLogoRefresh"/);
  assert.match(app, /async function refreshApp/);
  assert.match(app, /function triggerLogoRefresh/);
  assert.match(app, /logo-refresh-clicked/);
  assert.match(app, /registration\.update/);
  assert.match(app, /customer-copy-logo/);
  const styles = await file("styles.css");
  assert.match(styles, /customer-copy-logo/);
  assert.match(styles, /logo-refresh-clicked/);
  assert.match(styles, /logo-heartbeat/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(index, /id="userEmail"/);
  assert.match(index, /id="userEmailLabel" class="founder-email-only" hidden/);
  assert.match(index, /id="userPhone"/);
  assert.match(index, /id="userActive"/);
  assert.match(server, /telefono, note, attivo/);
  assert.match(schema, /ALTER TABLE utenti ADD COLUMN IF NOT EXISTS telefono/);
});

test("salvataggio atti mostra errori specifici e non generici", async () => {
  const [app, server] = await Promise.all([
    file("app.js"),
    file("server.js")
  ]);

  assert.match(server, /friendlyDatabaseError/);
  assert.match(server, /Numero atto già presente/);
  assert.match(server, /Formato data non valido/);
  assert.match(server, /Errore database durante il salvataggio dell'atto/);
  assert.equal(app.includes('showToast("Errore nel salvataggio dell\\\'atto. Controllare i campi compilati."'), false);
  assert.match(app, /showToast\(error\.message \|\| "Errore nel salvataggio dell'atto\."/);
});

test("sezione utenti usa endpoint e messaggi propri", async () => {
  const [index, app, server, schema] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql")
  ]);
  const saveUserStart = app.indexOf("async function saveUser");
  const saveUserEnd = app.indexOf("function editUser", saveUserStart);
  const saveUserBlock = app.slice(saveUserStart, saveUserEnd);
  const createUserStart = server.indexOf("async function createUser");
  const updateUserEnd = server.indexOf("async function listUsers", createUserStart);
  const userBackendBlock = server.slice(createUserStart, updateUserEnd);

  assert.match(server, /app\.get\(\["\/api\/utenti", "\/api\/users"\]/);
  assert.match(server, /listUsersForActor/);
  assert.match(server, /minimalPublicUser/);
  assert.match(server, /last_seen >= NOW\(\) - INTERVAL '2 minutes'/);
  assert.match(server, /app\.get\(\["\/api\/utenti\/:id", "\/api\/users\/:id"\]/);
  assert.match(server, /app\.get\(\["\/api\/utenti\/:id\/activity", "\/api\/users\/:id\/activity"\]/);
  assert.match(server, /app\.post\(\["\/api\/utenti", "\/api\/users"\]/);
  assert.match(server, /app\.put\(\["\/api\/utenti\/:id", "\/api\/users\/:id"\]/);
  assert.match(server, /app\.patch\(\["\/api\/utenti\/:id", "\/api\/users\/:id"\]/);
  assert.match(server, /app\.delete\(\["\/api\/utenti\/:id", "\/api\/users\/:id"\]/);
  assert.match(server, /Email\/username già presente/);
  assert.match(server, /Nome utente obbligatorio/);
  assert.match(server, /Ruolo utente obbligatorio/);
  assert.match(server, /Negozio assegnato non valido/);
  assert.doesNotMatch(userBackendBlock, /practiceNumber|Numero atto/);
  assert.match(app, /Utente creato correttamente/);
  assert.match(app, /Utente aggiornato correttamente/);
  assert.match(app, /data-user-activity/);
  assert.match(app, /function canCreateUsersUi/);
  assert.match(app, /function canDeleteUserRow[\s\S]*isFounder\(\)/);
  assert.match(app, /data-delete-user/);
  assert.match(app, /Elimina utente/);
  assert.match(app, /Sei sicuro di voler eliminare questo utente/);
  assert.match(app, /Nessuna attività registrata/);
  assert.match(app, /displayMenuUserName/);
  assert.match(app, /displayUserFullName/);
  assert.match(app, /function isFounderUser/);
  assert.match(app, /if \(isFounderUser\(user\)\) return "Elite"/);
  assert.match(app, /loggedUserName\.textContent = `\$\{displayMenuUserName/);
  assert.match(app, /sessionUsername\.textContent = displayMenuUserName/);
  assert.match(app, /mainUserMenuButton\.textContent = displayMenuUserName\(state\.currentUser\)/);
  assert.match(index, /id="mainUserMenuButton"[^>]*>Elite<\/button>/);
  assert.doesNotMatch(index, /Account OroActive/);
  assert.doesNotMatch(index, /id="mainUserMenuButton"[^>]*>Utente<\/button>/);
  assert.match(index, /<option value="founder">Founder<\/option>/);
  assert.match(app, /emailLabel\.hidden = !emailAllowed/);
  assert.match(app, /if \(role === "founder"\)[\s\S]*payload\.email/);
  assert.match(app, /isFounderUser\(user\) && user\.email/);
  assert.match(app, /roleSelect\.disabled = editingFounder/);
  assert.match(app, /state\.currentUser = \{ \.\.\.state\.currentUser, \.\.\.savedUser \}/);
  assert.match(server, /email: role === "founder" \? row\.email : ""/);
  assert.match(server, /if \(!targetIsFounder\)[\s\S]*delete input\.email/);
  assert.match(server, /function canUseRequestedRoleForUpdate/);
  assert.match(server, /targetRole === "founder"[\s\S]*normalizedRequestedRole === "founder"/);
  assert.match(server, /unauthorized_user_create_attempt/);
  assert.match(server, /unauthorized_user_delete_attempt/);
  assert.match(server, /actorRole !== "founder"/);
  assert.match(server, /Non puoi eliminare il tuo stesso utente\./);
  assert.match(server, /Non puoi eliminare l'unico Founder attivo\./);
  assert.match(server, /UPDATE utenti[\s\S]*SET attivo = FALSE/);
  assert.match(server, /user_deleted/);
  assert.match(server, /user_deactivated/);
  assert.match(server, /Utente eliminato correttamente/);
  assert.match(server, /COALESCE\(attivo, TRUE\) = TRUE/);
  assert.match(app, /return ROLE_LEVELS\.find\(\(level\) => level\.role === normalizeRole\(user\?\.ruolo\)\) \|\| null/);
  assert.match(app, /Fondatore OroActive/);
  assert.match(app, /userSaveErrorMessage/);
  assert.doesNotMatch(saveUserBlock, /Numero atto|numerazione della pratica/);
  assert.match(saveUserBlock, /saveButton\.disabled = true/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS user_activity_logs/);
  assert.match(schema, /ALTER TABLE utenti ADD COLUMN IF NOT EXISTS updated_at/);
});

test("elenco atti ha solo apri modifica riapri elimina e query operative escludono eliminati", async () => {
  const [app, server, schema] = await Promise.all([
    file("app.js"),
    file("server.js"),
    file("schema.sql")
  ]);
  const actionsStart = app.indexOf("function archiveRowActionsMarkup");
  const actionsEnd = app.indexOf("function dateParts", actionsStart);
  const actionsBlock = app.slice(actionsStart, actionsEnd);
  const archiveRenderStart = app.indexOf("function renderArchiveGroups");
  const archiveRenderEnd = app.indexOf("function archivePaginationMarkup", archiveRenderStart);
  const archiveRenderBlock = app.slice(archiveRenderStart, archiveRenderEnd);

  assert.match(actionsBlock, /data-open-act/);
  assert.match(actionsBlock, /data-edit-act/);
  assert.match(actionsBlock, /data-delete-act/);
  assert.doesNotMatch(actionsBlock, /Completa pratica|approve-delete|request-delete/);
  assert.match(archiveRenderBlock, /Pratica<\/span><span>Negozio<\/span><span>Cliente<\/span><span>Date<\/span><span>Stato<\/span><span>Totale<\/span><span>Operatore<\/span><span>Azioni/);
  assert.match(archiveRenderBlock, /workflowStatusListLabel/);
  assert.match(app, /Sei sicuro di voler eliminare definitivamente questo atto/);
  assert.match(app, /loadDashboard\(\)/);
  assert.match(server, /deleted_by = \$2::bigint/);
  assert.match(server, /realCompletedStatusSql\("a"\)/);
  assert.match(server, /visibleRealActStatusSql/);
  assert.match(schema, /ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS deleted_by/);
});

test("antifrode non mostra atti eliminati e sincronizza gli alert collegati", async () => {
  const server = await file("server.js");
  const listStart = server.indexOf("async function listAntifraudAlerts");
  const listEnd = server.indexOf("async function updateAntifraudAlert", listStart);
  const listBlock = server.slice(listStart, listEnd);
  const deleteStart = server.indexOf("async function deleteAct");
  const deleteEnd = server.indexOf("async function createUser", deleteStart);
  const deleteBlock = server.slice(deleteStart, deleteEnd);
  const scanStart = server.indexOf("async function scanAntifraud");
  const scanEnd = server.indexOf("async function listAntifraudAlerts", scanStart);
  const scanBlock = server.slice(scanStart, scanEnd);

  assert.match(listBlock, /LEFT JOIN \$\{actsTable\} a ON a\.id = af\.atto_id/);
  assert.match(listBlock, /af\.atto_id IS NULL OR/);
  assert.match(listBlock, /a\.deleted_at IS NULL/);
  assert.match(listBlock, /COALESCE\(a\.status, ''\) NOT ILIKE 'deleted'/);
  assert.match(deleteBlock, /UPDATE antifrode_alerts/);
  assert.match(deleteBlock, /stato = 'atto_eliminato'/);
  assert.match(scanBlock, /FROM antiriciclaggio_alerts ar/);
  assert.match(scanBlock, /LEFT JOIN \$\{actsTable\} a ON a\.id = ar\.atto_id/);
  assert.match(scanBlock, /normalizeWorkflowStatus\(existing\.status\) === "deleted"/);
});

test("feedback AI approvato sparisce dalla coda e si puo eliminare", async () => {
  const [app, server, schema, migration] = await Promise.all([
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260526_ai_feedback_review_workflow.sql")
  ]);
  const feedbackListStart = server.indexOf("async function listAiFeedback");
  const feedbackListEnd = server.indexOf("async function createAiFeedback", feedbackListStart);
  const feedbackListBlock = server.slice(feedbackListStart, feedbackListEnd);
  const feedbackToKnowledgeStart = server.indexOf("async function feedbackToKnowledge");
  const feedbackToKnowledgeEnd = server.indexOf("async function searchAiChunksBySource", feedbackToKnowledgeStart);
  const feedbackToKnowledgeBlock = server.slice(feedbackToKnowledgeStart, feedbackToKnowledgeEnd);
  const notesStart = app.indexOf("function renderKnowledgeNotes");
  const notesEnd = app.indexOf("async function loadKnowledgeNotes", notesStart);
  const notesBlock = app.slice(notesStart, notesEnd);

  assert.match(feedbackListBlock, /COALESCE\(status, 'da_valutare'\) = 'da_valutare'/);
  assert.match(feedbackToKnowledgeBlock, /SET status = 'approvato'/);
  assert.match(feedbackToKnowledgeBlock, /knowledge_note_id = \$2::bigint/);
  assert.match(server, /async function deleteAiFeedback/);
  assert.match(server, /app\.delete\("\/api\/ai\/feedback\/:id"/);
  assert.match(app, /data-delete-ai-feedback/);
  assert.match(app, /async function deleteAiFeedback/);
  assert.doesNotMatch(notesBlock, /data-reject-knowledge|>Rifiuta</);
  assert.match(schema, /ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'da_valutare'/);
  assert.match(migration, /ALTER TABLE ai_feedback ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'da_valutare'/);
});

test("strumenti contiene collegamento verificabile al sito OroActive", async () => {
  const [index, app] = await Promise.all([
    file("index.html"),
    file("app.js")
  ]);

  assert.match(index, /id="mainMenuActions"/);
  assert.match(index, /id="brandDropdown"/);
  assert.match(app, /label: "Sito web OroActive"[\s\S]*action: "website"/);
  assert.match(app, /data-menu-action="\$\{escapeHtml\(item\.action\)\}"/);
  assert.match(app, /const OROACTIVE_WEBSITE_URL = "http:\/\/wcfme33owxz0wfkr0ysnzthy\.188\.213\.161\.151\.sslip\.io\/"/);
  assert.match(app, /function openOroActiveWebsite/);
  assert.match(app, /window\.open\(OROACTIVE_WEBSITE_URL, "_blank", "noopener,noreferrer"\)/);
});

test("mascotte Aurum interattiva usa gufo dorato, flag e AI esistente", async () => {
  const [index, app, styles, server, schema, migration, quizMigration, repliesMigration, directMessagesMigration] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("styles.css"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260527_aurum_interaction_memory.sql"),
    file("migrations/20260527_aurum_memories_messages_quiz.sql"),
    file("migrations/20260527_aurum_message_replies.sql"),
    file("migrations/20260527_direct_user_messages.sql")
  ]);

  assert.match(index, /id="aurumMascotRoot"/);
  assert.match(index, /aria-label="Aurum Assistente OroActive"/);
  assert.match(index, /gufo dorato AI OroActive/);
  assert.match(index, /Aurum — Assistente OroActive/);
  assert.match(index, /Mascotte AI ufficiale/);
  assert.match(index, /id="aurumManagementPanel"/);
  assert.match(index, /Gestione Aurum/);
  assert.match(app, /label: "Gestione Aurum"[\s\S]*section: "aurumAdmin"/);
  assert.match(index, /id="userMessagesPanel"/);
  assert.match(index, /id="userMessageRecipient"/);
  assert.match(index, /id="aurumMessageRecipient"/);
  assert.match(index, /id="aurumConsentPanel"/);
  assert.match(index, /id="aurumUserMemoryToggle"/);
  assert.match(index, /id="aurumTutorToolbar"/);
  assert.match(index, /data-aurum-tutorial="tutorial_compila_atto"/);
  assert.match(index, /data-aurum-tutorial="tutorial_stampa_copia_aziendale"/);
  assert.match(index, /data-aurum-field-help/);
  assert.match(index, /data-aurum-quiz/);
  assert.match(index, /Sì, ricordalo/);
  assert.doesNotMatch(index, /<section class="main-menu-screen"[\s\S]*id="aurumMascotRoot"[\s\S]*<\/section>\s*<div class="app-shell">/);
  assert.doesNotMatch(index, /id="aurumFounderTestPanel"|Test Mascotte AI|Funzione sperimentale/);
  assert.doesNotMatch(app, /ENABLE_AURUM_MASCOT_TEST|AURUM_MASCOT_STORAGE_KEY|setAurumMascotTestActive/);
  assert.match(app, /const ENABLE_AURUM_MASCOT = true/);
  assert.match(app, /AURUM_SECTION_TIPS/);
  assert.match(app, /OROACTIVE_APP_GUIDE/);
  assert.match(app, /AURUM_FIELD_HELP/);
  assert.match(app, /AURUM_LIVE_TUTORIALS/);
  assert.match(app, /tutorial_stampa_copia_aziendale/);
  assert.match(app, /AURUM_DEFAULT_SETTINGS/);
  assert.match(app, /function maybeShowAurumDailyGreeting/);
  assert.match(app, /aurum_greeting_/);
  assert.match(app, /function classifyAurumMood/);
  assert.match(app, /function startAurumTutorial/);
  assert.match(app, /function handleAurumTutorRequest/);
  assert.match(app, /function ensureAurumHelpAttributes/);
  assert.match(app, /tutorial_operativo/);
  assert.match(app, /function sendAurumDirectMessage/);
  assert.match(app, /function renderAurumMessageRecipients/);
  assert.match(app, /function aurumMessageDirectionLabel/);
  assert.match(app, /function saveAurumMemory/);
  assert.match(app, /function recordAurumInteractionMemory/);
  assert.match(app, /function loadAurumAllMemories/);
  assert.match(app, /function resetAurumVisibleChat/);
  const resetAurumChatStart = app.indexOf("function resetAurumVisibleChat");
  const resetAurumChatEnd = app.indexOf("function closeAurumChat", resetAurumChatStart);
  const resetAurumChatBlock = app.slice(resetAurumChatStart, resetAurumChatEnd);
  assert.match(resetAurumChatBlock, /state\.aurumMessages = \[\]/);
  assert.match(resetAurumChatBlock, /state\.aurumLastUserMessage = ""/);
  assert.doesNotMatch(resetAurumChatBlock, /aurumMemories\s*=/);
  assert.doesNotMatch(resetAurumChatBlock, /aurumAllMemories\s*=/);
  assert.match(app, /function startAurumCuriosityQuiz/);
  assert.match(app, /function evaluateAurumQuizAnswer/);
  assert.match(app, /function renderUserMessages/);
  assert.match(app, /function replyAurumMessage/);
  assert.match(app, /function deleteAurumMessage/);
  assert.match(app, /data-reply-aurum-message/);
  assert.match(app, /data-delete-aurum-message/);
  assert.match(app, /recipient_user_id: recipientId/);
  assert.match(app, /Solo visualizzazione Founder/);
  assert.match(app, /AURUM_COMPRO_ORO_QUIZ/);
  assert.match(app, /function updateAurumMascotVisibility/);
  assert.match(app, /function askAurum/);
  assert.match(app, /apiRequest\("\/ai\/assistente"/);
  assert.match(app, /interface: "aurum_operational_tutor"/);
  assert.match(app, /visibleFields: visibleAurumFields\(\)/);
  assert.match(app, /availableActions: visibleAurumActions\(\)/);
  assert.match(app, /apiRequest\("\/aurum\/memories"/);
  assert.match(app, /apiRequest\("\/aurum\/memories\/all"/);
  assert.match(app, /apiRequest\("\/aurum\/support-requests"/);
  assert.match(server, /Sei Aurum, assistente operativo intelligente di OroActive/);
  assert.match(server, /Tutorial operativo\. Rispondi con guida concreta/);
  assert.match(server, /app\.get\("\/api\/aurum\/memories"/);
  assert.match(server, /app\.get\("\/api\/aurum\/memories\/all", requireFounder/);
  assert.match(server, /app\.post\("\/api\/aurum\/memories"/);
  assert.match(server, /app\.post\("\/api\/aurum\/support-requests"/);
  assert.match(server, /app\.patch\("\/api\/aurum\/support-requests\/:id\/reply"/);
  assert.match(server, /app\.delete\("\/api\/aurum\/support-requests\/:id"/);
  assert.match(server, /function replyAurumSupportRequest/);
  assert.match(server, /function deleteAurumSupportRequest/);
  assert.match(server, /recipient_user_id/);
  assert.match(server, /founder_observer/);
  assert.match(server, /can_reply: isRecipient/);
  assert.match(server, /sanitizeAurumMemoryText/);
  assert.match(server, /Memoria non salvata: contiene dati personali o sensibili/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS aurum_support_requests/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS aurum_user_memories/);
  assert.match(schema, /aurum_user_memories_type_idx/);
  assert.match(schema, /response_message TEXT/);
  assert.match(schema, /recipient_user_id BIGINT/);
  assert.match(schema, /aurum_support_requests_recipient_idx/);
  assert.match(schema, /aurum_support_requests_deleted_idx/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS aurum_support_requests/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS aurum_user_memories/);
  assert.match(quizMigration, /aurum_user_memories_type_idx/);
  assert.match(quizMigration, /aurum_support_requests_role_idx/);
  assert.match(repliesMigration, /response_message TEXT/);
  assert.match(repliesMigration, /aurum_support_requests_deleted_idx/);
  assert.match(directMessagesMigration, /recipient_user_id BIGINT/);
  assert.match(directMessagesMigration, /aurum_support_requests_recipient_idx/);
  assert.match(styles, /\.aurum-mascot-root/);
  assert.match(styles, /\.aurum-mascot-root \{[\s\S]*z-index: 9000/);
  assert.match(styles, /\.main-menu-screen:not\(\[hidden\]\) ~ \.aurum-mascot-root \{[\s\S]*opacity: 1[\s\S]*pointer-events: none/);
  assert.doesNotMatch(styles, /\.main-menu-screen:not\(\[hidden\]\) ~ \.aurum-mascot-root:not\(\.aurum-panel-open\)[\s\S]*opacity: 0/);
  assert.match(styles, /\.aurum-mascot-root\.aurum-panel-open/);
  assert.match(styles, /\.aurum-chat-panel[\s\S]*position: fixed/);
  assert.match(styles, /\.aurum-chat-panel[\s\S]*z-index: 9001/);
  assert.match(styles, /\.aurum-chat-panel[\s\S]*max-height: min\(720px, calc\(100vh - 32px\)\)/);
  assert.match(styles, /\.aurum-chat-header[\s\S]*flex-shrink: 0/);
  assert.match(styles, /\.aurum-chat-log[\s\S]*overscroll-behavior: contain/);
  assert.match(styles, /#aurumUserMemories[\s\S]*overflow-y: auto/);
  assert.match(styles, /\.aurum-list-row span[\s\S]*overflow-wrap: anywhere/);
  assert.match(styles, /\.aurum-list-row textarea/);
  assert.match(styles, /#aurumAskButton/);
  assert.match(styles, /\.aurum-chat-form label/);
  assert.match(styles, /\.aurum-mascot-root\.aurum-roaming/);
  assert.match(styles, /\.aurum-owl/);
  assert.match(styles, /\.aurum-body/);
  assert.match(styles, /\.aurum-wing-left/);
  assert.match(styles, /@keyframes aurum-breath/);
  assert.match(styles, /@keyframes aurum-blink/);
  assert.match(styles, /@keyframes aurum-wing-soft/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(app, /aurum-panel-open/);
  assert.match(app, /Nessuna memoria salvata al momento/);
  assert.match(app, /event\.key === "Escape"[\s\S]*closeAurumChat/);
});

test("Aurum Shield calcola risk score e integra atti dashboard antifrode CRM", async () => {
  const [index, app, server, schema, migration, styles] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260527_aurum_shield_risk_scoring.sql"),
    file("styles.css")
  ]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS aurum_shield_scores/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS aurum_shield_alerts/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS aurum_shield_settings/);
  assert.match(schema, /ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS aurum_shield_score/);
  assert.match(migration, /cash_limit_amount/);
  assert.match(migration, /idx_aurum_shield_alerts_status/);

  assert.match(server, /defaultAurumShieldSettings/);
  assert.match(server, /function calculateAurumShieldRisk/);
  assert.match(server, /function persistAurumShieldForAct/);
  assert.match(server, /function dashboardAurumShieldStats/);
  assert.match(server, /app\.post\("\/api\/aurum-shield\/evaluate"/);
  assert.match(server, /app\.get\("\/api\/aurum-shield\/settings"/);
  assert.match(server, /app\.put\("\/api\/aurum-shield\/settings", requireFounder/);
  assert.match(server, /app\.get\("\/api\/aurum-shield\/sale-deed\/:id"/);
  assert.match(server, /app\.get\("\/api\/aurum-shield\/client\/:id"/);
  assert.match(server, /app\.get\("\/api\/aurum-shield\/alerts"/);
  assert.match(server, /app\.put\("\/api\/aurum-shield\/alerts\/:id\/review"/);
  assert.match(server, /status = 'atto_eliminato'/);
  assert.match(server, /cash_over_limit/);
  assert.match(server, /Math\.max\(score, 85\)/);
  assert.match(server, /LEFT JOIN LATERAL \(/);

  assert.match(index, /id="aurumShieldCard"/);
  assert.match(index, /id="aurumShieldSettingsForm"/);
  assert.match(app, /label: "Aurum Shield"[\s\S]*section: "aurumShield"/);
  assert.match(app, /function scheduleAurumShieldEvaluation/);
  assert.match(app, /function confirmAurumShieldBeforeFinalSave/);
  assert.match(app, /apiRequest\("\/aurum-shield\/evaluate"/);
  assert.match(app, /apiRequest\("\/aurum-shield\/alerts"/);
  assert.match(app, /apiRequest\("\/aurum-shield\/settings"/);
  assert.match(app, /aurumShieldBadgeMarkup\(act\.aurumShield\)/);
  assert.match(app, /detail\.aurum_shield/);
  assert.match(app, /Shield medio/);
  assert.match(app, /showAurumTip\("Questa pratica merita un controllo in più/);
  assert.match(styles, /\.aurum-shield-card/);
  assert.match(styles, /\.aurum-shield-badge\.risk-critical/);
});

test("controllo qualità guidato blocca completamento e stampe finali", async () => {
  const [index, app, server, schema, migration, styles] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260527_guided_quality_check.sql"),
    file("styles.css")
  ]);

  assert.match(index, /id="guidedQualityPanel"/);
  assert.match(index, /Controllo Qualità Guidato/);
  assert.match(index, /id="guidedQualityList"/);
  assert.match(styles, /\.guided-quality-panel/);
  assert.match(styles, /\.quality-target-highlight/);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS quality_checks/);
  assert.match(schema, /ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS quality_check_status/);
  assert.match(schema, /idx_quality_checks_sale_deed_id/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS quality_checks/);
  assert.match(migration, /idx_quality_checks_status/);

  assert.match(server, /async function validateQualityChecklist/);
  assert.match(server, /async function assertQualityAllowsFinalSave/);
  assert.match(server, /async function saveQualityCheckResult/);
  assert.match(server, /app\.post\("\/api\/quality-check\/validate"/);
  assert.match(server, /app\.post\("\/api\/quality-check\/save"/);
  assert.match(server, /Pratica non completabile/);
  assert.match(server, /quality_check_status = \$2::text/);
  assert.match(server, /persistQualityCheckForAct/);

  assert.match(app, /function renderGuidedQualityCheck/);
  assert.match(app, /async function validateQualityChecklist/);
  assert.match(app, /async function ensureGuidedQualityAllows/);
  assert.match(app, /apiRequest\("\/quality-check\/validate"/);
  assert.match(app, /data-quality-target/);
  assert.match(app, /focusQualityTarget/);
  assert.match(app, /showAurumTip\(`Aurum ha controllato la pratica:/);
  assert.match(app, /async function validateSaleDeedForCompletion/);
  assert.match(app, /function showSaleDeedValidationModal/);
  assert.match(app, /data-quality-completion-choice="suspend"/);
  assert.match(app, /ensureGuidedQualityAllows\(isCompletion \? "complete" : "archive"/);
  assert.match(app, /ensureGuidedQualityAllows\("print"/);

  const archiveStart = app.indexOf("async function archiveCurrentPractice");
  const archiveEnd = app.indexOf("function compactActForAi", archiveStart);
  const archiveBlock = app.slice(archiveStart, archiveEnd);
  assert.match(archiveBlock, /requestedStatus !== "draft"/);
  assert.match(archiveBlock, /ensureGuidedQualityAllows/);

  const completeStart = app.indexOf("async function completeCurrentPractice");
  const completeEnd = app.indexOf("navItems.forEach", completeStart);
  const completeBlock = app.slice(completeStart, completeEnd);
  assert.match(completeBlock, /archiveCurrentPractice\("completed"\)/);
  assert.doesNotMatch(completeBlock, /runAiActCheck|Controllo AI/);
  assert.doesNotMatch(completeBlock, /archiviato\. Potrai completarlo da Elenco/);
});

test("OroActive Audit Trail traccia azioni utenti e ha UI Founder", async () => {
  const [index, app, server, schema, migration, styles] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260528_oroactive_audit_trail.sql"),
    file("styles.css")
  ]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS audit_logs/);
  assert.match(schema, /user_name TEXT/);
  assert.match(schema, /before_data JSONB DEFAULT NULL/);
  assert.match(schema, /after_data JSONB DEFAULT NULL/);
  assert.match(schema, /idx_audit_logs_action/);
  assert.match(schema, /idx_audit_logs_store_id/);
  assert.match(migration, /ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'api_request'/);
  assert.match(migration, /idx_audit_logs_entity_type/);

  assert.match(server, /async function writeAuditLog/);
  assert.match(server, /function compactAuditPayload/);
  assert.match(server, /function listAuditLogs/);
  assert.match(server, /function getAuditLogDetail/);
  assert.match(server, /function dashboardAuditSummary/);
  assert.match(server, /AUDIT LOG ERROR/);
  assert.match(server, /app\.get\("\/api\/audit-logs"/);
  assert.match(server, /app\.get\("\/api\/audit-logs\/:id"/);
  assert.match(server, /action: "login"/);
  assert.match(server, /action: "login_failed"/);
  assert.match(server, /action: "delete_act"/);
  assert.match(server, /action: "modify_payment"/);
  assert.match(server, /action: "change_user_role"/);
  assert.match(server, /action: "download_backup"/);
  assert.match(server, /action: "risk_score_calculated"/);
  assert.match(server, /quality_check_executed/);
  assert.match(server, /FROM audit_logs al/);
  assert.match(server, /audit_summary: auditSummary/);

  assert.match(index, /id="auditTrail"/);
  assert.match(app, /label: "Audit Trail"[\s\S]*section: "auditTrail"/);
  assert.match(index, /id="auditTrailFilters"/);
  assert.match(index, /id="auditTrailList"/);
  assert.match(app, /async function loadAuditTrail/);
  assert.match(app, /function renderAuditTrail/);
  assert.match(app, /function viewAuditLog/);
  assert.match(app, /apiRequest\(`\/audit-logs/);
  assert.match(app, /apiRequest\(`\/audit-logs\/\$\{encodeURIComponent\(id\)\}`/);
  assert.match(app, /Oggi nell'app/);
  assert.match(styles, /\.audit-trail-filters/);
  assert.match(styles, /\.audit-action-badge/);
  assert.match(styles, /\.audit-detail-grid/);
});

test("workflow autorizzazioni blocca pratiche rischiose e traccia Audit Trail", async () => {
  const [index, app, server, schema, migration, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260528_sale_deed_approval_workflow.sql"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(schema, /ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS approval_status/);
  assert.match(schema, /ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS approval_request_id/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS approval_requests/);
  assert.match(schema, /idx_approval_requests_sale_deed_id/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS approval_requests/);
  assert.match(migration, /idx_approval_requests_status/);

  assert.match(server, /async function assertApprovalAllowsFinalSave/);
  assert.match(server, /async function createApprovalRequest/);
  assert.match(server, /async function reviewApprovalRequest/);
  assert.match(server, /app\.get\("\/api\/approvals"/);
  assert.match(server, /app\.post\("\/api\/approvals\/request"/);
  assert.match(server, /app\.post\("\/api\/approvals\/:id\/approve"/);
  assert.match(server, /app\.post\("\/api\/approvals\/:id\/reject"/);
  assert.match(server, /approval_required = true/);
  assert.match(server, /approval_required_blocked_completion/);
  assert.match(server, /sale_deed_completed_after_approval/);

  assert.match(index, /id="approvals"/);
  assert.match(app, /label: "Autorizzazioni"[\s\S]*section: "approvals"/);
  assert.match(index, /id="approvalsList"/);
  assert.match(app, /async function loadApprovals/);
  assert.match(app, /function renderApprovals/);
  assert.match(app, /async function requestApprovalForCurrentPractice/);
  assert.match(app, /function shouldRequestApprovalForQuality/);
  assert.match(app, /function hasApprovedApprovalForCurrentAct/);
  assert.match(app, /confirmAurumShieldBeforeFinalSave\(shield, options = \{\}\)/);
  assert.match(app, /apiRequest\("\/approvals\/request"/);
  assert.match(app, /data-approve-approval/);
  assert.match(app, /In attesa autorizzazione/);
  assert.match(styles, /\.approvals-table/);
  assert.match(styles, /\.approval-status\.approval-approved/);
  assert.match(worker, /aurum-global-1/);
});

test("notifiche interne hanno schema API UI e polling leggero", async () => {
  const [index, app, server, schema, migration, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260528_internal_notifications.sql"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS notifications/);
  assert.match(schema, /idx_notifications_user_id/);
  assert.match(schema, /idx_notifications_read_at/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS notifications/);
  assert.match(migration, /idx_notifications_created_at/);

  assert.match(server, /async function createNotification/);
  assert.match(server, /async function listNotifications/);
  assert.match(server, /async function notificationUnreadCount/);
  assert.match(server, /app\.get\("\/api\/notifications"/);
  assert.match(server, /app\.get\("\/api\/notifications\/unread-count"/);
  assert.match(server, /app\.put\("\/api\/notifications\/read-all"/);
  assert.match(server, /app\.put\("\/api\/notifications\/:id\/read"/);
  assert.match(server, /app\.delete\("\/api\/notifications\/:id"/);
  assert.match(server, /notification_created/);
  assert.match(server, /approval_request/);
  assert.match(server, /aurum_shield_alert/);
  assert.match(server, /quality_check_failed/);
  assert.match(server, /backup_created/);
  assert.match(server, /deed_deleted/);
  assert.match(server, /aurum_support_request/);
  assert.match(server, /academy_course_assigned/);

  assert.match(index, /id="notificationCenter"/);
  assert.match(index, /id="notificationBell"/);
  assert.match(index, /id="notificationDropdown"/);
  assert.match(index, /id="notifications"/);
  assert.match(app, /label: "Notifiche"[\s\S]*section: "notifications"/);
  assert.match(app, /NOTIFICATION_POLL_INTERVAL_MS = 60000/);
  assert.match(app, /async function loadNotificationDropdown/);
  assert.match(app, /async function loadNotificationsPage/);
  assert.match(app, /function renderNotificationsPage/);
  assert.match(app, /apiRequest\("\/notifications\/unread-count"/);
  assert.match(app, /apiRequest\(`\/notifications\?\$\{notificationFilterParams/);
  assert.match(app, /setScreen\("notifications"\)/);
  assert.match(styles, /\.notification-center/);
  assert.match(styles, /\.notification-bell/);
  assert.match(styles, /\.notification-dropdown/);
  assert.match(styles, /\.notifications-table/);
  assert.match(worker, /aurum-global-1/);
});

test("pratiche sospese hanno schema API UI e non contaminano elenco giacenza", async () => {
  const [index, app, server, schema, migration, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260528_suspended_practices.sql"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(schema, /ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS suspended_reason/);
  assert.match(schema, /ALTER TABLE atti_vendita ADD COLUMN IF NOT EXISTS suspended_reasons/);
  assert.match(schema, /ALTER TABLE atti_vendita ALTER COLUMN status SET DEFAULT 'draft'/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS suspended_practice_logs/);
  assert.match(schema, /status = 'suspended'/);
  assert.match(schema, /idx_suspended_practice_logs_sale_deed_id/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS suspended_practice_logs/);
  assert.match(migration, /atti_vendita_suspended_status_idx/);

  assert.match(server, /function reservedActNumberStatusSql/);
  assert.match(server, /function suspendedStatusWhere/);
  assert.match(server, /async function listSuspendedPractices/);
  assert.match(server, /async function suspendPractice/);
  assert.match(server, /async function resolveSuspendedPractice/);
  assert.match(server, /async function deleteSuspendedPractice/);
  assert.match(server, /app\.get\("\/api\/suspended-practices"/);
  assert.match(server, /app\.post\("\/api\/suspended-practices\/:id\/suspend"/);
  assert.match(server, /app\.post\("\/api\/suspended-practices\/:id\/resolve-check"/);
  assert.match(server, /app\.delete\("\/api\/suspended-practices\/:id"/);
  assert.match(server, /sale_deed_suspended/);
  assert.match(server, /suspended_practice_created/);
  assert.match(server, /dashboardSuspendedPracticeStats/);

  assert.match(index, /id="suspendedPractices"/);
  assert.match(app, /label: "Pratiche sospese"[\s\S]*section: "suspendedPractices"/);
  assert.match(index, /id="archiveIncludeSuspended"/);
  assert.match(index, /id="saveSuspendedPractice"/);
  assert.match(index, /id="suspendedPracticesList"/);
  assert.match(app, /async function loadSuspendedPractices/);
  assert.match(app, /function renderSuspendedPractices/);
  assert.match(app, /async function saveCurrentPracticeAsSuspended/);
  assert.match(app, /function archiveShowsSuspended/);
  assert.match(app, /includeSuspended: archiveShowsSuspended\(\)/);
  assert.match(app, /apiRequest\(`\/suspended-practices/);
  assert.match(app, /isCompletedWorkflowStatus\(status\) \|\| \(archiveShowsSuspended\(\) && suspendedStatus\)/);
  assert.match(app, /\.filter\(\(act\) => isCompletedWorkflowStatus\(act\.status\)\)/);
  assert.match(styles, /\.suspended-practices-table/);
  assert.match(styles, /\.status-suspended/);
  assert.match(worker, /aurum-global-1/);
});

test("nuovo atto si apre senza attendere la numerazione remota", async () => {
  const app = await file("app.js");
  const enterStart = app.indexOf("async function enterSectionFromMainMenu");
  const enterEnd = app.indexOf("async function clearPracticeForFreshStart", enterStart);
  const enterBlock = app.slice(enterStart, enterEnd);
  const metaStart = app.indexOf("async function setPracticeMeta");
  const metaEnd = app.indexOf("async function updatePracticeNumber", metaStart);
  const metaBlock = app.slice(metaStart, metaEnd);

  assert.match(enterBlock, /route\.screen === "practice"[\s\S]*setScreen\(route\.screen\);[\s\S]*clearPracticeForFreshStart\(\{ deferPracticeNumber: true \}\)/);
  assert.match(metaBlock, /deferPracticeNumber/);
  assert.match(metaBlock, /In assegnazione/);
  assert.match(app, /if \(!fieldValue\("#practiceNumber"\)\) await updatePracticeNumber\(\)/);
});

test("errori database sono separati per modulo", async () => {
  const server = await file("server.js");
  const friendlyStart = server.indexOf("function friendlyDatabaseError");
  const friendlyEnd = server.indexOf("app.use((error", friendlyStart);
  const friendlyBlock = server.slice(friendlyStart, friendlyEnd);

  assert.match(friendlyBlock, /utenti\|users/);
  assert.match(friendlyBlock, /Email\/username già presente/);
  assert.match(friendlyBlock, /api.*atti/);
  assert.match(friendlyBlock, /api.*acts/);
  assert.match(friendlyBlock, /Numero atto già presente/);
  assert.match(friendlyBlock, /Errore database durante il salvataggio CRM/);
  assert.match(friendlyBlock, /Errore database durante il backup/);
  assert.match(friendlyBlock, /Errore database durante il salvataggio Academy/);
});

test("qualita generale protegge click doppi messaggi tecnici e caricamenti sezione", async () => {
  const [index, app, server, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("service-worker.js")
  ]);
  const loginStart = app.indexOf("async function handleLogin");
  const loginEnd = app.indexOf("function bytesToBase64Url", loginStart);
  const loginBlock = app.slice(loginStart, loginEnd);
  const toastStart = app.indexOf("function showToast");
  const toastEnd = app.indexOf("function showLogin", toastStart);
  const toastBlock = app.slice(toastStart, toastEnd);
  const setScreenStart = app.indexOf("function setScreen");
  const setScreenEnd = app.indexOf("async function handleScreenDataLoad", setScreenStart);
  const setScreenBlock = app.slice(setScreenStart, setScreenEnd);
  const errorStart = server.indexOf("function friendlyDatabaseError");
  const errorBlock = server.slice(errorStart);

  assert.match(app, /loggingIn: false/);
  assert.match(loginBlock, /if \(state\.loggingIn\) return/);
  assert.match(loginBlock, /submitButton\.disabled = true/);
  assert.match(loginBlock, /submitButton\.textContent = "Accesso\.\.\."/);
  assert.match(loginBlock, /faceIdLoginButton\.disabled = true/);
  assert.match(loginBlock, /Connessione al server non disponibile\. Riprova tra qualche secondo\./);
  assert.match(app, /function cleanUserMessage/);
  assert.match(app, /Failed to fetch\|NetworkError\|Load failed/);
  assert.match(toastBlock, /cleanUserMessage\(message\)/);
  assert.match(app, /function withButtonBusy/);
  assert.match(setScreenBlock, /handleScreenDataLoad\(id\)\.catch/);
  assert.match(setScreenBlock, /sectionLoadErrorMessage/);
  assert.match(server, /function publicErrorMessage/);
  assert.match(server, /function looksTechnicalErrorMessage/);
  assert.match(server, /function safeRouteErrorMessage/);
  assert.doesNotMatch(errorBlock, /payload\.code/);
  assert.doesNotMatch(server, /UPDATE PAYLOAD|ATTO ID/);
  assert.match(index, /app\.js\?v=20260529-aurum-global-1/);
  assert.match(index, /styles\.css\?v=20260529-aurum-global-1/);
  assert.match(worker, /aurum-global-1/);
  const sectionIds = new Set([...index.matchAll(/<section[^>]+id="([^"]+)"/g)].map((match) => match[1]));
  const menuTargets = [...new Set([...index.matchAll(/data-section="([^"]+)"/g)].map((match) => match[1]))];
  assert.deepEqual(menuTargets.filter((target) => !sectionIds.has(target)), []);
});

test("design system OroActive centralizza tema componenti e stati UI", async () => {
  const [index, styles, worker] = await Promise.all([
    file("index.html"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(styles, /OroActive Design System/);
  assert.match(styles, /--oa-black: #050505/);
  assert.match(styles, /--oa-bg-main: #050505/);
  assert.match(styles, /--oa-card-soft: #f8f6f2/i);
  assert.match(styles, /--oa-orange-soft: rgba\(255, 106, 0, 0\.12\)/);
  assert.match(styles, /--oa-orange: #ff6a00/i);
  assert.match(styles, /--oa-gold: #d4af37/i);
  assert.match(styles, /--oa-radius-lg: 16px/);
  assert.match(styles, /--oa-shadow-panel:/);
  assert.match(styles, /--orange: var\(--oa-orange\)/);
  assert.match(styles, /--muted: var\(--oa-muted\)/);
  assert.match(styles, /:where\(button, input, select, textarea, a, \[role="button"\]\):focus-visible/);
  assert.match(styles, /\.oa-glass-panel/);
  assert.match(styles, /\.oa-chip/);
  assert.match(styles, /\.oa-status\.danger/);
  assert.match(styles, /\.primary-button \{[\s\S]*var\(--oa-orange\)[\s\S]*var\(--oa-orange-2\)/);
  assert.match(styles, /\.form-panel,[\s\S]*\.side-panel > div \{[\s\S]*border-radius: var\(--oa-radius-md\)/);
  assert.match(styles, /\.dashboard-card,[\s\S]*\.dashboard-panel \{[\s\S]*border-radius: var\(--oa-radius-md\)/);
  assert.match(styles, /\.toast\.error \{[\s\S]*background: var\(--oa-danger\)/);
  assert.match(styles, /OroActive internal sections phase 2/);
  assert.match(styles, /\.workspace \{[\s\S]*var\(--oa-bg-main\)/);
  assert.match(styles, /\.topbar \{[\s\S]*linear-gradient\(135deg, rgba\(17, 17, 17, 0\.98\)/);
  assert.match(styles, /\.practice-meta,[\s\S]*\.notification-filters \{[\s\S]*linear-gradient\(180deg, #fffaf6 0%, #fff4ec 100%\)/);
  assert.match(styles, /input:focus,[\s\S]*\.date-input-frame:focus-within \{[\s\S]*border-color: var\(--oa-orange\)/);
  assert.match(styles, /\.table-row\.head \{[\s\S]*linear-gradient\(135deg, #17110d 0%, #23160e 100%\)/);
  assert.match(styles, /\.preview-dialog \{[\s\S]*max-height: calc\(100dvh - 32px/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*\.settings-list button \{[\s\S]*width: 100%/);
  assert.match(styles, /Header sezioni interne: contrasto alto su sfondo dark tech OroActive/);
  assert.match(styles, /\.oa-section-header,[\s\S]*\.archive-header,[\s\S]*\.course-hero,[\s\S]*\.settings-grid > div:first-child/);
  assert.match(styles, /\.archive-header h1,[\s\S]*\.archive-header h2,[\s\S]*\.course-hero h1,[\s\S]*\.course-hero h2[\s\S]*color: #fff/);
  assert.match(styles, /\.archive-header \.muted,[\s\S]*\.archive-header p:not\(\.eyebrow\)[\s\S]*rgba\(255, 255, 255, 0\.82\)/);
  assert.match(styles, /\.archive-header label,[\s\S]*\.founder-report-actions label,[\s\S]*\.store-health-filters label[\s\S]*rgba\(255, 255, 255, 0\.9\)/);
  assert.match(styles, /@media \(max-width: 768px\)[\s\S]*\.archive-header,[\s\S]*padding: 20px[\s\S]*font-size: 28px/);
  assert.match(index, /styles\.css\?v=20260529-aurum-global-1/);
  assert.match(worker, /aurum-global-1/);
});

test("menu principale usa macroaree centralizzate e permessi ruolo", async () => {
  const [index, app, server, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(index, /id="mainMenuQuickActions"/);
  assert.match(index, /id="mainMenuSearch"/);
  assert.match(index, /id="mainMenuActions"/);
  assert.match(index, /OroActive Control Center/);
  assert.doesNotMatch(index, /main-menu-control-sidebar|id="mainMenuSidebarActions"|id="mainMenuQuickJump"|id="mainMenuSidebarUserName"/);
  assert.match(index, /<aside class="sidebar" aria-label="Navigazione principale">/);
  assert.match(index, /id="mainMenuFounderKpis"/);
  assert.match(index, /id="mainMenuAurumButton"/);
  assert.match(index, /Bentornato, \[Nome Utente\]|Bentornato, Elite/);
  assert.match(index, /id="brandDropdown" hidden><\/div>/);
  assert.match(app, /const MENU_GROUPS = \[/);
  assert.match(app, /label: "Operatività"/);
  assert.match(app, /description: "Gestisci atti, pratiche, giacenza, fusioni e quotazioni\."/);
  assert.match(app, /id: "stock"[\s\S]*label: "Giacenza"[\s\S]*section: "giacenza"/);
  assert.match(app, /id: "melting"[\s\S]*label: "Fusioni"[\s\S]*section: "fusioni"/);
  assert.match(app, /const SECTION_ROUTE_ALIASES = \{[\s\S]*giacenza: \{ screen: "fusion", fusionView: "stock" \}[\s\S]*fusioni: \{ screen: "fusion", fusionView: "melting" \}/);
  assert.match(app, /function updateFusionScreenCopy/);
  assert.match(app, /icon: "OP"/);
  assert.match(app, /order: 10/);
  assert.match(app, /label: "Clienti"/);
  assert.match(app, /label: "Formazione"/);
  assert.match(app, /label: "Controllo e sicurezza"/);
  assert.match(app, /label: "Direzione"[\s\S]*roles: MENU_ROLES\.founder/);
  assert.match(app, /label: "Amministrazione"/);
  assert.match(app, /const MENU_QUICK_ACTIONS = \[/);
  assert.match(app, /label: "Nuovo atto"[\s\S]*section: "practice"/);
  assert.match(app, /label: "Elenco atti"[\s\S]*section: "archive"/);
  assert.match(app, /label: "Sospese"[\s\S]*section: "suspendedPractices"/);
  assert.match(app, /label: "Aurum"[\s\S]*section: "assistant"/);
  assert.match(app, /label: "Notifiche"[\s\S]*section: "notifications"/);
  assert.match(app, /function renderRoleBasedMenus/);
  assert.match(app, /menuItemMatchesSearch/);
  assert.match(app, /function menuGroupMarkup/);
  assert.match(app, /data-main-menu-toggle="\$\{escapeHtml\(submenuId\)\}"/);
  assert.match(app, /function renderFounderMenuKpis/);
  assert.match(app, /Store Health medio/);
  assert.match(app, /mainMenuFounderKpis\.hidden = !isFounder\(\)/);
  assert.match(app, /data-brand-submenu-toggle="\$\{escapeHtml\(`brandMenu-\$\{group\.id\}`\)\}"/);
  assert.match(app, /return \["founder", "supervisore", "responsabile"\]\.includes\(normalizeRole\(state\.currentUser\?\.ruolo\)\)/);
  assert.match(app, /Dashboard Founder è riservata al Founder/);
  assert.match(server, /app\.get\("\/api\/dashboard"[\s\S]*normalizeRole\(request\.user\?\.ruolo\) !== "founder"[\s\S]*Non autorizzato/);
  assert.match(styles, /\.main-menu-control-shell/);
  assert.match(styles, /\.main-menu-control-shell \{[\s\S]*grid-template-columns: minmax\(0, 1fr\)[\s\S]*width: 100%[\s\S]*max-width: 1440px[\s\S]*margin: 0 auto/);
  assert.doesNotMatch(styles, /grid-template-columns: 206px minmax\(0, 1fr\)/);
  assert.match(styles, /@media \(max-width: 1100px\) \{[\s\S]*\.main-menu-control-shell \{[\s\S]*grid-template-columns: minmax\(0, 1fr\)[\s\S]*max-width: none/);
  assert.match(styles, /\.main-menu-hero/);
  assert.match(styles, /\.main-menu-founder-kpis/);
  assert.match(styles, /\.main-menu-screen \{[\s\S]*overflow-y: auto/);
  assert.match(styles, /\.main-menu-inner \{[\s\S]*grid-template-rows: auto[\s\S]*overflow: visible/);
  assert.match(styles, /\.main-menu-submenu \{[\s\S]*position: relative[\s\S]*scroll-margin-bottom: 150px/);
  assert.match(styles, /\.main-menu-founder-kpis \{[\s\S]*position: relative[\s\S]*z-index: 1/);
  assert.match(styles, /\.main-menu-screen:not\(\[hidden\]\) ~ \.aurum-mascot-root \{[\s\S]*opacity: 1/);
  assert.match(app, /submenu\.scrollIntoView\(\{ block: "nearest", behavior: "smooth" \}\)/);
  assert.match(styles, /@keyframes control-center-orbit/);
  assert.match(styles, /\.main-menu-quick-actions/);
  assert.match(styles, /\.main-menu-search/);
  assert.match(styles, /\.main-menu-empty/);
  assert.match(worker, /aurum-global-1/);
});

test("Founder Daily Report ha backend UI PDF audit e conteggi sicuri", async () => {
  const [index, app, server, schema, migration, styles] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260528_founder_daily_report.sql"),
    file("styles.css")
  ]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS founder_daily_reports/);
  assert.match(schema, /UNIQUE\(report_date\)/);
  assert.match(schema, /quality_data JSONB/);
  assert.match(migration, /idx_founder_daily_reports_date/);
  assert.match(migration, /idx_founder_daily_reports_status/);
  assert.match(server, /async function generateFounderDailyReport/);
  assert.match(server, /function writeFounderDailyReportPdf/);
  assert.match(server, /realCompletedStatusSql\("a"\)/);
  assert.match(server, /suspendedStatusWhere\("a"\)/);
  assert.match(server, /app\.get\("\/api\/founder-daily-report", requireFounder/);
  assert.match(server, /app\.get\("\/api\/founder-daily-report\/:date", requireFounder/);
  assert.match(server, /app\.post\("\/api\/founder-daily-report\/generate", requireFounder/);
  assert.match(server, /app\.get\("\/api\/founder-daily-report\/:date\/pdf", requireFounder/);
  assert.match(server, /app\.post\("\/api\/founder-daily-report\/:date\/send", requireFounder/);
  assert.match(server, /founder_daily_report_generated/);
  assert.match(server, /founder_daily_report_downloaded/);
  assert.match(server, /Founder Daily Report generato/);
  assert.match(server, /Invio email non configurato/);
  assert.match(server, /actionUrl: "#founderDailyReport"/);
  assert.match(server, /Controllo pratica non completato|Founder Daily Report non completato/);
  assert.match(index, /id="founderDailyReport" class="screen founder-only"/);
  assert.match(app, /label: "Founder Daily Report"[\s\S]*section: "founderDailyReport"/);
  assert.match(index, /id="generateFounderReport"/);
  assert.match(index, /id="downloadFounderReportPdf"/);
  assert.match(index, /id="sendFounderReport"/);
  assert.match(app, /founderReports: \[\]/);
  assert.match(app, /founderReport: null/);
  assert.match(app, /Founder Daily Report è riservato al Founder/);
  assert.match(app, /async function loadFounderDailyReport/);
  assert.match(app, /async function generateFounderDailyReport/);
  assert.match(app, /async function downloadFounderDailyReportPdf/);
  assert.match(app, /async function sendFounderDailyReport/);
  assert.match(app, /apiRequest\("\/founder-daily-report\/generate"/);
  assert.match(app, /founder-daily-report\/\$\{encodeURIComponent\(date\)\}\/pdf/);
  assert.match(app, /Founder Daily Report generato\./);
  assert.match(styles, /founder-report-actions/);
  assert.match(styles, /founder-report-history-item/);
});

test("Store Health Score ha schema API UI dashboard e report Founder", async () => {
  const [index, app, server, schema, migration, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260528_store_health_score.sql"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS store_health_scores/);
  assert.match(schema, /store_id BIGINT NOT NULL/);
  assert.match(schema, /store_health_scores_store_date_unique/);
  assert.match(schema, /store_health_data JSONB/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS store_health_scores/);
  assert.match(migration, /idx_store_health_scores_store_id/);
  assert.match(migration, /store_health_scores_store_date_unique/);
  assert.match(migration, /ALTER TABLE founder_daily_reports ADD COLUMN IF NOT EXISTS store_health_data/);

  assert.match(server, /function canViewStoreHealth/);
  assert.match(server, /async function calculateStoreHealthScore/);
  assert.match(server, /function generateStoreHealthRecommendations/);
  assert.match(server, /async function storeHealthNetworkSummary/);
  assert.match(server, /app\.get\("\/api\/store-health"/);
  assert.match(server, /app\.post\("\/api\/store-health\/calculate"/);
  assert.match(server, /app\.get\("\/api\/store-health\/:storeId\/history"/);
  assert.match(server, /app\.get\("\/api\/store-health\/:storeId"/);
  assert.match(server, /realCompletedStatusSql\("a"\)/);
  assert.match(server, /suspendedStatusWhere\("a"\)/);
  assert.match(server, /store_health_score_calculated/);
  assert.match(server, /store_health_data/);
  assert.match(server, /Salute Negozio non caricata/);

  assert.match(index, /id="storeHealth" class="screen control-only"/);
  assert.match(app, /label: "Salute Negozio \/ Performance negozi"[\s\S]*section: "storeHealth"/);
  assert.match(index, /id="storeHealthFilters"/);
  assert.match(index, /id="storeHealthSummary"/);
  assert.match(index, /id="storeHealthList"/);
  assert.match(app, /storeHealth: \[\]/);
  assert.match(app, /storeHealthDateRange: null/);
  assert.match(app, /function renderStoreHealth/);
  assert.match(app, /async function loadStoreHealth/);
  assert.match(app, /async function recalculateStoreHealth/);
  assert.match(app, /async function openStoreHealthDetail/);
  assert.match(app, /data-open-store-health/);
  assert.match(app, /Salute negozi/);
  assert.match(app, /store_health_data/);
  assert.match(app, /Store Health Score ricalcolato/);
  assert.match(styles, /\.store-health-card/);
  assert.match(styles, /\.store-health-score/);
  assert.match(styles, /\.store-health-detail/);
  assert.match(worker, /aurum-global-1/);
});

test("Customer Trust Pack genera PDF protetto solo per atti completati", async () => {
  const [index, app, server, schema, migration, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260528_customer_trust_pack.sql"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS customer_trust_packs/);
  assert.match(schema, /sale_deed_id BIGINT NOT NULL/);
  assert.match(schema, /trust_pack_code TEXT UNIQUE NOT NULL/);
  assert.match(schema, /idx_customer_trust_packs_sale_deed_id/);
  assert.match(migration, /customer_trust_packs_code_unique/);
  assert.match(migration, /idx_customer_trust_packs_generated_at/);

  assert.match(server, /async function assertCustomerTrustPackEligible/);
  assert.match(server, /async function generateCustomerTrustPack/);
  assert.match(server, /async function writeCustomerTrustPackPdf/);
  assert.match(server, /drawPdfHeader\(doc,[\s\S]*Customer Trust Pack OroActive[\s\S]*centerLogo: true/);
  assert.match(server, /Il Customer Trust Pack può essere generato solo per pratiche completate o archiviate/);
  assert.match(server, /customer_trust_pack_generated/);
  assert.match(server, /customer_trust_pack_downloaded/);
  assert.match(server, /customer_trust_pack_sent_whatsapp/);
  assert.match(server, /customer_trust_pack_regenerated/);
  assert.match(server, /Content-Disposition/);
  assert.match(server, /private_uploads", "customer-trust-packs"/);
  const pdfStart = server.indexOf("async function writeCustomerTrustPackPdf");
  const pdfEnd = server.indexOf("async function generateCustomerTrustPack", pdfStart);
  const pdfBlock = server.slice(pdfStart, pdfEnd);
  assert.doesNotMatch(pdfBlock, /risk_score|aurum_shield|audit|margine|utile|autorizzazione/i);

  assert.match(app, /function canUseCustomerTrustPack/);
  assert.match(app, /function customerTrustPackButtonsMarkup/);
  assert.match(app, /async function generateCustomerTrustPackForAct/);
  assert.match(app, /async function downloadCustomerTrustPack/);
  assert.match(app, /data-open-trust-pack/);
  assert.match(app, /data-generate-trust-pack/);
  assert.match(app, /data-download-trust-pack/);
  assert.match(app, /data-email-trust-pack/);
  assert.match(app, /data-whatsapp-trust-pack/);
  assert.match(app, /detail\.trust_packs/);
  assert.match(app, /customer_trust_pack: \{/);
  assert.match(app, /Customer Trust Pack può essere generato solo per pratiche completate o archiviate/);
  assert.match(styles, /\.trust-pack-panel/);
  assert.match(styles, /\.crm-trust-pack-list/);
  assert.match(index, /app\.js\?v=20260529-aurum-global-1/);
  assert.match(index, /styles\.css\?v=20260529-aurum-global-1/);
  assert.match(worker, /aurum-global-1/);
});

test("Centro Privacy OroActive espone policy, presa visione e riferimenti cliente", async () => {
  const [index, app, server, schema, migration, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260529_privacy_center.sql"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS privacy_policy_versions/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS privacy_policy_acceptances/);
  assert.match(schema, /idx_privacy_policy_versions_version/);
  assert.match(schema, /idx_privacy_policy_acceptances_user_id/);
  assert.match(schema, /idx_privacy_policy_acceptances_user_version/);
  assert.match(migration, /privacy_policy_versions/);
  assert.match(migration, /privacy_policy_acceptances/);

  assert.match(server, /const privacyPolicyVersion = "v1\.0"/);
  assert.match(server, /async function bootstrapPrivacyPolicy/);
  assert.match(server, /function writePrivacyPolicyPdf/);
  assert.match(server, /app\.get\("\/api\/privacy-policy\/current"/);
  assert.match(server, /app\.get\("\/api\/privacy-policy\/versions"/);
  assert.match(server, /app\.post\("\/api\/privacy-policy\/accept"/);
  assert.match(server, /app\.get\("\/api\/privacy-policy\/my-acceptance"/);
  assert.match(server, /app\.get\("\/api\/privacy-policy\/current\/pdf"/);
  assert.match(server, /app\.post\("\/api\/privacy-policy\/customer-notice\/viewed"/);
  assert.match(server, /app\.get\("\/api\/privacy-policy\/acceptances", requireFounder/);
  assert.match(server, /privacy_policy_viewed/);
  assert.match(server, /privacy_policy_accepted/);
  assert.match(server, /customer_privacy_notice_viewed/);

  assert.match(app, /PRIVACY_POLICY_FALLBACK/);
  assert.match(app, /label: "Centro Privacy"[\s\S]*section: "privacyCenter"/);
  assert.match(app, /async function loadPrivacyPolicyState/);
  assert.match(app, /async function acceptPrivacyPolicy/);
  assert.match(app, /async function downloadPrivacyPolicyPdf/);
  assert.match(app, /async function maybeShowPrivacyPolicyNotice/);
  assert.match(app, /data-user-privacy/);
  assert.match(app, /data-login-privacy/);
  assert.match(app, /data-open-customer-privacy/);
  assert.match(app, /customerPrivacyAcknowledged/);

  assert.match(index, /id="privacyCenter"/);
  assert.match(index, /Centro Privacy OroActive/);
  assert.match(index, /data-user-privacy/);
  assert.match(index, /data-login-privacy/);
  assert.match(index, /Informativa privacy cliente/);
  assert.match(index, /id="customerPrivacyAcknowledged"/);

  assert.match(styles, /\.privacy-center-layout/);
  assert.match(styles, /\.privacy-accordion/);
  assert.match(styles, /\.customer-privacy-box/);
  assert.match(index, /app\.js\?v=20260529-aurum-global-1/);
  assert.match(index, /styles\.css\?v=20260529-aurum-global-1/);
  assert.match(worker, /aurum-global-1/);
});

test("Training Operatore simula atti demo senza effetti operativi reali", async () => {
  const [index, app, server, schema, migration, styles, worker] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql"),
    file("migrations/20260528_operator_training_mode.sql"),
    file("styles.css"),
    file("service-worker.js")
  ]);

  assert.match(schema, /CREATE TABLE IF NOT EXISTS training_scenarios/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS training_sessions/);
  assert.match(schema, /user_id BIGINT NOT NULL/);
  assert.match(schema, /idx_training_sessions_user_id/);
  assert.match(schema, /idx_training_sessions_started_at/);
  assert.match(migration, /cliente_standard/);
  assert.match(migration, /documento_scaduto/);
  assert.match(migration, /contabile_mancante/);
  assert.match(migration, /limite_contanti/);
  assert.match(migration, /alto_rischio/);
  assert.match(migration, /firme_mancanti/);
  assert.match(migration, /preziosi_incompleti/);
  assert.match(migration, /training_completo/);

  assert.match(server, /operatorTrainingScenarioBlueprints/);
  assert.match(server, /async function startOperatorTrainingSession/);
  assert.match(server, /function evaluateTrainingSession/);
  assert.match(server, /async function completeOperatorTrainingSession/);
  assert.match(server, /app\.get\("\/api\/training\/scenarios"/);
  assert.match(server, /app\.post\("\/api\/training\/start"/);
  assert.match(server, /app\.get\("\/api\/training\/session\/:id"/);
  assert.match(server, /app\.post\("\/api\/training\/session\/:id\/save-progress"/);
  assert.match(server, /app\.post\("\/api\/training\/session\/:id\/complete"/);
  assert.match(server, /app\.get\("\/api\/training\/my-results"/);
  assert.match(server, /app\.get\("\/api\/training\/team-results"/);
  assert.match(server, /app\.get\("\/api\/training\/results\/:id"/);
  assert.match(server, /training_started/);
  assert.match(server, /training_completed/);
  assert.match(server, /training_passed/);
  assert.match(server, /training_failed/);
  assert.match(server, /academy_practical_training: true/);
  assert.match(server, /no_real_sale_deed: true/);
  assert.match(server, /no_crm_update: true/);
  assert.match(server, /no_stock_update: true/);
  assert.match(server, /no_real_trust_pack: true/);
  const trainingBackendStart = server.indexOf("async function startOperatorTrainingSession");
  const trainingBackendEnd = server.indexOf("async function crmClients", trainingBackendStart);
  const trainingBackendBlock = server.slice(trainingBackendStart, trainingBackendEnd);
  assert.doesNotMatch(trainingBackendBlock, /INSERT INTO atti_vendita|INSERT INTO clienti|INSERT INTO fusion/i);
  assert.doesNotMatch(trainingBackendBlock, /generateCustomerTrustPack|completeSaleDeed|updateStock/i);

  assert.match(index, /data-course-tab="operatorTraining">Training Operatore/);
  assert.match(app, /label: "Training Operatore"[\s\S]*courseTabShortcut: "operatorTraining"/);
  assert.match(app, /operatorTrainingResults: \[\]/);
  assert.match(app, /function renderOperatorTraining/);
  assert.match(app, /function currentTrainingFormData/);
  assert.match(app, /async function startOperatorTraining/);
  assert.match(app, /async function saveOperatorTrainingProgress/);
  assert.match(app, /async function completeOperatorTraining/);
  assert.match(app, /async function openOperatorTrainingResult/);
  assert.match(app, /apiRequest\("\/training\/start"/);
  assert.match(app, /apiRequest\("\/training\/scenarios"/);
  assert.match(app, /apiRequest\("\/training\/my-results"/);
  assert.match(app, /apiRequest\("\/training\/team-results"/);
  assert.match(app, /data-start-operator-training/);
  assert.match(app, /data-complete-operator-training/);
  assert.match(app, /MODALITÀ TRAINING — dati simulati/);
  assert.match(app, /Questa pratica non crea atti reali, clienti CRM, giacenza, fusioni, PDF cliente o Trust Pack reali/);

  assert.match(styles, /\.operator-training-shell/);
  assert.match(styles, /\.training-mode-badge/);
  assert.match(styles, /\.operator-training-live/);
  assert.match(styles, /\.operator-training-result\.passed/);
  assert.match(worker, /aurum-global-1/);
});

test("app ripulita da dipendenze e bridge Capacitor", async () => {
  const [pkg, lock, index, app, server] = await Promise.all([
    file("package.json"),
    file("package-lock.json"),
    file("index.html"),
    file("app.js"),
    file("server.js")
  ]);
  const combined = `${pkg}\n${lock}\n${index}\n${app}\n${server}`;

  assert.doesNotMatch(combined, /@capacitor/i);
  assert.doesNotMatch(combined, /capacitor-native/i);
  assert.doesNotMatch(combined, /OroActiveNative/);
  assert.doesNotMatch(combined, /capacitor:\/\/localhost/);
  assert.doesNotMatch(combined, /ios:prepare|ios:sync|ios:open|ios:add/);
});
