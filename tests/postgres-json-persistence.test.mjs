import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import pgUtils from "pg/lib/utils.js";

const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
function context(names, values = {}) {
  const source = names.map((name) => {
    const start = server.search(new RegExp(`^(?:async )?function ${name}\\(`, "m"));
    assert.notEqual(start, -1, name);
    const rest = server.slice(start);
    const next = rest.slice(1).search(/^(?:async )?function \w+\(/m);
    return next < 0 ? rest : rest.slice(0, next + 1);
  }).join("\n");
  const ctx = vm.createContext({ console, ...values });
  vm.runInContext(source, ctx);
  return ctx;
}
function jsonAt(values, index) {
  // Exercise node-postgres's real parameter encoder, including its SQL-array format.
  return JSON.parse(pgUtils.prepareValue(values[index]));
}

test("Founder report saves store/operator lists as JSON arrays, including empty lists", async () => {
  for (const stores of [[], [{ store_name: "Cassano", note: '€ "test"' }]]) {
    let saved;
    const ctx = context(["generateFounderDailyReport", "sanitizeForPostgres"], {
      actsTable: "atti_vendita", founderReportDate: () => "2026-10-19",
      reportQuery: async () => [], realCompletedStatusSql: () => "TRUE", suspendedStatusWhere: () => "FALSE",
      rowToAct: (row) => row, publicAuditLog: (row) => row,
      reportNumber: (v = 0) => Number(v), reportArray: (v) => Array.isArray(v) ? v : [],
      founderReportMaterials: () => ({ totals: { Oro: 0, Argento: 0, Platino: 0 } }),
      founderReportPayments: () => ({}), groupReportActsByStore: () => stores,
      listStoreHealthScores: async () => [], reportActionSuggestions: () => [],
      publicFounderDailyReport: (row) => row, writeAuditLog() {}, createNotification() {},
      pool: { query: async (sql, values) => {
        if (sql.includes("summary, stores_data")) {
          saved = values;
          assert.deepEqual(jsonAt(values, 3), stores);
          assert.deepEqual(jsonAt(values, 4), []);
        }
        return { rows: [{ id: 1, report_date: "2026-10-19", risks_data: {}, backup_data: {} }] };
      } },
    });
    await ctx.generateFounderDailyReport("2026-10-19", { id: 2, ruolo: "founder" });
    assert.ok(saved, "generated report must reach the storage boundary");
  }
});

test("Aurum Shield persists factors and recommendations without SQL-array coercion", async () => {
  const factors = [{ reason: "Documento da verificare", weight: 20 }];
  const recommendations = ["Verificare firma e documento"];
  const calls = [];
  const ctx = context(["persistAurumShieldForAct", "sanitizeForPostgres"], {
    actsTable: "atti_vendita", normalizeWorkflowStatus: (v) => v, rowToAct: (row) => row,
    calculateAurumShieldRisk: async () => ({ score: 80, risk_level: "medio", summary: "Verifica", factors, recommendations }),
    syncAurumShieldAlert: async () => {}, writeAuditLog() {},
    pool: { query: async (sql, values) => { calls.push({ sql, values }); return { rows: [{ id: 4 }] }; } },
  });
  await ctx.persistAurumShieldForAct({ id: 1, status: "draft" }, { id: 2 });
  assert.deepEqual(jsonAt(calls[0].values, 5), factors);
  assert.deepEqual(jsonAt(calls[0].values, 6), recommendations);
  assert.deepEqual(jsonAt(calls[1].values, 4), factors);
});

test("quality checklist storage preserves every list and the empty-list type", async () => {
  const quality = { quality_status: "attenzione", score: 90, summary: "Controllare", checks: [{ status: "warning" }], blocking_errors: [], warnings: ["Verificare"], required_actions: ["Controllare documento"] };
  let stored;
  const ctx = context(["saveQualityCheckResult", "sanitizeForPostgres"], {
    actsTable: "atti_vendita", findExisting: async () => ({ id: 7 }), canAccessAct: () => true,
    rowToAct: (row) => row, validateQualityChecklist: async () => quality,
    pool: { query: async (sql, values) => { if (sql.includes("INSERT INTO quality_checks")) stored = values; return { rows: [{ id: 8 }] }; } },
  });
  await ctx.saveQualityCheckResult({ atto_id: 7 }, { id: 2 });
  for (const [index, key] of [[4, "checks"], [5, "blocking_errors"], [6, "warnings"], [7, "required_actions"]]) {
    assert.deepEqual(jsonAt(stored, index), quality[key], key);
  }
});

test("training progress saves completed steps as an ordered JSON list", async () => {
  let stored;
  const steps = ["cliente_demo", "firme_demo"];
  const ctx = context(["saveOperatorTrainingProgress", "sanitizeForPostgres"], {
    trainingSessionById: async () => ({ id: "session-1", user_id: 2, metadata: {} }), publicTrainingSession: (v) => v,
    pool: { query: async (_sql, values) => { stored = values; return { rows: [{}] }; } },
  });
  await ctx.saveOperatorTrainingProgress("session-1", { completed_steps: steps }, { id: 2 });
  assert.deepEqual(jsonAt(stored, 1), steps);
});

test("suspension log retains the reasons and valid Unicode as JSON", async () => {
  let stored;
  const reasons = ["Firma mancante", 'Verifica 20 € "dato"'];
  const ctx = context(["writeSuspendedPracticeLog", "sanitizeForPostgres"], {
    suspendedPracticeSummary: () => "Verificare",
    pool: { query: async (_sql, values) => { stored = values; return { rows: [{}] }; } },
  });
  await ctx.writeSuspendedPracticeLog({ saleDeedId: 1, action: "suspend", reasons });
  assert.deepEqual(jsonAt(stored, 4), reasons);
});

test("completed training preserves both mistakes and ordered steps", async () => {
  const evaluation = { passed: false, score: 40, mistakes: [{ field: "signature", message: "Firma mancante" }], completed_steps: ["cliente_demo"], feedback: {}, sanitized_demo_data: {} };
  let stored;
  const ctx = context(["completeOperatorTrainingSession", "sanitizeForPostgres"], {
    trainingSessionById: async () => ({ id: "session-1", user_id: 2, started_at: new Date().toISOString() }),
    evaluateTrainingSession: () => evaluation, publicTrainingSession: (v) => v, writeAuditLog() {}, createNotification() {},
    pool: { query: async (sql, values) => { if (sql.includes("UPDATE training_sessions")) stored = values; return { rows: [{}] }; } },
  });
  await ctx.completeOperatorTrainingSession("session-1", {}, { id: 2 });
  assert.deepEqual(jsonAt(stored, 6), evaluation.mistakes);
  assert.deepEqual(jsonAt(stored, 7), evaluation.completed_steps);
});

test("Academy simulation stores executed controls as a JSON list", async () => {
  let stored;
  const controls = ["peso", "documento"];
  const ctx = context(["submitAcademySimulationAttempt", "sanitizeForPostgres"], {
    pool: { query: async (sql, values) => {
      if (sql.includes("UPDATE academy_simulation_attempts")) stored = values;
      return { rows: [{ id: 1, expected_decision: "escalation" }] };
    } },
  });
  await ctx.submitAcademySimulationAttempt(1, { decision: "escalation", controls_executed: controls }, { id: 2 });
  assert.deepEqual(jsonAt(stored, 3), controls);
});
