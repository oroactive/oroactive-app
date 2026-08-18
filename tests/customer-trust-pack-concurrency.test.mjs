import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readFile } from "node:fs/promises";
import {
  prepareAtomicTrustPackPdf,
  verifyTrustPackPdf,
  verifyTrustPackPdfBuffer
} from "../services/customerTrustPack/atomicPdf.js";

const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

function sourceBlock(startMarker, endMarker) {
  const start = server.indexOf(startMarker);
  const end = server.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `Blocco mancante: ${startMarker}`);
  assert.notEqual(end, -1, `Fine blocco mancante: ${endMarker}`);
  return server.slice(start, end);
}

async function temporaryDirectory() {
  return fs.mkdtemp(path.join(os.tmpdir(), "oroactive-trust-pack-test-"));
}

function fakePdf(label) {
  return Buffer.from(`%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Label (${label}) >>\nendobj\ntrailer\n<<>>\n%%EOF\n`);
}

test("pubblicazioni PDF simultanee lasciano un solo PDF integro e nessun file temporaneo", async () => {
  const directory = await temporaryDirectory();
  const outputPath = path.join(directory, "trust-pack.pdf");
  try {
    await Promise.all(Array.from({ length: 16 }, async (_value, index) => {
      const publication = await prepareAtomicTrustPackPdf({
        outputPath,
        async writePdf(temporaryPath) {
          const complete = fakePdf(`request-${index}`);
          const split = Math.max(8, Math.floor(complete.length / 2));
          await fs.writeFile(temporaryPath, complete.subarray(0, split));
          await new Promise((resolve) => setTimeout(resolve, index % 4));
          await fs.appendFile(temporaryPath, complete.subarray(split));
        }
      });
      await publication.commit();
      await publication.cleanup();
    }));

    const verification = await verifyTrustPackPdf(outputPath);
    assert.ok(verification.bytes > 16);
    assert.match(verification.sha256, /^[a-f0-9]{64}$/);
    const finalPdf = await fs.readFile(outputPath, "utf8");
    assert.match(finalPdf, /^%PDF-/);
    assert.match(finalPdf, /%%EOF\s*$/);
    assert.equal((finalPdf.match(/\/Label \(request-/g) || []).length, 1);
    const leftovers = (await fs.readdir(directory)).filter((name) => name !== "trust-pack.pdf");
    assert.deepEqual(leftovers, []);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("rollback e PDF incompleto preservano la versione precedente e puliscono i temporanei", async () => {
  const directory = await temporaryDirectory();
  const outputPath = path.join(directory, "trust-pack.pdf");
  const original = fakePdf("original");
  try {
    await fs.writeFile(outputPath, original);
    const publication = await prepareAtomicTrustPackPdf({
      outputPath,
      writePdf: (temporaryPath) => fs.writeFile(temporaryPath, fakePdf("replacement"))
    });
    await publication.rollback();
    await publication.cleanup();
    assert.deepEqual(await fs.readFile(outputPath), original);

    await assert.rejects(
      prepareAtomicTrustPackPdf({
        outputPath,
        writePdf: (temporaryPath) => fs.writeFile(temporaryPath, "%PDF-1.7\nfile troncato")
      }),
      /chiusura mancante/
    );
    assert.deepEqual(await fs.readFile(outputPath), original);
    const leftovers = (await fs.readdir(directory)).filter((name) => name !== "trust-pack.pdf");
    assert.deepEqual(leftovers, []);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("la verifica in memoria valida il PDF esatto che verrà restituito", () => {
  const pdf = fakePdf("download-atomico");
  const verification = verifyTrustPackPdfBuffer(pdf);
  assert.equal(verification.bytes, pdf.length);
  assert.match(verification.sha256, /^[a-f0-9]{64}$/);
  assert.throws(() => verifyTrustPackPdfBuffer(Buffer.from("%PDF-1.7\ntroncato")), /chiusura mancante/);
});

test("generateCustomerTrustPack serializza per atto e ricalcola sede, stato e versione sotto lock", () => {
  const block = sourceBlock(
    "async function generateCustomerTrustPack",
    'app.post("/api/customer-trust-pack/generate"'
  );
  assert.match(block, /withDatabaseTransaction\(async \(db\) =>/);
  assert.match(block, /pg_advisory_xact_lock\(hashtext\(\$1::text\)\)/);
  assert.match(block, /customer-trust-pack:\$\{initialRow\.id\}/);
  assert.match(block, /FROM \$\{actsTable\}[\s\S]*WHERE id = \$1::bigint[\s\S]*FOR UPDATE/);
  assert.match(block, /FROM utenti[\s\S]*FOR UPDATE[\s\S]*const freshUser = \{ \.\.\.user, \.\.\.actor \}/);
  assert.match(block, /assertCustomerTrustPackRowEligible\(row, freshUser\)/);
  assert.match(block, /String\(row\.row_version \|\| ""\) !== expectedVersion[\s\S]*customerTrustPackVersionConflictError/);
  assert.match(block, /TRUST_PACK_ACT_VERSION_CONFLICT|customerTrustPackVersionConflictError/);
  assert.doesNotMatch(block, /const row = await assertCustomerTrustPackEligible/);
});

test("upsert e file Trust Pack sono idempotenti, verificati e compensati insieme", () => {
  const block = sourceBlock(
    "async function generateCustomerTrustPack",
    'app.post("/api/customer-trust-pack/generate"'
  );
  assert.match(block, /WHERE sale_deed_id = \$1::bigint[\s\S]*LIMIT 1[\s\S]*FOR UPDATE/);
  assert.match(block, /existingVersion === String\(row\.row_version\)[\s\S]*verifyTrustPackPdf/);
  assert.match(block, /prepareAtomicTrustPackPdf\([\s\S]*writeCustomerTrustPackPdf/);
  assert.match(block, /pdf_sha256: publication\.verification\.sha256/);
  assert.match(block, /pdf_bytes: publication\.verification\.bytes/);
  assert.match(block, /ON CONFLICT \(trust_pack_code\)[\s\S]*customer_trust_packs\.sale_deed_id = EXCLUDED\.sale_deed_id/);
  assert.match(block, /databaseCommitted = true[\s\S]*publication\.commit/);
  assert.match(block, /!databaseCommitted && publication[\s\S]*publication\.rollback/);
  assert.match(block, /finally[\s\S]*publication\.cleanup/);
  assert.doesNotMatch(block, /buildPdfForActs/);
});

test("list e detail calcolano lo staleness sulla versione xmin corrente dell'atto", () => {
  const publicBlock = sourceBlock("function publicCustomerTrustPack", "async function customerTrustPackStoreForAct");
  assert.match(publicBlock, /customerTrustPackIsStale\(row\)/);
  assert.match(publicBlock, /stale,/);
  assert.match(publicBlock, /row\.id && !stale/);

  const detailQuery = sourceBlock("async function customerTrustPackRowById", "async function listCustomerTrustPacksForSaleDeed");
  const actListQuery = sourceBlock("async function listCustomerTrustPacksForSaleDeed", "async function listCustomerTrustPacksForClient");
  const clientListQuery = sourceBlock("async function listCustomerTrustPacksForClient", "async function withFreshCustomerTrustPack");
  for (const block of [detailQuery, actListQuery, clientListQuery]) {
    assert.match(block, /a\.xmin::text AS act_row_version_current/);
  }

  const versionBlock = sourceBlock("function customerTrustPackIsStale", "function customerTrustPackStaleError");
  assert.match(versionBlock, /metadata\?\.act_row_version/);
  assert.match(versionBlock, /generatedVersion !== currentVersion/);
});

test("download, email e WhatsApp ricontrollano atto, sede e versione sotto gli stessi lock", () => {
  const guard = sourceBlock("async function withFreshCustomerTrustPack", "function drawTrustPackText");
  assert.match(guard, /withDatabaseTransaction\(async \(db\) =>/);
  assert.match(guard, /pg_advisory_xact_lock/);
  assert.match(guard, /FROM \$\{actsTable\}[\s\S]*FOR UPDATE/);
  assert.match(guard, /FROM utenti[\s\S]*FOR UPDATE/);
  assert.match(guard, /canAccessAct\(act, freshUser\)/);
  assert.match(guard, /a\.xmin::text AS act_row_version_current/);
  assert.match(guard, /FOR UPDATE OF ctp/);
  assert.match(guard, /assertCustomerTrustPackFresh\(row\)/);

  const routes = sourceBlock(
    'app.get("/api/customer-trust-pack/:id/download"',
    'app.get("/api/customer-trust-pack/:id"'
  );
  assert.equal((routes.match(/withFreshCustomerTrustPack\(/g) || []).length, 3);
  assert.match(routes, /verifyTrustPackPdfBuffer\(contents\)/);
  assert.match(routes, /response\.send\(contents\)/);
  assert.doesNotMatch(routes, /createReadStream\(row\.pdf_path\)/);
  assert.match(server, /error\.code = "TRUST_PACK_STALE"/);
  assert.match(server, /publicErrorCodes = new Set\(\[[\s\S]*"TRUST_PACK_STALE"/);
  assert.match(server, /if \(safeCode\) payload\.code = safeCode/);
  assert.doesNotMatch(server, /payload\.code = error\.code/);
});

test("l'interfaccia stale espone soltanto Rigenera", () => {
  const buttonsStart = app.indexOf("function customerTrustPackButtonsMarkup");
  const buttonsEnd = app.indexOf("async function fetchCustomerTrustPackForAct", buttonsStart);
  assert.notEqual(buttonsStart, -1);
  assert.notEqual(buttonsEnd, -1);
  const block = app.slice(buttonsStart, buttonsEnd);
  const staleStart = block.indexOf("if (trustPack.stale)");
  const staleEnd = block.indexOf("\n    }\n    return `", staleStart);
  const staleBranch = block.slice(staleStart, staleEnd);
  assert.match(staleBranch, /data-generate-trust-pack/);
  assert.match(staleBranch, /data-regenerate-trust-pack="true"/);
  assert.doesNotMatch(staleBranch, /data-download-trust-pack|data-email-trust-pack|data-whatsapp-trust-pack/);

  const crmStart = app.indexOf('<div class="crm-trust-pack-list">');
  const crmEnd = app.indexOf("<h4>Aurum Shield", crmStart);
  const crmBlock = app.slice(crmStart, crmEnd);
  assert.match(crmBlock, /pack\.stale[\s\S]*data-generate-trust-pack/);
  assert.match(crmBlock, /: `<button type="button" data-download-trust-pack/);
});
