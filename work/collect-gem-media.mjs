import fs from "node:fs/promises";
import path from "node:path";
import { GEM_CATALOG_SEED } from "../services/academy/gemologicalCatalog.js";

const OUTPUT_ROOT = new URL("../assets/academy/gems/library/", import.meta.url);
const MANIFEST_PATH = new URL("../assets/academy/gems/library-manifest.json", import.meta.url);
const USER_AGENT = "OroActiveGemResearch/1.0 (contact: elite@oroactive.it)";
const ACCEPTED_LICENSE = /^(CC0|Public domain|CC BY(?:-SA)?(?: \d(?:\.\d)?)?)$/i;
const EXCLUDED_TITLE = /\b(ring|necklace|pendant|earring|bracelet|brooch|jewellery|jewelry|beach|bird|hummingbird|book|logo|map|flag|portrait|church|window|building)\b/i;

const SEARCH_BY_SLUG = {
  "diamante-naturale": "natural diamond gemstone",
  "diamante-sintetico-hpht": "HPHT diamond",
  "diamante-sintetico-cvd": "CVD diamond",
  "diamante-trattato": "laser drilled diamond",
  moissanite: "moissanite gemstone",
  "zirconia-cubica": "cubic zirconia gemstone",
  "zircone-naturale": "zircon mineral",
  "vetro-pasta-vitrea": ["glass gemstone imitation", "paste gemstone", "rhinestone glass"],
  "doppiette-triplette": ["gemstone doublet", "opal doublet", "opal triplet"],
  "rubino-naturale": "ruby gemstone",
  "rubino-sintetico": "synthetic ruby",
  "zaffiro-blu-naturale": "blue sapphire gemstone",
  "zaffiri-fancy": ["yellow sapphire gemstone", "pink sapphire gemstone", "padparadscha sapphire", "green sapphire gemstone"],
  "zaffiro-sintetico": "synthetic sapphire gemstone",
  "spinello-naturale": "spinel gemstone",
  "spinello-sintetico": "synthetic spinel",
  smeraldo: "emerald gemstone",
  "smeraldo-sintetico": ["synthetic emerald", "hydrothermal emerald", "Chatham emerald"],
  acquamarina: "aquamarine gemstone",
  morganite: "morganite gemstone",
  eliodoro: "heliodor beryl",
  goshenite: "goshenite gemstone",
  ametista: "amethyst gemstone",
  citrino: "citrine gemstone",
  "quarzo-ialino": "rock crystal clear quartz",
  "quarzo-fume": "smoky quartz gemstone",
  "quarzo-rosa": "rose quartz gemstone",
  prasiolite: "prasiolite green quartz",
  calcedonio: "chalcedony gemstone",
  agata: "agate gemstone",
  onice: "onyx gemstone",
  topazio: "topaz gemstone",
  "topazio-imperiale": "imperial topaz gemstone",
  "granato-almandino": "almandine garnet gemstone",
  "granato-piropo": "pyrope garnet gemstone",
  rodolite: ["rhodolite garnet", "rhodolite"],
  tsavorite: "tsavorite garnet gemstone",
  demantoide: "demantoid garnet",
  tormalina: "tourmaline gemstone",
  rubellite: "rubellite tourmaline gemstone",
  indicolite: "indicolite tourmaline gemstone",
  "tormalina-paraiba": "Paraiba tourmaline",
  tanzanite: "tanzanite gemstone",
  peridoto: "peridot gemstone",
  alessandrite: "alexandrite gemstone",
  "crisoberillo-occhio-di-gatto": ["chrysoberyl cat eye", "catseye chrysoberyl"],
  "opale-prezioso": "precious opal gemstone",
  "opale-di-fuoco": "fire opal gemstone",
  "opale-sintetico": ["synthetic opal", "Gilson opal", "laboratory opal"],
  "pietra-di-luna": "moonstone gemstone",
  labradorite: "labradorite gemstone",
  giadeite: "jadeite jade",
  nefrite: "nephrite jade gemstone",
  turchese: "turquoise gemstone",
  lapislazzuli: "lapis lazuli gemstone",
  malachite: "malachite gemstone",
  "perla-naturale": "natural pearl",
  "perla-coltivata": "cultured pearl",
  "perla-imitazione": "imitation pearl",
  corallo: "precious coral gemstone",
  ambra: "amber gemstone"
};

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function normalizedWords(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !["natural", "synthetic", "gemstone", "laboratory", "grown"].includes(word));
}

async function commonsSearch(query) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  Object.entries({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: `file:${query}`,
    gsrnamespace: "6",
    gsrlimit: "50",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "1600"
  }).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Commons ${response.status} per ${query}`);
  const payload = await response.json();
  return Object.values(payload.query?.pages || {});
}

function candidateFromPage(page, query) {
  const image = page.imageinfo?.[0];
  const metadata = image?.extmetadata || {};
  const license = String(metadata.LicenseShortName?.value || "").replace(/<[^>]+>/g, "").trim();
  const title = String(page.title || "").replace(/^File:/, "");
  if (!image?.thumburl || !image?.url || !ACCEPTED_LICENSE.test(license)) return null;
  if (Number(image.width || 0) < 1000 || Number(image.height || 0) < 600) return null;
  if (EXCLUDED_TITLE.test(title)) return null;
  const words = normalizedWords(query);
  const normalizedTitle = normalizedWords(title).join(" ");
  const matches = words.filter((word) => normalizedTitle.includes(word)).length;
  if (!matches) return null;
  return {
    title,
    source_page: String(metadata.DescriptionUrl?.value || image.descriptionurl || ""),
    download_url: image.thumburl,
    original_url: image.url,
    width: Number(image.thumbwidth || 1600),
    height: Number(image.thumbheight || 0),
    original_width: Number(image.width || 0),
    original_height: Number(image.height || 0),
    author: String(metadata.Artist?.value || "Autore indicato su Wikimedia Commons").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    license,
    license_url: String(metadata.LicenseUrl?.value || ""),
    credit: String(metadata.Credit?.value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    score: matches * 100 + Math.min(Number(image.width || 0), 6000) / 100
  };
}

function extensionFor(response, url) {
  const type = String(response.headers.get("content-type") || "").toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  const extension = path.extname(new URL(url).pathname).toLowerCase().replace(".", "");
  return ["jpg", "jpeg", "png", "webp"].includes(extension) ? extension.replace("jpeg", "jpg") : "jpg";
}

async function downloadCandidate(candidate, directory, index) {
  const response = await fetch(candidate.download_url, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Download ${response.status}: ${candidate.download_url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const extension = extensionFor(response, candidate.download_url);
  const filename = `view-${String(index + 1).padStart(2, "0")}.${extension}`;
  await fs.writeFile(new URL(filename, directory), bytes);
  return { ...candidate, local_url: `${directory.pathname.split("/assets/")[1]}${filename}`.replace(/^/, "/assets/") };
}

async function collectMaterial(material) {
  const configured = SEARCH_BY_SLUG[material.slug] || `${material.name} gemstone`;
  const queries = Array.isArray(configured) ? configured : [configured];
  const pages = [];
  for (const query of queries) {
    pages.push(...(await commonsSearch(query)).map((page) => ({ page, query })));
    await sleep(400);
  }
  const candidates = pages
    .map(({ page, query }) => candidateFromPage(page, query))
    .filter(Boolean)
    .sort((left, right) => right.score - left.score)
    .filter((candidate, index, list) => list.findIndex((item) => item.original_url === candidate.original_url) === index)
    .slice(0, 4);
  const directory = new URL(`${material.slug}/`, OUTPUT_ROOT);
  await fs.mkdir(directory, { recursive: true });
  const media = [];
  for (const [index, candidate] of candidates.entries()) {
    media.push(await downloadCandidate(candidate, directory, index));
  }
  return {
    slug: material.slug,
    query: queries,
    expected: 4,
    collected: media.length,
    media
  };
}

await fs.mkdir(OUTPUT_ROOT, { recursive: true });
const requestedSlugs = new Set(process.argv.slice(2));
const selectedMaterials = requestedSlugs.size
  ? GEM_CATALOG_SEED.filter((material) => requestedSlugs.has(material.slug))
  : GEM_CATALOG_SEED;
let existingMaterials = [];
try {
  existingMaterials = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8")).materials || [];
} catch {
  existingMaterials = [];
}
const manifest = [];
for (const [index, material] of selectedMaterials.entries()) {
  try {
    const result = await collectMaterial(material);
    manifest.push(result);
    console.log(`${index + 1}/${selectedMaterials.length} ${material.slug}: ${result.collected}/4`);
  } catch (error) {
    manifest.push({ slug: material.slug, expected: 4, collected: 0, media: [], error: error.message });
    console.error(`${index + 1}/${selectedMaterials.length} ${material.slug}: ${error.message}`);
  }
  await sleep(850);
}
const mergedMaterials = requestedSlugs.size
  ? GEM_CATALOG_SEED.map((material) => (
      manifest.find((item) => item.slug === material.slug)
      || existingMaterials.find((item) => item.slug === material.slug)
      || { slug: material.slug, expected: 4, collected: 0, media: [] }
    ))
  : manifest;
await fs.writeFile(MANIFEST_PATH, `${JSON.stringify({
  generated_at: new Date().toISOString(),
  source: "Wikimedia Commons",
  policy: "Solo CC0, pubblico dominio, CC BY o CC BY-SA; attribuzione conservata per ogni file.",
  materials: mergedMaterials
}, null, 2)}\n`);
console.log(`Manifest: ${MANIFEST_PATH.pathname}`);
