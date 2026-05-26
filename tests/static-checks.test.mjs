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

  assert.match(index, /data-section="training">OroActive Academy/);
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
  const [app, server, schema] = await Promise.all([
    file("app.js"),
    file("server.js"),
    file("schema.sql")
  ]);

  assert.match(app, /data-save-crm-client/);
  assert.match(app, /data-delete-crm-client/);
  assert.match(app, /data-view-backup/);
  assert.match(app, /data-delete-backup/);
  assert.match(server, /app\.put\("\/api\/crm\/clienti\/:id"/);
  assert.match(server, /app\.delete\("\/api\/crm\/clienti\/:id"/);
  assert.match(server, /app\.get\("\/api\/backups\/:id"/);
  assert.match(server, /app\.delete\("\/api\/backups\/:id"/);
  assert.match(schema, /ALTER TABLE clienti ADD COLUMN IF NOT EXISTS archiviato/);
  assert.match(schema, /ALTER TABLE backup_jobs ADD COLUMN IF NOT EXISTS metadata/);
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
  assert.match(index, /id="mainMenuLogoRefresh"/);
  assert.match(app, /async function refreshApp/);
  assert.match(app, /function triggerLogoRefresh/);
  assert.match(app, /logo-refresh-clicked/);
  assert.match(app, /registration\.update/);
  assert.match(app, /customer-copy-logo/);
  const styles = await file("styles.css");
  assert.match(styles, /customer-copy-logo/);
  assert.match(styles, /logo-refresh-clicked/);
  assert.match(index, /id="userEmail"/);
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
  assert.match(app, /Nessuna attività registrata/);
  assert.match(app, /displayMenuUserName/);
  assert.match(app, /displayUserFullName/);
  assert.match(app, /loggedUserName\.textContent = `\$\{displayUserFullName/);
  assert.match(app, /sessionUsername\.textContent = displayMenuUserName/);
  assert.match(index, />Account OroActive<\/button>/);
  assert.doesNotMatch(index, /id="mainUserMenuButton"[^>]*>Utente<\/button>/);
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

test("nuovo atto si apre senza attendere la numerazione remota", async () => {
  const app = await file("app.js");
  const enterStart = app.indexOf("async function enterSectionFromMainMenu");
  const enterEnd = app.indexOf("async function clearPracticeForFreshStart", enterStart);
  const enterBlock = app.slice(enterStart, enterEnd);
  const metaStart = app.indexOf("async function setPracticeMeta");
  const metaEnd = app.indexOf("async function updatePracticeNumber", metaStart);
  const metaBlock = app.slice(metaStart, metaEnd);

  assert.match(enterBlock, /setScreen\(section\);[\s\S]*clearPracticeForFreshStart\(\{ deferPracticeNumber: true \}\)/);
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
