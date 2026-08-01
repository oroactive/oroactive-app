import crypto from "node:crypto";

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object" && !Buffer.isBuffer(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function contentBuffer(content) {
  if (Buffer.isBuffer(content)) return content;
  if (content instanceof Uint8Array) return Buffer.from(content);
  if (typeof content === "string") return Buffer.from(content.replace(/\r\n/g, "\n"), "utf8");
  return Buffer.from(stableJson(content ?? null), "utf8");
}

export function calculateContentHash(content) {
  return crypto.createHash("sha256").update(contentBuffer(content)).digest("hex");
}

export function createSourceVersion(input = {}, options = {}) {
  const now = (options.clock || (() => new Date()))();
  const contentHash = calculateContentHash(input.content);
  const previousHash = input.previousVersion?.content_hash || input.previousHash || null;
  const changed = previousHash !== contentHash;
  return Object.freeze({
    id: input.id || null,
    source_id: input.source_id || input.sourceId || null,
    source_key: input.source_key || input.sourceKey || null,
    version_label: input.version_label || input.versionLabel || `${now.toISOString().slice(0, 10)}-${contentHash.slice(0, 12)}`,
    publication_date: input.publication_date || input.publicationDate || null,
    effective_from: input.effective_from || input.effectiveFrom || null,
    effective_to: input.effective_to || input.effectiveTo || null,
    retrieved_at: input.retrieved_at || input.retrievedAt || now.toISOString(),
    content_hash: contentHash,
    raw_document_path: input.raw_document_path || input.rawDocumentPath || null,
    metadata: Object.freeze({ ...(input.metadata || {}) }),
    change_summary: input.change_summary || input.changeSummary || (changed ? "Nuovo contenuto da revisionare." : "Nessuna variazione rilevata."),
    changes_detected: changed,
    is_current: false,
    review_status: "pending",
    reviewed_by: null,
    reviewed_at: null
  });
}

export function compareSourceVersions(previousVersion, nextVersion) {
  if (!nextVersion) throw new Error("Versione sorgente successiva mancante.");
  const previousHash = previousVersion?.content_hash || null;
  return Object.freeze({
    changed: previousHash !== nextVersion.content_hash,
    previousHash,
    newHash: nextVersion.content_hash,
    previousVersionLabel: previousVersion?.version_label || null,
    newVersionLabel: nextVersion.version_label || null
  });
}

export function approveSourceVersion(version = {}, reviewer = {}, options = {}) {
  const reviewerId = reviewer.id || reviewer.user_id;
  if (!reviewerId) throw new Error("Revisore obbligatorio per approvare una versione.");
  if (options.explicitApproval !== true) throw new Error("Approvazione esplicita obbligatoria.");
  const now = (options.clock || (() => new Date()))();
  return Object.freeze({
    ...version,
    review_status: "approved",
    is_current: true,
    reviewed_by: reviewerId,
    reviewed_at: now.toISOString()
  });
}

export function rejectSourceVersion(version = {}, reviewer = {}, options = {}) {
  const reviewerId = reviewer.id || reviewer.user_id;
  if (!reviewerId) throw new Error("Revisore obbligatorio per rifiutare una versione.");
  const now = (options.clock || (() => new Date()))();
  return Object.freeze({
    ...version,
    review_status: "rejected",
    is_current: false,
    reviewed_by: reviewerId,
    reviewed_at: now.toISOString()
  });
}
