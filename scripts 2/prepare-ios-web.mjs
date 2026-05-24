import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..");
const outDir = path.join(root, "ios-web");

const files = [
  "index.html",
  "styles.css",
  "app.js",
  "capacitor-native.js",
  "manifest.json",
  "manifest.webmanifest",
  "service-worker.js",
  "oroactive-logo.png"
];

const directories = ["icons"];

async function copyFileIfExists(file) {
  const source = path.join(root, file);
  const target = path.join(outDir, file);
  try {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function copyDirectory(sourceDir, targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);
    if (entry.isDirectory()) await copyDirectory(source, target);
    else await fs.copyFile(source, target);
  }
}

await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

for (const file of files) await copyFileIfExists(file);
for (const dir of directories) await copyDirectory(path.join(root, dir), path.join(outDir, dir));

const indexPath = path.join(outDir, "index.html");
let index = await fs.readFile(indexPath, "utf8");
index = index
  .replace("</head>", index.includes("capacitor-native.js") ? "</head>" : '  <script src="capacitor-native.js?v=20260524-ios-1"></script>\n</head>')
  .replace(/styles\.css\?v=[^"]+/g, "styles.css?v=20260524-ios-1")
  .replace(/app\.js\?v=[^"]+/g, "app.js?v=20260524-ios-1");
await fs.writeFile(indexPath, index);

console.log(`OroActive iOS web build pronta in ${outDir}`);
