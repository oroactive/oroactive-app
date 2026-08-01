import crypto from "node:crypto";
import { containsAurumCaseRestrictedData, isAurumCaseFieldNameAllowed } from "./privacy.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const KEY_PATTERN = /^[a-z0-9][a-z0-9._-]{1,119}$/;
const ROLE_PATTERN = /^[a-z][a-z0-9_]{1,79}$/;
const RISK_LEVELS = new Set(["low", "medium", "high", "critical"]);
const REVIEW_RESOLUTIONS = new Set(["resolved", "approved", "rejected", "dismissed"]);
const CONFLICT_RESOLUTIONS = new Set(["resolved", "dismissed"]);
const SOURCE_UPDATE_FIELDS = new Set([
  "source_key", "organization", "title", "official_url", "domain", "jurisdiction", "authority_level",
  "source_type", "document_identifier", "language", "license", "ingestion_mode", "content_policy",
  "allow_full_text", "update_frequency",
  "requires_manual_review", "active", "next_check_at"
]);
const PROCEDURE_UPDATE_FIELDS = new Set([
  "procedure_key", "title", "domain", "jurisdiction", "purpose", "risk_level", "required_role",
  "required_tools", "preconditions", "stop_conditions", "escalation_rules", "source_versions", "active"
]);
const SENSITIVE_CASE_KEY = /(^|_)(nome|cognome|name|surname|cliente|client|acquirente|buyer|venditore|seller|proprietario|owner|persona|person|alias|nickname|contatto|contact|operatore|operator|dipendente|employee|email|e_mail|telefono|phone|cellulare|indirizzo|address|codice_fiscale|fiscal_code|iban|documento|document_id|data_nascita|birth_date|ragione_sociale|numero_pratica|practice_number|username|firma|signature|foto|photo|ip_address)(_|$)/i;

export class AurumKnowledgeManagementError extends Error {
  constructor(message, { status = 400, code = "AURUM_KNOWLEDGE_INVALID_INPUT" } = {}) {
    super(message);
    this.name = "AurumKnowledgeManagementError";
    this.status = status;
    this.code = code;
  }
}

function invalid(message) {
  throw new AurumKnowledgeManagementError(message);
}

function notFound(entity) {
  throw new AurumKnowledgeManagementError(`${entity} non trovato.`, { status: 404, code: "AURUM_KNOWLEDGE_NOT_FOUND" });
}

function conflict(message) {
  throw new AurumKnowledgeManagementError(message, { status: 409, code: "AURUM_KNOWLEDGE_CONFLICT" });
}

function rowsOf(result) {
  if (Array.isArray(result)) return result;
  return Array.isArray(result?.rows) ? result.rows : [];
}

function firstRow(result) {
  return rowsOf(result)[0] || null;
}

function parseId(value, label = "Identificativo") {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) invalid(`${label} non valido.`);
  const number = Number(text);
  if (!Number.isSafeInteger(number) || number <= 0) invalid(`${label} non valido.`);
  return number;
}

function requiredText(value, label, maximum = 500) {
  const text = String(value ?? "").trim();
  if (!text) invalid(`${label} obbligatorio.`);
  if (text.length > maximum) invalid(`${label} supera ${maximum} caratteri.`);
  return text;
}

function optionalText(value, label, maximum = 2000) {
  if (value === undefined || value === null || value === "") return null;
  const text = String(value).trim();
  if (text.length > maximum) invalid(`${label} supera ${maximum} caratteri.`);
  return text || null;
}

function keyText(value, label) {
  const text = requiredText(value, label, 120).toLowerCase();
  if (!KEY_PATTERN.test(text)) invalid(`${label} non valido: usa lettere minuscole, numeri, punto, trattino o underscore.`);
  return text;
}

function optionalRole(value) {
  const text = optionalText(value, "Ruolo", 80);
  if (text && !ROLE_PATTERN.test(text)) invalid("Ruolo non valido.");
  return text;
}

function integerBetween(value, label, minimum, maximum) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    invalid(`${label} deve essere un intero tra ${minimum} e ${maximum}.`);
  }
  return number;
}

function bool(value, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  invalid("Valore booleano non valido.");
}

function optionalHttpsUrl(value) {
  const text = optionalText(value, "URL ufficiale", 2048);
  if (!text) return null;
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    invalid("URL ufficiale non valido.");
  }
  if (parsed.protocol !== "https:") invalid("L'URL ufficiale deve usare HTTPS.");
  if (parsed.username || parsed.password) invalid("L'URL ufficiale non può contenere credenziali.");
  return parsed.toString();
}

function isoInstant(value, label, { nullable = true } = {}) {
  if ((value === undefined || value === null || value === "") && nullable) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) invalid(`${label} non valida.`);
  return date.toISOString();
}

function jsonArray(value, label) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) invalid(`${label} deve essere un elenco.`);
  return structuredClone(value);
}

function jsonObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(`${label} deve essere un oggetto.`);
  return structuredClone(value);
}

function jsonParameter(value) {
  return JSON.stringify(value ?? null);
}

function normalizePagination(input = {}) {
  const limit = input.limit === undefined ? DEFAULT_LIMIT : integerBetween(input.limit, "Limite", 1, MAX_LIMIT);
  const offset = input.offset === undefined ? 0 : integerBetween(input.offset, "Offset", 0, 1_000_000);
  return { limit, offset };
}

function listEnvelope(result, { limit, offset }, extra = {}) {
  const raw = rowsOf(result);
  const total = raw.length ? Number(raw[0].total_count ?? raw.length) : 0;
  const items = raw.map(({ total_count: _totalCount, ...item }) => item);
  return { items, total, limit, offset, ...extra };
}

function asNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function taxonomyDomains(taxonomy) {
  const domains = Array.isArray(taxonomy) ? taxonomy : taxonomy?.domains;
  return Array.isArray(domains) ? domains.filter((item) => item && typeof item === "object" && item.id) : [];
}

function registrySources(registry) {
  if (Array.isArray(registry)) return registry;
  if (Array.isArray(registry?.sources)) return registry.sources;
  return [];
}

function validateDomain(value, configuredDomains) {
  const domain = keyText(value, "Dominio");
  if (configuredDomains.size && !configuredDomains.has(domain)) invalid(`Dominio non presente nella tassonomia: ${domain}.`);
  return domain;
}

function normalizeRisk(value, fallback = "medium") {
  const risk = String(value ?? fallback).trim().toLowerCase();
  if (!RISK_LEVELS.has(risk)) invalid("Livello di rischio non valido.");
  return risk;
}

function normalizeSourceVersions(value) {
  const values = jsonArray(value, "Versioni fonte");
  return values.map((item) => parseId(item, "Versione fonte"));
}

function createOpaqueCaseKey() {
  return `caso-${crypto.randomUUID()}`;
}

function assertOpaqueStoredCaseIdentity(caseKey, sourceType) {
  if (!/^caso-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(caseKey || ""))) {
    invalid("Il caso non usa un identificativo opaco valido.");
  }
  if (sourceType !== "internal_anonymized_case") invalid("Il tipo fonte del caso non è ammesso.");
}

function assertCaseAnonymized(value, path = "facts") {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertCaseAnonymized(item, `${path}[${index}]`));
    return;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (SENSITIVE_CASE_KEY.test(key) || !isAurumCaseFieldNameAllowed(key)) {
        invalid(`Il caso non è anonimizzato: campo sensibile o non controllato ${path}.${key}.`);
      }
      assertCaseAnonymized(nested, `${path}.${key}`);
    }
    return;
  }
  if (typeof value === "string" || typeof value === "number") {
    const allowChemicalFormula = /(?:^|\.)(?:formula|formula_chimica|chemical_formula)$/iu.test(path);
    if (containsAurumCaseRestrictedData(String(value), { allowChemicalFormula })) {
      invalid(`Il caso non è anonimizzato: dato personale o testo fuori vocabolario controllato in ${path}.`);
    }
  }
}

function normalizedSteps(value) {
  if (!Array.isArray(value) || value.length === 0) invalid("La procedura richiede almeno un passo.");
  const seen = new Set();
  return value.map((step, index) => {
    if (!step || typeof step !== "object" || Array.isArray(step)) invalid(`Passo ${index + 1} non valido.`);
    const stepOrder = step.step_order === undefined ? index + 1 : integerBetween(step.step_order, "Ordine passo", 1, 10_000);
    if (seen.has(stepOrder)) invalid(`Ordine passo duplicato: ${stepOrder}.`);
    seen.add(stepOrder);
    return {
      step_order: stepOrder,
      title: requiredText(step.title, `Titolo passo ${stepOrder}`, 300),
      instruction: requiredText(step.instruction, `Istruzione passo ${stepOrder}`, 10_000),
      why_it_matters: optionalText(step.why_it_matters ?? step.whyItMatters, "Motivazione passo", 5000),
      input_schema: step.input_schema === undefined ? {} : jsonObject(step.input_schema, "Schema input"),
      expected_result: step.expected_result === undefined ? {} : jsonObject(step.expected_result, "Risultato atteso"),
      warning: optionalText(step.warning, "Avvertenza passo", 5000),
      blocking: bool(step.blocking, false)
    };
  }).sort((a, b) => a.step_order - b.step_order);
}

function itemOrNotFound(result, entity) {
  const item = firstRow(result);
  if (!item) notFound(entity);
  return { item };
}

export function createAurumKnowledgeManagement({ query, taxonomy = { domains: [] }, registry = { sources: [] }, clock = () => new Date() } = {}) {
  if (typeof query !== "function") invalid("Adapter SQL query obbligatorio.");
  if (typeof clock !== "function") invalid("Clock non valido.");
  const domainDefinitions = taxonomyDomains(taxonomy);
  const configuredDomains = new Set(domainDefinitions.map((item) => String(item.id).toLowerCase()));
  const configuredSources = registrySources(registry);

  function nowIso() {
    return isoInstant(clock(), "Data corrente", { nullable: false });
  }

  async function coverage() {
    const result = await query(`WITH domain_counts AS (
        SELECT domain,
          COUNT(*)::int AS sources,
          COUNT(*) FILTER (WHERE active = TRUE)::int AS active_sources,
          0::int AS documents, 0::int AS facts, 0::int AS procedures,
          0::int AS approved_items
        FROM ai_source_registry GROUP BY domain
        UNION ALL
        SELECT domain, 0, 0, COUNT(*)::int, 0, 0,
          COUNT(*) FILTER (WHERE review_status = 'approved' AND is_current = TRUE)::int
        FROM ai_documents WHERE domain IS NOT NULL GROUP BY domain
        UNION ALL
        SELECT domain, 0, 0, 0, COUNT(*)::int, 0,
          COUNT(*) FILTER (WHERE review_status = 'approved')::int
        FROM ai_knowledge_facts GROUP BY domain
        UNION ALL
        SELECT domain, 0, 0, 0, 0, COUNT(*)::int,
          COUNT(*) FILTER (WHERE review_status = 'approved' AND active = TRUE)::int
        FROM ai_procedures GROUP BY domain
      )
      SELECT domain,
        SUM(sources)::int AS sources, SUM(active_sources)::int AS active_sources,
        SUM(documents)::int AS documents, SUM(facts)::int AS facts,
        SUM(procedures)::int AS procedures, SUM(approved_items)::int AS approved_items
      FROM domain_counts GROUP BY domain ORDER BY domain`, []);
    const databaseRows = new Map(rowsOf(result).map((row) => [String(row.domain), row]));
    const known = new Set(domainDefinitions.map((item) => String(item.id)));
    const definitions = [
      ...domainDefinitions,
      ...[...databaseRows.keys()].filter((id) => !known.has(id)).map((id) => ({ id, description: "Dominio presente nel database", risk_level: "unknown", primary_sources: [] }))
    ];
    const items = definitions.map((definition) => {
      const row = databaseRows.get(String(definition.id)) || {};
      const sources = asNumber(row.sources);
      const activeSources = asNumber(row.active_sources ?? row.sources);
      const documents = asNumber(row.documents);
      const facts = asNumber(row.facts);
      const procedures = asNumber(row.procedures);
      const approvedItems = asNumber(row.approved_items);
      const requiredSources = Array.isArray(definition.primary_sources) ? definition.primary_sources : [];
      const registeredKeys = new Set(configuredSources.filter((source) => source.active !== false).map((source) => source.source_key));
      const configuredPrimarySources = requiredSources.filter((key) => registeredKeys.has(key)).length;
      const referencedActiveSources = configuredPrimarySources;
      const effectiveActiveSources = Math.max(activeSources, referencedActiveSources);
      const score = Math.min(100,
        (effectiveActiveSources > 0 ? 20 : 0) +
        (documents > 0 ? 20 : 0) +
        (facts > 0 ? 25 : 0) +
        (procedures > 0 ? 20 : 0) +
        (approvedItems > 0 ? 10 : 0) +
        (requiredSources.length === 0 || configuredPrimarySources === requiredSources.length ? 5 : 0)
      );
      return {
        id: String(definition.id),
        description: definition.description || "",
        riskLevel: definition.risk_level || "unknown",
        primarySources: requiredSources,
        configuredPrimarySources,
        referencedActiveSources,
        sources,
        activeSources,
        documents,
        facts,
        procedures,
        approvedItems,
        score,
        covered: effectiveActiveSources > 0 && approvedItems > 0,
        gaps: [
          ...(effectiveActiveSources ? [] : ["Nessuna fonte attiva"]),
          ...(documents || facts || procedures ? [] : ["Nessun contenuto indicizzato"]),
          ...(approvedItems ? [] : ["Nessun contenuto approvato"]),
          ...(requiredSources.length === configuredPrimarySources ? [] : ["Fonti primarie configurate incomplete"])
        ]
      };
    });
    const covered = items.filter((item) => item.covered).length;
    return {
      items,
      summary: {
        total_domains: items.length,
        covered_domains: covered,
        uncovered_domains: items.length - covered,
        average_score: items.length ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length) : 0
      },
      generatedAt: nowIso()
    };
  }

  async function overview() {
    const metricsResult = await query(`SELECT
        (SELECT COUNT(*) FROM ai_source_registry WHERE active = TRUE)::int AS active_sources,
        (SELECT COUNT(*) FROM ai_source_registry WHERE active = TRUE AND authority_level >= 90)::int AS official_sources,
        (SELECT COUNT(*) FROM ai_documents)::int AS documents,
        (SELECT COUNT(*) FROM ai_document_chunks)::int AS chunks,
        (SELECT COUNT(*) FROM ai_knowledge_facts)::int AS facts,
        (SELECT COUNT(*) FROM ai_knowledge_relations)::int AS relations,
        (SELECT COUNT(*) FROM ai_procedures WHERE active = TRUE)::int AS procedures,
        (SELECT COUNT(*) FROM ai_case_library WHERE anonymized = TRUE AND review_status = 'approved')::int AS cases,
        (SELECT COUNT(*) FROM ai_source_registry
          WHERE active = TRUE
            AND update_frequency NOT IN ('manual', 'on_change')
            AND (next_check_at IS NULL OR next_check_at <= $1::timestamptz))::int AS stale_sources,
        (SELECT COUNT(*) FROM ai_knowledge_conflicts WHERE status = 'open')::int AS conflicts,
        (SELECT COUNT(*) FROM ai_review_queue WHERE status = 'pending')::int AS review_pending,
        (SELECT COUNT(*) FROM ai_answer_audit WHERE answer_status IN ('INSUFFICIENTE', 'no_answer', 'insufficient'))::int AS unanswered_questions,
        COALESCE((SELECT AVG(confidence) FROM ai_answer_audit), 0)::numeric(6,4) AS average_reliability`, [nowIso()]);
    const metricRow = firstRow(metricsResult) || {};
    const domainCoverage = await coverage();
    return {
      activeSources: asNumber(metricRow.active_sources),
      officialSources: asNumber(metricRow.official_sources),
      documents: asNumber(metricRow.documents),
      chunks: asNumber(metricRow.chunks),
      facts: asNumber(metricRow.facts),
      relations: asNumber(metricRow.relations),
      procedures: asNumber(metricRow.procedures),
      cases: asNumber(metricRow.cases),
      staleSources: asNumber(metricRow.stale_sources),
      conflicts: asNumber(metricRow.conflicts),
      reviewPending: asNumber(metricRow.review_pending),
      unansweredQuestions: asNumber(metricRow.unanswered_questions),
      averageReliability: asNumber(metricRow.average_reliability),
      configuredSources: configuredSources.length,
      coverage: domainCoverage.summary,
      coverageByDomain: domainCoverage.items,
      generatedAt: nowIso()
    };
  }

  async function domains() {
    return coverage();
  }

  async function listSources(filters = {}) {
    const page = normalizePagination(filters);
    const params = [];
    const where = [];
    if (filters.domain) {
      params.push(validateDomain(filters.domain, configuredDomains));
      where.push(`s.domain = $${params.length}`);
    }
    if (filters.active !== undefined) {
      params.push(bool(filters.active));
      where.push(`s.active = $${params.length}`);
    }
    if (filters.search) {
      params.push(`%${requiredText(filters.search, "Ricerca", 200)}%`);
      where.push(`(s.source_key ILIKE $${params.length} OR s.organization ILIKE $${params.length} OR s.title ILIKE $${params.length})`);
    }
    params.push(page.limit, page.offset);
    const result = await query(`SELECT s.*,
        COUNT(*) OVER() AS total_count,
        COALESCE(vc.version_count, 0)::int AS version_count,
        latest.id AS latest_version_id, latest.version_label AS latest_version_label,
        latest.review_status AS latest_review_status, latest.retrieved_at AS latest_retrieved_at
      FROM ai_source_registry s
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS version_count FROM ai_source_versions v WHERE v.source_id = s.id
      ) vc ON TRUE
      LEFT JOIN LATERAL (
        SELECT v.id, v.version_label, v.review_status, v.retrieved_at
        FROM ai_source_versions v WHERE v.source_id = s.id
        ORDER BY v.created_at DESC, v.id DESC LIMIT 1
      ) latest ON TRUE
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY s.authority_level DESC, s.organization, s.title
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return listEnvelope(result, page);
  }

  async function createSource(input = {}) {
    const sourceKey = keyText(input.source_key, "Chiave fonte");
    const domain = validateDomain(input.domain, configuredDomains);
    const values = [
      sourceKey,
      requiredText(input.organization, "Organizzazione", 300),
      requiredText(input.title, "Titolo", 500),
      optionalHttpsUrl(input.official_url),
      domain,
      optionalText(input.jurisdiction, "Giurisdizione", 20)?.toUpperCase() || "IT",
      integerBetween(input.authority_level, "Livello di autorità", 0, 100),
      keyText(input.source_type, "Tipo fonte"),
      optionalText(input.document_identifier, "Identificativo documento", 300),
      optionalText(input.language, "Lingua", 20) || "it",
      optionalText(input.license, "Licenza", 300) || "da_verificare",
      optionalText(input.ingestion_mode, "Modalità di acquisizione", 120) || "manual_review",
      keyText(input.content_policy || "metadata_abstract_only_until_rights_reviewed", "Policy contenuto"),
      bool(input.allow_full_text, false),
      true,
      bool(input.active, true),
      optionalText(input.update_frequency, "Frequenza aggiornamento", 80) || "manual"
    ];
    const result = await query(`INSERT INTO ai_source_registry (
        source_key, organization, title, official_url, domain, jurisdiction, authority_level, source_type,
        document_identifier, language, license, ingestion_mode, content_policy, allow_full_text,
        requires_manual_review, active, update_frequency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`, values);
    return itemOrNotFound(result, "Fonte creata");
  }

  async function updateSource(idValue, input = {}) {
    const id = parseId(idValue, "Identificativo fonte");
    const entries = Object.entries(input).filter(([field]) => SOURCE_UPDATE_FIELDS.has(field));
    if (!entries.length) invalid("Nessun campo fonte aggiornabile fornito.");
    const setters = [];
    const params = [];
    for (const [field, raw] of entries) {
      let value;
      switch (field) {
        case "source_key": value = keyText(raw, "Chiave fonte"); break;
        case "organization": value = requiredText(raw, "Organizzazione", 300); break;
        case "title": value = requiredText(raw, "Titolo", 500); break;
        case "official_url": value = optionalHttpsUrl(raw); break;
        case "domain": value = validateDomain(raw, configuredDomains); break;
        case "jurisdiction": value = optionalText(raw, "Giurisdizione", 20)?.toUpperCase(); break;
        case "authority_level": value = integerBetween(raw, "Livello di autorità", 0, 100); break;
        case "source_type": value = keyText(raw, "Tipo fonte"); break;
        case "content_policy": value = keyText(raw, "Policy contenuto"); break;
        case "allow_full_text": value = bool(raw); break;
        case "active": value = bool(raw); break;
        case "requires_manual_review": value = true; break;
        case "next_check_at": value = isoInstant(raw, "Prossimo controllo"); break;
        default: value = optionalText(raw, field, field === "document_identifier" ? 300 : 120);
      }
      params.push(value);
      setters.push(`${field} = $${params.length}`);
    }
    params.push(id);
    const manualReviewAlreadyAssigned = entries.some(([field]) => field === "requires_manual_review");
    const result = await query(`UPDATE ai_source_registry
      SET ${setters.join(", ")}${manualReviewAlreadyAssigned ? "" : ", requires_manual_review = TRUE"}, updated_at = NOW()
      WHERE id = $${params.length} RETURNING *`, params);
    return itemOrNotFound(result, "Fonte");
  }

  async function sourceVersions(sourceIdValue, filters = {}) {
    const sourceId = parseId(sourceIdValue, "Identificativo fonte");
    const page = normalizePagination(filters);
    const params = [sourceId];
    const where = ["v.source_id = $1"];
    if (filters.status) {
      params.push(requiredText(filters.status, "Stato versione", 40));
      where.push(`v.review_status = $${params.length}`);
    }
    params.push(page.limit, page.offset);
    const result = await query(`SELECT v.*, s.source_key, s.organization, s.title AS source_title,
        COUNT(*) OVER() AS total_count
      FROM ai_source_versions v JOIN ai_source_registry s ON s.id = v.source_id
      WHERE ${where.join(" AND ")}
      ORDER BY v.created_at DESC, v.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return listEnvelope(result, page, { sourceId });
  }

  async function listVersions(filters = {}) {
    const page = normalizePagination(filters);
    const params = [];
    const where = [];
    if (filters.source_id) {
      params.push(parseId(filters.source_id, "Identificativo fonte"));
      where.push(`v.source_id = $${params.length}`);
    }
    if (filters.status) {
      params.push(requiredText(filters.status, "Stato versione", 40));
      where.push(`v.review_status = $${params.length}`);
    }
    if (filters.current !== undefined) {
      params.push(bool(filters.current));
      where.push(`v.is_current = $${params.length}`);
    }
    params.push(page.limit, page.offset);
    const result = await query(`SELECT v.*, s.source_key, s.organization, s.title AS source_title,
        s.domain, s.authority_level, COUNT(*) OVER() AS total_count
      FROM ai_source_versions v JOIN ai_source_registry s ON s.id = v.source_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY v.created_at DESC, v.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return listEnvelope(result, page);
  }

  async function approveVersion(versionIdValue, input = {}) {
    const versionId = parseId(versionIdValue, "Identificativo versione");
    const reviewedBy = parseId(input.reviewedBy ?? input.reviewed_by, "Identificativo revisore");
    const reviewedAt = nowIso();
    const result = await query(`WITH target AS MATERIALIZED (
        SELECT * FROM ai_source_versions WHERE id = $1 FOR UPDATE
      ), source_lock AS MATERIALIZED (
        SELECT s.id FROM ai_source_registry s
        JOIN target t ON t.source_id = s.id
        FOR UPDATE
      ), approved AS (
        UPDATE ai_source_versions v
        SET review_status = 'approved', reviewed_by = $2, reviewed_at = $3::timestamptz, is_current = TRUE
        FROM target t
        WHERE v.id = t.id
          AND EXISTS (SELECT 1 FROM source_lock)
          AND t.review_status IN ('pending', 'changes_requested', 'approved')
        RETURNING v.*
      ), demoted AS (
        UPDATE ai_source_versions v
        SET is_current = FALSE
        WHERE v.source_id = (SELECT source_id FROM approved)
          AND v.id <> $1 AND v.is_current = TRUE
        RETURNING v.id
      ), demoted_documents AS (
        UPDATE ai_documents d
        SET is_current = FALSE
        WHERE d.source_registry_id = (SELECT source_id FROM approved)
          AND d.source_version_id <> $1 AND d.is_current = TRUE
        RETURNING d.id
      ), approved_documents AS (
        UPDATE ai_documents d
        SET review_status = 'approved', is_current = TRUE, last_verified_at = $3::timestamptz
        WHERE d.source_version_id = $1
          AND EXISTS (SELECT 1 FROM approved)
        RETURNING d.id
      ), approved_chunks AS (
        UPDATE ai_document_chunks c
        SET review_status = 'approved'
        WHERE c.source_version_id = $1
          AND EXISTS (SELECT 1 FROM approved)
        RETURNING c.id
      ), approved_facts AS (
        UPDATE ai_knowledge_facts f
        SET review_status = 'approved', reviewed_by = $2, reviewed_at = $3::timestamptz, updated_at = NOW()
        WHERE f.source_version_id = $1
          AND EXISTS (SELECT 1 FROM approved)
        RETURNING f.id
      ), approved_relations AS (
        UPDATE ai_knowledge_relations r
        SET review_status = 'approved', updated_at = NOW()
        WHERE r.source_version_id = $1
          AND EXISTS (SELECT 1 FROM approved)
        RETURNING r.id
      ), resolved_reviews AS (
        UPDATE ai_review_queue q
        SET status = 'approved', resolved_by = $2, resolved_at = $3::timestamptz
        WHERE q.entity_type = 'source_version' AND q.entity_id = $1
          AND q.status IN ('pending', 'in_review')
          AND EXISTS (SELECT 1 FROM approved)
        RETURNING q.id
      )
      SELECT t.id AS target_id, t.review_status AS previous_status,
        (SELECT to_jsonb(a) FROM approved a) AS item,
        (SELECT COUNT(*)::int FROM demoted) AS demoted_count,
        (SELECT COUNT(*)::int FROM demoted_documents) AS demoted_documents_count,
        (SELECT COUNT(*)::int FROM approved_documents) AS approved_documents_count,
        (SELECT COUNT(*)::int FROM approved_chunks) AS approved_chunks_count,
        (SELECT COUNT(*)::int FROM approved_facts) AS approved_facts_count,
        (SELECT COUNT(*)::int FROM approved_relations) AS approved_relations_count,
        (SELECT COUNT(*)::int FROM resolved_reviews) AS resolved_reviews_count
      FROM target t`, [versionId, reviewedBy, reviewedAt]);
    const row = firstRow(result);
    if (!row) notFound("Versione");
    if (!row.item) conflict(`La versione in stato ${row.previous_status || "sconosciuto"} non è approvabile.`);
    return {
      item: row.item,
      previousStatus: row.previous_status,
      demotedVersions: asNumber(row.demoted_count),
      demotedDocuments: asNumber(row.demoted_documents_count),
      approvedDocuments: asNumber(row.approved_documents_count),
      approvedChunks: asNumber(row.approved_chunks_count),
      approvedFacts: asNumber(row.approved_facts_count),
      approvedRelations: asNumber(row.approved_relations_count),
      resolvedReviews: asNumber(row.resolved_reviews_count)
    };
  }

  async function listReviewQueue(filters = {}) {
    const page = normalizePagination(filters);
    const params = [];
    const where = [];
    for (const [field, maximum] of [["status", 40], ["priority", 40], ["entity_type", 80]]) {
      if (filters[field]) {
        params.push(requiredText(filters[field], field, maximum));
        where.push(`${field} = $${params.length}`);
      }
    }
    params.push(page.limit, page.offset);
    const result = await query(`SELECT q.*, COUNT(*) OVER() AS total_count
      FROM ai_review_queue q ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY CASE q.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
        q.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return listEnvelope(result, page);
  }

  async function resolveReviewQueueItem(idValue, input = {}) {
    const id = parseId(idValue, "Identificativo review");
    const status = requiredText(input.status, "Esito review", 40).toLowerCase();
    if (!REVIEW_RESOLUTIONS.has(status)) invalid("Esito review non valido.");
    const resolvedBy = parseId(input.resolvedBy ?? input.resolved_by, "Identificativo revisore");
    const resolution = optionalText(input.resolution, "Motivazione risoluzione", 4000);
    const auditPatch = { resolution, resolution_status: status, resolved_at: nowIso() };
    const result = await query(`WITH target AS MATERIALIZED (
        SELECT * FROM ai_review_queue
        WHERE id = $1 AND status IN ('pending', 'in_review')
        FOR UPDATE
      ), applied_source_registry AS (
        UPDATE ai_source_registry s SET
          organization = CASE WHEN t.proposed_change->'configured' ? 'organization' THEN t.proposed_change->'configured'->>'organization' ELSE s.organization END,
          title = CASE WHEN t.proposed_change->'configured' ? 'title' THEN t.proposed_change->'configured'->>'title' ELSE s.title END,
          official_url = CASE WHEN t.proposed_change->'configured' ? 'official_url' THEN t.proposed_change->'configured'->>'official_url' ELSE s.official_url END,
          domain = CASE WHEN t.proposed_change->'configured' ? 'domain' THEN t.proposed_change->'configured'->>'domain' ELSE s.domain END,
          jurisdiction = CASE WHEN t.proposed_change->'configured' ? 'jurisdiction' THEN t.proposed_change->'configured'->>'jurisdiction' ELSE s.jurisdiction END,
          authority_level = CASE WHEN t.proposed_change->'configured' ? 'authority_level' THEN (t.proposed_change->'configured'->>'authority_level')::int ELSE s.authority_level END,
          source_type = CASE WHEN t.proposed_change->'configured' ? 'source_type' THEN t.proposed_change->'configured'->>'source_type' ELSE s.source_type END,
          document_identifier = CASE WHEN t.proposed_change->'configured' ? 'document_identifier' THEN t.proposed_change->'configured'->>'document_identifier' ELSE s.document_identifier END,
          language = CASE WHEN t.proposed_change->'configured' ? 'language' THEN t.proposed_change->'configured'->>'language' ELSE s.language END,
          license = CASE WHEN t.proposed_change->'configured' ? 'license' THEN t.proposed_change->'configured'->>'license' ELSE s.license END,
          ingestion_mode = CASE WHEN t.proposed_change->'configured' ? 'ingestion_mode' THEN t.proposed_change->'configured'->>'ingestion_mode' ELSE s.ingestion_mode END,
          content_policy = CASE WHEN t.proposed_change->'configured' ? 'content_policy' THEN t.proposed_change->'configured'->>'content_policy' ELSE s.content_policy END,
          allow_full_text = CASE WHEN t.proposed_change->'configured' ? 'allow_full_text' THEN (t.proposed_change->'configured'->>'allow_full_text')::boolean ELSE s.allow_full_text END,
          update_frequency = CASE WHEN t.proposed_change->'configured' ? 'update_frequency' THEN t.proposed_change->'configured'->>'update_frequency' ELSE s.update_frequency END,
          requires_manual_review = TRUE,
          active = CASE WHEN t.proposed_change->'configured' ? 'active' THEN (t.proposed_change->'configured'->>'active')::boolean ELSE s.active END,
          updated_at = NOW()
        FROM target t
        WHERE $2::text = 'approved'
          AND t.entity_type = 'source_registry_update'
          AND s.id = t.entity_id
          AND jsonb_typeof(t.proposed_change->'current') = 'object'
          AND to_jsonb(s) @> (t.proposed_change->'current')
        RETURNING s.id
      ), resolved AS (
        UPDATE ai_review_queue q
        SET status = $2, resolved_by = $3, resolved_at = $4::timestamptz,
            proposed_change = COALESCE(q.proposed_change, '{}'::jsonb) || $5::jsonb
        FROM target t
        WHERE q.id = t.id
          AND ($2::text <> 'approved'
            OR t.entity_type <> 'source_registry_update'
            OR EXISTS (SELECT 1 FROM applied_source_registry))
        RETURNING q.*
      )
      SELECT r.*, EXISTS (SELECT 1 FROM applied_source_registry) AS source_registry_applied
      FROM resolved r`, [id, status, resolvedBy, auditPatch.resolved_at, jsonParameter(auditPatch)]);
    const resolved = firstRow(result);
    if (!resolved) conflict("Elemento review non trovato, già risolto oppure proposta superata da una modifica più recente.");
    const { source_registry_applied: sourceRegistryApplied, ...item } = resolved;
    return { item, sourceRegistryApplied: sourceRegistryApplied === true };
  }

  async function listConflicts(filters = {}) {
    const page = normalizePagination(filters);
    const params = [];
    const where = [];
    for (const [field, maximum] of [["status", 40], ["risk_level", 40], ["domain", 120]]) {
      if (filters[field]) {
        const value = field === "domain" ? validateDomain(filters[field], configuredDomains) : requiredText(filters[field], field, maximum);
        params.push(value);
        where.push(`c.${field} = $${params.length}`);
      }
    }
    params.push(page.limit, page.offset);
    const result = await query(`SELECT c.*, va.version_label AS version_a, vb.version_label AS version_b,
        sa.source_key AS source_a, sb.source_key AS source_b, COUNT(*) OVER() AS total_count
      FROM ai_knowledge_conflicts c
      LEFT JOIN ai_source_versions va ON va.id = c.source_version_a_id
      LEFT JOIN ai_source_registry sa ON sa.id = va.source_id
      LEFT JOIN ai_source_versions vb ON vb.id = c.source_version_b_id
      LEFT JOIN ai_source_registry sb ON sb.id = vb.source_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY CASE c.risk_level WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        c.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return listEnvelope(result, page);
  }

  async function resolveConflict(idValue, input = {}) {
    const id = parseId(idValue, "Identificativo conflitto");
    const status = requiredText(input.status ?? "resolved", "Esito conflitto", 40).toLowerCase();
    if (!CONFLICT_RESOLUTIONS.has(status)) invalid("Esito conflitto non valido.");
    const resolvedBy = parseId(input.resolvedBy ?? input.resolved_by, "Identificativo revisore");
    const action = requiredText(input.resolution ?? input.recommended_action, "Risoluzione", 4000);
    const result = await query(`UPDATE ai_knowledge_conflicts
      SET status = $2, resolved_by = $3, resolved_at = $4::timestamptz,
          recommended_action = $5, updated_at = NOW()
      WHERE id = $1 AND status = 'open' RETURNING *`, [id, status, resolvedBy, nowIso(), action]);
    if (!firstRow(result)) conflict("Conflitto non trovato oppure già risolto.");
    return { item: firstRow(result) };
  }

  async function stale(filters = {}) {
    const page = normalizePagination(filters);
    const current = nowIso();
    const params = [current];
    if (filters.domain) params.push(validateDomain(filters.domain, configuredDomains));
    params.push(page.limit, page.offset);
    const domainClause = filters.domain ? "AND s.domain = $2" : "";
    const result = await query(`SELECT s.*, latest.version_id, latest.version_label, latest.effective_to,
        CASE
          WHEN s.next_check_at IS NULL THEN 'Controllo non pianificato'
          WHEN s.next_check_at <= $1::timestamptz THEN 'Controllo fonte scaduto'
          WHEN latest.effective_to < $1::date THEN 'Versione corrente non più efficace'
          WHEN latest.version_id IS NULL THEN 'Nessuna versione acquisita'
          ELSE 'Da verificare'
        END AS stale_reason,
        COUNT(*) OVER() AS total_count
      FROM ai_source_registry s
      LEFT JOIN LATERAL (
        SELECT v.id AS version_id, v.version_label, v.effective_to
        FROM ai_source_versions v
        WHERE v.source_id = s.id AND v.is_current = TRUE
        ORDER BY v.created_at DESC LIMIT 1
      ) latest ON TRUE
      WHERE s.active = TRUE ${domainClause}
        AND (s.next_check_at IS NULL OR s.next_check_at <= $1::timestamptz
          OR latest.version_id IS NULL OR latest.effective_to < $1::date)
      ORDER BY s.next_check_at NULLS FIRST, s.authority_level DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return listEnvelope(result, page, { checkedAt: current });
  }

  async function listProcedures(filters = {}) {
    const page = normalizePagination(filters);
    const params = [];
    const where = [];
    if (filters.domain) {
      params.push(validateDomain(filters.domain, configuredDomains));
      where.push(`p.domain = $${params.length}`);
    }
    if (filters.status) {
      params.push(requiredText(filters.status, "Stato procedura", 40));
      where.push(`p.review_status = $${params.length}`);
    }
    if (filters.active !== undefined) {
      params.push(bool(filters.active));
      where.push(`p.active = $${params.length}`);
    }
    params.push(page.limit, page.offset);
    const result = await query(`SELECT p.*, COALESCE(steps.items, '[]'::jsonb) AS steps,
        COUNT(*) OVER() AS total_count
      FROM ai_procedures p
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(to_jsonb(ps) ORDER BY ps.step_order) AS items
        FROM ai_procedure_steps ps WHERE ps.procedure_id = p.id
      ) steps ON TRUE
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY p.domain, p.title, p.version DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return listEnvelope(result, page);
  }

  async function createProcedure(input = {}) {
    const steps = normalizedSteps(input.steps);
    const values = [
      keyText(input.procedure_key, "Chiave procedura"),
      requiredText(input.title, "Titolo procedura", 500),
      validateDomain(input.domain, configuredDomains),
      optionalText(input.jurisdiction, "Giurisdizione", 20)?.toUpperCase() || "IT",
      optionalText(input.purpose, "Scopo", 5000),
      normalizeRisk(input.risk_level),
      optionalRole(input.required_role),
      jsonParameter(jsonArray(input.required_tools, "Strumenti richiesti")),
      jsonParameter(jsonArray(input.preconditions, "Precondizioni")),
      jsonParameter(jsonArray(input.stop_conditions, "Condizioni di arresto")),
      jsonParameter(jsonArray(input.escalation_rules, "Regole di escalation")),
      jsonParameter(normalizeSourceVersions(input.source_versions)),
      bool(input.active, true),
      jsonParameter(steps)
    ];
    const result = await query(`WITH inserted AS (
        INSERT INTO ai_procedures (
          procedure_key, title, domain, jurisdiction, purpose, risk_level, required_role, required_tools,
          preconditions, stop_conditions, escalation_rules, source_versions, version, active, review_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, 1, $13, 'pending')
        RETURNING *
      ), inserted_steps AS (
        INSERT INTO ai_procedure_steps (
          procedure_id, step_order, title, instruction, why_it_matters, input_schema, expected_result, warning, blocking
        )
        SELECT p.id, x.step_order, x.title, x.instruction, x.why_it_matters,
          x.input_schema, x.expected_result, x.warning, x.blocking
        FROM inserted p CROSS JOIN jsonb_to_recordset($14::jsonb) AS x(
          step_order int, title text, instruction text, why_it_matters text,
          input_schema jsonb, expected_result jsonb, warning text, blocking boolean
        ) RETURNING *
      )
      SELECT p.*, COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.step_order) FROM inserted_steps s), '[]'::jsonb) AS steps
      FROM inserted p`, values);
    return itemOrNotFound(result, "Procedura creata");
  }

  async function updateProcedure(idValue, input = {}) {
    const id = parseId(idValue, "Identificativo procedura");
    const hasSteps = Object.hasOwn(input, "steps");
    const steps = hasSteps ? normalizedSteps(input.steps) : null;
    const entries = Object.entries(input).filter(([field]) => PROCEDURE_UPDATE_FIELDS.has(field));
    if (!entries.length && !hasSteps) invalid("Nessun campo procedura aggiornabile fornito.");
    const setters = [];
    const params = [];
    for (const [field, raw] of entries) {
      let value;
      switch (field) {
        case "procedure_key": value = keyText(raw, "Chiave procedura"); break;
        case "title": value = requiredText(raw, "Titolo procedura", 500); break;
        case "domain": value = validateDomain(raw, configuredDomains); break;
        case "jurisdiction": value = optionalText(raw, "Giurisdizione", 20)?.toUpperCase(); break;
        case "purpose": value = optionalText(raw, "Scopo", 5000); break;
        case "risk_level": value = normalizeRisk(raw); break;
        case "required_role": value = optionalRole(raw); break;
        case "active": value = bool(raw); break;
        case "source_versions": value = normalizeSourceVersions(raw); break;
        default: value = jsonArray(raw, field);
      }
      params.push(["required_tools", "preconditions", "stop_conditions", "escalation_rules", "source_versions"].includes(field)
        ? jsonParameter(value)
        : value);
      setters.push(`${field} = $${params.length}${["required_tools", "preconditions", "stop_conditions", "escalation_rules", "source_versions"].includes(field) ? "::jsonb" : ""}`);
    }
    const idPosition = params.push(id);
    const baseSet = `${setters.length ? `${setters.join(", ")}, ` : ""}version = version + 1,
      review_status = 'pending', reviewed_by = NULL, reviewed_at = NULL, updated_at = NOW()`;
    if (!hasSteps) {
      const result = await query(`UPDATE ai_procedures SET ${baseSet} WHERE id = $${idPosition} RETURNING *`, params);
      return itemOrNotFound(result, "Procedura");
    }
    const stepsPosition = params.push(jsonParameter(steps));
    const ordersPosition = params.push(steps.map((step) => step.step_order));
    const result = await query(`WITH updated AS (
        UPDATE ai_procedures SET ${baseSet} WHERE id = $${idPosition} RETURNING *
      ), pruned AS (
        DELETE FROM ai_procedure_steps ps USING updated p
        WHERE ps.procedure_id = p.id AND NOT (ps.step_order = ANY($${ordersPosition}::int[]))
        RETURNING ps.id
      ), upserted AS (
        INSERT INTO ai_procedure_steps (
          procedure_id, step_order, title, instruction, why_it_matters, input_schema, expected_result, warning, blocking
        )
        SELECT p.id, x.step_order, x.title, x.instruction, x.why_it_matters,
          x.input_schema, x.expected_result, x.warning, x.blocking
        FROM updated p CROSS JOIN jsonb_to_recordset($${stepsPosition}::jsonb) AS x(
          step_order int, title text, instruction text, why_it_matters text,
          input_schema jsonb, expected_result jsonb, warning text, blocking boolean
        )
        ON CONFLICT (procedure_id, step_order) DO UPDATE SET
          title = EXCLUDED.title, instruction = EXCLUDED.instruction,
          why_it_matters = EXCLUDED.why_it_matters, input_schema = EXCLUDED.input_schema,
          expected_result = EXCLUDED.expected_result, warning = EXCLUDED.warning, blocking = EXCLUDED.blocking
        RETURNING id
      )
      SELECT p.*, $${stepsPosition}::jsonb AS steps,
        (SELECT COUNT(*)::int FROM pruned) AS removed_steps,
        (SELECT COUNT(*)::int FROM upserted) AS written_steps
      FROM updated p`, params);
    return itemOrNotFound(result, "Procedura");
  }

  async function publishProcedure(idValue, input = {}) {
    const id = parseId(idValue, "Identificativo procedura");
    const reviewedBy = parseId(input.reviewedBy ?? input.reviewed_by, "Identificativo revisore");
    const result = await query(`UPDATE ai_procedures p
      SET review_status = 'approved', reviewed_by = $2, reviewed_at = $3::timestamptz, updated_at = NOW()
      WHERE p.id = $1 AND p.active = TRUE
        AND jsonb_typeof(COALESCE(p.source_versions, '[]'::jsonb)) = 'array'
        AND jsonb_array_length(COALESCE(p.source_versions, '[]'::jsonb)) > 0
        AND EXISTS (SELECT 1 FROM ai_procedure_steps ps WHERE ps.procedure_id = p.id)
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(p.source_versions) source_version(value)
          LEFT JOIN ai_source_versions v ON v.id = CASE WHEN source_version.value ~ '^[0-9]+$' THEN source_version.value::bigint ELSE NULL END
          WHERE v.id IS NULL OR v.review_status IS DISTINCT FROM 'approved' OR v.is_current IS DISTINCT FROM TRUE
        )
      RETURNING p.*`, [id, reviewedBy, nowIso()]);
    if (!firstRow(result)) conflict("Procedura non pubblicabile: servono passi e versioni fonte correnti già approvate.");
    return { item: firstRow(result) };
  }

  async function listCases(filters = {}) {
    const page = normalizePagination(filters);
    const params = [];
    const where = [];
    if (filters.domain) {
      params.push(validateDomain(filters.domain, configuredDomains));
      where.push(`c.domain = $${params.length}`);
    }
    if (filters.status) {
      params.push(requiredText(filters.status, "Stato caso", 40));
      where.push(`c.review_status = $${params.length}`);
    }
    params.push(page.limit, page.offset);
    const result = await query(`SELECT c.*, COUNT(*) OVER() AS total_count
      FROM ai_case_library c ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY c.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return listEnvelope(result, page);
  }

  async function createCase(input = {}) {
    const facts = jsonObject(input.facts, "Fatti del caso");
    const testsPerformed = jsonArray(input.tests_performed, "Test eseguiti");
    const title = requiredText(input.title, "Titolo caso", 500);
    const textFields = [title, input.summary, input.initial_error, input.correct_decision, input.final_outcome, input.lesson_learned];
    assertCaseAnonymized(facts);
    assertCaseAnonymized(testsPerformed, "tests_performed");
    textFields.forEach((value, index) => assertCaseAnonymized(value, `testo[${index}]`));
    const opaqueCaseKey = createOpaqueCaseKey();
    const governedSourceType = "internal_anonymized_case";
    const values = [
      opaqueCaseKey,
      title,
      validateDomain(input.domain, configuredDomains),
      optionalText(input.summary, "Sintesi", 10_000),
      jsonParameter(facts),
      jsonParameter(testsPerformed),
      optionalText(input.initial_error, "Errore iniziale", 10_000),
      optionalText(input.correct_decision, "Decisione corretta", 10_000),
      optionalText(input.final_outcome, "Esito finale", 10_000),
      optionalText(input.lesson_learned, "Lezione appresa", 10_000),
      governedSourceType,
      false
    ];
    const result = await query(`INSERT INTO ai_case_library (
        case_key, title, domain, summary, facts, tests_performed, initial_error, correct_decision,
        final_outcome, lesson_learned, source_type, anonymized, review_status
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11, $12, 'pending')
      RETURNING *`, values);
    return itemOrNotFound(result, "Caso creato");
  }

  async function approveCase(idValue, input = {}) {
    const id = parseId(idValue, "Identificativo caso");
    const approvedBy = parseId(input.approvedBy ?? input.approved_by, "Identificativo revisore");
    if (!bool(input.confirmAnonymized ?? input.confirm_anonymized, false)) {
      conflict("Conferma Founder dell'anonimizzazione obbligatoria prima dell'approvazione.");
    }
    const target = firstRow(await query("SELECT * FROM ai_case_library WHERE id = $1", [id]));
    if (!target) notFound("Caso");
    assertOpaqueStoredCaseIdentity(target.case_key, target.source_type);
    assertCaseAnonymized(target.facts, "facts");
    assertCaseAnonymized(target.tests_performed, "tests_performed");
    [target.title, target.summary, target.initial_error, target.correct_decision, target.final_outcome, target.lesson_learned]
      .forEach((value, index) => assertCaseAnonymized(value, `testo[${index}]`));
    const result = await query(`UPDATE ai_case_library
      SET anonymized = TRUE, review_status = 'approved', approved_by = $2, approved_at = $3::timestamptz, updated_at = NOW()
      WHERE id = $1 AND review_status IN ('pending', 'changes_requested', 'approved')
      RETURNING *`, [id, approvedBy, nowIso()]);
    const approved = firstRow(result);
    if (!approved) conflict(`Il caso in stato ${target.review_status || "sconosciuto"} non è approvabile.`);
    return { item: approved, previousStatus: target.review_status };
  }

  async function listDocuments(filters = {}) {
    const page = normalizePagination(filters);
    const params = [];
    const where = [];
    if (filters.domain) {
      params.push(validateDomain(filters.domain, configuredDomains));
      where.push(`d.domain = $${params.length}`);
    }
    if (filters.status) {
      params.push(requiredText(filters.status, "Stato documento", 40));
      where.push(`d.review_status = $${params.length}`);
    }
    if (filters.source_id) {
      params.push(parseId(filters.source_id, "Identificativo fonte"));
      where.push(`d.source_registry_id = $${params.length}`);
    }
    params.push(page.limit, page.offset);
    const result = await query(`SELECT d.*, s.source_key, v.version_label,
        COALESCE(ch.chunk_count, 0)::int AS chunk_count, COUNT(*) OVER() AS total_count
      FROM ai_documents d
      LEFT JOIN ai_source_registry s ON s.id = d.source_registry_id
      LEFT JOIN ai_source_versions v ON v.id = d.source_version_id
      LEFT JOIN LATERAL (SELECT COUNT(*)::int AS chunk_count FROM ai_document_chunks c WHERE c.document_id = d.id) ch ON TRUE
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY d.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return listEnvelope(result, page);
  }

  async function listFacts(filters = {}) {
    const page = normalizePagination(filters);
    const params = [];
    const where = [];
    if (filters.domain) {
      params.push(validateDomain(filters.domain, configuredDomains));
      where.push(`f.domain = $${params.length}`);
    }
    if (filters.status) {
      params.push(requiredText(filters.status, "Stato fatto", 40));
      where.push(`f.review_status = $${params.length}`);
    }
    if (filters.search) {
      params.push(`%${requiredText(filters.search, "Ricerca", 200)}%`);
      where.push(`(f.subject ILIKE $${params.length} OR f.predicate ILIKE $${params.length} OR f.object_value::text ILIKE $${params.length})`);
    }
    params.push(page.limit, page.offset);
    const result = await query(`SELECT f.*, v.version_label, s.source_key, s.title AS source_title,
        COUNT(*) OVER() AS total_count
      FROM ai_knowledge_facts f
      JOIN ai_source_versions v ON v.id = f.source_version_id
      JOIN ai_source_registry s ON s.id = v.source_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY f.authority_level DESC, f.updated_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return listEnvelope(result, page);
  }

  async function listGraph(filters = {}) {
    const page = normalizePagination(filters);
    const params = [];
    const where = [];
    if (filters.domain) {
      params.push(validateDomain(filters.domain, configuredDomains));
      where.push(`r.domain = $${params.length}`);
    }
    if (filters.status) {
      params.push(requiredText(filters.status, "Stato relazione", 40));
      where.push(`r.review_status = $${params.length}`);
    }
    if (filters.entity) {
      params.push(`%${requiredText(filters.entity, "Entità", 300)}%`);
      where.push(`(r.source_entity ILIKE $${params.length} OR r.target_entity ILIKE $${params.length})`);
    }
    params.push(page.limit, page.offset);
    const result = await query(`SELECT r.*, v.version_label, s.source_key,
        COUNT(*) OVER() AS total_count
      FROM ai_knowledge_relations r
      LEFT JOIN ai_source_versions v ON v.id = r.source_version_id
      LEFT JOIN ai_source_registry s ON s.id = v.source_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY r.updated_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return listEnvelope(result, page);
  }

  async function listSyncRuns(filters = {}) {
    const page = normalizePagination(filters);
    const params = [];
    const where = [];
    if (filters.source_id) {
      params.push(parseId(filters.source_id, "Identificativo fonte"));
      where.push(`r.source_id = $${params.length}`);
    }
    if (filters.status) {
      params.push(requiredText(filters.status, "Stato sincronizzazione", 40));
      where.push(`r.status = $${params.length}`);
    }
    params.push(page.limit, page.offset);
    const result = await query(`SELECT r.*, s.source_key, s.title AS source_title,
        COUNT(*) OVER() AS total_count
      FROM ai_sync_runs r LEFT JOIN ai_source_registry s ON s.id = r.source_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY r.started_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return listEnvelope(result, page);
  }

  async function listEvaluations(filters = {}) {
    const page = normalizePagination(filters);
    const params = [];
    const where = [];
    if (filters.domain) {
      params.push(validateDomain(filters.domain, configuredDomains));
      where.push(`e.domain = $${params.length}`);
    }
    if (filters.active !== undefined) {
      params.push(bool(filters.active));
      where.push(`e.active = $${params.length}`);
    }
    if (filters.risk_level) {
      params.push(normalizeRisk(filters.risk_level));
      where.push(`e.risk_level = $${params.length}`);
    }
    params.push(page.limit, page.offset);
    const result = await query(`SELECT e.*, COUNT(*) OVER() AS total_count
      FROM ai_evaluation_cases e ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY e.domain, e.case_key
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return listEnvelope(result, page);
  }

  async function listFeedback(filters = {}) {
    const page = normalizePagination(filters);
    const params = [];
    const where = [];
    if (filters.status) {
      params.push(requiredText(filters.status, "Stato feedback", 40));
      where.push(`f.status = $${params.length}`);
    }
    if (filters.feedback_type) {
      params.push(requiredText(filters.feedback_type, "Tipo feedback", 80));
      where.push(`f.feedback_type = $${params.length}`);
    }
    params.push(page.limit, page.offset);
    const result = await query(`SELECT f.id, f.feedback_type, f.comment, f.status, f.knowledge_note_id,
        f.reviewed_by, f.reviewed_at, f.created_at, COUNT(*) OVER() AS total_count
      FROM ai_feedback f ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY f.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return listEnvelope(result, page, { privacy: "Il contenuto integrale di domanda e risposta non è esposto dalla console." });
  }

  async function evaluateSummary(filters = {}) {
    const params = [];
    const where = [];
    if (filters.domain) {
      params.push(validateDomain(filters.domain, configuredDomains));
      where.push(`domain = $${params.length}`);
    }
    const result = await query(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE active = TRUE)::int AS active,
        COUNT(DISTINCT domain)::int AS domains,
        COUNT(*) FILTER (WHERE risk_level IN ('high', 'critical'))::int AS high_risk,
        COUNT(*) FILTER (WHERE expected_tool IS NOT NULL AND expected_tool <> '')::int AS with_tool
      FROM ai_evaluation_cases ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`, params);
    const row = firstRow(result) || {};
    return {
      total: asNumber(row.total),
      active: asNumber(row.active),
      domains: asNumber(row.domains),
      highRisk: asNumber(row.high_risk),
      withTool: asNumber(row.with_tool),
      generatedAt: nowIso()
    };
  }

  return Object.freeze({
    overview,
    domains,
    coverage,
    listSources,
    createSource,
    updateSource,
    sourceVersions,
    listVersions,
    approveVersion,
    listReviewQueue,
    resolveReviewQueueItem,
    listConflicts,
    resolveConflict,
    stale,
    listProcedures,
    createProcedure,
    updateProcedure,
    publishProcedure,
    listCases,
    createCase,
    approveCase,
    listDocuments,
    listFacts,
    listGraph,
    listSyncRuns,
    listEvaluations,
    listFeedback,
    evaluateSummary
  });
}
