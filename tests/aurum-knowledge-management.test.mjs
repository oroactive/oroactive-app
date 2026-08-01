import test from "node:test";
import assert from "node:assert/strict";

import { createAurumKnowledgeManagement } from "../services/aurum/aurumKnowledgeManagement.js";

const taxonomy = {
  jurisdictionDefault: "IT",
  domains: [
    { id: "legal_compro_oro", description: "Normativa", risk_level: "high", primary_sources: ["normattiva"] },
    { id: "gemology", description: "Gemmologia", risk_level: "high", primary_sources: ["cibjo"] }
  ]
};

const registry = {
  sources: [
    { source_key: "normattiva", domain: "legal_compro_oro", active: true },
    { source_key: "cibjo", domain: "gemology", active: true }
  ]
};

function recordingQuery(responder = () => ({ rows: [], rowCount: 0 })) {
  const calls = [];
  const query = async (sql, params = []) => {
    calls.push({ sql, params });
    return responder(sql, params, calls.length - 1);
  };
  query.calls = calls;
  return query;
}

test("espone la superficie completa per la Gestione Founder", () => {
  const service = createAurumKnowledgeManagement({ query: recordingQuery(), taxonomy, registry });
  for (const method of [
    "overview", "domains", "coverage", "listSources", "createSource", "updateSource", "sourceVersions", "listVersions",
    "approveVersion", "listReviewQueue", "resolveReviewQueueItem", "listConflicts", "resolveConflict", "stale",
    "listProcedures", "createProcedure", "updateProcedure", "publishProcedure", "listCases", "createCase", "approveCase",
    "listDocuments", "listFacts", "listGraph", "listSyncRuns", "listEvaluations", "listFeedback", "evaluateSummary"
  ]) assert.equal(typeof service[method], "function", `${method} deve essere esportato`);
});

test("crea fonti con query parametrizzata e senza approvazioni implicite", async () => {
  const query = recordingQuery((_sql, params) => ({ rows: [{ id: 8, source_key: params[0], requires_manual_review: true }] }));
  const service = createAurumKnowledgeManagement({ query, taxonomy, registry });
  const result = await service.createSource({
    source_key: "nuova-fonte",
    organization: "Ente pubblico",
    title: "Documento ufficiale",
    official_url: "https://example.test/documento",
    domain: "legal_compro_oro",
    authority_level: 90,
    source_type: "regulator_guidance"
  });

  assert.equal(result.item.source_key, "nuova-fonte");
  assert.match(query.calls[0].sql, /VALUES \(\$1, \$2, \$3/);
  assert.doesNotMatch(query.calls[0].sql, /nuova-fonte/);
  assert.equal(query.calls[0].params[14], true, "la revisione manuale deve essere sempre richiesta");
  assert.equal(query.calls[0].params[13], false, "il full text richiede una scelta Founder esplicita");
});

test("l'aggiornamento fonte non può disabilitare la revisione manuale", async () => {
  const query = recordingQuery((_sql, params) => ({ rows: [{ id: params.at(-1), requires_manual_review: params[0] }] }));
  const service = createAurumKnowledgeManagement({ query, taxonomy, registry });
  const result = await service.updateSource(8, { requires_manual_review: false });
  assert.equal(result.item.requires_manual_review, true);
  assert.equal((query.calls[0].sql.match(/requires_manual_review\s*=/g) || []).length, 1);
  assert.deepEqual(query.calls[0].params, [true, 8]);
});

test("i filtri booleani della query HTTP sono accettati senza interpolazione SQL", async () => {
  const query = recordingQuery(() => ({ rows: [] }));
  const service = createAurumKnowledgeManagement({ query, taxonomy, registry });
  await service.listVersions({ current: "false", limit: "10", offset: "0" });
  assert.equal(query.calls[0].params[0], false);
  assert.deepEqual(query.calls[0].params.slice(-2), [10, 0]);
  assert.doesNotMatch(query.calls[0].sql, /current = false/);
});

test("approva una versione con una singola operazione atomica e revisore esplicito", async () => {
  const query = recordingQuery((_sql, _params) => ({
    rows: [{ target_id: 21, previous_status: "pending", item: { id: 21, review_status: "approved", is_current: true } }]
  }));
  const service = createAurumKnowledgeManagement({ query, taxonomy, registry, clock: () => new Date("2026-08-01T09:00:00Z") });
  const result = await service.approveVersion(21, { reviewedBy: 7 });

  assert.equal(result.item.review_status, "approved");
  assert.equal(query.calls.length, 1);
  assert.match(query.calls[0].sql, /WITH target AS[\s\S]+FOR UPDATE[\s\S]+approved AS[\s\S]+demoted AS[\s\S]+approved_documents AS[\s\S]+approved_chunks AS[\s\S]+approved_facts AS[\s\S]+approved_relations AS[\s\S]+resolved_reviews AS/i);
  assert.deepEqual(query.calls[0].params, [21, 7, "2026-08-01T09:00:00.000Z"]);
});

test("una nuova procedura resta pending e i passi vengono scritti atomicamente", async () => {
  const query = recordingQuery((_sql, params) => ({ rows: [{ id: 4, procedure_key: params[0], review_status: "pending" }] }));
  const service = createAurumKnowledgeManagement({ query, taxonomy, registry });
  const result = await service.createProcedure({
    procedure_key: "verifica-metallo",
    title: "Verifica metallo",
    domain: "legal_compro_oro",
    purpose: "Controllo prudente",
    source_versions: [3],
    steps: [{ title: "Controlla", instruction: "Verifica il campione", blocking: true }],
    review_status: "approved"
  });

  assert.equal(result.item.review_status, "pending");
  assert.match(query.calls[0].sql, /WITH inserted AS[\s\S]+jsonb_to_recordset/i);
  const writtenSteps = JSON.parse(query.calls[0].params.at(-1));
  assert.equal(writtenSteps[0].step_order, 1);
  assert.equal(writtenSteps[0].blocking, true);
  assert.deepEqual(JSON.parse(query.calls[0].params[11]), [3]);
});

test("la modifica di una procedura revoca l'approvazione e riconcilia i passi in una sola query", async () => {
  const query = recordingQuery((_sql, params) => ({
    rows: [{ id: params[1], title: params[0], review_status: "pending", steps: params[2] }]
  }));
  const service = createAurumKnowledgeManagement({ query, taxonomy, registry });
  const result = await service.updateProcedure(4, {
    title: "Verifica aggiornata",
    steps: [{ step_order: 2, title: "Secondo passo", instruction: "Conferma il risultato" }]
  });
  assert.equal(result.item.review_status, "pending");
  assert.equal(query.calls.length, 1);
  assert.match(query.calls[0].sql, /review_status = 'pending'[\s\S]+pruned AS[\s\S]+upserted AS/i);
  assert.equal(JSON.parse(query.calls[0].params[2])[0].step_order, 2);
  assert.deepEqual(query.calls[0].params[3], [2]);
});

test("la review applica soltanto una proposta esplicita di aggiornamento del registro", async () => {
  const query = recordingQuery((_sql, params) => ({ rows: [{ id: params[0], status: params[1], source_registry_applied: true }] }));
  const service = createAurumKnowledgeManagement({ query, taxonomy, registry, clock: () => new Date("2026-08-01T09:00:00Z") });
  const result = await service.resolveReviewQueueItem(5, { status: "approved", resolvedBy: 7, resolution: "Revisionato" });
  assert.equal(result.item.status, "approved");
  assert.equal(result.sourceRegistryApplied, true);
  assert.match(query.calls[0].sql, /^WITH target AS MATERIALIZED/);
  assert.match(query.calls[0].sql, /t\.entity_type = 'source_registry_update'/);
  assert.match(query.calls[0].sql, /UPDATE ai_source_registry/);
  assert.match(query.calls[0].sql, /to_jsonb\(s\) @> \(t\.proposed_change->'current'\)/);
  assert.match(query.calls[0].sql, /EXISTS \(SELECT 1 FROM applied_source_registry\)/);
  assert.doesNotMatch(query.calls[0].sql, /UPDATE ai_(procedures|case_library|source_versions)/);
});

test("la pubblicazione procedura richiede passi e versioni fonte già approvate", async () => {
  const query = recordingQuery(() => ({ rows: [], rowCount: 0 }));
  const service = createAurumKnowledgeManagement({ query, taxonomy, registry });
  await assert.rejects(() => service.publishProcedure(4, { reviewedBy: 7 }), /non pubblicabile/i);
  assert.match(query.calls[0].sql, /jsonb_array_length[\s\S]+ai_procedure_steps[\s\S]+v\.review_status IS DISTINCT FROM 'approved'/i);
});

test("i casi restano non attestati e pending finché il Founder conferma l'anonimizzazione", async () => {
  const createQuery = recordingQuery((_sql, params) => ({
    rows: [{ id: 12, case_key: params[0], anonymized: params.at(-1), review_status: "pending" }]
  }));
  const service = createAurumKnowledgeManagement({ query: createQuery, taxonomy, registry });
  const created = await service.createCase({
    case_key: "caso-test-1",
    title: "Caso di verifica",
    domain: "gemology",
    facts: { materiale: "zaffiro", esito: "da confermare" },
    anonymized: false,
    review_status: "approved"
  });
  assert.equal(created.item.anonymized, false);
  assert.equal(created.item.review_status, "pending");
  assert.match(created.item.case_key, /^caso-[0-9a-f-]{36}$/i);
  assert.notEqual(created.item.case_key, "caso-test-1");
  assert.deepEqual(JSON.parse(createQuery.calls[0].params[4]), { materiale: "zaffiro", esito: "da confermare" });
  assert.deepEqual(JSON.parse(createQuery.calls[0].params[5]), []);

  const rejectedQuery = recordingQuery();
  const rejectingService = createAurumKnowledgeManagement({ query: rejectedQuery, taxonomy, registry });
  await assert.rejects(() => rejectingService.approveCase(12, { approvedBy: 7 }), /Conferma Founder/i);
  assert.equal(rejectedQuery.calls.length, 0);

  const approvalQuery = recordingQuery((sql) => sql.startsWith("SELECT")
    ? ({ rows: [{
      id: 12,
      case_key: "caso-123e4567-e89b-42d3-a456-426614174000",
      source_type: "internal_anonymized_case",
      title: "Caso di verifica",
      anonymized: false,
      review_status: "pending",
      facts: {},
      tests_performed: []
    }] })
    : ({ rows: [{ id: 12, anonymized: true, review_status: "approved" }] }));
  const approvalService = createAurumKnowledgeManagement({ query: approvalQuery, taxonomy, registry });
  const approved = await approvalService.approveCase(12, { approvedBy: 7, confirmAnonymized: true });
  assert.equal(approved.item.anonymized, true);
  assert.match(approvalQuery.calls[1].sql, /SET anonymized = TRUE, review_status = 'approved'/);

  await assert.rejects(() => service.createCase({
    case_key: "caso-pii-libero", title: "Caso PII libero", domain: "gemology",
    facts: { nota: "Cliente Mario Rossi, telefono 3331234567, residente in via Roma 12" }
  }), /anonimizzat/i);
  const technicalCase = await service.createCase({
    case_key: "caso-diamante-sintetico", title: "Diamante Sintetico HPHT", domain: "gemology",
    facts: {
      descrizione: "Diamante Sintetico HPHT", reperto: "Anello Danneggiato",
      formula: "Be3Al2Si6O18", densità: "3,52 g/cm3"
    }
  });
  assert.equal(technicalCase.item.anonymized, false, "anche un caso tecnicamente valido richiede attestazione Founder");
  for (const [index, title] of ["Diamante Naturale", "Rubino Naturale", "Topazio Imperiale", "Esito Positivo", "Caso tecnico"].entries()) {
    const safeTechnicalCase = await service.createCase({
      case_key: `caso-tecnico-${index}`, title, domain: "gemology", facts: { esito: "da confermare" }
    });
    assert.equal(safeTechnicalCase.item.anonymized, false);
  }

  const personalDataCases = [
    { cliente: "Mario Rossi" },
    { acquirente: "Mario Rossi" },
    { cliente_alias: "Mario Rossi" },
    { nota: "Mario Rossi ha consegnato il lotto" },
    { nota: "mario rossi ha consegnato il lotto" },
    { nota: "ettore bianchi ha consegnato il lotto" },
    { nota: "john doe" },
    { nota: "ha parlato con xavier dupont durante la verifica" },
    { nota: "il nominativo è xavier dupont nel registro" },
    { nota: "la pratica riguarda xavier dupont per un lingotto" },
    { nota: "xavier dupont è presente nel registro" },
    { nota: "riferimento xavier dupont archiviato" },
    { nota: "soggetto xavier dupont associato alla pratica" },
    { nota: "la scheda riporta xavier dupont come riferimento" },
    { nota: "passaporto YA1234567 associato al caso" },
    { nota: "documento AB1234567 archiviato" },
    { nota: "targa AB123CD verificata" },
    { nota: "nato il 12/03/1980 nel comune di Roma" },
    { nota: "3331234567" },
    { riferimento: "0234567890" },
    { nota: "333/123/4567" },
    { riferimento: "02/12345678" },
    { riferimento: "Ca123Se" },
    { riferimento: "Fe12Co34" },
    { formula: "Ca123Se456B7" },
    { score: 3331234567 },
    { riferimento: 12345678901 }
  ];
  for (const [index, facts] of personalDataCases.entries()) {
    await assert.rejects(() => service.createCase({
      case_key: `caso-pii-${index}`, title: "Caso tecnico", domain: "gemology", facts
    }), /anonimizzat/i);
  }
  const opaqueInputQuery = recordingQuery((_sql, params) => ({
    rows: [{ id: 14, case_key: params[0], source_type: params[10], anonymized: false, review_status: "pending" }]
  }));
  const opaqueInputService = createAurumKnowledgeManagement({ query: opaqueInputQuery, taxonomy, registry });
  const opaqueInputCase = await opaqueInputService.createCase({
    case_key: "mario-rossi",
    source_type: "Mario Rossi",
    title: "Caso tecnico",
    domain: "gemology",
    facts: { descrizione: "campione pseudonimizzato" }
  });
  assert.match(opaqueInputCase.item.case_key, /^caso-[0-9a-f-]{36}$/i);
  assert.notEqual(opaqueInputQuery.calls[0].params[0], "mario-rossi");
  assert.equal(opaqueInputQuery.calls[0].params[10], "internal_anonymized_case");

  const tamperedQuery = recordingQuery(() => ({
    rows: [{
      id: 13,
      case_key: "caso-123e4567-e89b-42d3-a456-426614174001",
      source_type: "internal_anonymized_case",
      anonymized: true,
      review_status: "pending",
      facts: { nota: "Cliente Mario Rossi, telefono 3331234567" },
      tests_performed: []
    }]
  }));
  const tamperedService = createAurumKnowledgeManagement({ query: tamperedQuery, taxonomy, registry });
  await assert.rejects(() => tamperedService.approveCase(13, { approvedBy: 7, confirmAnonymized: true }), /anonimizzat/i);
  assert.equal(tamperedQuery.calls.length, 1, "un caso alterato non deve raggiungere l'UPDATE di approvazione");
});

test("rifiuta identificativi, URL e dati personali non validi prima del database", async () => {
  const query = recordingQuery();
  const service = createAurumKnowledgeManagement({ query, taxonomy, registry });
  await assert.rejects(() => service.sourceVersions("1 OR 1=1"), /identificativo/i);
  await assert.rejects(() => service.createSource({
    source_key: "fonte-http", organization: "Ente", title: "Titolo", official_url: "http://example.test",
    domain: "legal_compro_oro", authority_level: 80, source_type: "law"
  }), /HTTPS/i);
  await assert.rejects(() => service.createCase({
    case_key: "caso-pii", title: "Caso PII", domain: "gemology",
    facts: { email_cliente: "mario@example.test" }
  }), /anonimizz/i);
  assert.equal(query.calls.length, 0);
});

test("domini e copertura includono anche domini tassonomici ancora vuoti", async () => {
  const query = recordingQuery(() => ({
    rows: [{ domain: "legal_compro_oro", sources: 2, documents: 3, facts: 4, procedures: 1, approved_items: 8 }]
  }));
  const service = createAurumKnowledgeManagement({ query, taxonomy, registry });
  const result = await service.coverage();
  assert.equal(result.items.length, 2);
  assert.equal(result.items.find((item) => item.id === "legal_compro_oro").facts, 4);
  assert.equal(result.items.find((item) => item.id === "gemology").facts, 0);
  assert.ok(result.summary.covered_domains < result.summary.total_domains);
});

test("evaluateSummary restituisce metriche aggregate senza eseguire il modello", async () => {
  const query = recordingQuery(() => ({ rows: [{ total: 325, active: 325, domains: 35, high_risk: 180, with_tool: 90 }] }));
  const service = createAurumKnowledgeManagement({ query, taxonomy, registry });
  const result = await service.evaluateSummary();
  assert.deepEqual(result, { total: 325, active: 325, domains: 35, highRisk: 180, withTool: 90, generatedAt: result.generatedAt });
  assert.match(result.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(query.calls.length, 1);
});
