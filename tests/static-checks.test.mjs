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

test("sezione corsi e certificazioni interne presenti", async () => {
  const [index, app, server, schema] = await Promise.all([
    file("index.html"),
    file("app.js"),
    file("server.js"),
    file("schema.sql")
  ]);

  assert.match(index, /data-section="training">Corsi/);
  assert.match(index, /Catalogo corsi/);
  assert.match(index, /I miei corsi/);
  assert.match(index, /Certificazioni/);
  assert.match(index, /Badge/);
  assert.match(app, /apiRequest\("\/corsi"/);
  assert.match(server, /app\.get\("\/api\/corsi"/);
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
  assert.match(app, /registration\.update/);
  assert.match(app, /customer-copy-logo/);
  assert.match(stylesCss(await file("styles.css")), /customer-copy-logo/);
  assert.match(index, /id="userEmail"/);
  assert.match(index, /id="userPhone"/);
  assert.match(index, /id="userActive"/);
  assert.match(server, /telefono, note, attivo/);
  assert.match(schema, /ALTER TABLE utenti ADD COLUMN IF NOT EXISTS telefono/);
});

test("app ripulita da dipendenze e bridge Capacitor", async () => {
  const [pkg, index, app, server] = await Promise.all([
    file("package.json"),
    file("index.html"),
    file("app.js"),
    file("server.js")
  ]);
  const combined = `${pkg}\n${index}\n${app}\n${server}`;

  assert.doesNotMatch(combined, /@capacitor/i);
  assert.doesNotMatch(combined, /capacitor-native/i);
  assert.doesNotMatch(combined, /OroActiveNative/);
  assert.doesNotMatch(combined, /capacitor:\/\/localhost/);
  assert.doesNotMatch(pkg, /ios:prepare|ios:sync|ios:open|ios:add/);
});

function stylesCss(content) {
  return content;
}
