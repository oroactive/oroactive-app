import { sanitizeRetrievedKnowledge } from "./promptSecurity.js";

function decodeHtmlEntities(value = "") {
  return String(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)));
}

export function htmlToText(value = "") {
  return decodeHtmlEntities(String(value || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(?:p|div|section|article|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function applySourceContentPolicy(parsed = {}, source = {}) {
  const abstractOnly = source.ingestion_mode === "metadata_abstract_only"
    || String(source.content_policy || "").startsWith("metadata_abstract_only")
    || source.allow_full_text === false;
  if (!abstractOnly) return Object.freeze({ ...parsed, storageMode: "full_text" });
  const suppliedAbstract = String(parsed.abstract || parsed.metadata?.abstract || "").trim();
  return Object.freeze({
    ...parsed,
    text: suppliedAbstract,
    storageMode: "metadata_abstract_only",
    fullTextDiscarded: Boolean(parsed.text && parsed.text !== suppliedAbstract)
  });
}

export async function parseDocument(input = {}, options = {}) {
  const mimeType = String(input.mimeType || input.contentType || "text/plain").split(";")[0].trim().toLowerCase();
  const raw = input.content ?? input.text ?? input.buffer ?? "";
  let text = "";
  if (mimeType === "text/html") {
    text = htmlToText(Buffer.isBuffer(raw) ? raw.toString("utf8") : raw);
  } else if (mimeType === "text/plain" || mimeType === "application/json") {
    text = Buffer.isBuffer(raw) ? raw.toString("utf8") : typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
  } else {
    const extractor = options.extractors?.[mimeType];
    if (typeof extractor !== "function") throw new Error(`Parser non configurato per ${mimeType}.`);
    text = await extractor(Buffer.isBuffer(raw) ? raw : Buffer.from(raw));
  }
  const parsed = {
    title: String(input.title || "").trim(),
    mimeType,
    text: sanitizeRetrievedKnowledge(text, Number(options.maxChars || 2_000_000)),
    abstract: String(input.abstract || "").trim(),
    metadata: Object.freeze({ ...(input.metadata || {}) })
  };
  return applySourceContentPolicy(parsed, input.source || {});
}
