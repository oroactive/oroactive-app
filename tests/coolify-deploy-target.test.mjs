import assert from "node:assert/strict";
import test from "node:test";

import {
  OROACTIVE_PRODUCTION_RESOURCE_UUID,
  buildProductionDeployWebhook,
  validateProductionDeployResponse
} from "../scripts/coolify-deploy-target.mjs";

test("il deploy Coolify sostituisce sempre un UUID obsoleto con OroActive produzione", () => {
  const url = new URL(buildProductionDeployWebhook(
    "https://app.coolify.io/api/v1/deploy?uuid=tcmmkodrsz32vt341ja4z6ny&force=false&tag=legacy&pr=42&docker_tag=old#ignored"
  ));

  assert.equal(url.hostname, "app.coolify.io");
  assert.equal(url.pathname, "/api/v1/deploy");
  assert.equal(url.searchParams.get("uuid"), OROACTIVE_PRODUCTION_RESOURCE_UUID);
  assert.equal(url.searchParams.get("force"), "true");
  assert.deepEqual([...url.searchParams.keys()].sort(), ["force", "uuid"]);
  assert.equal(url.hash, "");
});

test("il deploy Coolify rifiuta endpoint non ufficiali", () => {
  assert.throws(
    () => buildProductionDeployWebhook("https://example.com/api/v1/deploy?uuid=legacy"),
    /endpoint deploy ufficiale/
  );
  assert.throws(
    () => buildProductionDeployWebhook("http://app.coolify.io/api/v1/deploy?uuid=legacy"),
    /endpoint deploy ufficiale/
  );
  assert.throws(
    () => buildProductionDeployWebhook("https://app.coolify.io:444/api/v1/deploy?uuid=legacy"),
    /endpoint deploy ufficiale/
  );
});

test("la risposta Coolify è valida solo per la risorsa OroActive attesa", () => {
  assert.deepEqual(
    validateProductionDeployResponse({
      deployments: [{
        resource_uuid: OROACTIVE_PRODUCTION_RESOURCE_UUID,
        deployment_uuid: "deployment-final-1"
      }]
    }),
    {
      resourceUuid: OROACTIVE_PRODUCTION_RESOURCE_UUID,
      deploymentUuid: "deployment-final-1"
    }
  );

  assert.throws(
    () => validateProductionDeployResponse({
      deployments: [{
        resource_uuid: "tcmmkodrsz32vt341ja4z6ny",
        deployment_uuid: "deployment-wrong-resource"
      }]
    }),
    /risorsa diversa/
  );
  assert.throws(
    () => validateProductionDeployResponse({
      deployments: [{ resource_uuid: OROACTIVE_PRODUCTION_RESOURCE_UUID }]
    }),
    /identificativo del deploy/
  );
});
