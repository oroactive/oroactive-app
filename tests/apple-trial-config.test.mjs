import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../ios/OroActiveTrial/", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");

function plistArray(xml, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<key>${escaped}</key>\\s*<array>([\\s\\S]*?)</array>`));
  assert.ok(match, `Expected plist array ${key}`);
  return [...match[1].matchAll(/<string>([^<]*)<\/string>/g)].map(entry => entry[1]);
}

test("Apple trial and widget request only the OroActive public-quote App Group", () => {
  for (const file of ["App/OroActiveTrial.entitlements", "Widgets/OroActiveWidgets.entitlements"]) {
    assert.deepEqual(plistArray(read(file), "com.apple.security.application-groups"), ["group.it.oroactive.trial"]);
  }
});

test("Apple trial authenticates only with the existing OroActive domain", () => {
  assert.deepEqual(plistArray(read("App/OroActiveTrial.entitlements"), "com.apple.developer.associated-domains"),
    ["webcredentials:app.oroactive.it"]);
});
