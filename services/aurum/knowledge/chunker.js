import crypto from "node:crypto";
import { sanitizeRetrievedKnowledge } from "./promptSecurity.js";

const headingPatterns = Object.freeze({
  legal: /^(?:(TITOLO|CAPO|SEZIONE)\s+([IVXLCDM\d-]+)|(?:Art(?:icolo)?\.?\s*)(\d+[a-z-]*(?:\s*[-–]\s*[^\n]+)?))\s*$/i,
  standard: /^(?:(\d+(?:\.\d+){0,5})\s+(.+)|(?:SCOPE|AMBITO|METHOD|METODO|LIMITS?|LIMITI|EXCLUSIONS?|ESCLUSIONI)\s*:?.*)$/i,
  procedure: /^(?:OBIETTIVO|SCOPO|PREREQUISITI|PRECONDIZIONI|PASSAGGI|PROCEDURA|STOP CONDITIONS?|CONDIZIONI DI BLOCCO|ESCALATION|AVVERTENZE?)\s*:?.*$/i,
  generic: /^(?:#{1,6}\s+.+|[A-ZÀ-Ü][A-ZÀ-Ü0-9 /'’().,:;-]{5,})$/
});

function normalizeText(value = "") {
  return sanitizeRetrievedKnowledge(value, 2_000_000)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isHeading(line, kind) {
  const pattern = headingPatterns[kind] || headingPatterns.generic;
  return pattern.test(line.trim()) || headingPatterns.generic.test(line.trim());
}

function sectionize(text, kind) {
  const lines = normalizeText(text).split("\n");
  const sections = [];
  let current = { heading: "Introduzione", lines: [] };
  for (const line of lines) {
    if (isHeading(line, kind)) {
      if (current.lines.some((item) => item.trim())) sections.push(current);
      current = { heading: line.replace(/^#{1,6}\s*/, "").trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.some((item) => item.trim()) || current.heading !== "Introduzione") sections.push(current);
  return sections;
}

function paragraphsForSection(section) {
  return section.lines.join("\n").split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

function joinParagraphsWithoutBreakingExceptions(paragraphs, maxChars) {
  const groups = [];
  let current = "";
  for (const paragraph of paragraphs) {
    const isException = /^(?:salvo|fatto salvo|ad eccezione|eccetto|tuttavia|fermo restando|in deroga|unless|except|provided that)\b/i.test(paragraph);
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (current && candidate.length > maxChars && !isException) {
      groups.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }
  }
  if (current) groups.push(current);
  return groups;
}

function articleNumber(heading = "") {
  return heading.match(/Art(?:icolo)?\.?\s*(\d+[a-z-]*)/i)?.[1] || null;
}

export function chunkStructuredDocument(input = {}, options = {}) {
  const kind = ["legal", "standard", "procedure", "generic"].includes(input.kind) ? input.kind : "generic";
  const maxChars = Math.max(800, Math.min(12_000, Number(options.maxChars || 2800)));
  const sections = sectionize(input.text || input.content || "", kind);
  const chunks = [];
  for (const section of sections) {
    const bodyGroups = joinParagraphsWithoutBreakingExceptions(paragraphsForSection(section), maxChars);
    for (const body of bodyGroups) {
      const content = `${section.heading}\n${body}`.trim();
      if (content.length < 40) continue;
      const index = chunks.length;
      chunks.push(Object.freeze({
        id: input.idPrefix ? `${input.idPrefix}-${index}` : crypto.createHash("sha256").update(`${input.sourceVersionId || "source"}|${index}|${content}`).digest("hex").slice(0, 24),
        source_version_id: input.sourceVersionId || input.source_version_id || null,
        chunk_index: index,
        content,
        domain: input.domain || null,
        jurisdiction: input.jurisdiction || null,
        authority_level: Number(input.authorityLevel ?? input.authority_level ?? 0),
        section_path: section.heading,
        article_number: articleNumber(section.heading),
        valid_from: input.validFrom || input.valid_from || null,
        valid_to: input.validTo || input.valid_to || null,
        fact_type: kind === "legal" ? "legal_rule" : kind === "standard" ? "technical_standard" : kind === "procedure" ? "procedure" : "reference",
        review_status: input.reviewStatus || input.review_status || "pending",
        citation_label: [input.title, section.heading].filter(Boolean).join(" — ")
      }));
    }
  }
  return chunks;
}
