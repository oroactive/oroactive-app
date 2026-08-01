import { buildAssayProtocol } from "./buildAssayProtocol.js";
import { calculateBuybackPrice } from "./calculateBuybackPrice.js";
import { calculateDensity } from "./calculateDensity.js";
import { calculateFineMetal } from "./calculateFineMetal.js";
import { calculateFoundryYield } from "./calculateFoundryYield.js";
import { calculateStoreMargin } from "./calculateStoreMargin.js";
import { checkActCompleteness } from "./checkActCompleteness.js";
import { compareGemCandidates } from "./compareGemCandidates.js";
import { compareMeltVsResale } from "./compareMeltVsResale.js";
import { convertPurity } from "./convertPurity.js";
import { convertWeightUnits } from "./convertWeightUnits.js";
import { lookupHallmark } from "./lookupHallmark.js";
import { reconcileLotWeights } from "./reconcileLotWeights.js";
import { scoreAmlIndicators } from "./scoreAmlIndicators.js";
import { AURUM_TOOL_CONTROL_ROLES, AURUM_TOOL_ROLES, normalizeToolRole } from "./common.js";

const registry = {
  calculateFineMetal: { execute: calculateFineMetal, roles: AURUM_TOOL_ROLES, domain: "precious_metals", riskLevel: "medium" },
  convertPurity: { execute: convertPurity, roles: AURUM_TOOL_ROLES, domain: "precious_metals", riskLevel: "low" },
  convertWeightUnits: { execute: convertWeightUnits, roles: AURUM_TOOL_ROLES, domain: "precious_metals", riskLevel: "low" },
  calculateDensity: { execute: calculateDensity, roles: AURUM_TOOL_ROLES, domain: "assaying", riskLevel: "medium" },
  calculateBuybackPrice: { execute: calculateBuybackPrice, roles: AURUM_TOOL_CONTROL_ROLES, domain: "buyback_pricing", riskLevel: "high" },
  calculateFoundryYield: { execute: calculateFoundryYield, roles: AURUM_TOOL_CONTROL_ROLES, domain: "foundry", riskLevel: "high" },
  reconcileLotWeights: { execute: reconcileLotWeights, roles: AURUM_TOOL_CONTROL_ROLES, domain: "foundry", riskLevel: "high" },
  compareMeltVsResale: { execute: compareMeltVsResale, roles: ["founder"], domain: "business_management", riskLevel: "high" },
  checkActCompleteness: { execute: checkActCompleteness, roles: AURUM_TOOL_ROLES, domain: "store_operations", riskLevel: "medium" },
  buildAssayProtocol: { execute: buildAssayProtocol, roles: AURUM_TOOL_ROLES, domain: "assaying", riskLevel: "high" },
  lookupHallmark: { execute: lookupHallmark, roles: AURUM_TOOL_ROLES, domain: "hallmarks", riskLevel: "medium" },
  compareGemCandidates: { execute: compareGemCandidates, roles: AURUM_TOOL_ROLES, domain: "gemology", riskLevel: "high" },
  scoreAmlIndicators: { execute: scoreAmlIndicators, roles: AURUM_TOOL_CONTROL_ROLES, domain: "aml_ctf", riskLevel: "critical" },
  calculateStoreMargin: { execute: calculateStoreMargin, roles: ["founder"], domain: "business_management", riskLevel: "high" }
};

export const AURUM_TOOL_REGISTRY = Object.freeze(Object.fromEntries(
  Object.entries(registry).map(([name, definition]) => [name, Object.freeze({
    name,
    domain: definition.domain,
    riskLevel: definition.riskLevel,
    roles: Object.freeze([...definition.roles])
  })])
));

export class AurumToolAccessError extends Error {
  constructor(message, code, toolName = "") {
    super(message);
    this.name = "AurumToolAccessError";
    this.code = code;
    this.toolName = toolName;
    this.status = code === "UNKNOWN_TOOL" ? 404 : 403;
  }
}

export function normalizeAurumToolRole(role = "") {
  return normalizeToolRole(role);
}

export function listAurumToolsForRole(role = "") {
  const normalizedRole = normalizeAurumToolRole(role);
  if (!AURUM_TOOL_ROLES.includes(normalizedRole)) return [];
  return Object.values(AURUM_TOOL_REGISTRY).filter((definition) => definition.roles.includes(normalizedRole));
}

export function executeAurumTool(toolName, input, context = {}) {
  const normalizedName = String(toolName || "").trim();
  const definition = registry[normalizedName];
  if (!definition) throw new AurumToolAccessError("Tool Aurum non consentito o inesistente.", "UNKNOWN_TOOL", normalizedName);
  const role = normalizeAurumToolRole(context.role);
  if (!definition.roles.includes(role)) {
    throw new AurumToolAccessError("Il ruolo non è autorizzato a usare questo tool Aurum.", "TOOL_FORBIDDEN", normalizedName);
  }
  const result = definition.execute(input);
  return Object.freeze({
    ...result,
    authorization: Object.freeze({ role, domain: definition.domain, riskLevel: definition.riskLevel })
  });
}

export {
  buildAssayProtocol,
  calculateBuybackPrice,
  calculateDensity,
  calculateFineMetal,
  calculateFoundryYield,
  calculateStoreMargin,
  checkActCompleteness,
  compareGemCandidates,
  compareMeltVsResale,
  convertPurity,
  convertWeightUnits,
  lookupHallmark,
  reconcileLotWeights,
  scoreAmlIndicators
};
