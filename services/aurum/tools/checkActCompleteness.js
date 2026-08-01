import { requireField, requireObject, toolResult } from "./preciseDecimal.js";

function hasMeaningfulValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

export function checkActCompleteness(input = {}) {
  const tool = "checkActCompleteness";
  requireObject(input, tool);
  const act = requireField(input, "act", tool);
  const requiredFields = requireField(input, "requiredFields", tool);
  if (!act || typeof act !== "object" || Array.isArray(act)) throw new TypeError(`${tool}: act deve essere un oggetto.`);
  if (!Array.isArray(requiredFields) || !requiredFields.length) throw new TypeError(`${tool}: requiredFields deve essere un elenco non vuoto.`);
  const normalizedFields = requiredFields.map((entry) => {
    if (typeof entry === "string" && entry.trim()) return { field: entry.trim(), label: entry.trim() };
    if (entry && typeof entry === "object" && typeof entry.field === "string" && entry.field.trim()) {
      return { field: entry.field.trim(), label: String(entry.label || entry.field).trim() };
    }
    throw new TypeError(`${tool}: ogni campo richiesto deve avere un identificatore esplicito.`);
  });
  const duplicates = normalizedFields.filter((entry, index, all) => all.findIndex((candidate) => candidate.field === entry.field) !== index);
  if (duplicates.length) throw new TypeError(`${tool}: requiredFields contiene duplicati.`);
  const missingFields = normalizedFields.filter(({ field }) => !hasMeaningfulValue(act[field]));
  return toolResult(tool, {
    complete: missingFields.length === 0,
    checkedFields: normalizedFields.map(({ field }) => field),
    missingFields,
    units: { checkedFields: "fields", missingFields: "fields" },
    formula: "complete = ogni requiredField possiede un valore non vuoto",
    assumptions: ["L’elenco dei campi obbligatori è stato fornito dal chiamante in base alla versione vigente della procedura e al caso concreto."],
    warnings: missingFields.length
      ? ["La completezza formale non equivale a validità legale o sostanziale; correggere i campi mancanti prima della chiusura."]
      : ["Esito di completezza formale: restano necessari controlli di coerenza, autenticità e autorizzazione."],
    missingInformation: missingFields.map(({ field }) => field)
  });
}

export default checkActCompleteness;
