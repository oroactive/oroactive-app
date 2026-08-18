import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";

function siblingArtifactPath(outputPath, kind) {
  const suffix = `${process.pid}-${crypto.randomUUID()}`;
  return path.join(path.dirname(outputPath), `.${path.basename(outputPath)}.${kind}-${suffix}`);
}

async function removeIfPresent(filePath) {
  if (!filePath) return;
  await fs.rm(filePath, { force: true });
}

export function verifyTrustPackPdfBuffer(contents) {
  if (!Buffer.isBuffer(contents)) {
    throw new TypeError("Contenuto Customer Trust Pack PDF non valido");
  }
  if (contents.length < 16 || contents.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("Customer Trust Pack PDF non valido: intestazione mancante");
  }
  const tail = contents.subarray(Math.max(0, contents.length - 64)).toString("ascii");
  if (!tail.includes("%%EOF")) {
    throw new Error("Customer Trust Pack PDF non valido: chiusura mancante");
  }
  return {
    bytes: contents.length,
    sha256: crypto.createHash("sha256").update(contents).digest("hex")
  };
}

export async function verifyTrustPackPdf(filePath) {
  return verifyTrustPackPdfBuffer(await fs.readFile(filePath));
}

export async function prepareAtomicTrustPackPdf({ outputPath, writePdf } = {}) {
  if (!outputPath || typeof writePdf !== "function") throw new TypeError("Destinazione PDF Trust Pack non valida");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryPath = siblingArtifactPath(outputPath, "tmp");
  const rollbackPath = siblingArtifactPath(outputPath, "rollback");
  let rollbackAvailable = false;
  let published = false;
  let finalized = false;

  try {
    await writePdf(temporaryPath);
    const verification = await verifyTrustPackPdf(temporaryPath);
    try {
      await fs.copyFile(outputPath, rollbackPath, fsConstants.COPYFILE_EXCL);
      rollbackAvailable = true;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await fs.rename(temporaryPath, outputPath);
    published = true;

    return {
      outputPath,
      temporaryPath,
      rollbackPath,
      verification,
      async commit() {
        if (finalized) return;
        await removeIfPresent(rollbackPath);
        rollbackAvailable = false;
        finalized = true;
      },
      async rollback() {
        if (finalized) return;
        if (published && rollbackAvailable) {
          await fs.rename(rollbackPath, outputPath);
          rollbackAvailable = false;
        } else if (published) {
          await removeIfPresent(outputPath);
        }
        await removeIfPresent(temporaryPath);
        finalized = true;
      },
      async cleanup() {
        await removeIfPresent(temporaryPath);
        if (finalized) await removeIfPresent(rollbackPath);
      }
    };
  } catch (error) {
    await Promise.allSettled([
      removeIfPresent(temporaryPath),
      removeIfPresent(rollbackPath)
    ]);
    throw error;
  }
}
