import fs from "node:fs";
import { pathToFileURL } from "node:url";

export const OROACTIVE_PRODUCTION_RESOURCE_UUID = "heyeitdqcuq3gxk36zrt2lkc";
export const OROACTIVE_COOLIFY_DEPLOY_ENDPOINT = "https://app.coolify.io/api/v1/deploy";

function normalizedText(value) {
  return String(value || "").trim();
}

export function buildProductionDeployUrl() {
  const deployUrl = new URL(OROACTIVE_COOLIFY_DEPLOY_ENDPOINT);
  deployUrl.searchParams.set("uuid", OROACTIVE_PRODUCTION_RESOURCE_UUID);
  deployUrl.searchParams.set("force", "true");
  return deployUrl.href;
}

export function validateProductionDeployResponse(rawResponse) {
  const payload = typeof rawResponse === "string" ? JSON.parse(rawResponse) : rawResponse;
  const deployments = Array.isArray(payload?.deployments) ? payload.deployments : [];
  if (deployments.length !== 1) {
    throw new Error("Coolify non ha restituito una singola richiesta di deploy.");
  }

  const deployment = deployments[0] || {};
  if (normalizedText(deployment.resource_uuid) !== OROACTIVE_PRODUCTION_RESOURCE_UUID) {
    throw new Error("Coolify ha accettato il deploy per una risorsa diversa da OroActive produzione.");
  }
  if (!normalizedText(deployment.deployment_uuid)) {
    throw new Error("Coolify non ha restituito l'identificativo del deploy OroActive.");
  }

  return {
    deploymentUuid: normalizedText(deployment.deployment_uuid),
    resourceUuid: normalizedText(deployment.resource_uuid)
  };
}

function runCli() {
  const [command, input] = process.argv.slice(2);
  if (command === "url") {
    process.stdout.write(buildProductionDeployUrl());
    return;
  }
  if (command === "validate") {
    const response = fs.readFileSync(input, "utf8");
    const deployment = validateProductionDeployResponse(response);
    process.stdout.write(`Coolify ha accodato il deploy OroActive ${deployment.deploymentUuid}.\n`);
    return;
  }
  throw new Error("Uso: coolify-deploy-target.mjs <url|validate> <valore>");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runCli();
  } catch (error) {
    console.error(error?.message || error);
    process.exitCode = 1;
  }
}
