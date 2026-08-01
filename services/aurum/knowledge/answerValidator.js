export const INSUFFICIENT_EVIDENCE_ANSWER = "Non dispongo di fonti approvate e aggiornate sufficienti per rispondere in modo affidabile.";
export const AURUM_CONFIDENCE_LEVELS = Object.freeze(["ALTO", "MEDIO", "BASSO", "INSUFFICIENTE"]);

export function validateAurumAnswer(input = {}, policy = {}) {
  const risk = String(input.risk_level || policy.riskLevel || "low").toLowerCase();
  const citations = Array.isArray(input.citations) ? input.citations.slice(0, 4) : [];
  const required = Number(policy.minimumCitations ?? (["high", "critical"].includes(risk) ? 2 : 1));
  const minimumAuthority = Number(policy.minimumAuthorityLevel ?? (["high", "critical"].includes(risk) ? 95 : 40));
  const valid = citations.filter((item) => Number(item.authority_level || 0) >= minimumAuthority);
  const unresolvedConflict = input.conflicts?.some((item) => item.status === "manual_review_required");
  let confidence = "INSUFFICIENTE";
  if (valid.length >= required && !unresolvedConflict) confidence = valid.every((item) => Number(item.authority_level) >= 95) ? "ALTO" : "MEDIO";
  else if (citations.length && risk === "low" && !unresolvedConflict) confidence = "BASSO";
  return Object.freeze({
    answer: confidence === "INSUFFICIENTE" ? INSUFFICIENT_EVIDENCE_ANSWER : String(input.answer || "").trim(),
    confidence,
    citations,
    escalation_required: confidence === "INSUFFICIENTE" || Boolean(unresolvedConflict),
    valid: confidence !== "INSUFFICIENTE"
  });
}
