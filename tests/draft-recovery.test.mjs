import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import pg from 'pg';

const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const server = await readFile(new URL('../server.js', import.meta.url), 'utf8');
function fn(source, name) {
  const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, 'm'));
  assert.ok(start >= 0, name);
  const rest = source.slice(start);
  const end = rest.slice(1).search(/^(?:async )?function \w+\(/m);
  return end < 0 ? rest : rest.slice(0, end + 1);
}
function ctx(source, names, values) {
  const context = vm.createContext(values);
  vm.runInContext(names.map(name => fn(source, name)).join('\n'), context);
  return context;
}

test('Elenco exposes recoverable drafts and incomplete deeds while keeping other stores and hidden statuses out', () => {
  const acts = ['draft', 'Bozza', 'archived_incomplete', 'completed', 'archived_completed', 'suspended', 'pending_approval', 'deleted', 'abandoned'].map((status, id) => ({ id, status, store: 'QA' }));
  acts.push({ id: 99, status: 'draft', store: 'Other' });
  const c = ctx(app, ['archiveVisibleActs'], {
    demoActs: acts, state: { searchActive: false }, document: { getElementById: () => ({ value: '' }) },
    selectedArchiveStore: () => 'QA', selectedStoreMatchesAct: (store, act) => store === act.store,
    workflowStatusCode: status => status === 'Bozza' ? 'draft' : status,
    isCompletedWorkflowStatus: status => ['completed', 'archived_completed'].includes(status),
    archiveShowsSuspended: () => false
  });
  assert.deepEqual(Array.from(c.archiveVisibleActs(), act => act.id), [0, 1, 2, 3, 4]);
  c.archiveShowsSuspended = () => true;
  assert.deepEqual(Array.from(c.archiveVisibleActs(), act => act.id), [0, 1, 2, 3, 4, 5, 6]);
});

test('archive and search request drafts, fusion keeps completed-only API selection', async () => {
  const calls = [];
  const c = ctx(app, ['loadArchiveScreenData', 'loadFusionScreenData', 'runActSearch'], {
    state: {}, ACT_LIST_LIMIT: 100, selectedArchiveStore: () => 'QA', selectedFusionStore: () => 'QA',
    archiveShowsSuspended: () => false,
    document: { getElementById: id => ({ value: id === 'searchKeyword' ? 'ClienteQA' : 'name' }) },
    loadSavedActs: async options => { calls.push(options); return []; }, renderArchiveGroups() {}, showToast() {}
  });
  await c.loadArchiveScreenData(); await c.runActSearch(); await c.loadFusionScreenData();
  assert.equal(calls[0].includeDrafts, true);
  assert.equal(calls[1].includeDrafts, true);
  assert.notEqual(calls[2].includeDrafts, true);
});

test('draft-inclusive API requests use a distinct cache entry', async () => {
  const calls = [];
  const c = ctx(app, ['queryString', 'loadSavedActs'], {
    state: { actsCache: new Map() }, demoActs: [], Date, URLSearchParams,
    ACT_LIST_LIMIT: 100, ACT_CACHE_TTL: 100000,
    apiRequest: async path => { calls.push(path); return []; }, mergeActsIntoCache() {},
    showLoading() {}, hideLoading() {}, showToast() {}
  });
  await c.loadSavedActs({ includeDrafts: true });
  await c.loadSavedActs();
  await c.loadSavedActs({ includeDrafts: true });
  assert.equal(calls.length, 2);
  assert.equal(new URL('http://qa'+calls[0]).searchParams.get('includeDrafts'), 'true');
  assert.notEqual(new URL('http://qa'+calls[1]).searchParams.get('includeDrafts'), 'true');
});

test('user statistics ignore incomplete and draft records already cached by Elenco', () => {
  const c = ctx(app, ['computeStatsRows'], {
    demoActs: [{ status: 'draft', operatorId: 17, store: 'QA', date: '2026-10-20', amount: 900, weight: 10 },
      { status: 'completed', operatorId: 17, store: 'QA', date: '2026-10-20', amount: 80, weight: 2 }],
    userOperatorKey: () => '17', actOperatorKey: act => String(act.operatorId), localDateKey: () => '2026-10-20', monthKey: () => '2026-10',
    isCompletedWorkflowStatus: status => status === 'completed', actWeightAmount: act => act.weight, actSpentAmount: act => act.amount,
    displayUsername: () => 'QA'
  });
  const rows = c.computeStatsRows({ id: 17 });
  assert.equal(rows[0].dailyClients, 1);
  assert.equal(rows[0].dailySpent, 80);
});

function saveHarness() {
  const original = { id: 11, practice_number: 'OA-QA-2026-1', operatore_id: 17, payload: { legalSignature: { timestamp: '2026-10-20T12:00:00Z', documentHashSha256: 'qa-hash' } } };
  const updates = [];
  const names = ['actNumberConflictError', 'saveAct'];
  if (server.includes('function isSameActCreateRequest(')) names.unshift('isSameActCreateRequest');
  const c = ctx(server, names, {
    enforceActStore: async input => input, findExisting: async () => original, canAccessAct: () => true,
    updateAct: async (...args) => { updates.push(args); return original; }, rowToAct: row => row
  });
  return { c, original, updates };
}

test('new POST cannot overwrite another deed by reusing its practice number', async () => {
  const { c, original, updates } = saveHarness();
  await assert.rejects(c.saveAct({ practiceNumber: original.practice_number, name: 'Different customer' }, { id: 17 }), error => error.status === 409 && error.code === 'ACT_NUMBER_CONFLICT');
  assert.equal(updates.length, 0);
});

test('an exact create retry returns its original record without updating it', async () => {
  const { c, original, updates } = saveHarness();
  const value = await c.saveAct({ practiceNumber: original.practice_number, legalSignature: { ...original.payload.legalSignature } }, { id: 17 });
  assert.equal(value.id, 11);
  assert.equal(updates.length, 0);
});

test('explicit legacy edits by ID retain their update path', async () => {
  const { c, updates } = saveHarness();
  await c.saveAct({ id: 11, practiceNumber: 'OA-QA-2026-1' }, { id: 17 });
  assert.equal(updates.length, 1);
});

function concurrentSaveHarness() {
  const original = { id: 21, practice_number: 'OA-QA-2026-2', operatore_id: 17,
    payload: { legalSignature: { timestamp: '2026-10-20T13:00:00Z', documentHashSha256: 'qa-race' } } };
  const transaction = { query: async () => ({ rows: [], rowCount: 0 }) };
  const lookups = [];
  const c = ctx(server, ['isSameActCreateRequest', 'actNumberConflictError', 'lockActPracticeNumbers', 'saveAct'], {
    enforceActStore: async input => input,
    findExisting: async (number, db) => { lookups.push({ number, db }); return db === transaction ? original : null; },
    normalizeAct: input => ({ status: 'draft', practiceNumber: input.practiceNumber, payload: input }),
    enrichActStore: async act => act, normalizeWorkflowStatus: status => status,
    withDatabaseTransaction: work => work(transaction), canAccessAct: () => true, rowToAct: row => row,
    lockCashTransactionIdentity: () => { throw new Error('A concurrent existing deed must not reach insert side effects'); }
  });
  return { c, original, transaction, lookups };
}

test('creation rechecks the deed inside its transaction after the outside lookup was empty', async () => {
  const { c, original, transaction, lookups } = concurrentSaveHarness();
  await assert.rejects(c.saveAct({ practiceNumber: original.practice_number }, { id: 17 }), error => error.code === 'ACT_NUMBER_CONFLICT');
  assert.equal(lookups.length, 2);
  assert.equal(lookups[1].db, transaction);
});

test('a simultaneous identical create retry returns the saved row without repeating insert side effects', async () => {
  const { c, original } = concurrentSaveHarness();
  const value = await c.saveAct({ practiceNumber: original.practice_number, legalSignature: { ...original.payload.legalSignature } }, { id: 17 });
  assert.equal(value.id, original.id);
});

const databaseUrl = process.env.OROACTIVE_DRAFT_TEST_DATABASE_URL;
test('number allocation never reuses persisted draft, deleted or abandoned identities', { skip: !databaseUrl }, async () => {
  const url = new URL(databaseUrl);
  assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '55436'); assert.equal(url.pathname, '/oroactive_qa_20261020');
  const client = new pg.Client({ connectionString: databaseUrl }); await client.connect();
  try {
    await client.query('CREATE TEMP TABLE qa_draft_numbers (practice_number text, codice_negozio text, store_code text, act_year integer, numero_atto_negozio integer, act_number integer, status text, deleted_at timestamptz, suspended_at timestamptz, resumed_at timestamptz, completed_at timestamptz)');
    for (const [index, status] of ['draft','deleted','abandoned','suspended','completed','archived_incomplete'].entries()) {
      await client.query('INSERT INTO qa_draft_numbers (practice_number,store_code,act_year,act_number,status) VALUES ($1,$2,2026,$3,$4)', ['QA-'+(index+1),'QA',index+1,status]);
    }
    const names = ['nextActNumber'];
    if (server.includes('function reservedActNumberStatusSql(')) names.unshift('realCompletedStatusSql','reservedActNumberStatusSql');
    const c = ctx(server, names, { actsTable: 'qa_draft_numbers', pool: client });
    assert.equal(await c.nextActNumber('QA',2026), 7);
    await client.query('SET statement_timeout TO 2000');
    await client.query("INSERT INTO qa_draft_numbers (practice_number,store_code,act_year,act_number,status) VALUES ('legacy-high','QA',2026,2147483000,'deleted')");
    assert.equal(await c.nextActNumber('QA',2026), 7);
  } finally { await client.end(); }
});

test('replayed create metadata from a different actor cannot update or return the deed', async () => {
  const { c, original, updates } = saveHarness();
  await assert.rejects(c.saveAct({ practiceNumber: original.practice_number, legalSignature: { ...original.payload.legalSignature } }, { id: 18 }), error => error.code === 'ACT_NUMBER_CONFLICT');
  assert.equal(updates.length, 0);
});

test('practice conflicts retain their public code, including a concurrent unique-key conflict', () => {
  const c = vm.createContext({});
  vm.runInContext(server.slice(server.indexOf('const publicErrorCodes ='), server.indexOf('app.use((error, request, response, _next)')), c);
  assert.equal(c.publicErrorCode({ code: 'ACT_NUMBER_CONFLICT' }), 'ACT_NUMBER_CONFLICT');
  assert.equal(c.publicErrorCode({ code: '23505', constraint: 'atti_vendita_practice_number_key' }), 'ACT_NUMBER_CONFLICT');
  assert.equal(c.publicErrorCode({ code: '23505', constraint: 'utenti_email_key' }), '');
});

test('a create conflict refreshes only the number and retains the unsaved customer data', async () => {
  const form = { name: 'ClienteQA', number: 'OA-QA-2026-1' };
  let resets = 0;
  const c = ctx(app, ['archiveCurrentPractice'], {
    state: { editingPracticeNumber: null },
    refreshAmlCashCheck: async () => {}, fieldValue: () => form.number,
    currentQualityReview: () => null, workflowStatusCode: () => 'draft',
    currentActSnapshot: () => ({ name: form.name, practiceNumber: form.number }),
    attachLegalSignatureMetadata: async act => act, buildPrintCopy: () => '',
    evaluateAurumShield: async () => null, confirmAurumShieldBeforeFinalSave: async () => true,
    saveActRecord: async () => { const error = new Error('conflict'); error.code = 'ACT_NUMBER_CONFLICT'; throw error; },
    updatePracticeNumber: async () => { form.number = 'OA-QA-2026-2'; },
    resetCurrentPractice: async () => { resets++; }, showToast() {}
  });
  assert.equal(await c.archiveCurrentPractice('Bozza'), false);
  assert.deepEqual(form, { name: 'ClienteQA', number: 'OA-QA-2026-2' });
  assert.equal(resets, 0);
});
