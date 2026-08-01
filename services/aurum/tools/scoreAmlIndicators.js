import {
  addDecimal,
  decimal,
  divideDecimal,
  formatDecimal,
  multiplyDecimal,
  requireField,
  requireObject,
  toolResult
} from "./preciseDecimal.js";

export function scoreAmlIndicators(input = {}) {
  const tool = "scoreAmlIndicators";
  requireObject(input, tool);
  const indicators = requireField(input, "indicators", tool);
  if (!Array.isArray(indicators) || !indicators.length) throw new TypeError(`${tool}: indicators deve essere un elenco non vuoto.`);
  const normalized = indicators.map((indicator, index) => {
    if (!indicator || typeof indicator !== "object" || !String(indicator.code || "").trim()) {
      throw new TypeError(`${tool}: indicatore ${index} non valido.`);
    }
    return {
      code: String(indicator.code).trim(),
      observed: indicator.observed === true,
      weight: decimal(requireField(indicator, "weight", tool), { name: `indicators[${index}].weight`, min: 0, max: 100 })
    };
  });
  const totalWeight = addDecimal(...normalized.map(({ weight }) => weight));
  if (totalWeight.coefficient === 0n) throw new RangeError(`${tool}: almeno un peso deve essere maggiore di zero.`);
  const observedWeight = addDecimal(...normalized.filter(({ observed }) => observed).map(({ weight }) => weight), 0);
  const attentionScore = multiplyDecimal(divideDecimal(observedWeight, totalWeight, { scale: 12 }), 100);
  const observedIndicators = normalized.filter(({ observed }) => observed).map(({ code }) => code);
  const requiresHumanReview = observedIndicators.length > 0;
  return toolResult(tool, {
    attentionScore: formatDecimal(attentionScore, { maxScale: 2, minScale: 2 }),
    observedIndicators,
    requiresHumanReview,
    decision: "no_automated_sos_decision",
    sosDecision: null,
    units: { attentionScore: "%", observedIndicators: "indicators" },
    formula: "attentionScore = somma pesi indicatori osservati / somma pesi indicatori valutati × 100",
    assumptions: ["Indicatori e pesi provengono da una matrice AML vigente, approvata e fornita dal responsabile competente."],
    warnings: [
      "Il punteggio non prova riciclaggio e non decide, compila o invia una SOS.",
      "La decisione e l’eventuale escalation competono al responsabile AML sulla base dell’analisi complessiva; non informare il cliente di una possibile SOS."
    ],
    escalation: requiresHumanReview ? "Responsabile AML" : "Riesame umano secondo procedura AML",
    inputs: { indicators: normalized.map(({ code, observed, weight }) => ({ code, observed, weight: formatDecimal(weight) })) }
  });
}

export default scoreAmlIndicators;
