import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

test("tutte le schede complete sono pubblicate", () => {
  assert.ok(GEM_CATALOG_SEED.every(({ published }) => published === true));
});

test("tutte le schede sono scientificamente revisionate", () => {
  assert.ok(GEM_CATALOG_SEED.every(({ review_status }) => review_status === "approved"));
});

test("tutte le schede hanno media approvati", () => {
  assert.ok(GEM_CATALOG_SEED.every(({ media_status }) => media_status === "approved"));
});

test("tutte le schede hanno revisione editoriale esplicita", () => {
  assert.ok(GEM_CATALOG_SEED.every(({ founder_review_status }) => founder_review_status === "approved"));
});

test("la galleria seed resta separata dai media con licenza in database", () => {
  assert.ok(GEM_CATALOG_SEED.every(({ gallery }) => Array.isArray(gallery) && gallery.length === 0));
});

test("ogni scheda contiene proprietà fisiche e ottiche", () => {
  assert.ok(GEM_CATALOG_SEED.every(({ chemical_formula, mohs_min, density_min, refractive_index_min, optical_character }) => (
    chemical_formula && mohs_min !== null && density_min !== null && refractive_index_min !== null && optical_character
  )));
});

test("ogni scheda cita almeno tre fonti autorevoli", () => {
  assert.ok(GEM_CATALOG_SEED.every(({ sources }) => Array.isArray(sources) && sources.length >= 3));
});

test("ogni scheda contiene protocollo, inclusioni, confronti e almeno tre strumenti", () => {
  assert.ok(GEM_CATALOG_SEED.every((material) => (
    material.operator_protocol?.steps?.length >= 5
    && material.inclusions?.typical?.length >= 1
    && material.comparison_table?.rows?.length >= 1
    && material.recommended_tools?.length >= 3
  )));
});

test("ogni materiale dispone di almeno quattro viste HD autorizzate", () => {
  const manifest = JSON.parse(file("assets/academy/gems/library-manifest.json"));
  const mediaBySlug = new Map(manifest.materials.map((material) => [material.slug, material.media]));
  for (const material of GEM_CATALOG_SEED) {
    const plate = new URL(`../assets/academy/gems/plates/${material.slug}-four-view.jpg`, import.meta.url);
    const media = mediaBySlug.get(material.slug) || [];
    assert.ok(existsSync(plate) || media.length >= 4, `${material.slug}: meno di quattro viste`);
    for (const item of media) {
      assert.ok(item.license && item.source_page && item.local_url, `${material.slug}: attribuzione media incompleta`);
      assert.ok(
        /^https:\/\/upload\.wikimedia\.org\//.test(item.local_url)
          || existsSync(new URL(`..${item.local_url}`, import.meta.url)),
        `${material.slug}: file media assente`
      );
      assert.ok(Math.max(Number(item.width), Number(item.height)) >= 1000, `${material.slug}: media non HD`);
    }
  }
});

test("la galleria non contiene omonimi geografici, animali o oggetti estranei", () => {
  const manifest = JSON.parse(file("assets/academy/gems/library-manifest.json"));
  const forbidden = /\b(bay|beach|sea|falls|waterfall|tower|ship|panoramio|chameleon|damselfly|bird|butterfly|crescent|xolmis|pyrope pyrope|duicon|tights|temple|display base|collision|mist|tobacco box|mantel clock|workshop|epergne|base jumping)\b/i;
  for (const material of manifest.materials) {
    for (const media of material.media) {
      assert.doesNotMatch(media.title, forbidden, `${material.slug}: media estraneo ${media.title}`);
    }
  }
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

test("le card aprono la scheda completa e non il visualizzatore immagini", () => {
  const app = file("app.js");
  assert.match(app, /class="gem-lab-card"[\s\S]*data-gem-open=/);
  assert.match(app, /state\.gemLabView = "detail"[\s\S]*state\.gemLabDetailTab = "overview"[\s\S]*state\.gemLabZoomMedia = null/);
  assert.doesNotMatch(app, /class="gem-lab-card"[^>]*data-gem-zoom=/);
  const detail = app.slice(app.indexOf("function renderGemLabDetail"), app.indexOf("function renderGemLabZoom"));
  assert.doesNotMatch(detail, /data-gem-zoom=/);
});

test("il visualizzatore immagini si chiude da tasto, sfondo ed Escape", () => {
  const app = file("app.js");
  assert.match(app, /data-gem-zoom-close/);
  assert.match(app, /data-gem-zoom-backdrop/);
  assert.match(app, /event\.key !== "Escape"/);
  assert.match(app, /function closeGemLabZoom\(\)/);
  assert.match(app, /document\.addEventListener\("click"[\s\S]*true\);/);
});

test("layout iPad protegge pulsanti, scheda e chiusura immagine", () => {
  const styles = file("styles.css");
  assert.match(styles, /@media \(min-width: 821px\) and \(max-width: 1100px\)/);
  assert.match(styles, /\.gem-lab-detail-hero > \.ghost-button[\s\S]*grid-column: 1 \/ -1/);
  assert.match(styles, /\.gem-lab-zoom-close[\s\S]*min-width: 48px[\s\S]*touch-action: manipulation/);
  assert.match(styles, /calc\(env\(safe-area-inset-top\) \+ 8px\)/);
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
  const expected = "20260729-gem-viewer-fix-2";
  assert.match(file("app.js"), new RegExp(expected));
  assert.match(file("service-worker.js"), new RegExp(expected));
  assert.equal(JSON.parse(file("version.json")).assetBuildId, expected);
});
