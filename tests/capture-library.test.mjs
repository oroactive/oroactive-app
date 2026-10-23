import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
function sourceFunction(name) {
  const start = app.search(new RegExp(`^(?:async )?function ${name}\\(`, "m"));
  assert.ok(start >= 0, `Missing function ${name}`);
  const tail = app.slice(start);
  const next = tail.slice(1).search(/^(?:async )?function \w+\(/m);
  return next < 0 ? tail : tail.slice(0, next + 1);
}
function harness(convert = async () => "data:image/jpeg;base64,bmV3") {
  const key = "documento-fronte-carta-identita";
  const old = { name: "fronte-esistente.jpg", dataUrl: "data:image/jpeg;base64,b2xk", url: "blob:old" };
  const sibling = { name: "retro-esistente.jpg", dataUrl: "data:image/jpeg;base64,cmV0cm8=" };
  const card = { dataset: { captureKey: key }, classList: { add() {} }, querySelector: () => ({ textContent: "" }) };
  const input = { matches: () => true, closest: () => card, files: [{ name: "foto-salvata.jpg", type: "image/jpeg" }], value: "foto-salvata.jpg" };
  const effects = { dirty: 0, revoked: [], updates: 0, toasts: [] };
  const state = { captureFiles: new Map([[key, old], ["codice-fiscale-retro", sibling]]), uploadedCaptures: new Set([key, "codice-fiscale-retro"]), attachments: 2, sessionGeneration: 1 };
  const ctx = vm.createContext({ state, fileToDataUrl: convert, markPracticeDirty: () => effects.dirty++, revokeCaptureUrl: file => effects.revoked.push(file), showToast: message => effects.toasts.push(message), updateAttachmentState: () => effects.updates++, updateChecklistState() {}, scheduleAurumShieldEvaluation() {}, previewModal: { hidden: true }, openCaptureGroupModal() {} });
  vm.runInContext(sourceFunction("setCaptureFile") + sourceFunction("handleCaptureFileChange"), ctx);
  return { ctx, state, key, old, sibling, card, input, effects };
}

test("camera and library remain separate native inputs; only camera requests capture", () => {
  const ctx = vm.createContext({ escapeHtml: value => value });
  vm.runInContext(sourceFunction("captureInputsMarkup"), ctx);
  for (const accept of ["image/*", "image/*,.pdf"]) {
    const inputs = ctx.captureInputsMarkup(accept).match(/<input\b[^>]*>/g);
    assert.equal(inputs.length, 2);
    const camera = inputs.find(input => input.includes('data-capture-source="camera"'));
    const library = inputs.find(input => input.includes('data-capture-source="library"'));
    assert.match(camera, /capture="environment"/);
    assert.match(camera, /accept="image\/\*"/);
    assert.doesNotMatch(library, /\bcapture=/);
    assert.ok(library.includes(`accept="${accept}"`));
  }
});

test("opening the library does not invoke the camera and allows choosing the same file again", () => {
  const calls = [];
  const inputs = { camera: { value: "old", click: () => calls.push("camera") }, library: { value: "old", click: () => calls.push("library") } };
  const ctx = vm.createContext({});
  vm.runInContext(sourceFunction("openCapturePicker"), ctx);
  const card = { querySelector: selector => selector.includes('"library"') ? inputs.library : inputs.camera };
  assert.equal(ctx.openCapturePicker(card, "library"), true);
  assert.deepEqual(calls, ["library"]);
  assert.equal(inputs.library.value, "");
  assert.equal(inputs.camera.value, "old");
  inputs.camera.disabled = true;
  assert.equal(ctx.openCapturePicker(card, "camera"), false);
  assert.deepEqual(calls, ["library"]);
});

test("cancelling a picker never creates an attachment or marks a saved deed dirty", async () => {
  const h = harness(); h.input.files = [];
  await h.ctx.handleCaptureFileChange({ target: h.input });
  assert.equal(h.state.captureFiles.get(h.key), h.old);
  assert.equal(h.state.attachments, 2);
  assert.equal(h.effects.dirty, 0);
  assert.equal(h.effects.revoked.length, 0);
  assert.equal(h.effects.updates, 0);
});

test("an unreadable replacement preserves both existing document sides", async () => {
  const h = harness(async () => { throw Error("image decode failed"); });
  await h.ctx.handleCaptureFileChange({ target: h.input });
  assert.equal(h.state.captureFiles.get(h.key), h.old);
  assert.equal(h.state.captureFiles.get("codice-fiscale-retro"), h.sibling);
  assert.equal(h.effects.dirty, 0);
  assert.equal(h.effects.revoked.length, 0);
  assert.equal(h.effects.toasts.length, 1);
  assert.equal(h.input.value, "");
});

test("a saved photo replaces only its intended attachment after successful conversion", async () => {
  const h = harness(); await h.ctx.handleCaptureFileChange({ target: h.input });
  const saved = h.state.captureFiles.get(h.key);
  assert.equal(saved.name, "foto-salvata.jpg");
  assert.equal(saved.dataUrl, "data:image/jpeg;base64,bmV3");
  assert.equal(h.state.captureFiles.get("codice-fiscale-retro"), h.sibling);
  assert.equal(h.state.attachments, 2);
  assert.equal(h.effects.dirty, 1);
  assert.deepEqual(h.effects.revoked, [h.old]);
  assert.equal(h.input.value, "");
});

test("payment PDF upload keeps its format without changing the document photos", async () => {
  const h = harness(async () => "data:application/pdf;base64,cGRm");
  h.card.dataset.captureKey = "pagamento-bonifico";
  h.input.files = [{ name: "contabile.pdf", type: "application/pdf" }];
  await h.ctx.handleCaptureFileChange({ target: h.input });
  const payment = h.state.captureFiles.get("pagamento-bonifico");
  assert.equal(payment.type, "application/pdf");
  assert.equal(payment.dataUrl, "data:application/pdf;base64,cGRm");
  assert.equal(h.state.captureFiles.get(h.key), h.old);
  assert.equal(h.state.captureFiles.get("codice-fiscale-retro"), h.sibling);
  assert.equal(h.state.attachments, 3);
});

test("a photo finishing after the session changes cannot alter the next session", async () => {
  let complete; const h = harness(() => new Promise(resolve => { complete = resolve; }));
  const pending = h.ctx.handleCaptureFileChange({ target: h.input });
  h.state.sessionGeneration++; complete("data:image/jpeg;base64,bmV3"); await pending;
  assert.equal(h.state.captureFiles.get(h.key), h.old);
  assert.equal(h.effects.dirty, 0);
  assert.equal(h.effects.revoked.length, 0);
});

test("switching to another deed discards a photo still loading for the previous deed", async () => {
  let complete; const h = harness(() => new Promise(resolve => { complete = resolve; }));
  vm.runInContext(sourceFunction("restoreCaptureStateFromAct"), h.ctx);
  const pending = h.ctx.handleCaptureFileChange({ target: h.input });
  h.ctx.restoreCaptureStateFromAct({ captures: [], captureAttachments: [] });
  complete("data:image/jpeg;base64,cHJldmlvdXM="); await pending;
  assert.equal(h.state.captureFiles.size, 0);
  assert.equal(h.state.uploadedCaptures.size, 0);
  assert.equal(h.effects.dirty, 0);
});

test("a picker card removed while decoding cannot reintroduce its attachment", async () => {
  let complete; const h = harness(() => new Promise(resolve => { complete = resolve; }));
  const pending = h.ctx.handleCaptureFileChange({ target: h.input });
  h.card.isConnected = false;
  complete("data:image/jpeg;base64,bmV3"); await pending;
  assert.equal(h.state.captureFiles.get(h.key), h.old);
  assert.equal(h.effects.dirty, 0);
});

test("the most recently selected photo wins if two source conversions finish out of order", async () => {
  const complete = []; const h = harness(() => new Promise(resolve => complete.push(resolve)));
  const first = h.ctx.handleCaptureFileChange({ target: h.input });
  h.input.files = [{ name: "seconda.jpg", type: "image/jpeg" }];
  const second = h.ctx.handleCaptureFileChange({ target: h.input });
  complete[1]("data:image/jpeg;base64,c2Vjb25k"); await second;
  complete[0]("data:image/jpeg;base64,Zmlyc3Q="); await first;
  assert.equal(h.state.captureFiles.get(h.key).name, "seconda.jpg");
  assert.equal(h.effects.dirty, 1);
});
