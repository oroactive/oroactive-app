import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
function sourceFunction(name) {
  const start = app.search(new RegExp(`^(?:async )?function ${name}\\(`, 'm'));
  assert.ok(start >= 0, `Missing function ${name}`);
  const tail = app.slice(start);
  const next = tail.slice(1).search(/^(?:async )?function \w+\(/m);
  return next < 0 ? tail : tail.slice(0, next + 1);
}

function harness() {
  const classes = new Set();
  const note = { textContent: 'Scatta una foto o carica dal dispositivo' };
  const fiscal = {
    dataset: { captureKey: 'codice-fiscale-fronte' },
    classList: { toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); } },
    querySelector: () => note
  };
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      value: '', checked: false, textContent: '', selectedOptions: [{ text: 'Negozio fittizio' }],
      querySelectorAll: () => [], insertAdjacentHTML() {}
    });
    return elements.get(id);
  };
  const state = { captureFiles: new Map(), uploadedCaptures: new Set() };
  const original = { key: 'codice-fiscale-fronte', name: 'fiscale-fittizio.jpg', type: 'image/jpeg', dataUrl: 'data:image/jpeg;base64,Zm90by1maXR0aXppYQ==' };
  let act = { id: 22, practiceNumber: 'QA-ONLY', name: 'Fittizio', surname: 'Collaudo', signatures: [], captures: [original.key], captureAttachments: [original] };
  const env = {
    state, SIGNATURE_LABELS: [], previewModal: { hidden: true },
    document: {
      getElementById: element,
      querySelector: () => null,
      querySelectorAll: selector => selector === '.capture-card[data-capture-key]' ? [fiscal] : []
    },
    window: { clearTimeout() {} },
    getActRecord: async () => act,
    canModifyAct: () => true,
    normalizeWorkflowStatus: value => value,
    normalizeSignatureArray: values => [...values],
    storeCodeFromAct: () => 'QA',
    setFieldValue: (selector, value) => { element(selector).value = value; },
    setPracticeMeta: async () => {},
    toDateInputValue: value => value,
    fieldValue: () => '',
    cededItemRowMarkup: () => '',
    defaultCededItemRow: () => ''
  };
  for (const name of [
    'showToast', 'setQualityReview', 'updateTitleOptions', 'updateCededItems', 'updateSaleTotal',
    'updateCustomerSummary', 'updateSignatureState', 'updateDocumentCaptureCards',
    'renderPaymentCaptureCard', 'renderPreciousCaptureCards', 'updateAttachmentState',
    'updateDocumentExpiryWarning', 'renderStep', 'setScreen', 'renderAurumShieldCard',
    'renderGuidedQualityCheck', 'scheduleAurumShieldEvaluation', 'renderAmlCashAlert',
    'applyRolePermissions', 'updateIbanVisibility', 'updateChecklistState', 'syncDirtyState',
    'scheduleQualityCheckValidation'
  ]) env[name] = () => {};
  const ctx = vm.createContext(env);
  vm.runInContext([
    'refreshCaptureCardStates', 'restoreCaptureStateFromAct', 'resetCurrentPractice', 'loadActForEdit'
  ].map(sourceFunction).join('\n'), ctx);
  return { ctx, state, classes, note, original, emptyAct() { act = { ...act, id: 23, practiceNumber: 'QA-EMPTY', captures: [], captureAttachments: [] }; } };
}

test('reopening a saved deed shows its existing fiscal photo without changing its content', async () => {
  const h = harness();
  await h.ctx.loadActForEdit('QA-ONLY');
  assert.equal(h.state.captureFiles.get(h.original.key).dataUrl, h.original.dataUrl);
  assert.equal(h.state.captureFiles.get(h.original.key).name, h.original.name);
  assert.equal(h.classes.has('loaded'), true, 'The existing, previewable fiscal photo must visibly show as acquired');
  assert.equal(h.note.textContent, 'Foto acquisita');
});

test('opening a different deed with no fiscal photo removes the previous acquired marker', async () => {
  const h = harness();
  await h.ctx.loadActForEdit('QA-ONLY');
  h.classes.add('loaded'); h.note.textContent = 'Foto acquisita';
  h.emptyAct();
  await h.ctx.loadActForEdit('QA-EMPTY');
  assert.equal(h.state.captureFiles.size, 0);
  assert.equal(h.classes.has('loaded'), false, 'An empty deed must not display the preceding customer attachment');
  assert.equal(h.note.textContent, 'Scatta una foto o carica dal dispositivo');
});

test('resetting the current deed clears its fiscal marker together with its local capture state', async () => {
  const h = harness();
  await h.ctx.loadActForEdit('QA-ONLY');
  h.classes.add('loaded'); h.note.textContent = 'Foto acquisita';
  await h.ctx.resetCurrentPractice();
  assert.equal(h.state.captureFiles.size, 0);
  assert.equal(h.state.uploadedCaptures.size, 0);
  assert.equal(h.classes.has('loaded'), false);
  assert.equal(h.note.textContent, 'Scatta una foto o carica dal dispositivo');
});
