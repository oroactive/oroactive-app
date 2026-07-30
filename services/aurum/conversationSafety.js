import { classifyCoachingSafety } from "./coachingSafety.js";

const immediateSafetyPattern = /\b(?:sono|mi trovo|ora sono|adesso sono)\s+(?:davvero\s+)?al sicuro\b|\bnon sono (?:pi[uù] )?in pericolo\b|\bil pericolo (?:immediato )?[eè] passato\b|\bnon intendo farmi del male\b/iu;
const humanSupportPattern = /\b(?:non sono sol[oa]|sono con (?:qualcuno|una persona|un amico|un['’]amica|un familiare|mia madre|mio padre|mia sorella|mio fratello|il mio partner)|ho (?:chiamato|contattato|raggiunto|avvisato) (?:i servizi|l['’]emergenza|un medico|uno psicologo|una persona|un amico|un['’]amica|un familiare)|qualcuno [eè] con me)\b/iu;

function normalizeHistory(history = []) {
  return (Array.isArray(history) ? history : [])
    .slice(-8)
    .map((message) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      content: String(message?.content || "").replace(/\s+/g, " ").trim()
    }))
    .filter((message) => message.content);
}

export function hasStrongCrisisResolution(value = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return immediateSafetyPattern.test(text) && humanSupportPattern.test(text);
}

export function analyzeAurumConversationSafety(history = [], currentQuestion = "") {
  const messages = normalizeHistory(history);
  let lastCrisisIndex = -1;
  let lastSensitiveIndex = -1;

  messages.forEach((message, index) => {
    if (message.role !== "user") return;
    const safety = classifyCoachingSafety(message.content);
    if (safety.level === "crisis") lastCrisisIndex = index;
    if (["crisis", "mental_health_boundary"].includes(safety.level)) lastSensitiveIndex = index;
  });

  let resolutionIndex = -1;
  if (lastCrisisIndex >= 0) {
    for (let index = lastCrisisIndex + 1; index < messages.length; index += 1) {
      if (messages[index].role === "user" && hasStrongCrisisResolution(messages[index].content)) {
        resolutionIndex = index;
      }
    }
  }

  const currentIsStrongResolution = hasStrongCrisisResolution(currentQuestion);
  const currentSafety = classifyCoachingSafety(currentQuestion);
  const recentCrisis = lastCrisisIndex >= 0;
  const resolvedAfterCrisis = resolutionIndex > lastCrisisIndex;
  const needsCrisisFollowUp = recentCrisis
    && currentSafety.level !== "crisis"
    && (!resolvedAfterCrisis || currentIsStrongResolution);

  return Object.freeze({
    recentCrisis,
    hasSensitiveHistory: lastSensitiveIndex >= 0,
    resolvedAfterCrisis,
    currentIsStrongResolution,
    needsCrisisFollowUp
  });
}

export function buildAurumCrisisFollowUpResponse(analysis = {}) {
  if (analysis.currentIsStrongResolution) {
    return [
      "Grazie per avermelo detto. È importante che tu sia al sicuro e non sia solo.",
      "Resta vicino alla persona che è con te e continua a seguire le indicazioni dei servizi o del professionista che hai contattato. Aurum non sostituisce l’assistenza umana nelle situazioni di pericolo.",
      "Questa parte della conversazione non viene salvata nella memoria Aurum né inviata a servizi IA esterni."
    ].join("\n\n");
  }
  return [
    "Resto concentrato prima di tutto sulla tua sicurezza.",
    "Se il pericolo è ancora presente, contatta subito i servizi di emergenza locali o raggiungi una persona fidata che possa stare fisicamente con te. Puoi dirmi soltanto se ora sei al sicuro e se c’è una persona reale con te o già contattata.",
    "Aurum è un sistema digitale e non può gestire un’emergenza. Questa parte della conversazione non viene salvata nella memoria Aurum né inviata a servizi IA esterni."
  ].join("\n\n");
}
