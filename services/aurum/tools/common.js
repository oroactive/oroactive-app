export const AURUM_TOOL_ROLES = Object.freeze(["founder", "supervisore", "responsabile", "commesso", "aiuto_commesso"]);
export const AURUM_TOOL_CONTROL_ROLES = Object.freeze(["founder", "supervisore", "responsabile"]);

export function normalizeToolRole(role = "") {
  const normalized = String(role || "").trim().toLowerCase().replace(/[ -]+/g, "_");
  return normalized === "aiuto" || normalized === "assistente" ? "aiuto_commesso" : normalized;
}

export function normalizeToolText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
