import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(projectRoot, "app.js");
const outputPath = path.join(projectRoot, "assets/aurum-knowledge/coins/gold-coin-catalog.json");

export function extractGoldCoinCatalog(appSource = "") {
  const start = appSource.indexOf("const BILANCIA_DORO_COIN_IMAGE_BASE");
  const end = appSource.indexOf("const COIN_RECOGNITION_HINTS", start);
  if (start < 0 || end <= start) throw new Error("Catalogo Elenco Monete non trovato in app.js.");
  const context = {};
  vm.runInNewContext(`${appSource.slice(start, end)}\nglobalThis.catalog = GOLD_COIN_CATALOG;`, context, {
    timeout: 2_000
  });
  if (!Array.isArray(context.catalog)) throw new Error("Catalogo Elenco Monete non valido.");
  return context.catalog.map(({ bookImages: _bookImages, visual: _visual, ...coin }) => coin);
}

export async function syncAurumGoldCoinCatalog() {
  const appSource = await readFile(appPath, "utf8");
  const coins = extractGoldCoinCatalog(appSource);
  const payload = {
    catalogVersion: "2026.08.02",
    verifiedAt: "2 agosto 2026",
    sourceOfTruth: "Elenco Monete OroActive",
    coins
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { outputPath, count: coins.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await syncAurumGoldCoinCatalog();
  console.log(`Sincronizzate ${result.count} monete in ${path.relative(projectRoot, result.outputPath)}.`);
}
