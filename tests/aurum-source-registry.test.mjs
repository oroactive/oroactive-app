import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadSourceRegistry, validateSourceRegistry } from "../services/aurum/knowledge/sourceRegistry.js";
import { applySourceContentPolicy } from "../services/aurum/knowledge/documentParser.js";

test("il registro fonti è valido, tracciabile e limita ISO/GIA ai metadati", () => {
  const registry = loadSourceRegistry();
  assert.ok(registry.sources.length >= 39);
  for (const key of [
    "oroactive-sector-knowledge", "oroactive-laboratorio-gemmologico", "oroactive-elenco-monete",
    "oroactive-procedure-operative", "oroactive-bilancia-doro", "oroactive-manuale-format",
    "oroactive-aurum-shield", "oroactive-procedure-aml", "oroactive-procedure-privacy",
    "oroactive-academy", "oroactive-manuali-strumenti", "oroactive-casi-approvati"
  ]) assert.ok(registry.get(key), key);
  const restricted = registry.sources.filter((source) => /^(global-iso-|global-gia-)/.test(source.source_key));
  assert.ok(restricted.length >= 4);
  assert.ok(restricted.every((source) => source.ingestion_mode === "metadata_abstract_only" && source.allow_full_text === false));
  assert.ok(registry.sources.every((source) => source.license && source.update_frequency && "last_checked_at" in source && "next_check_at" in source));
});

test("tutti gli URL e i riferimenti primari obbligatori sono registrati", () => {
  const registry = loadSourceRegistry();
  const urls = new Set(registry.sources.map((source) => source.official_url).filter(Boolean));
  for (const url of [
    "https://www.garanteprivacy.it/it/regolamentoue/guida-all-applicazione-del-regolamento-europeo-in-materia-di-protezione-dei-dati-personali",
    "https://cibjo.org/industry-standards-resources/",
    "https://www.lbma.org.uk/responsible-sourcing/guidance-documents"
  ]) assert.ok(urls.has(url), url);

  const taxonomy = JSON.parse(readFileSync(new URL("../data/aurum/taxonomy.json", import.meta.url)));
  for (const domain of taxonomy.domains) {
    assert.ok(domain.primary_sources.length > 0 || domain.minimum_citations === 0, `${domain.id}: fonte primaria mancante`);
    for (const sourceKey of domain.primary_sources) assert.ok(registry.get(sourceKey), `${domain.id}: ${sourceKey}`);
  }
});

test("il registro rifiuta duplicati e URL non HTTPS", () => {
  const original = JSON.parse(readFileSync(new URL("../config/aurum-source-registry.json", import.meta.url)));
  assert.throws(() => validateSourceRegistry({ sources: [original.sources[0], original.sources[0]] }), /duplicata/i);
  assert.throws(() => validateSourceRegistry({ sources: [{ ...original.sources[0], official_url: "http://example.com" }] }), /HTTPS/i);
});

test("una fonte senza diritto al full text conserva solo metadati e abstract consentito", () => {
  const restricted = applySourceContentPolicy(
    { text: "Testo integrale protetto", abstract: "Riferimento e abstract consentito" },
    { allow_full_text: false, ingestion_mode: "metadata_and_permitted_extracts" }
  );
  assert.equal(restricted.storageMode, "metadata_abstract_only");
  assert.equal(restricted.text, "Riferimento e abstract consentito");
  assert.equal(restricted.fullTextDiscarded, true);

  const permitted = applySourceContentPolicy(
    { text: "Testo ufficiale riutilizzabile", abstract: "" },
    { allow_full_text: true, ingestion_mode: "official_structured_text" }
  );
  assert.equal(permitted.storageMode, "full_text");
  assert.equal(permitted.text, "Testo ufficiale riutilizzabile");
});
