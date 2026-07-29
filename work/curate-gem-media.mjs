import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "assets", "academy", "gems", "library-manifest.json");
const platesPath = path.join(root, "assets", "academy", "gems", "plates");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const plateSlugs = new Set(
  (await fs.readdir(platesPath))
    .filter((name) => name.endsWith("-four-view.jpg"))
    .map((name) => name.replace(/-four-view\.jpg$/, ""))
);

for (const material of manifest.materials) {
  material.media = plateSlugs.has(material.slug)
    ? []
    : material.media
      .filter((media) => !/\.(pdf|djvu)$/i.test(media.title))
      .map((media) => ({ ...media, local_url: media.download_url }));
  material.collected = material.media.length;
  material.presentation = plateSlugs.has(material.slug)
    ? "Tavola originale OroActive a quattro viste; rappresentazione didattica non diagnostica."
    : "Fotografie Wikimedia Commons selezionate con attribuzione e licenza documentata.";
}

manifest.generated_at = new Date().toISOString();
manifest.curation_note = "Risultati omonimi o non pertinenti esclusi; le tavole generate sono dichiarate come rappresentazioni didattiche.";
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const referenced = new Set(manifest.materials.flatMap((material) => material.media.map((media) => (
  path.join(root, media.local_url.replace(/^\//, ""))
))));
const libraryRoot = path.join(root, "assets", "academy", "gems", "library");
const libraryEntries = await fs.readdir(libraryRoot, { withFileTypes: true }).catch(() => []);
for (const materialDir of libraryEntries) {
  if (!materialDir.isDirectory()) continue;
  const absoluteDir = path.join(libraryRoot, materialDir.name);
  for (const file of await fs.readdir(absoluteDir)) {
    const absoluteFile = path.join(absoluteDir, file);
    if (!referenced.has(absoluteFile)) await fs.unlink(absoluteFile);
  }
}
