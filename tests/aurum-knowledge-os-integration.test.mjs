import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const server = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../migrations/20260801_aurum_knowledge_os.sql", import.meta.url), "utf8");
const management = fs.readFileSync(new URL("../services/aurum/aurumKnowledgeManagement.js", import.meta.url), "utf8");
const repository = fs.readFileSync(new URL("../services/aurum/knowledge/knowledgeRepository.js", import.meta.url), "utf8");

test("la migration Knowledge OS crea ed estende tutte le entità governate", () => {
  for (const table of [
    "ai_source_registry", "ai_source_versions", "ai_knowledge_facts", "ai_knowledge_relations",
    "ai_procedures", "ai_procedure_steps", "ai_case_library", "ai_review_queue", "ai_sync_runs",
    "ai_answer_audit", "ai_evaluation_cases", "ai_knowledge_conflicts"
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`), table);
  }
  assert.match(migration, /ALTER TABLE ai_documents ADD COLUMN IF NOT EXISTS source_registry_id BIGINT/);
  assert.match(migration, /ALTER TABLE ai_document_chunks ADD COLUMN IF NOT EXISTS source_version_id BIGINT/);
  assert.match(migration, /^BEGIN;[\s\S]+COMMIT;\s*$/);
});

test("bootstrap, repository e scheduler Knowledge OS sono collegati al server esistente", () => {
  assert.match(server, /"20260801_aurum_knowledge_os\.sql"/);
  assert.match(server, /await seedAurumKnowledgeOs\(\)/);
  assert.match(server, /createSqlKnowledgeRepository\(/);
  assert.match(server, /createRetrievalService\(/);
  assert.match(server, /startAurumKnowledgeScheduler\(\)/);
  assert.match(server, /AURUM_KNOWLEDGE_RETRIEVAL_TIMEOUT_MS/);
});

test("la sincronizzazione costruisce documenti e chunk pending prima della review", () => {
  const persistence = server.match(/async function persistPendingAurumSourceDocument[\s\S]+?async function syncAurumKnowledgeSource/)?.[0] || "";
  assert.match(persistence, /parseDocument\(/);
  assert.match(persistence, /chunkStructuredDocument\(/);
  assert.match(persistence, /aurumKnowledgeEmbeddingService\.embedMany/);
  assert.match(persistence, /INSERT INTO ai_documents/);
  assert.match(persistence, /INSERT INTO ai_document_chunks/);
  assert.match(persistence, /'pending', FALSE/);
  const sync = server.match(/async function syncAurumKnowledgeSource[\s\S]+?async function checkAurumKnowledgeSourceUpdates/)?.[0] || "";
  assert.match(sync, /ensurePendingAurumSourceDocument/);
  assert.match(sync, /documents_created = \$4::int, chunks_created = \$5::int/);
  assert.match(sync, /allowedDomains:\s*\[new URL\(source\.official_url\)\.hostname\]/);
  assert.match(sync, /allowSubdomains:\s*false/);
  assert.match(sync, /previousVersion\?\.review_status === "pending"/);
  assert.match(sync, /recovered_pending_version:\s*true/);
});

test("il seed controllato entra pending e non può riapprovarsi al riavvio", () => {
  const seed = server.match(/async function seedAurumKnowledgeOs\(\)[\s\S]+?function isUsefulBuildValue/)?.[0] || "";
  assert.match(seed, /FALSE, 'pending'/);
  assert.match(seed, /approvazione Founder obbligatoria/);
  assert.match(seed, /'source_version'[\s\S]+status IN \('pending', 'in_review'\)/);
  assert.match(seed, /ON CONFLICT \(source_key\) DO NOTHING/);
  assert.match(seed, /'source_registry_update'/);
  assert.match(seed, /WITH refreshed AS[\s\S]+UPDATE ai_review_queue[\s\S]+proposed_change = \$4::jsonb/);
  assert.doesNotMatch(seed, /review_status\s*=\s*'approved'/);
  assert.doesNotMatch(seed, /'approved',\s*NOW\(\)/);
  assert.doesNotMatch(seed, /ON CONFLICT \(source_key\) DO UPDATE SET[\s\S]{0,1000}?active = EXCLUDED\.active/);
});

test("versioni, documenti e chunk vengono approvati nella stessa operazione SQL", () => {
  const approval = management.match(/async function approveVersion[\s\S]+?async function listReviewQueue/)?.[0] || "";
  assert.match(approval, /WITH target AS MATERIALIZED[\s\S]+FOR UPDATE/);
  assert.match(approval, /approved_documents AS[\s\S]+approved_chunks AS/);
  assert.match(approval, /review_status = 'approved'/);
  assert.equal((approval.match(/await query\(/g) || []).length, 1);
});

test("i payload JSONB nuovi sono serializzati esplicitamente per PostgreSQL", () => {
  assert.match(server, /function jsonForPostgres\(value\)[\s\S]+JSON\.stringify/);
  assert.match(server, /jsonForPostgres\(procedure\.requiredTools \|\| \[\]\)/);
  assert.match(server, /jsonForPostgres\(evaluationCase\.expectedSources/);
  assert.match(management, /function jsonParameter\(value\)[\s\S]+JSON\.stringify/);
  assert.match(management, /jsonParameter\(steps\)/);
});

test("gestione Founder, audit minimizzato e aggiornamenti pending restano obbligatori", () => {
  const founderRoutes = server.match(/app\.(?:get|post|put|delete)\("\/api\/aurum\/knowledge\//g) || [];
  assert.ok(founderRoutes.length >= 20);
  for (const routeLine of server.match(/^app\.(?:get|post|put|delete)\("\/api\/aurum\/knowledge\/.*$/gm) || []) {
    assert.match(routeLine, /requireFounder/);
  }
  const audit = server.match(/INSERT INTO ai_answer_audit[\s\S]+?\)\.catch/)?.[0] || "";
  assert.match(audit, /question_hash/);
  assert.doesNotMatch(audit, /question_text|raw_question|domanda/);
  const sourceSync = server.match(/async function syncAurumKnowledgeSource[\s\S]+?async function checkAurumKnowledgeSourceUpdates/)?.[0] || "";
  assert.match(sourceSync, /review_status\s*=\s*'pending'|FALSE, 'pending'/);
  assert.match(sourceSync, /auto_approved:\s*false/);
  assert.doesNotMatch(sourceSync, /review_status\s*=\s*'approved'/);
});

test("la risposta legacy non può aggirare la validazione professionale", () => {
  const route = server.match(/app\.post\("\/api\/ai\/assistente"[\s\S]+?app\.get\("\/api\/aurum\/tools"/)?.[0] || "";
  assert.match(route, /risposta:\s*professional\.answer/);
  assert.match(route, /fonti:\s*professional\.sources/);
  assert.match(server, /governedOnly:\s*options\.knowledge\?\.route\?\.matched_by_keywords === true/);
  assert.match(server, /d\.review_status = 'approved' AND d\.is_current = TRUE/);
  assert.match(server, /c\.source_version_id = d\.source_version_id AND c\.review_status = 'approved'/);
});

test("la ricerca dei casi usa soltanto record anonimizzati e approvati di livello 70", () => {
  const searchCases = repository.match(/async searchCases\(text[\s\S]+?return result\.rows \|\| result;/)?.[0] || "";
  assert.match(searchCases, /FROM ai_case_library c/);
  assert.match(searchCases, /JOIN ai_source_registry s ON s\.source_key = 'oroactive-casi-approvati'/);
  assert.match(searchCases, /c\.anonymized = TRUE AND c\.review_status = 'approved' AND s\.active = TRUE/);
  assert.match(searchCases, /c\.domain, COALESCE\(s\.jurisdiction, 'IT'\) AS jurisdiction, s\.authority_level/);
});

test("le fonti interne dichiarate database_adapter hanno un adapter reale e minimizzato", () => {
  const adapters = server.match(/async function internalAurumSourceSnapshot[\s\S]+?function aurumSourceDocumentKind/)?.[0] || "";
  assert.match(adapters, /source\.source_key === "oroactive-aurum-shield"[\s\S]+FROM aurum_shield_settings/);
  assert.match(adapters, /source\.source_key === "oroactive-academy"[\s\S]+FROM academy_courses ac[\s\S]+publicationStatus[\s\S]+\) = 'published'/);
  assert.match(adapters, /source\.source_key === "oroactive-casi-approvati"[\s\S]+FROM ai_case_library[\s\S]+anonymized = TRUE AND review_status = 'approved'/);
  assert.doesNotMatch(adapters, /SELECT \* FROM ai_case_library/);
  assert.doesNotMatch(adapters, /updated_by|created_by/);
});

test("l'indicizzazione usa soltanto la governance approvata nel registro SQL", () => {
  const persistence = server.match(/async function persistPendingAurumSourceDocument[\s\S]+?async function ensurePendingAurumSourceDocument/)?.[0] || "";
  assert.match(persistence, /allow_full_text:\s*source\.allow_full_text === true/);
  assert.match(persistence, /content_policy:\s*source\.content_policy \|\| "metadata_abstract_only_until_rights_reviewed"/);
  assert.doesNotMatch(persistence, /\.\.\.source,\s*\.\.\.configuredSource/);
  assert.match(migration, /ai_source_registry ADD COLUMN IF NOT EXISTS content_policy/);
  assert.match(migration, /ai_source_registry ADD COLUMN IF NOT EXISTS allow_full_text/);
});

test("lo scheduler ricontrolla automaticamente gli adapter interni on_change", () => {
  const scheduler = server.match(/async function checkAurumKnowledgeSourceUpdates[\s\S]+?function startAurumKnowledgeScheduler/)?.[0] || "";
  assert.match(scheduler, /update_frequency = 'on_change'/);
  assert.match(scheduler, /ingestion_mode IN \('database_adapter', 'bundled_structured_data'\)/);
  assert.match(scheduler, /last_checked_at IS NULL OR last_checked_at <= NOW\(\) - \(\$1::int \* INTERVAL '1 minute'\)/);
  assert.ok((scheduler.match(/update_frequency = 'on_change'/g) || []).length >= 2);
  assert.match(scheduler, /\)\s+OR\s+\(update_frequency = 'on_change'/);
  assert.match(scheduler, /CASE WHEN update_frequency = 'on_change' THEN 0 ELSE 1 END[\s\S]+LIMIT 12/);
});
