import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";

const writer = new URL("../scripts/write-version-metadata.mjs", import.meta.url);
const server = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
const release = "oroactive_gestionale_72_20261026";

for (const [asset, expected] of [[release, release], ["20261023-reliability-65", "919"]]) {
  test(`metadata writer keeps the application release identity: ${asset}`, () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "oroactive-version-test-"));
    try {
      fs.writeFileSync(path.join(directory, "app.js"), `const OROACTIVE_CLIENT_BUILD_ID = "${asset}";\nconst EXPECTED_GOLD_COIN_CATALOG_COUNT = 197;\n`);
      fs.writeFileSync(path.join(directory, "package.json"), '{"version":"1.0.0"}');
      execFileSync(process.execPath, [writer.pathname], {
        cwd: directory,
        env: { PATH: process.env.PATH, BUILD_NUMBER: "919", GITHUB_RUN_NUMBER: "920", GIT_COMMIT: "a".repeat(40), BUILD_TIME: "2026-10-23T13:00:00Z" },
        stdio: "pipe"
      });
      const value = JSON.parse(fs.readFileSync(path.join(directory, "version.json"), "utf8"));
      assert.equal(value.buildNumber, expected);
      assert.equal(value.assetBuildId, asset);
      assert.equal(value.commit, "a".repeat(40));
      assert.equal(value.buildTime, "2026-10-23T13:00:00Z");
      assert.equal(value.catalogCount, 197);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
}

for (const [asset, expected] of [[release, release], ["20261023-reliability-65", "919"]]) {
  test(`server exposes the release while retaining commit metadata: ${asset}`, async () => {
    const start = server.indexOf("async function getBuildMetadata()");
    const end = server.indexOf("\nconst jwtExpiresIn", start);
    assert.ok(start >= 0 && end > start);
    const context = vm.createContext({
      buildMetadataCache: null, buildMetadataCacheAt: 0, versionFilePath: "version.json",
      readOptionalJson: async () => ({ assetBuildId: asset, buildNumber: asset, catalogCount: 197 }),
      readGitCommitFromDisk: async () => "b".repeat(40), readGitValue: async () => "999",
      firstUsefulBuildValue: (values, options = {}) => values.find(value => value && value !== "unknown" && (!options.rejectLocal || value !== "local")) || "",
      shortCommit: value => value.slice(0, 12), validCatalogCount: Number,
      process: { env: { OROACTIVE_BUILD_NUMBER: "919", GITHUB_RUN_NUMBER: "920" } },
      runtimeStatus: { startedAt: "2026-10-23T13:00:00Z" }
    });
    vm.runInContext(server.slice(start, end), context);
    const value = await context.getBuildMetadata();
    assert.equal(value.buildNumber, expected);
    assert.equal(value.assetBuildId, asset);
    assert.equal(value.commit, "b".repeat(40));
    assert.equal(value.catalogCount, 197);
    assert.equal(await context.getBuildMetadata(), value);
  });
}
