import test from "node:test";
import assert from "node:assert/strict";
import { isSourceStale } from "../services/aurum/knowledge/sourceRegistry.js";
import { createKnowledgeScheduler } from "../services/aurum/knowledge/scheduler.js";

test("staleness usa la prossima verifica e lo scheduler non approva mai", async () => {
  const now = new Date("2026-08-01T12:00:00Z");
  const source = { source_key: "due", active: true, update_frequency: "daily", next_check_at: "2026-08-01T10:00:00Z" };
  assert.equal(isSourceStale(source, now), true);
  let syncOptions;
  const registry = { list: () => [source] };
  const scheduler = createKnowledgeScheduler({ registry, clock: () => now, syncSource: async (_source, options) => { syncOptions = options; return { content: "nuovo testo" }; } });
  const result = await scheduler.runDue();
  assert.equal(syncOptions.autoApprove, false);
  assert.equal(result[0].version.review_status, "pending");
  assert.equal(result[0].version.is_current, false);
});
