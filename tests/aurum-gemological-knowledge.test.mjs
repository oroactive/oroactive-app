import assert from "node:assert/strict";
import test from "node:test";
import * as catalog from "../services/academy/gemologicalCatalog.js";
import * as subject from "../services/aurum/gemologicalKnowledge.js";

// La matrice usa il catalogo reale per impedire divergenze tra Laboratorio e Aurum.
test("indicizza per riferimento tutte le 61 pietre e guida tutti i 21 strumenti", () => {
  assert.equal(subject.AURUM_GEM_KNOWLEDGE_STATS.materialCount, 61);
  assert.equal(subject.AURUM_GEM_KNOWLEDGE_STATS.uniqueMaterialSlugs, 61);
  assert.equal(subject.AURUM_GEM_KNOWLEDGE_STATS.toolCount, 21);
  assert.equal(subject.AURUM_GEM_KNOWLEDGE_STATS.uniqueToolNames, 21);
  assert.equal(subject.AURUM_GEM_MATERIAL_INDEX.length, catalog.GEM_CATALOG_SEED.length);
  assert.equal(subject.AURUM_GEM_TOOL_INDEX.length, catalog.GEM_TOOL_SEED.length);
  subject.AURUM_GEM_TOOL_INDEX.forEach((entry) => {
    assert.ok(entry.purpose);
    assert.ok(entry.preparation.length >= 2);
    assert.ok(entry.procedure.length >= 3);
    assert.ok(entry.observations.length >= 2);
    assert.ok(entry.limitations.length >= 2);
    assert.ok(entry.safety.length >= 1);
    assert.ok(entry.next_step);
  });
});

test("tutte le pietre hanno proprietà scientifiche, protocollo, strumenti e fonti HTTPS", () => {
  const scientificFields = [
    "chemical_formula",
    "crystal_system",
    "mohs_hardness",
    "density",
    "refractive_index",
    "classification",
    "cleaning_precautions"
  ];
  catalog.GEM_CATALOG_SEED.forEach((material) => {
    scientificFields.forEach((field) => {
      assert.ok(material[field], `${material.name}: ${field}`);
    });
    assert.ok(material.recommended_tools.length > 0, `${material.name}: strumenti`);
    assert.ok(material.operator_protocol.steps.length > 0, `${material.name}: protocollo`);
    assert.ok(material.sources.some((source) => /^https:\/\//.test(source.url || "")), `${material.name}: fonti`);
  });
});

test("ogni nome canonico e alias include la scheda corretta senza forzare famiglie ambigue", () => {
  catalog.GEM_CATALOG_SEED.forEach((material) => {
    const byName = subject.searchGemologicalKnowledge(`Scheda ${material.name}`);
    assert.ok(
      byName.primary?.slug === material.slug
      || (byName.ambiguous && byName.materials.some((match) => match.slug === material.slug)),
      material.name
    );
    for (const alias of material.aliases || []) {
      const byAlias = subject.searchGemologicalKnowledge(alias);
      assert.ok(
        byAlias.primary?.slug === material.slug
        || (byAlias.ambiguous && byAlias.materials.some((match) => match.slug === material.slug)),
        `${material.name}: ${alias}`
      );
    }
  });
});

test("i nomi di famiglia restano ambigui e non promuovono una classificazione arbitraria", () => {
  const expected = {
    zaffiro: ["zaffiro-blu-naturale", "zaffiri-fancy", "zaffiro-sintetico"],
    diamante: ["diamante-naturale", "diamante-sintetico-hpht", "diamante-sintetico-cvd", "diamante-trattato"],
    perla: ["perla-naturale", "perla-coltivata", "perla-imitazione"],
    opale: ["opale-prezioso", "opale-di-fuoco", "opale-sintetico"],
    rubino: ["rubino-naturale", "rubino-sintetico"],
    smeraldo: ["smeraldo", "smeraldo-sintetico"],
    spinello: ["spinello-naturale", "spinello-sintetico"]
  };
  Object.entries(expected).forEach(([query, slugs]) => {
    const result = subject.searchGemologicalKnowledge(query, { maxMaterials: 12 });
    assert.equal(result.ambiguous, true, query);
    assert.deepEqual(new Set(result.materials.map((match) => match.slug)), new Set(slugs), query);
    assert.equal(result.primary, null, query);
    assert.equal(subject.hasGemologicalKnowledgeIntent(result), true, query);
  });
});

test("separa naturali, sintetici, processi e richieste generiche ambigue", () => {
  assert.equal(subject.searchGemologicalKnowledge("rubino sintetico").primary?.slug, "rubino-sintetico");
  assert.equal(subject.searchGemologicalKnowledge("diamante naturale").primary?.slug, "diamante-naturale");
  assert.equal(subject.searchGemologicalKnowledge("diamante sintetico HPHT").primary?.slug, "diamante-sintetico-hpht");
  assert.equal(subject.searchGemologicalKnowledge("diamante sintetico CVD").primary?.slug, "diamante-sintetico-cvd");

  const syntheticDiamond = subject.searchGemologicalKnowledge("diamante sintetico");
  assert.equal(syntheticDiamond.ambiguous, true);
  assert.deepEqual(
    new Set(syntheticDiamond.materials.map((match) => match.slug)),
    new Set(["diamante-sintetico-hpht", "diamante-sintetico-cvd"])
  );
  assert.equal(subject.searchGemologicalKnowledge("diamante").ambiguous, true);

  const comparison = subject.searchGemologicalKnowledge("confronta rubino naturale e rubino sintetico");
  assert.equal(comparison.comparison, true);
  assert.deepEqual(
    new Set(comparison.materials.map((match) => match.slug)),
    new Set(["rubino-naturale", "rubino-sintetico"])
  );
});

test("risolve query strumento e restituisce fonti generali ufficiali", () => {
  catalog.GEM_TOOL_SEED.forEach((tool) => {
    const result = subject.searchGemologicalKnowledge(`Come si usa ${tool.name}?`);
    assert.equal(result.primaryTool?.name, tool.name, tool.name);
    assert.equal(subject.hasGemologicalKnowledgeIntent(result), true, tool.name);
  });
  const result = subject.searchGemologicalKnowledge("Come si usa il rifrattometro?");
  const sources = subject.gemologicalKnowledgeSources(result);
  assert.equal(result.primaryTool?.name, "Rifrattometro");
  assert.ok(sources.length >= 3);
  assert.ok(sources.every((source) => source.url.startsWith("https://")));
  assert.ok(sources.every((source) => /generale/i.test(source.source_scope)));
});

test("contesto bounded non include media e risposta deterministica mantiene sezioni e limiti", () => {
  const result = subject.searchGemologicalKnowledge("scheda tanzanite");
  const context = subject.formatGemologicalKnowledgeContext(result, { maxChars: 2_800, maxTools: 2 });
  assert.ok(context.length <= 2_800);
  assert.doesNotMatch(context, /\b(?:gallery|data:image|four-view|\.jpg|\.png)\b/i);

  const first = subject.buildGemologicalKnowledgeAnswer("scheda tanzanite", result);
  const second = subject.buildGemologicalKnowledgeAnswer("scheda tanzanite", result);
  assert.deepEqual(first, second);
  assert.match(first.risposta, /Proprietà scientifiche:/);
  assert.match(first.risposta, /Strumenti consigliati:/);
  assert.match(first.risposta, /Protocollo operativo:/);
  assert.match(first.risposta, /Limiti e cautele:/);
  assert.match(first.risposta, /Fonti di riferimento generale:/);
  assert.deepEqual(first.materiali, ["tanzanite"]);
  assert.doesNotMatch(first.risposta, /Rubino sintetico|Diamante naturale/);
});

test("query non pertinente non riceve proprietà di una pietra casuale", () => {
  for (const query of ["paesaggi alpini", "animali della savana", "riparare una collana", "prenota un viaggio"]) {
    const result = subject.searchGemologicalKnowledge(query);
    assert.equal(result.materials.length, 0, query);
    assert.equal(result.primary, null, query);
  }
  const answer = subject.buildGemologicalKnowledgeAnswer("paesaggi alpini");
  assert.match(answer.risposta, /Non ho identificato/);
  assert.equal(answer.materiali.length, 0);
});
