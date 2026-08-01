import { insufficientToolResult, requireObject, toolResult } from "./preciseDecimal.js";

function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function lookupHallmark(input = {}) {
  const tool = "lookupHallmark";
  requireObject(input, tool);
  const query = normalized(input.query);
  if (!query) throw new TypeError(`${tool}: query obbligatoria.`);
  if (!Array.isArray(input.dataset) || !input.dataset.length) {
    return insufficientToolResult(tool, ["dataset punzoni revisionato"], {
      units: { candidates: "records" },
      formula: "candidates = record del dataset che corrispondono ai termini osservati",
      assumptions: [],
      warnings: ["Senza un dataset revisionato Aurum non attribuisce produttore, provenienza, periodo o autenticità."],
      candidates: []
    });
  }
  const queryTokens = new Set(query.split(" "));
  const candidates = input.dataset.map((record, index) => {
    if (!record || typeof record !== "object") throw new TypeError(`${tool}: record dataset ${index} non valido.`);
    const searchable = normalized([record.code, record.title, record.producer, record.province, record.country, record.period, record.metal, record.fineness].filter(Boolean).join(" "));
    const matchedTerms = [...queryTokens].filter((token) => searchable.split(" ").includes(token));
    return { record, matchedTerms, score: matchedTerms.length };
  }).filter(({ score }) => score > 0).sort((left, right) => right.score - left.score).slice(0, 10)
    .map(({ record, matchedTerms }) => ({ ...record, matchedTerms }));
  return toolResult(tool, {
    status: candidates.length ? "candidates_found" : "insufficient",
    ok: candidates.length > 0,
    candidates,
    units: { candidates: "records" },
    formula: "candidates = corrispondenze lessicali nel dataset revisionato fornito",
    assumptions: ["Il dataset è aggiornato, licenziato e revisionato per giurisdizione e periodo pertinenti."],
    warnings: ["Un punzone compatibile non prova autenticità, titolo o identità del produttore; verificare oggetto, periodo e test indipendenti."],
    missingInformation: candidates.length ? [] : ["corrispondenza verificabile nel dataset"]
  });
}

export default lookupHallmark;
