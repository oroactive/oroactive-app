import "../../shared/aurum-policy.js";

const sharedPolicy = globalThis.OroActiveAurumPolicy;
if (!sharedPolicy?.classifySafety) {
  throw new Error("Policy condivisa privacy e sicurezza Aurum non disponibile.");
}

const coachingPattern = /\b(?:coach(?:ing)?|obiettiv[io]|micro azion[ei]|priorit[aà]|deleg(?:a|are)|leadership|team|feedback|assertiv(?:o|a|it[aà])|confini|resilien(?:za|te)|flow|creativit[aà]|apprendimento|autosabot(?:aggio|armi|o)|impostore|perfezionismo|procrastin(?:o|are|azione)|work life balance|equilibrio vita(?:\s*-\s*|\s+)lavoro|stress(?:ato|ata)? (?:dal|per il|sul) lavoro|esaust\w* (?:dal|per il|a causa del) lavoro|sovraccaric[oa]|non riesco a staccare|gestire (?:meglio )?il tempo|organizzarmi|comunicazione|fiducia|motivazione|abitudine|cresc(?:ere|ita) professional(?:mente|e)|svilupp(?:are|o) (?:le mie )?capacit[aà] emotiv[ae]|mi sento bloccat[oa]|non so da dove iniziare)\b/iu;

export function classifyCoachingSafety(value = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return Object.freeze({ level: "none", blockExternal: false, blockMemory: false, reason: "" });
  }
  const sensitiveSafety = sharedPolicy.classifySafety(text);
  if (sensitiveSafety.level !== "none") return sensitiveSafety;
  if (coachingPattern.test(text)) {
    return Object.freeze({
      level: "coaching",
      blockExternal: false,
      blockMemory: false,
      reason: "coaching_topic"
    });
  }
  return Object.freeze({ level: "none", blockExternal: false, blockMemory: false, reason: "" });
}

export function buildCoachingSafetyResponse(safety = {}) {
  if (safety.level === "crisis") {
    return [
      "Mi importa che tu non resti solo con quello che stai vivendo.",
      "Aurum è un sistema digitale di coaching e non può gestire un pericolo immediato. Contatta subito i servizi di emergenza locali oppure raggiungi ora una persona fidata che possa stare con te. Se puoi, allontanati da ciò che potrebbe farti male e resta in un luogo sicuro.",
      "Questa frase non viene salvata nella memoria Aurum né inviata a servizi IA esterni."
    ].join("\n\n");
  }
  if (safety.level === "mental_health_boundary") {
    return [
      "Aurum può sostenere riflessione, obiettivi e azioni professionali, ma non può diagnosticare, prescrivere terapie o sostituire uno psicologo, uno psicoterapeuta, un medico o un altro professionista sanitario.",
      "Per questo tema è più sicuro parlarne con un professionista qualificato. Posso comunque aiutarti, senza entrare nel trattamento clinico, a preparare le domande da portargli o a organizzare un prossimo passo pratico.",
      "Questa informazione non viene salvata nella memoria Aurum né inviata a servizi IA esterni."
    ].join("\n\n");
  }
  return "";
}
