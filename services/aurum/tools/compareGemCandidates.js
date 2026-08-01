import { insufficientToolResult, requireObject, toolResult } from "./preciseDecimal.js";

function normalizeValue(value) {
  if (Array.isArray(value)) return value.map(normalizeValue).sort();
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function propertyMatches(observed, expected) {
  const observedValues = Array.isArray(observed) ? observed.map(normalizeValue) : [normalizeValue(observed)];
  const expectedValues = Array.isArray(expected) ? expected.map(normalizeValue) : [normalizeValue(expected)];
  return observedValues.some((value) => expectedValues.includes(value));
}

export function compareGemCandidates(input = {}) {
  const tool = "compareGemCandidates";
  requireObject(input, tool);
  if (!input.observations || typeof input.observations !== "object" || Array.isArray(input.observations) || !Object.keys(input.observations).length) {
    throw new TypeError(`${tool}: observations deve contenere proprietà osservate esplicite.`);
  }
  if (!Array.isArray(input.candidates) || !input.candidates.length) {
    return insufficientToolResult(tool, ["dataset candidati gemmologici revisionato"], {
      units: { candidates: "records" },
      formula: "compatibility = proprietà osservate corrispondenti / proprietà confrontabili",
      assumptions: [],
      warnings: ["Senza candidati revisionati Aurum non propone un’identificazione."],
      candidates: []
    });
  }
  const candidates = input.candidates.map((candidate, index) => {
    if (!candidate || typeof candidate !== "object" || !candidate.name || !candidate.properties || typeof candidate.properties !== "object") {
      throw new TypeError(`${tool}: candidato ${index} non valido.`);
    }
    const compared = Object.entries(input.observations).filter(([key]) => key in candidate.properties);
    const matched = compared.filter(([key, observed]) => propertyMatches(observed, candidate.properties[key]));
    return {
      id: candidate.id || null,
      name: String(candidate.name),
      comparedProperties: compared.map(([key]) => key),
      matchedProperties: matched.map(([key]) => key),
      compatibility: compared.length ? `${matched.length}/${compared.length}` : "0/0"
    };
  }).sort((left, right) => {
    const [leftMatch, leftTotal] = left.compatibility.split("/").map(BigInt);
    const [rightMatch, rightTotal] = right.compatibility.split("/").map(BigInt);
    const leftCross = leftTotal ? leftMatch * rightTotal : 0n;
    const rightCross = rightTotal ? rightMatch * leftTotal : 0n;
    if (leftCross !== rightCross) return leftCross > rightCross ? -1 : 1;
    return leftTotal === rightTotal ? 0 : leftTotal > rightTotal ? -1 : 1;
  });
  const comparable = candidates.some(({ compatibility }) => !compatibility.endsWith("/0"));
  return toolResult(tool, {
    ok: comparable,
    status: comparable ? "preliminary_comparison" : "insufficient",
    candidates,
    units: { candidates: "compatibility records" },
    formula: "compatibility = numero proprietà corrispondenti / numero proprietà confrontabili",
    assumptions: ["Osservazioni e proprietà candidate sono state raccolte con metodi compatibili e unità coerenti."],
    warnings: ["Confronto preliminare: non certifica autenticità, origine naturale o sintetica, provenienza, trattamenti, purezza o valore."],
    missingInformation: comparable ? [] : ["proprietà osservate confrontabili con il dataset"]
  });
}

export default compareGemCandidates;
