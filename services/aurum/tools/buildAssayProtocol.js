import { requireField, requireObject, toolResult } from "./preciseDecimal.js";

const SAFE_METHODS = Object.freeze({
  visual: { title: "Esame visivo", instruction: "Documentare superficie, giunti, usura, colore e zone non omogenee con illuminazione adeguata." },
  loupe: { title: "Lente", instruction: "Osservare punzoni, bordi, saldature, rivestimenti e anomalie senza alterare il campione." },
  microscope: { title: "Microscopio", instruction: "Registrare caratteristiche osservabili e punti da approfondire senza attribuire autenticità definitiva." },
  scale: { title: "Bilancia", instruction: "Verificare azzeramento e unità, quindi registrare massa e identificativo dello strumento." },
  caliper: { title: "Calibro", instruction: "Misurare dimensioni accessibili senza deformare o danneggiare il bene." },
  magnet: { title: "Magnete", instruction: "Usare come screening e registrare intensità e zona della risposta; l’assenza di attrazione non prova il titolo." },
  density: { title: "Densità", instruction: "Applicare solo a campione compatibile, documentando metodo, liquido, temperatura e incertezza." },
  xrf: { title: "ED-XRF", instruction: "Eseguire misure multipunto secondo manuale, calibrazione, radioprotezione e matrice applicabile." },
  thermal_tester: { title: "Tester termico", instruction: "Usare come screening su gemma compatibile evitando contatto con la montatura." },
  moissanite_tester: { title: "Tester moissanite", instruction: "Confermare lo screening termico secondo manuale e condizioni del campione." },
  uv: { title: "UV", instruction: "Osservare la risposta in condizioni controllate senza dedurre da sola origine o trattamento." },
  refractometer: { title: "Rifrattometro", instruction: "Usare soltanto con campione e liquido compatibili, seguendo SDS e manuale del produttore." }
});
const RESTRICTED_METHODS = new Set(["acid", "acids", "cupellation", "chemical_analysis", "melting", "refining"]);

export function buildAssayProtocol(input = {}) {
  const tool = "buildAssayProtocol";
  requireObject(input, tool);
  const materialType = String(requireField(input, "materialType", tool)).trim();
  const methods = requireField(input, "methods", tool);
  if (!materialType) throw new TypeError(`${tool}: materialType non valido.`);
  if (!Array.isArray(methods) || !methods.length) throw new TypeError(`${tool}: methods deve essere un elenco non vuoto.`);
  const normalized = [...new Set(methods.map((method) => String(method || "").trim().toLowerCase()).filter(Boolean))];
  const unknown = normalized.filter((method) => !(method in SAFE_METHODS) && !RESTRICTED_METHODS.has(method));
  if (unknown.length) throw new TypeError(`${tool}: metodi non riconosciuti: ${unknown.join(", ")}.`);
  const restricted = normalized.filter((method) => RESTRICTED_METHODS.has(method));
  const safe = normalized.filter((method) => method in SAFE_METHODS);
  const steps = safe.map((method, index) => ({ order: index + 1, method, ...SAFE_METHODS[method] }));
  const warnings = ["Il protocollo è di screening: non certifica metallo, titolo, gemma, origine o trattamento."];
  if (safe.includes("xrf")) warnings.push("XRF analizza principalmente la superficie; su oggetti rivestiti, cavi o eterogenei richiede conferma indipendente.");
  if (restricted.length) warnings.push("Metodi distruttivi, chimici, fusione e raffinazione sono esclusi: richiedono consenso, personale autorizzato, procedura approvata e sicurezza specialistica.");
  return toolResult(tool, {
    status: restricted.length && !steps.length ? "escalation_required" : "protocol_built",
    materialType,
    steps,
    excludedMethods: restricted,
    units: { steps: "ordered steps" },
    formula: "protocol = sequenza dei soli metodi non distruttivi richiesti e riconosciuti",
    assumptions: ["Compatibilità del campione, autorizzazioni, calibrazione e manuali degli strumenti devono essere verificati prima dell’esecuzione."],
    warnings,
    missingInformation: restricted.length ? ["procedura autorizzata e consenso per i metodi esclusi"] : [],
    escalation: restricted.length ? "Responsabile tecnico o laboratorio qualificato" : null
  });
}

export default buildAssayProtocol;
