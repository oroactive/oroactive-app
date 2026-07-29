const GEM_GROUPS = [
  {
    category: "Diamanti",
    items: [
      ["diamante-naturale", "Diamante naturale", "Diamante", "Naturale", ["brillante"]],
      ["diamante-sintetico-hpht", "Diamante sintetico HPHT", "Diamante prodotto in laboratorio", "Sintetica", ["diamante HPHT"]],
      ["diamante-sintetico-cvd", "Diamante sintetico CVD", "Diamante prodotto in laboratorio", "Sintetica", ["diamante CVD"]],
      ["diamante-trattato", "Diamante trattato", "Diamante", "Trattata", []],
      ["moissanite", "Moissanite", "Carburo di silicio", "Simulante", []],
      ["zirconia-cubica", "Zirconia cubica - CZ", "Ossido di zirconio sintetico", "Imitazione", ["CZ"]],
      ["zircone-naturale", "Zircone naturale", "Zircone", "Naturale", []],
      ["vetro-pasta-vitrea", "Vetro/pasta vitrea", "Vetro artificiale", "Imitazione", ["pasta vitrea"]],
      ["doppiette-triplette", "Doppiette e triplette", "Materiale assemblato", "Assemblata", ["doppietta", "tripletta"]]
    ]
  },
  {
    category: "Corindoni",
    items: [
      ["rubino-naturale", "Rubino naturale", "Corindone", "Naturale", ["rubino"]],
      ["rubino-sintetico", "Rubino sintetico", "Corindone prodotto in laboratorio", "Sintetica", []],
      ["zaffiro-blu-naturale", "Zaffiro blu naturale", "Corindone", "Naturale", ["zaffiro blu"]],
      ["zaffiri-fancy", "Zaffiri fancy", "Corindone", "Naturale", ["zaffiro fancy"]],
      ["zaffiro-sintetico", "Zaffiro sintetico", "Corindone prodotto in laboratorio", "Sintetica", []],
      ["spinello-naturale", "Spinello naturale", "Spinello", "Naturale", []],
      ["spinello-sintetico", "Spinello sintetico", "Spinello prodotto in laboratorio", "Sintetica", []]
    ]
  },
  {
    category: "Berilli",
    items: [
      ["smeraldo", "Smeraldo", "Berillo", "Naturale", []],
      ["smeraldo-sintetico", "Smeraldo sintetico", "Berillo prodotto in laboratorio", "Sintetica", []],
      ["acquamarina", "Acquamarina", "Berillo", "Naturale", []],
      ["morganite", "Morganite", "Berillo", "Naturale", []],
      ["eliodoro", "Eliodoro", "Berillo", "Naturale", []],
      ["goshenite", "Goshenite", "Berillo", "Naturale", []]
    ]
  },
  {
    category: "Quarzi",
    items: [
      ["ametista", "Ametista", "Quarzo", "Naturale", []],
      ["citrino", "Citrino", "Quarzo", "Naturale", []],
      ["quarzo-ialino", "Quarzo ialino", "Quarzo", "Naturale", ["cristallo di rocca"]],
      ["quarzo-fume", "Quarzo fumé", "Quarzo", "Naturale", ["quarzo fumè"]],
      ["quarzo-rosa", "Quarzo rosa", "Quarzo", "Naturale", []],
      ["prasiolite", "Prasiolite", "Quarzo", "Naturale", []],
      ["calcedonio", "Calcedonio", "Quarzo microcristallino", "Naturale", []],
      ["agata", "Agata", "Calcedonio", "Naturale", []],
      ["onice", "Onice", "Calcedonio", "Naturale", []]
    ]
  },
  {
    category: "Altre pietre",
    items: [
      ["topazio", "Topazio", "Topazio", "Naturale", []],
      ["topazio-imperiale", "Topazio imperiale", "Topazio", "Naturale", []],
      ["granato-almandino", "Granato almandino", "Granato", "Naturale", []],
      ["granato-piropo", "Granato piropo", "Granato", "Naturale", []],
      ["rodolite", "Rodolite", "Granato", "Naturale", []],
      ["tsavorite", "Tsavorite", "Granato grossularia", "Naturale", []],
      ["demantoide", "Demantoide", "Granato andradite", "Naturale", []],
      ["tormalina", "Tormalina", "Tormalina", "Naturale", []],
      ["rubellite", "Rubellite", "Tormalina", "Naturale", []],
      ["indicolite", "Indicolite", "Tormalina", "Naturale", []],
      ["tormalina-paraiba", "Tormalina Paraíba", "Tormalina", "Naturale", ["Paraíba"]],
      ["tanzanite", "Tanzanite", "Zoisite", "Naturale", []],
      ["peridoto", "Peridoto", "Olivina", "Naturale", []],
      ["alessandrite", "Alessandrite", "Crisoberillo", "Naturale", []],
      ["crisoberillo-occhio-di-gatto", "Crisoberillo occhio di gatto", "Crisoberillo", "Naturale", []],
      ["opale-prezioso", "Opale prezioso", "Opale", "Naturale", []],
      ["opale-di-fuoco", "Opale di fuoco", "Opale", "Naturale", []],
      ["opale-sintetico", "Opale sintetico", "Opale prodotto in laboratorio", "Sintetica", []],
      ["pietra-di-luna", "Pietra di luna", "Feldspato", "Naturale", []],
      ["labradorite", "Labradorite", "Feldspato", "Naturale", []],
      ["giadeite", "Giadeite", "Pirosseno", "Naturale", ["giada giadeite"]],
      ["nefrite", "Nefrite", "Anfibolo", "Naturale", ["giada nefrite"]],
      ["turchese", "Turchese", "Turchese", "Naturale", []],
      ["lapislazzuli", "Lapislazzuli", "Roccia ornamentale", "Naturale", ["lapis lazuli"]],
      ["malachite", "Malachite", "Carbonato di rame", "Naturale", []]
    ]
  },
  {
    category: "Pietre organiche",
    items: [
      ["perla-naturale", "Perla naturale", "Materiale organico", "Organica", []],
      ["perla-coltivata", "Perla coltivata", "Materiale organico", "Coltivata", []],
      ["perla-imitazione", "Perla di imitazione", "Materiale artificiale", "Imitazione", []],
      ["corallo", "Corallo", "Materiale organico", "Organica", []],
      ["ambra", "Ambra", "Resina fossile", "Organica", []]
    ]
  }
];

const CATEGORY_BY_SLUG = new Map([
  ...["granato-almandino", "granato-piropo", "rodolite", "tsavorite", "demantoide"].map((slug) => [slug, "Granati"]),
  ...["tormalina", "rubellite", "indicolite", "tormalina-paraiba"].map((slug) => [slug, "Tormaline"]),
  ...["opale-prezioso", "opale-di-fuoco", "opale-sintetico"].map((slug) => [slug, "Opali"]),
  ...["pietra-di-luna", "labradorite"].map((slug) => [slug, "Feldspati"]),
  ...["giadeite", "nefrite", "turchese", "lapislazzuli", "malachite"].map((slug) => [slug, "Pietre ornamentali"]),
  ["diamante-sintetico-hpht", "Sintetiche"],
  ["diamante-sintetico-cvd", "Sintetiche"],
  ["rubino-sintetico", "Sintetiche"],
  ["zaffiro-sintetico", "Sintetiche"],
  ["spinello-sintetico", "Sintetiche"],
  ["smeraldo-sintetico", "Sintetiche"],
  ["moissanite", "Imitazioni e simulanti"],
  ["zirconia-cubica", "Imitazioni e simulanti"],
  ["vetro-pasta-vitrea", "Imitazioni e simulanti"],
  ["perla-imitazione", "Imitazioni e simulanti"],
  ["doppiette-triplette", "Materiali assemblati"]
]);

const GEM_CATALOG_DRAFT = GEM_GROUPS.flatMap(({ category, items }) => items.map(([
  slug,
  name,
  mineralName,
  classification,
  aliases
]) => ({
  slug,
  name,
  commercial_name: name,
  mineral_name: mineralName,
  mineralogical_name: mineralName,
  aliases,
  family: null,
  group_name: mineralName,
  gem_group: mineralName,
  chemical_formula: null,
  crystal_system: null,
  category: CATEGORY_BY_SLUG.get(slug) || category,
  classification,
  summary: null,
  description: null,
  theory: null,
  history: null,
  origins: [],
  origin: null,
  typical_uses: [],
  typical_colors: [],
  transparency: null,
  luster: null,
  mohs_min: null,
  mohs_max: null,
  mohs_hardness: null,
  density_min: null,
  density_max: null,
  density: null,
  refractive_index_min: null,
  refractive_index_max: null,
  refractive_index: null,
  optical_character: null,
  birefringence: null,
  dispersion: null,
  pleochroism: null,
  fluorescence_long_wave: null,
  fluorescence_short_wave: null,
  phosphorescence: null,
  spectral_features: null,
  tenacity: null,
  cleavage: null,
  fracture: null,
  cleaning_precautions: null,
  common_treatments: [],
  common_simulants: [],
  value_factors: [],
  commercial_value_level: null,
  identification_difficulty: 3,
  difficulty_level: "Avanzata",
  review_status: "draft",
  media_status: "needs_media",
  active: true,
  published: false,
  founder_review_status: "pending",
  gallery: [],
  recommended_tools: [],
  operator_protocol: {},
  inclusions: {},
  comparison_table: {},
  sources: []
})));

export const GEM_CATALOG_SEED = GEM_CATALOG_DRAFT.map(completeGemologicalMaterial);

export const GEM_TOOL_SEED = [
  ["Lente 10x", "Primo esame di superficie e inclusioni."],
  ["Microscopio gemmologico", "Osservazione in campo chiaro, scuro e luce obliqua."],
  ["Microscopio digitale", "Documentazione macro e confronto visuale."],
  ["Bilancia di precisione", "Misurazione non distruttiva del peso."],
  ["Calibro gemmologico", "Misurazione di diametri e profondità accessibili."],
  ["Rifrattometro", "Misurazione dell'indice di rifrazione quando applicabile."],
  ["Liquido di contatto", "Accoppiamento ottico controllato per rifrattometro."],
  ["Polariscopio", "Osservazione del comportamento ottico."],
  ["Conoscopio", "Osservazione della figura d'interferenza quando possibile."],
  ["Dicroscopio", "Confronto dei colori pleocroici."],
  ["Spettroscopio", "Osservazione qualitativa dello spettro di assorbimento."],
  ["Lampada UV lunga onda", "Osservazione di fluorescenza a lunga onda."],
  ["Lampada UV corta onda", "Osservazione controllata di fluorescenza a corta onda."],
  ["Tester termico per diamanti", "Pre-screening della conducibilità termica."],
  ["Tester elettrico/moissanite", "Controllo complementare per moissanite e diamante."],
  ["Bilancia idrostatica", "Stima del peso specifico su campioni idonei."],
  ["Filtro Chelsea", "Osservazione complementare su materiali selezionati."],
  ["Luce daylight", "Valutazione cromatica con illuminazione neutra."],
  ["Fotocamera macro", "Documentazione autorizzata delle osservazioni."],
  ["Magneti gemmologici", "Test complementare solo nei protocolli che lo prevedono."],
  ["Strumenti avanzati di laboratorio", "Referral per analisi spettroscopiche e imaging avanzato."]
].map(([name, description]) => ({
  name,
  description,
  usage: "Usare esclusivamente secondo il protocollo del materiale e le istruzioni del produttore.",
  limitations: "Il risultato non costituisce da solo identificazione definitiva, certificazione o stima economica."
}));

export const GEM_PUBLICATION_REQUIREMENTS = Object.freeze({
  authorizedHdMedia: 4,
  linkedTools: 3,
  sources: 1,
  inclusions: 1,
  protocols: 1,
  comparisons: 1
});

function nonEmpty(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function evaluateGemPublicationReadiness(material = {}, counts = {}) {
  const overview = [
    material.name || material.commercial_name,
    material.mineral_name || material.mineralogical_name,
    material.category,
    material.classification,
    material.summary || material.theory,
    material.description || material.theory
  ].every(nonEmpty);
  const physical = [
    material.mohs_min ?? material.mohs_hardness,
    material.density_min ?? material.density,
    material.tenacity,
    material.cleavage,
    material.fracture,
    material.cleaning_precautions
  ].every(nonEmpty);
  const optical = [
    material.refractive_index_min ?? material.refractive_index,
    material.optical_character ?? material.double_refraction,
    material.birefringence,
    material.pleochroism,
    material.fluorescence_long_wave ?? material.fluorescence
  ].every(nonEmpty);
  const checklist = {
    overview,
    physical,
    optical,
    authorizedHdMedia: Number(counts.authorizedHdMedia ?? material.authorized_hd_media_count ?? 0) >= GEM_PUBLICATION_REQUIREMENTS.authorizedHdMedia,
    inclusions: Number(counts.inclusions ?? material.inclusion_count ?? 0) >= GEM_PUBLICATION_REQUIREMENTS.inclusions,
    treatments: nonEmpty(material.common_treatments),
    simulants: nonEmpty(material.common_simulants),
    linkedTools: Number(counts.linkedTools ?? material.linked_tool_count ?? material.recommended_tools?.length ?? 0) >= GEM_PUBLICATION_REQUIREMENTS.linkedTools,
    protocols: Number(counts.protocols ?? material.protocol_count ?? (material.operator_protocol?.steps?.length ? 1 : 0)) >= GEM_PUBLICATION_REQUIREMENTS.protocols,
    comparisons: Number(counts.comparisons ?? material.comparison_count ?? material.comparison_table?.rows?.length ?? 0) >= GEM_PUBLICATION_REQUIREMENTS.comparisons,
    sources: Number(counts.sources ?? material.source_count ?? material.sources?.length ?? 0) >= GEM_PUBLICATION_REQUIREMENTS.sources,
    founderReview: material.founder_review_status === "approved"
  };
  return {
    ready: Object.values(checklist).every(Boolean),
    checklist,
    missing: Object.entries(checklist).filter(([, valid]) => !valid).map(([key]) => key)
  };
}

export const GEM_CATALOG_SEED_VALIDATION = Object.freeze({
  count: GEM_CATALOG_SEED.length,
  uniqueSlugs: new Set(GEM_CATALOG_SEED.map(({ slug }) => slug)).size,
  expectedCount: 61
});
import { completeGemologicalMaterial } from "./gemologicalKnowledge.js";
