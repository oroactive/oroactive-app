import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  GEM_CATALOG_SEED,
  GEM_CATALOG_SEED_VALIDATION,
  GEM_TOOL_SEED,
  evaluateGemPublicationReadiness
} from "../services/academy/gemologicalCatalog.js";

const root = new URL("../", import.meta.url);
const file = (path) => readFileSync(new URL(path, root), "utf8");

const completeMaterial = () => ({
  name: "Campione revisionato",
  mineral_name: "Minerale revisionato",
  category: "Pietre ornamentali",
  classification: "Naturale",
  summary: "Panoramica tecnica revisionata.",
  description: "Descrizione tecnica completa revisionata.",
  mohs_min: 7,
  density_min: 2.6,
  tenacity: "Buona",
  cleavage: "Assente",
  fracture: "Concoide",
  cleaning_precautions: "Pulizia non invasiva secondo protocollo.",
  refractive_index_min: 1.54,
  optical_character: "Uniassico",
  birefringence: "0,009",
  pleochroism: "Assente",
  fluorescence_long_wave: "Inerte",
  common_treatments: ["Trattamento revisionato"],
  common_simulants: ["Simulante revisionato"],
  founder_review_status: "approved"
});

const completeCounts = () => ({
  authorizedHdMedia: 4,
  inclusions: 1,
  linkedTools: 3,
  protocols: 1,
  comparisons: 1,
  sources: 1
});

test("catalogo gemmologico iniziale contiene 61 materiali", () => {
  assert.equal(GEM_CATALOG_SEED.length, 61);
  assert.equal(GEM_CATALOG_SEED_VALIDATION.count, 61);
});

test("catalogo gemmologico usa 61 slug univoci", () => {
  assert.equal(new Set(GEM_CATALOG_SEED.map(({ slug }) => slug)).size, 61);
  assert.equal(GEM_CATALOG_SEED_VALIDATION.uniqueSlugs, 61);
});

test("catalogo contiene i 21 strumenti richiesti", () => {
  assert.equal(GEM_TOOL_SEED.length, 21);
});

test("nomi degli strumenti sono univoci", () => {
  assert.equal(new Set(GEM_TOOL_SEED.map(({ name }) => name)).size, 21);
});

test("tutte le schede seed sono attive", () => {
  assert.ok(GEM_CATALOG_SEED.every(({ active }) => active === true));
});

test("nessuna scheda seed incompleta è pubblicata", () => {
  assert.ok(GEM_CATALOG_SEED.every(({ published }) => published === false));
});

test("tutte le schede seed iniziano come bozze", () => {
  assert.ok(GEM_CATALOG_SEED.every(({ review_status }) => review_status === "draft"));
});

test("tutte le schede seed richiedono media", () => {
  assert.ok(GEM_CATALOG_SEED.every(({ media_status }) => media_status === "needs_media"));
});

test("nessuna scheda seed simula una revisione Founder", () => {
  assert.ok(GEM_CATALOG_SEED.every(({ founder_review_status }) => founder_review_status === "pending"));
});

test("nessuna scheda seed contiene immagini prive di provenienza", () => {
  assert.ok(GEM_CATALOG_SEED.every(({ gallery }) => Array.isArray(gallery) && gallery.length === 0));
});

test("i dati scientifici non verificati restano null", () => {
  assert.ok(GEM_CATALOG_SEED.every(({ chemical_formula, mohs_min, refractive_index_min }) => (
    chemical_formula === null && mohs_min === null && refractive_index_min === null
  )));
});

test("catalogo include materiali naturali", () => {
  assert.ok(GEM_CATALOG_SEED.some(({ classification }) => classification === "Naturale"));
});

test("catalogo include materiali sintetici", () => {
  assert.ok(GEM_CATALOG_SEED.some(({ classification }) => classification === "Sintetica"));
});

test("catalogo include imitazioni e simulanti", () => {
  assert.ok(GEM_CATALOG_SEED.some(({ category }) => category === "Imitazioni e simulanti"));
});

test("catalogo include materiali organici", () => {
  assert.ok(GEM_CATALOG_SEED.some(({ category }) => category === "Pietre organiche"));
});

test("catalogo include materiali assemblati", () => {
  assert.ok(GEM_CATALOG_SEED.some(({ category }) => category === "Materiali assemblati"));
});

test("gate blocca una scheda vuota", () => {
  assert.equal(evaluateGemPublicationReadiness({}).ready, false);
});

test("gate richiede quattro fotografie HD autorizzate", () => {
  assert.equal(evaluateGemPublicationReadiness(completeMaterial(), { ...completeCounts(), authorizedHdMedia: 3 }).ready, false);
});

test("gate richiede panoramica completa", () => {
  assert.equal(evaluateGemPublicationReadiness({ ...completeMaterial(), summary: null }, completeCounts()).ready, false);
});

test("gate richiede proprietà fisiche", () => {
  assert.equal(evaluateGemPublicationReadiness({ ...completeMaterial(), fracture: null }, completeCounts()).ready, false);
});

test("gate richiede proprietà ottiche", () => {
  assert.equal(evaluateGemPublicationReadiness({ ...completeMaterial(), optical_character: null }, completeCounts()).ready, false);
});

test("gate richiede almeno una inclusione o nota diagnostica", () => {
  assert.equal(evaluateGemPublicationReadiness(completeMaterial(), { ...completeCounts(), inclusions: 0 }).ready, false);
});

test("gate richiede trattamenti revisionati", () => {
  assert.equal(evaluateGemPublicationReadiness({ ...completeMaterial(), common_treatments: [] }, completeCounts()).ready, false);
});

test("gate richiede simulanti revisionati", () => {
  assert.equal(evaluateGemPublicationReadiness({ ...completeMaterial(), common_simulants: [] }, completeCounts()).ready, false);
});

test("gate richiede almeno tre strumenti", () => {
  assert.equal(evaluateGemPublicationReadiness(completeMaterial(), { ...completeCounts(), linkedTools: 2 }).ready, false);
});

test("gate richiede un protocollo operativo", () => {
  assert.equal(evaluateGemPublicationReadiness(completeMaterial(), { ...completeCounts(), protocols: 0 }).ready, false);
});

test("gate richiede almeno un confronto", () => {
  assert.equal(evaluateGemPublicationReadiness(completeMaterial(), { ...completeCounts(), comparisons: 0 }).ready, false);
});

test("gate richiede almeno una fonte", () => {
  assert.equal(evaluateGemPublicationReadiness(completeMaterial(), { ...completeCounts(), sources: 0 }).ready, false);
});

test("gate richiede approvazione Founder esplicita", () => {
  const material = { ...completeMaterial(), founder_review_status: "pending", review_status: "approved" };
  assert.equal(evaluateGemPublicationReadiness(material, completeCounts()).ready, false);
});

test("gate accetta una scheda completa e revisionata", () => {
  assert.equal(evaluateGemPublicationReadiness(completeMaterial(), completeCounts()).ready, true);
});

test("laboratorio ha una schermata autonoma", () => {
  const index = file("index.html");
  assert.match(index, /<section id="gemLab" class="screen">/);
  assert.match(index, /id="gemLabShell"/);
});

test("laboratorio non è una tab Academy", () => {
  assert.doesNotMatch(file("index.html"), /data-course-tab="gems"/);
});

test("menu Formazione collega il laboratorio autonomo", () => {
  const app = file("app.js");
  assert.match(app, /id: "gemological-lab"[\s\S]*section: "gemLab"/);
});

test("dettaglio espone quattordici sezioni", () => {
  const app = file("app.js");
  const tabs = app.slice(app.indexOf("const GEM_LAB_TABS"), app.indexOf("const GEM_LAB_DISCLAIMER"));
  assert.equal((tabs.match(/\[\"[a-z]+\",/g) || []).length, 14);
});

test("hero e disclaimer richiesti sono presenti", () => {
  const app = file("app.js");
  assert.match(app, /Formazione gemmologica operativa/);
  assert.match(app, /Enciclopedia OroActive per conoscere, analizzare e classificare diamanti/);
  assert.match(app, /Strumento formativo e di pre-screening/);
});

test("risultato AI usa solo compatibilità visiva preliminare", () => {
  const app = file("app.js");
  const server = file("server.js");
  assert.match(app, /Compatibilità visiva preliminare/);
  assert.match(server, /label: "Compatibilità visiva preliminare"/);
});

test("API pubblica filtra schede attive pubblicate e approvate", () => {
  const server = file("server.js");
  assert.match(server, /material\.active = TRUE[\s\S]*material\.published = TRUE[\s\S]*material\.founder_review_status = 'approved'/);
});

test("Founder può includere le bozze senza esporle agli altri ruoli", () => {
  const server = file("server.js");
  assert.match(server, /include_drafts/);
  assert.match(server, /requireFounder/);
});

test("Founder può gestire media, inclusioni e ordine foto", () => {
  const server = file("server.js");
  assert.match(server, /materials\/:id\/media", requireFounder/);
  assert.match(server, /materials\/:id\/media\/:mediaId", requireFounder/);
  assert.match(server, /materials\/:id\/inclusions", requireFounder/);
});

test("i video non valgono come fotografie HD obbligatorie", () => {
  const server = file("server.js");
  const migration = file("migrations/20260727_gemological_encyclopedia.sql");
  assert.match(server, /media_count\.type <> 'video'/);
  assert.match(migration, /media\.type <> 'video'/);
});

test("media responsive usa srcset, sizes e caricamento lazy", () => {
  const app = file("app.js");
  assert.match(app, /srcset=/);
  assert.match(app, /sizes="\(max-width: 720px\) 92vw, 640px"/);
  assert.match(app, /loading="lazy"/);
  assert.match(app, /decoding="async"/);
});

test("protocollo vieta test distruttivi", () => {
  const app = file("app.js");
  assert.match(app, /Non eseguire test distruttivi su beni del cliente/);
});

test("scheda commerciale vieta una stima automatica", () => {
  const app = file("app.js");
  assert.match(app, /Nessuna stima automatica/);
  assert.match(app, /non attribuisce prezzi, autenticità o valore/);
});

test("migrazione crea tutte le tabelle dell'enciclopedia", () => {
  const migration = file("migrations/20260727_gemological_encyclopedia.sql");
  for (const table of [
    "academy_gem_media",
    "academy_gem_material_tools",
    "academy_gem_inclusions",
    "academy_gem_comparisons",
    "academy_gem_analysis_protocols",
    "academy_gem_analysis_sessions",
    "academy_gem_sources"
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
});

test("build PWA è coerente fra frontend worker e versione", () => {
  const expected = "20260727-gemological-encyclopedia-196-2";
  assert.match(file("app.js"), new RegExp(expected));
  assert.match(file("service-worker.js"), new RegExp(expected));
  assert.equal(JSON.parse(file("version.json")).assetBuildId, expected);
});
