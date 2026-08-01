import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildAurumProfessionalResponse } from "../services/aurum/aurumProfessionalResponse.js";

const registry = JSON.parse(readFileSync(new URL("../config/aurum-source-registry.json", import.meta.url), "utf8"));
const fixedClock = () => new Date("2026-08-01T12:00:00.000Z");

function legalRoute(overrides = {}) {
  return {
    domains: ["legal_compro_oro"],
    jurisdiction: "IT",
    risk_level: "high",
    minimum_authority_level: 95,
    minimum_citations: 1,
    access_allowed: true,
    matched_by_keywords: true,
    ...overrides
  };
}

test("il contratto professionale accetta soltanto una versione primaria approvata dal retrieval", () => {
  const result = buildAurumProfessionalResponse({
    legacy: {
      risposta: "La scheda dell'operazione va gestita secondo la disciplina vigente.",
      fonti: [
        {
          title: "D.Lgs. 92/2017, testo consolidato",
          url: "https://www.normattiva.it/eli/id/2017/06/20/17G00109/CONSOLIDATED",
          authority: "Normattiva",
          verifiedAt: "2026-08-01"
        },
        ...Array.from({ length: 6 }, (_, index) => ({
          title: `Duplicato ${index}`,
          url: "https://www.normattiva.it/eli/id/2017/06/20/17G00109/CONSOLIDATED",
          authority: "Normattiva",
          verifiedAt: "2026-08-01"
        }))
      ]
    },
    retrieved: [{
      id: 101,
      source_key: "it-normattiva-dlgs-92-2017",
      organization: "Normattiva",
      source_title: "D.Lgs. 92/2017, testo consolidato",
      official_url: "https://www.normattiva.it/eli/id/2017/06/20/17G00109/CONSOLIDATED",
      version_label: "consolidato-2026-08-01",
      retrieved_at: "2026-08-01T08:00:00.000Z",
      authority_level: 100,
      review_status: "approved",
      is_current: true,
      source_active: true,
      content: "Disciplina vigente della scheda dell'operazione."
    }],
    route: legalRoute(),
    registry,
    clock: fixedClock
  });
  assert.equal(result.answer.startsWith("La scheda"), true);
  assert.equal(result.confidence, "ALTO");
  assert.equal(result.validAsOf, "2026-08-01");
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].source_key, "it-normattiva-dlgs-92-2017");
  assert.match(result.sources[0].url, /^https:\/\//);
});

test("una citazione legacy dichiarata verificata non sostituisce l'approvazione Founder", () => {
  const result = buildAurumProfessionalResponse({
    legacy: {
      risposta: "Affermazione legacy",
      fonti: [{
        title: "Pagina ufficiale",
        url: "https://www.normattiva.it/eli/id/2017/06/20/17G00109/CONSOLIDATED",
        verifiedAt: "2026-08-01"
      }]
    },
    route: legalRoute(),
    registry,
    clock: fixedClock
  });
  assert.equal(result.confidence, "INSUFFICIENTE");
  assert.equal(result.sources.length, 0);
  assert.doesNotMatch(result.answer, /Affermazione legacy/);
});

test("una risposta high risk senza fonte approvata diventa non assertiva", () => {
  const result = buildAurumProfessionalResponse({
    legacy: { risposta: "Affermazione non supportata", fonti: [] },
    route: legalRoute(),
    registry,
    clock: fixedClock
  });
  assert.equal(result.confidence, "INSUFFICIENTE");
  assert.doesNotMatch(result.answer, /Affermazione non supportata/);
  assert.match(result.answer, /fonti approvate e aggiornate/i);
  assert.ok(result.missingInformation.length > 0);
});

test("il contratto applica il ruolo e non espone chain-of-thought privata", () => {
  const result = buildAurumProfessionalResponse({
    legacy: { risposta: "Dati Founder" },
    route: legalRoute({ domains: [], access_allowed: false, matched_by_keywords: true }),
    registry,
    clock: fixedClock
  });
  assert.match(result.answer, /riservata/i);
  assert.equal("chainOfThought" in result, false);
  assert.deepEqual(Object.keys(result.operationalReasoning).sort(), ["calculations", "facts", "missingInformation", "rules", "steps"]);
});

test("un calcolo richiesto senza input indica il tool e i dati mancanti", () => {
  const result = buildAurumProfessionalResponse({
    legacy: { risposta: "Servono i valori" },
    route: {
      domains: ["precious_metals"], jurisdiction: "IT", risk_level: "medium",
      minimum_authority_level: 80, minimum_citations: 1, access_allowed: true,
      matched_by_keywords: true, requiresTool: true, toolName: "calculateFineMetal"
    },
    retrieved: [{
      id: 1, source_key: "oroactive-sector-knowledge", organization: "OroActive", source_title: "Base settoriale",
      official_url: "https://app.oroactive.it/", authority_level: 80, review_status: "approved", is_current: true,
      source_active: true, content: "Il fino richiede peso netto e titolo."
    }],
    registry,
    clock: fixedClock
  });
  assert.ok(result.missingInformation.some((item) => item.includes("calculateFineMetal")));
  assert.ok(result.recommendedSteps.some((item) => /strumento deterministico/i.test(item)));
});
