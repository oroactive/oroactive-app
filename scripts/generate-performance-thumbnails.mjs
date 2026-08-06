#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");
const MAX_EDGE = 448;
const WEBP_QUALITY = 84;
const MIN_REDUCTION_PERCENT = 70;
const CONCURRENCY = Math.max(1, Math.min(6, availableParallelism?.() || 4));

const TARGETS = [
  {
    id: "coins",
    label: "Monete",
    sourceDirectory: "assets/coins/bilancia-oro",
    outputDirectory: "assets/coins/thumbnails"
  },
  {
    id: "gems",
    label: "Gemme",
    sourceDirectory: "assets/academy/gems/cutouts",
    outputDirectory: "assets/academy/gems/thumbnails"
  }
];

function parseArguments(argv) {
  const options = { scope: "all", verifyOnly: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--verify-only") {
      options.verifyOnly = true;
      continue;
    }
    if (argument === "--scope") {
      options.scope = String(argv[index + 1] || "").trim().toLowerCase();
      index += 1;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      console.log("Uso: node scripts/generate-performance-thumbnails.mjs [--scope all|coins|gems] [--verify-only]");
      process.exit(0);
    }
    throw new Error(`Argomento non riconosciuto: ${argument}`);
  }

  if (!["all", "coins", "gems"].includes(options.scope)) {
    throw new Error(`Ambito non valido: ${options.scope}. Valori ammessi: all, coins, gems.`);
  }
  return options;
}

function resolveSharp() {
  const require = createRequire(import.meta.url);
  const executableDirectory = path.dirname(process.execPath);
  const candidates = [
    process.env.SHARP_MODULE_PATH,
    path.join(PROJECT_ROOT, "node_modules", "sharp"),
    path.resolve(executableDirectory, "..", "node_modules", "sharp"),
    path.resolve(executableDirectory, "..", "..", "node_modules", "sharp")
  ].filter(Boolean);

  try {
    return require("sharp");
  } catch {
    // Prova i runtime locali noti senza installare o modificare dipendenze.
  }

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Continua con il candidato successivo.
    }
  }

  throw new Error(
    "Modulo sharp non disponibile. Esegui con un runtime che includa sharp oppure imposta SHARP_MODULE_PATH."
  );
}

const sharp = resolveSharp();

function relativeProjectPath(absolutePath) {
  return path.relative(PROJECT_ROOT, absolutePath).split(path.sep).join("/");
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
  }));
  return nested.flat().sort((left, right) => left.localeCompare(right, "it"));
}

async function sha256(filePath) {
  const contents = await readFile(filePath);
  return createHash("sha256").update(contents).digest("hex");
}

function assertImageMetadata(metadata, filePath) {
  if (!Number.isInteger(metadata.width) || !Number.isInteger(metadata.height)) {
    throw new Error(`Dimensioni immagine non leggibili: ${relativeProjectPath(filePath)}`);
  }
  if (metadata.width < 1 || metadata.height < 1) {
    throw new Error(`Dimensioni immagine non valide: ${relativeProjectPath(filePath)}`);
  }
}

async function decodeImage(filePath) {
  const result = await sharp(filePath, { failOn: "error" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (!result.data.length || result.info.width < 1 || result.info.height < 1) {
    throw new Error(`Decodifica immagine fallita: ${relativeProjectPath(filePath)}`);
  }
  return result.info;
}

function outputPathFor(target, sourcePath) {
  const sourceRoot = path.join(PROJECT_ROOT, target.sourceDirectory);
  const relativeSource = path.relative(sourceRoot, sourcePath);
  return path.join(
    PROJECT_ROOT,
    target.outputDirectory,
    relativeSource.replace(/\.png$/i, ".webp")
  );
}

async function listSources(target) {
  const sourceRoot = path.join(PROJECT_ROOT, target.sourceDirectory);
  const files = (await walkFiles(sourceRoot)).filter((filePath) => /\.png$/i.test(filePath));
  if (!files.length) {
    throw new Error(`Nessun PNG trovato in ${target.sourceDirectory}.`);
  }
  return files;
}

async function mapConcurrent(items, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function buildEntry(target, sourcePath) {
  const outputPath = outputPathFor(target, sourcePath);
  const temporaryPath = `${outputPath}.tmp-${process.pid}`;
  await mkdir(path.dirname(outputPath), { recursive: true });

  const sourceMetadata = await sharp(sourcePath, { failOn: "error" }).metadata();
  assertImageMetadata(sourceMetadata, sourcePath);

  try {
    await sharp(sourcePath, { failOn: "error" })
      .rotate()
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3
      })
      .webp({
        quality: WEBP_QUALITY,
        alphaQuality: 100,
        effort: 6,
        smartSubsample: true
      })
      .toFile(temporaryPath);
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }

  const outputMetadata = await sharp(outputPath, { failOn: "error" }).metadata();
  assertImageMetadata(outputMetadata, outputPath);
  await decodeImage(outputPath);

  if (outputMetadata.width > MAX_EDGE || outputMetadata.height > MAX_EDGE) {
    throw new Error(`Thumbnail oltre ${MAX_EDGE}px: ${relativeProjectPath(outputPath)}`);
  }
  if (sourceMetadata.hasAlpha && !outputMetadata.hasAlpha) {
    throw new Error(`Trasparenza persa: ${relativeProjectPath(outputPath)}`);
  }

  const [sourceStats, outputStats, sourceHash, outputHash] = await Promise.all([
    stat(sourcePath),
    stat(outputPath),
    sha256(sourcePath),
    sha256(outputPath)
  ]);

  return {
    source: relativeProjectPath(sourcePath),
    output: relativeProjectPath(outputPath),
    sourceBytes: sourceStats.size,
    outputBytes: outputStats.size,
    sourceWidth: sourceMetadata.width,
    sourceHeight: sourceMetadata.height,
    width: outputMetadata.width,
    height: outputMetadata.height,
    hasAlpha: Boolean(outputMetadata.hasAlpha),
    sourceSha256: sourceHash,
    outputSha256: outputHash
  };
}

function summarize(target, entries) {
  const totalSourceBytes = entries.reduce((total, entry) => total + entry.sourceBytes, 0);
  const totalOutputBytes = entries.reduce((total, entry) => total + entry.outputBytes, 0);
  const reductionPercent = Number((100 * (1 - totalOutputBytes / totalSourceBytes)).toFixed(2));
  return {
    schemaVersion: 1,
    assetKind: target.id,
    settings: {
      format: "webp",
      maxWidth: MAX_EDGE,
      maxHeight: MAX_EDGE,
      quality: WEBP_QUALITY,
      alphaQuality: 100,
      fit: "inside",
      withoutEnlargement: true
    },
    sourceDirectory: target.sourceDirectory,
    outputDirectory: target.outputDirectory,
    sourceCount: entries.length,
    outputCount: entries.length,
    totalSourceBytes,
    totalOutputBytes,
    reductionPercent,
    entries
  };
}

async function writeManifest(target, manifest) {
  const manifestPath = path.join(PROJECT_ROOT, target.outputDirectory, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifestPath;
}

async function verifyTarget(target) {
  const sourceFiles = await listSources(target);
  const outputRoot = path.join(PROJECT_ROOT, target.outputDirectory);
  const manifestPath = path.join(outputRoot, "manifest.json");
  if (!(await pathExists(manifestPath))) {
    throw new Error(`Manifest assente: ${relativeProjectPath(manifestPath)}`);
  }

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const outputFiles = (await walkFiles(outputRoot)).filter((filePath) => /\.webp$/i.test(filePath));
  const expectedOutputs = sourceFiles.map((sourcePath) => outputPathFor(target, sourcePath));

  if (outputFiles.length !== sourceFiles.length || expectedOutputs.length !== manifest.entries?.length) {
    throw new Error(
      `${target.label}: conteggio non 1:1 (sorgenti ${sourceFiles.length}, WebP ${outputFiles.length}, manifest ${manifest.entries?.length || 0}).`
    );
  }

  const actualOutputSet = new Set(outputFiles.map((filePath) => path.resolve(filePath)));
  for (const expectedOutput of expectedOutputs) {
    if (!actualOutputSet.has(path.resolve(expectedOutput))) {
      throw new Error(`Thumbnail mancante: ${relativeProjectPath(expectedOutput)}`);
    }
  }

  const entriesBySource = new Map(manifest.entries.map((entry) => [entry.source, entry]));
  const verifiedEntries = await mapConcurrent(sourceFiles, async (sourcePath) => {
    const sourceRelative = relativeProjectPath(sourcePath);
    const entry = entriesBySource.get(sourceRelative);
    if (!entry) throw new Error(`Mapping assente nel manifest: ${sourceRelative}`);

    const outputPath = outputPathFor(target, sourcePath);
    if (entry.output !== relativeProjectPath(outputPath)) {
      throw new Error(`Mapping errato per ${sourceRelative}: ${entry.output}`);
    }

    const [sourceStats, outputStats, sourceHash, outputHash, outputMetadata] = await Promise.all([
      stat(sourcePath),
      stat(outputPath),
      sha256(sourcePath),
      sha256(outputPath),
      sharp(outputPath, { failOn: "error" }).metadata()
    ]);
    assertImageMetadata(outputMetadata, outputPath);
    await decodeImage(outputPath);

    if (outputMetadata.width > MAX_EDGE || outputMetadata.height > MAX_EDGE) {
      throw new Error(`Thumbnail oltre ${MAX_EDGE}px: ${relativeProjectPath(outputPath)}`);
    }
    if (sourceHash !== entry.sourceSha256 || outputHash !== entry.outputSha256) {
      throw new Error(`Thumbnail o sorgente non allineati al manifest: ${sourceRelative}`);
    }
    if (sourceStats.size !== entry.sourceBytes || outputStats.size !== entry.outputBytes) {
      throw new Error(`Dimensione file non allineata al manifest: ${sourceRelative}`);
    }
    return entry;
  });

  const summary = summarize(target, verifiedEntries);
  if (summary.reductionPercent < MIN_REDUCTION_PERCENT) {
    throw new Error(
      `${target.label}: riduzione ${summary.reductionPercent}% inferiore al minimo ${MIN_REDUCTION_PERCENT}%.`
    );
  }
  if (
    manifest.sourceCount !== summary.sourceCount
    || manifest.outputCount !== summary.outputCount
    || manifest.totalSourceBytes !== summary.totalSourceBytes
    || manifest.totalOutputBytes !== summary.totalOutputBytes
    || manifest.reductionPercent !== summary.reductionPercent
  ) {
    throw new Error(`${target.label}: riepilogo manifest non coerente con i file.`);
  }
  return summary;
}

function printSummary(summary, label) {
  const sourceMiB = (summary.totalSourceBytes / 1024 / 1024).toFixed(2);
  const outputMiB = (summary.totalOutputBytes / 1024 / 1024).toFixed(2);
  console.log(
    `${label}: ${summary.outputCount}/${summary.sourceCount} WebP validi, `
    + `${sourceMiB} MiB -> ${outputMiB} MiB (${summary.reductionPercent}% in meno).`
  );
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const targets = TARGETS.filter((target) => options.scope === "all" || target.id === options.scope);

  if (!options.verifyOnly) {
    for (const target of targets) {
      const sources = await listSources(target);
      console.log(`${target.label}: genero ${sources.length} miniature WebP...`);
      const entries = await mapConcurrent(sources, (sourcePath) => buildEntry(target, sourcePath));
      await writeManifest(target, summarize(target, entries));
    }
  }

  for (const target of targets) {
    const summary = await verifyTarget(target);
    printSummary(summary, target.label);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
