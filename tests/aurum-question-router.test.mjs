import test from "node:test";
import assert from "node:assert/strict";
import { AURUM_QUESTION_DOMAINS, routeAurumQuestion } from "../services/aurum/aurumQuestionRouter.js";
import { AURUM_TOOL_REGISTRY } from "../services/aurum/tools/index.js";

test("il router espone 35 domini e associa rischio, tool e giurisdizione", () => {
  assert.equal(AURUM_QUESTION_DOMAINS.length, 35);
  const route = routeAurumQuestion("Calcola il titolo e il fino della lega oro in Italia", { role: "commesso" });
  assert.ok(route.domains.includes("alloys"));
  assert.ok(route.tools.includes("calculateFineMetal"));
  assert.equal(route.jurisdiction, "IT");
  assert.equal(route.access_allowed, true);
});

test("il router applica ruolo e privacy", () => {
  const denied = routeAurumQuestion("Spiegami il franchising", { role: "commesso" });
  assert.equal(denied.access_allowed, false);
  const pii = routeAurumQuestion("La mia email è cliente@example.com e vorrei sapere della privacy", { role: "commesso" });
  assert.equal(pii.pii_detected, true);
  assert.equal(pii.persist_question, false);
});

test("i casi approvati usano il livello 70 senza abbassare gli altri domini", () => {
  const caseRoute = routeAurumQuestion("Mostra un caso reale e la lezione appresa", { role: "responsabile" });
  assert.ok(caseRoute.domains.includes("oroactive_cases"));
  assert.equal(caseRoute.minimum_authority_level, 70);
  const amlRoute = routeAurumQuestion("Mostra un caso reale con indicatori antiriciclaggio", { role: "responsabile" });
  assert.ok(amlRoute.domains.includes("oroactive_cases"));
  assert.ok(amlRoute.domains.includes("aml_ctf"));
  assert.equal(amlRoute.minimum_authority_level, 95);
});

test("il commesso accede alle informazioni AML senza ricevere il tool riservato", () => {
  const route = routeAurumQuestion("Verifica gli indicatori antiriciclaggio AML", { role: "commesso" });
  assert.equal(route.access_allowed, true);
  assert.ok(route.domains.includes("aml_ctf"));
  assert.ok(!route.tools.includes("scoreAmlIndicators"));
  assert.equal(route.toolName, null);
  assert.equal(route.requiresTool, false);
});

test("il commesso accede al dominio buyback senza ricevere il calcolo riservato", () => {
  const route = routeAurumQuestion("Calcola il prezzo acquisto massimo pagabile", { role: "commesso" });
  assert.equal(route.access_allowed, true);
  assert.ok(route.domains.includes("buyback_pricing"));
  assert.ok(!route.tools.includes("calculateBuybackPrice"));
  assert.equal(route.toolName, null);
  assert.equal(route.requiresTool, false);
});

test("ogni tool proposto dal router rispetta le ACL del registry esecutivo", () => {
  const roles = ["founder", "supervisore", "responsabile", "commesso", "aiuto_commesso"];
  for (const [toolName, definition] of Object.entries(AURUM_TOOL_REGISTRY)) {
    const taxonomy = {
      domains: [{
        id: definition.domain,
        keywords: ["richiesta dedicata"],
        risk_level: definition.riskLevel,
        authorized_roles: roles,
        tools: [toolName],
        minimum_citations: 0
      }]
    };
    for (const role of roles) {
      const route = routeAurumQuestion("Calcola richiesta dedicata", { role }, { taxonomy });
      assert.equal(route.access_allowed, true, `${toolName}: accesso informativo inatteso per ${role}`);
      assert.equal(
        route.tools.includes(toolName),
        definition.roles.includes(role),
        `${toolName}: ACL router diversa dal registry per ${role}`
      );
      if (route.toolName) {
        assert.ok(AURUM_TOOL_REGISTRY[route.toolName].roles.includes(role), `${route.toolName}: tool vietato proposto a ${role}`);
      }
    }
  }
});
