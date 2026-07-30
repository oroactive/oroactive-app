import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";

const expectedTree = "48a27aabbf76ea26ae7df7831be42efc36cbf6a8";
const uploadRoot = ".codex-upload";
const chunksDir = path.join(uploadRoot, "chunks");
const chunkFiles = readdirSync(chunksDir).sort();
if (!chunkFiles.length) throw new Error("Release chunks missing.");
const compressedPatch = Buffer.concat(chunkFiles.map((name) => readFileSync(path.join(chunksDir, name))));
const patchPath = path.join("/tmp", "oroactive-release.patch");
writeFileSync(patchPath, gunzipSync(compressedPatch));
execFileSync("git", ["apply", "--index", patchPath], { stdio: "inherit" });
rmSync(uploadRoot, { recursive: true, force: true });
execFileSync("git", ["add", "-A"], { stdio: "inherit" });
const actualTree = execFileSync("git", ["write-tree"], { encoding: "utf8" }).trim();
if (actualTree !== expectedTree) {
  throw new Error(`Verified tree mismatch: expected ${expectedTree}, got ${actualTree}`);
}
execFileSync("git", ["config", "user.name", "OroActive Automation"]);
execFileSync("git", ["config", "user.email", "actions@users.noreply.github.com"]);
execFileSync("git", ["commit", "-m", "Add Aurum coaching and private memory"], { stdio: "inherit" });
const finalCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const buildTime = execFileSync("git", ["show", "-s", "--format=%cI", "HEAD"], { encoding: "utf8" }).trim();
execFileSync("git", ["push", "origin", "HEAD:main"], { stdio: "inherit" });
if (process.env.GITHUB_ENV) {
  appendFileSync(process.env.GITHUB_ENV, `GIT_COMMIT=${finalCommit}\nBUILD_TIME=${buildTime}\n`);
}
console.log(`Verified OroActive tree materialized and pushed: ${finalCommit}`);
