const fiscalCodePattern = /[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]/i;
const ibanPattern = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/i;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const internationalPhonePattern = /\+\d{1,3}(?:[\s().-]*\d){7,12}\b/;
const vatPattern = /\b(?:P\.?\s*IVA|partita\s+IVA)\s*[:#-]?\s*(?:IT\s*)?\d{11}\b/i;
const addressPattern = /\b(?:via|viale|piazza|corso|largo|vicolo)\s+[\p{L}'’ .-]{2,80}\s+\d{1,5}(?:\s*[A-Z])?\b/iu;
const birthDatePattern = /\b(?:nato|nata|data\s+di\s+nascita)\b.{0,60}\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2}\b/iu;
const documentPattern = /\b(?:passaporto|patente|carta\s+d['’]?identit[aà]|documento)(?:\s+(?:n|numero))?\s*[:#-]?\s*(?=[A-Z0-9-]{5,24}\b)(?=[A-Z0-9-]*\d)[A-Z0-9-]{5,24}\b/i;
const labelledNamePattern = /\b(?:cliente|sig(?:nor[ae])?|nome|cognome)\s*[:=-]\s*[\p{L}'’ -]{2,80}/iu;
const spokenNamePattern = /\b(?:il\s+)?cliente\s+(?:e|è|si\s+chiama)\s+[\p{Lu}][\p{Ll}'’-]+(?:\s+[\p{Lu}][\p{Ll}'’-]+){1,2}\b/u;
const sensitiveContextKeyPattern = /^(?:availableMemories|userName|cliente|customer|nome|cognome|indirizzo|residenza|domicilio|documento|documentNumber|passaporto|patente|email|telefono|phone|iban|codiceFiscale|codice_fiscale|partitaIva|partita_iva|dataNascita|data_nascita)$/i;
const sensitiveJsonValuePattern = /("(?:cliente|customer|nome|cognome|indirizzo|residenza|domicilio|documento|documentNumber|passaporto|patente|email|telefono|phone|iban|codiceFiscale|codice_fiscale|partitaIva|partita_iva|dataNascita|data_nascita)"\s*:\s*)"[^"]*"/gi;

export function redactAssistantPersonalData(value = "", maxLength = 4000) {
  const safeMaxLength = Math.max(1, Math.min(20000, Number(maxLength || 4000)));
  return String(value || "")
    .replace(sensitiveJsonValuePattern, '$1"[dato personale omesso]"')
    .replace(new RegExp(spokenNamePattern.source, "gu"), "[nome omesso]")
    .replace(/(^|[.;]\s*)([\p{Lu}][\p{L}'’-]+(?:\s+[\p{Lu}][\p{L}'’-]+){1,2})(?=\s*,\s*(?:via|viale|piazza|corso|largo|vicolo)\b)/gu, "$1[nome omesso]")
    .replace(new RegExp(labelledNamePattern.source, "giu"), "[nome omesso]")
    .replace(new RegExp(addressPattern.source, "giu"), "[indirizzo omesso]")
    .replace(/\b(?:nato|nata|data\s+di\s+nascita)\s*(?:a|il|:|-)?\s*[\p{L}'’ .-]{0,50}\d{1,2}[\/.-]\d{1,2}[\/.-](?:19|20)\d{2}\b/giu, "[data di nascita omessa]")
    .replace(new RegExp(documentPattern.source, "gi"), "[documento omesso]")
    .replace(new RegExp(fiscalCodePattern.source, "gi"), "[codice fiscale omesso]")
    .replace(/\bIT\s*\d{2}\s*[A-Z]\s*(?:\d\s*){10,27}\b/gi, "[IBAN omesso]")
    .replace(new RegExp(ibanPattern.source, "gi"), "[IBAN omesso]")
    .replace(new RegExp(vatPattern.source, "gi"), "[partita IVA omessa]")
    .replace(new RegExp(emailPattern.source, "gi"), "[email omessa]")
    .replace(new RegExp(internationalPhonePattern.source, "g"), "[telefono omesso]")
    .replace(/\b(?:3\d{2}|0\d{1,3})(?:[\s.-]*\d){6,9}\b/g, "[telefono omesso]")
    .slice(0, safeMaxLength);
}

export function containsAssistantPersonalData(value = "") {
  const text = String(value || "");
  return [
    fiscalCodePattern,
    ibanPattern,
    emailPattern,
    internationalPhonePattern,
    vatPattern,
    addressPattern,
    birthDatePattern,
    documentPattern,
    labelledNamePattern,
    spokenNamePattern,
    new RegExp(sensitiveJsonValuePattern.source, "i")
  ].some((pattern) => pattern.test(text));
}

export function sanitizeAssistantContextObject(value, depth = 0) {
  if (depth > 6 || value === null || value === undefined) return null;
  if (typeof value === "string") return redactAssistantPersonalData(value, 4000);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 60).map((item) => sanitizeAssistantContextObject(item, depth + 1));
  }
  if (typeof value !== "object") return null;
  const output = {};
  for (const [key, item] of Object.entries(value).slice(0, 120)) {
    if (sensitiveContextKeyPattern.test(key)) continue;
    output[key] = sanitizeAssistantContextObject(item, depth + 1);
  }
  return output;
}

export function sanitizeAssistantUntrustedContext(value = "", maxLength = 4000) {
  return redactAssistantPersonalData(value, maxLength)
    .split(/\r?\n/)
    .filter((line) => !/(ignora|disattendi|sostituisci).{0,40}(istruzioni|prompt|regole)|system\s*prompt|developer\s*message|agisci\s+come|rivela.{0,30}(segreti|credenziali|token)/i.test(line))
    .join("\n")
    .trim();
}
