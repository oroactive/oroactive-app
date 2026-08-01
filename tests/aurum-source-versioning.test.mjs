import test from "node:test";
import assert from "node:assert/strict";
import { calculateContentHash, createSourceVersion, approveSourceVersion, compareSourceVersions } from "../services/aurum/knowledge/sourceVersioning.js";

test("l'hash è stabile e ogni nuova versione resta pending", () => {
  assert.equal(calculateContentHash({ b: 2, a: 1 }), calculateContentHash({ a: 1, b: 2 }));
  const version = createSourceVersion({ source_key: "test-source", content: "testo" }, { clock: () => new Date("2026-08-01T10:00:00Z") });
  assert.equal(version.review_status, "pending");
  assert.equal(version.is_current, false);
  assert.equal(compareSourceVersions(null, version).changed, true);
  assert.throws(() => approveSourceVersion(version, { id: 1 }), /esplicita/i);
  assert.equal(approveSourceVersion(version, { id: 1 }, { explicitApproval: true, clock: () => new Date("2026-08-01T11:00:00Z") }).review_status, "approved");
});
