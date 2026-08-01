import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const SOURCE_REGISTRY_PATH = path.resolve(__dirname, "../../../config/aurum-source-registry.json");

export const AURUM_AUTHORITY_LEVELS = Object.freeze({
  LAW: 100,
  AUTHORITY: 95,
  TECHNICAL_STANDARD: 90,
  OROACTIVE_POLICY: 85,
  PROPRIETARY_KNOWLEDGE: 80,
  APPROVED_CASE: 70,
  SECONDARY: 40
});

const requiredFields = Object.freeze([
  "source_key",
  "organization",
  "title",
  "domain",
  "authority_level",
  "source_type",
  "language",
  "license",
  "ingestion_mode",
  "update_frequency"
]);

function registryError(message) {
  const error = new Error(message);
  error.code = "AURUM_SOURCE_REGISTRY_INVALID";
  return error;
}

function validOptionalDate(value) {
  return value === null || value === undefined || value === "" || !Number.isNaN(Date.parse(value));
}

function normalizeSource(source = {}) {
  const normalized = {
    ...source,
    source_key: String(source.source_key || "").trim(),
    organization: String(source.organization || "").trim(),
    title: String(source.title || "").trim(),
    official_url: source.official_url ? String(source.official_url).trim() : null,
    domain: String(source.domain || "").trim(),
    jurisdiction: String(source.jurisdiction || "GLOBAL").trim().toUpperCase(),
    authority_level: Number(source.authority_level),
    source_type: String(source.source_type || "").trim(),
    document_identifier: source.document_identifier ? String(source.document_identifier).trim() : null,
    language: String(source.language || "it").trim().toLowerCase(),
    license: String(source.license || "").trim(),
    ingestion_mode: String(source.ingestion_mode || "").trim(),
    update_frequency: String(source.update_frequency || "manual").trim().toLowerCase(),
    requires_manual_review: source.requires_manual_review !== false,
    allow_full_text: source.allow_full_text === true,
    active: source.active !== false,
    last_checked_at: source.last_checked_at || null,
    next_check_at: source.next_check_at || null
  };
  return Object.freeze(normalized);
}

export function validateSourceRegistry(input = {}) {
  const sources = Array.isArray(input) ? input : input.sources;
  if (!Array.isArray(sources) || !sources.length) {
    throw registryError("Il registro fonti Aurum deve contenere almeno una fonte.");
  }

  const keys = new Set();
  const normalizedSources = sources.map((rawSource, index) => {
    const source = normalizeSource(rawSource);
    for (const field of requiredFields) {
      if (source[field] === "" || source[field] === null || source[field] === undefined || Number.isNaN(source[field])) {
        throw registryError(`Fonte ${index + 1}: campo obbligatorio ${field} mancante.`);
      }
    }
    if (!/^[a-z0-9][a-z0-9._-]{2,119}$/.test(source.source_key)) {
      throw registryError(`Source key non valida: ${source.source_key || "vuota"}.`);
    }
    if (keys.has(source.source_key)) throw registryError(`Source key duplicata: ${source.source_key}.`);
    keys.add(source.source_key);
    if (!Number.isInteger(source.authority_level) || source.authority_level < 0 || source.authority_level > 100) {
      throw registryError(`Livello di autorità non valido per ${source.source_key}.`);
    }
    if (source.official_url) {
      let parsed;
      try {
        parsed = new URL(source.official_url);
      } catch {
        throw registryError(`URL ufficiale non valido per ${source.source_key}.`);
      }
      if (parsed.protocol !== "https:") throw registryError(`La fonte ${source.source_key} deve usare HTTPS.`);
    }
    if (!validOptionalDate(source.last_checked_at) || !validOptionalDate(source.next_check_at)) {
      throw registryError(`Data di controllo non valida per ${source.source_key}.`);
    }
    if (/^(?:global-iso-|global-gia-)/.test(source.source_key)) {
      if (source.allow_full_text || source.ingestion_mode !== "metadata_abstract_only") {
        throw registryError(`ISO/GIA richiede metadata_abstract_only: ${source.source_key}.`);
      }
    }
    return source;
  });

  return Object.freeze({
    schemaVersion: Number(Array.isArray(input) ? 1 : input.schemaVersion || 1),
    registeredAt: Array.isArray(input) ? null : input.registeredAt || null,
    sources: Object.freeze(normalizedSources)
  });
}

export function createSourceRegistry(input = {}) {
  const validated = validateSourceRegistry(input);
  const byKey = new Map(validated.sources.map((source) => [source.source_key, source]));
  return Object.freeze({
    ...validated,
    get(sourceKey) {
      return byKey.get(String(sourceKey || "")) || null;
    },
    list(filters = {}) {
      return validated.sources.filter((source) => (
        (filters.active === undefined || source.active === filters.active)
        && (!filters.domain || source.domain === filters.domain)
        && (!filters.jurisdiction || source.jurisdiction === String(filters.jurisdiction).toUpperCase())
        && (!filters.minimumAuthorityLevel || source.authority_level >= Number(filters.minimumAuthorityLevel))
      ));
    },
    allowedDomains() {
      return [...new Set(validated.sources
        .map((source) => source.official_url)
        .filter(Boolean)
        .map((value) => new URL(value).hostname.toLowerCase()))].sort();
    }
  });
}

export function loadSourceRegistry(filePath = SOURCE_REGISTRY_PATH) {
  return createSourceRegistry(JSON.parse(readFileSync(filePath, "utf8")));
}

export function frequencyToMilliseconds(value = "manual") {
  const normalized = String(value || "manual").trim().toLowerCase();
  if (normalized === "hourly") return 60 * 60 * 1000;
  if (normalized === "daily") return 24 * 60 * 60 * 1000;
  if (normalized === "weekly") return 7 * 24 * 60 * 60 * 1000;
  if (normalized === "monthly") return 30 * 24 * 60 * 60 * 1000;
  const match = normalized.match(/^(\d+)\s*(?:m|min|minutes?|h|hours?|d|days?)$/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (/^(?:m|min|minutes?)$/.test(normalized.replace(/^\d+\s*/, ""))) return amount * 60 * 1000;
  if (/^(?:h|hours?)$/.test(normalized.replace(/^\d+\s*/, ""))) return amount * 60 * 60 * 1000;
  return amount * 24 * 60 * 60 * 1000;
}

export function sourceNextCheckAt(source = {}, from = new Date()) {
  if (source.next_check_at) return new Date(source.next_check_at);
  const interval = frequencyToMilliseconds(source.update_frequency);
  if (!interval || !source.last_checked_at) return null;
  return new Date(new Date(source.last_checked_at).getTime() + interval);
}

export function isSourceStale(source = {}, asOf = new Date()) {
  if (source.active === false) return true;
  if (["manual", "on_change"].includes(String(source.update_frequency || "").toLowerCase())) return false;
  const nextCheckAt = sourceNextCheckAt(source, asOf);
  if (!nextCheckAt) return true;
  return nextCheckAt.getTime() < new Date(asOf).getTime();
}
