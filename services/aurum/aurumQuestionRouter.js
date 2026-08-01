import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { containsAssistantPersonalData } from "./privacy.js";
import { AURUM_TOOL_REGISTRY, normalizeAurumToolRole } from "./tools/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TAXONOMY_PATH = path.resolve(__dirname, "../../data/aurum/taxonomy.json");

const TECHNICAL_PRIMARY_DOMAINS = new Set([
  "assaying",
  "hallmarks",
  "jewellery_manufacturing",
  "jewellery_repairs",
  "gemology",
  "diamonds",
  "pearls",
  "coral",
  "numismatics",
  "bullion",
  "foundry",
  "refining",
  "bullion_desk",
  "responsible_sourcing",
  "physical_security",
  "internal_fraud"
]);

const INTERNAL_PRIMARY_DOMAINS = new Set([
  "buyback_pricing",
  "store_operations",
  "customer_communication",
  "sales",
  "complaints",
  "franchising",
  "business_management",
  "oroactive_policy",
  "oroactive_cases"
]);

function loadDomains() {
  return JSON.parse(readFileSync(TAXONOMY_PATH, "utf8")).domains;
}

export const AURUM_QUESTION_DOMAINS = Object.freeze(loadDomains().map((domain) => domain.id));
const riskRank = Object.freeze({ low: 0, medium: 1, high: 2, critical: 3 });

function matchesDomain(text, domain) {
  return domain.keywords.some((keyword) => text.includes(String(keyword).toLowerCase()));
}

function requestedJurisdiction(text) {
  if (/\b(?:italia|italiano|italiana|normativa italiana)\b/i.test(text)) return "IT";
  if (/\b(?:unione europea|ue|europea|eur-lex)\b/i.test(text)) return "EU";
  return "IT";
}

function inferIntent(text) {
  if (/\b(?:calcola|quanto vale|converti|conversione|resa|margine|prezzo)\b/i.test(text)) return "calculate";
  if (/\b(?:verifica|controlla|check|conforme|completezza)\b/i.test(text)) return "verify";
  if (/\b(?:procedura|come faccio|passaggi|istruzioni operative)\b/i.test(text)) return "procedure";
  if (/\b(?:quotazione|spot|prezzo live|oggi|adesso|attuale)\b/i.test(text)) return "live_data";
  return "explain";
}

function highestRisk(domains) {
  return domains.reduce((risk, domain) => riskRank[domain.risk_level] > riskRank[risk] ? domain.risk_level : risk, "low");
}

function minimumAuthorityLevel(domains, riskLevel) {
  const ids = domains.map((domain) => domain.id);
  if (ids.length && ids.every((id) => id === "oroactive_cases")) return 70;
  if (riskLevel === "low") return 40;
  if (riskLevel === "medium") return 80;
  if (ids.length && ids.every((id) => INTERNAL_PRIMARY_DOMAINS.has(id))) return 85;
  if (ids.length && ids.every((id) => TECHNICAL_PRIMARY_DOMAINS.has(id))) return 90;
  return 95;
}

function chooseTool(text, tools, intent) {
  if (!tools.length || !["calculate", "verify", "procedure"].includes(intent)) return null;
  const preferred = [
    [/\b(?:fino|peso fino|metallo fino)\b/i, "calculateFineMetal"],
    [/\b(?:carat|carati|millesimi|purezza|titolo)\b/i, "convertPurity"],
    [/\b(?:oncia|once|troy|chilogramm|converti.*(?:peso|gramm))\b/i, "convertWeightUnits"],
    [/\b(?:densit|idrostatic)\b/i, "calculateDensity"],
    [/\b(?:prezzo acquisto|massimo pagabile|buyback)\b/i, "calculateBuybackPrice"],
    [/\b(?:resa.*fonderia|calo.*fonderia)\b/i, "calculateFoundryYield"],
    [/\b(?:riconcili|differenza.*peso|lotto)\b/i, "reconcileLotWeights"],
    [/\b(?:fusione.*rivendita|rivendita.*fusione)\b/i, "compareMeltVsResale"],
    [/\b(?:completezza.*atto|dati mancanti.*pratica)\b/i, "checkActCompleteness"],
    [/\b(?:protocollo.*(?:saggio|test)|xrf|coppellazione)\b/i, "buildAssayProtocol"],
    [/\b(?:punzone|marchio)\b/i, "lookupHallmark"],
    [/\b(?:confronta.*(?:gemm|pietr)|moissanite.*diamante)\b/i, "compareGemCandidates"],
    [/\b(?:indicatori.*aml|rischio.*antiriciclaggio|frazionat)\b/i, "scoreAmlIndicators"],
    [/\b(?:margine.*negozio|margine operativo)\b/i, "calculateStoreMargin"]
  ];
  return preferred.find(([pattern, name]) => pattern.test(text) && tools.includes(name))?.[1] || tools[0];
}

function toolsAllowedForRole(toolNames = [], role = "") {
  const normalizedRole = normalizeAurumToolRole(role);
  return toolNames.filter((toolName) => AURUM_TOOL_REGISTRY[toolName]?.roles.includes(normalizedRole));
}

export function routeAurumQuestion(question = "", context = {}, options = {}) {
  const text = String(question || "").trim();
  if (!text) throw new Error("Domanda Aurum mancante.");
  const taxonomy = options.taxonomy?.domains || loadDomains();
  const matched = taxonomy.filter((domain) => matchesDomain(text.toLowerCase(), domain));
  const selected = matched.length ? matched.slice(0, 4) : taxonomy.filter((domain) => domain.id === "oroactive_policy");
  const role = String(context.role || "aiuto_commesso").toLowerCase();
  const allowed = selected.filter((domain) => domain.authorized_roles.includes(role));
  const denied = selected.filter((domain) => !domain.authorized_roles.includes(role));
  const declaredTools = [...new Set(allowed.flatMap((domain) => domain.tools || []))];
  const tools = toolsAllowedForRole(declaredTools, role);
  const intent = inferIntent(text);
  const riskLevel = highestRisk(selected);
  const piiDetected = containsAssistantPersonalData(text);
  const liveDataRequired = intent === "live_data" || selected.some((domain) => domain.id === "market_prices");
  const accessAllowed = allowed.length > 0 && denied.length === 0;
  const authorityFloor = minimumAuthorityLevel(selected, riskLevel);
  const toolName = chooseTool(text, tools, intent);
  const escalationRequired = !accessAllowed || riskLevel === "critical" || piiDetected;
  return Object.freeze({
    question: text,
    intent,
    domains: Object.freeze(allowed.map((domain) => domain.id)),
    denied_domains: Object.freeze(denied.map((domain) => domain.id)),
    jurisdiction: requestedJurisdiction(text),
    role,
    risk_level: riskLevel,
    minimum_authority_level: authorityFloor,
    minimum_citations: Math.max(0, ...selected.map((domain) => Number(domain.minimum_citations || 0))),
    tools: Object.freeze(tools),
    matched_by_keywords: matched.length > 0,
    live_data_required: liveDataRequired,
    pii_detected: piiDetected,
    persist_question: !piiDetected,
    access_allowed: accessAllowed,
    escalation_required: escalationRequired,
    requires_human_confirmation: ["high", "critical"].includes(riskLevel),
    riskLevel,
    requiresLiveData: liveDataRequired,
    requiresTool: Boolean(toolName),
    toolName,
    requiresEscalation: escalationRequired,
    containsPersonalData: piiDetected,
    matchedByKeywords: matched.length > 0,
    minimumAuthorityLevel: authorityFloor
  });
}
