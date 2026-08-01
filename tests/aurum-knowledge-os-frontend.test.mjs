import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const [index, app, styles, worker, version, manifest, webmanifest] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("app.js", root), "utf8"),
  readFile(new URL("styles.css", root), "utf8"),
  readFile(new URL("service-worker.js", root), "utf8"),
  readFile(new URL("version.json", root), "utf8"),
  readFile(new URL("manifest.json", root), "utf8"),
  readFile(new URL("manifest.webmanifest", root), "utf8")
]);

const expectedTabs = [
  "Panoramica",
  "Domini di conoscenza",
  "Fonti",
  "Versioni",
  "Documenti",
  "Fatti",
  "Knowledge Graph",
  "Procedure",
  "Casi reali",
  "Review Queue",
  "Conflitti",
  "Fonti obsolete",
  "Sincronizzazioni",
  "Copertura",
  "Test Aurum",
  "Feedback",
  "Impostazioni"
];

test("Gestione Aurum espone esattamente i 17 tab Founder richiesti", () => {
  const shell = index.match(/<div class="aurum-knowledge-tabs"[\s\S]*?<\/div>/)?.[0] || "";
  const labels = [...shell.matchAll(/data-aurum-knowledge-tab="[^"]+">([^<]+)<\/button>/g)].map((match) => match[1]);
  assert.deepEqual(labels, expectedTabs);
  assert.match(index, /id="aurumAdmin" class="screen founder-only"/);
  assert.match(index, /id="aurumManagementPanel"[\s\S]*Statistiche memorie Aurum/);
  assert.match(app, /const canViewPanel = isFounder\(\) && state\.aurumKnowledgeTab === "settings"/);
});

test("i tab effettuano caricamento lazy soltanto sotto aurum knowledge", () => {
  const tabBlock = app.match(/const AURUM_KNOWLEDGE_TABS = Object\.freeze\(\[[\s\S]*?\]\);/)?.[0] || "";
  assert.ok(tabBlock);
  const endpoints = [...tabBlock.matchAll(/endpoint: "([^"]*)"/g)].map((match) => match[1]).filter(Boolean);
  assert.equal(endpoints.length, 16);
  assert.ok(endpoints.every((endpoint) => endpoint.startsWith("/aurum/knowledge/")));
  assert.match(app, /if \(!options\.force && state\.aurumKnowledgeData\[tab\.id\]\)/);
  assert.match(app, /state\.aurumKnowledgeData\[tab\.id\] = await apiRequest\(tab\.endpoint/);
  assert.match(app, /aurum-knowledge-state" role="status"/);
  assert.match(app, /aurum-knowledge-state error" role="alert"/);
  assert.match(app, /Nessun elemento disponibile/);
});

test("la console Founder espone tutte le azioni Knowledge OS richieste", () => {
  for (const label of [
    "Verifica aggiornamenti",
    "Sincronizza fonte",
    "Disattiva fonte",
    "Approva versione",
    "Rigenera embeddings",
    "Riesegui estrazione fatti",
    "Risolvi conflitto",
    "Testa domanda",
    "Pubblica procedura"
  ]) assert.match(app, new RegExp(label));
  assert.match(app, /\/aurum\/knowledge\/sources\/\$\{id\}\/sync/);
  assert.match(app, /\/aurum\/knowledge\/versions\/\$\{id\}\/approve/);
  assert.match(app, /\/aurum\/knowledge\/conflicts\/\$\{id\}\/resolve/);
  assert.match(app, /apiRequest\("\/aurum\/knowledge\/evaluate"/);
});

test("la chat normalizza il contratto professionale preservando il legacy", () => {
  const normalizer = app.match(/function normalizeAurumProfessionalResponse[\s\S]*?\n\}/)?.[0] || "";
  assert.match(normalizer, /data\.professional/);
  assert.match(normalizer, /response\.answer \|\| response\.risposta/);
  assert.match(normalizer, /response\.sources\?\.length \? response\.sources : response\.fonti/);
  for (const field of [
    "classification", "domain", "jurisdiction", "validAsOf", "confidence", "assumptions",
    "missingInformation", "toolResults", "recommendedSteps", "risks", "escalation"
  ]) assert.match(normalizer, new RegExp(`${field}:`));
  assert.match(app, /\.\.\.normalizeAurumProfessionalResponse\(data\)/);
  assert.match(app, /const professionalResponse = normalizeAurumProfessionalResponse\(data\)/);
});

test("la chat non sostituisce una risposta insufficiente con un fallback normativo assertivo", () => {
  const askBlock = app.match(/async function askAurum\(event\)[\s\S]+?function aurumMemoryTypeLabel/)?.[0] || app.match(/async function askAurum\(event\)[\s\S]+?async function/)?.[0] || "";
  assert.match(askBlock, /content:\s*professionalResponse\.content/);
  assert.doesNotMatch(askBlock, /content:[\s\S]{0,180}buildAurumNormativeAnswer\(question\)/);
  assert.match(askBlock, /Non posso verificare in questo momento le fonti approvate e vigenti/);
});

test("il dettaglio operativo mostra solo campi verificabili e massimo quattro citazioni", () => {
  const sourceRenderer = app.match(/function aurumSourcesMarkup[\s\S]*?\n\}/)?.[0] || "";
  const detailRenderer = app.match(/function aurumOperationalDetailsMarkup[\s\S]*?\n\}/)?.[0] || "";
  assert.match(sourceRenderer, /\.slice\(0, 4\)/);
  for (const field of ["organization", "title", "version", "section", "validity", "consultedAt", "url"]) {
    assert.match(app, new RegExp(`${field}:`));
  }
  assert.match(detailRenderer, /Mostra fonti e ragionamento operativo/);
  for (const label of ["Fonti utilizzate", "Fatti utilizzati", "Regole applicate", "Calcoli", "Passaggi procedurali", "Dati mancanti"]) {
    assert.match(app, new RegExp(label));
  }
  assert.doesNotMatch(detailRenderer, /chain.?of.?thought|reasoningText|ragionamentoInterno/i);
  assert.match(styles, /\.aurum-operational-details summary/);
});

test("PWA e richieste dinamiche restano no-store con build coerente", () => {
  const buildId = "20260801-aurum-knowledge-os-14";
  assert.match(app, new RegExp(buildId));
  assert.match(index, new RegExp(buildId, "g"));
  assert.match(worker, new RegExp(buildId));
  assert.equal(JSON.parse(version).assetBuildId, buildId);
  assert.match(app, /cache: "no-store"/);
  assert.match(worker, /NEVER_CACHE_PREFIXES = \[[\s\S]*"\/api\/"/);
  assert.match(worker, /return fetch\(request, \{ cache: "no-store" \}\)/);
  assert.match(manifest, /Aurum Knowledge OS/);
  assert.match(webmanifest, /Aurum Knowledge OS/);
});
