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
  assert.match(schema, /CREATE TABLE IF NOT EXISTS course_certificates/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS course_badges/);
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
