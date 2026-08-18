import assert from "node:assert/strict";
import test from "node:test";

import {
  OROACTIVE_COOLIFY_DEPLOY_ENDPOINT,
  OROACTIVE_PRODUCTION_RESOURCE_UUID,
  buildProductionDeployUrl,
  validateProductionDeployResponse
} from "../scripts/coolify-deploy-target.mjs";

test("il deploy Coolify usa soltanto endpoint e UUID OroActive produzione", () => {
  const url = new URL(buildProductionDeployUrl());

  assert.equal(url.origin + url.pathname, OROACTIVE_COOLIFY_DEPLOY_ENDPOINT);
  assert.equal(url.hostname, "app.coolify.io");
  assert.equal(url.pathname, "/api/v1/deploy");
  assert.equal(url.searchParams.get("uuid"), OROACTIVE_PRODUCTION_RESOURCE_UUID);
  assert.equal(url.searchParams.get("force"), "true");
  assert.deepEqual([...url.searchParams.keys()].sort(), ["force", "uuid"]);
  assert.equal(url.hash, "");
});

test("la risposta Coolify rifiuta richieste vuote, multiple o malformate", () => {
  assert.throws(
    () => validateProductionDeployResponse({ deployments: [] }),
    /singola richiesta/
  );
  assert.throws(
    () => validateProductionDeployResponse({ deployments: [{}, {}] }),
    /singola richiesta/
  );
  assert.throws(
    () => validateProductionDeployResponse("non-json"),
    /Unexpected token|JSON/
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
