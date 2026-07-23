import { execFileSync } from "node:child_process";
import fs from "node:fs";

function useful(value, options = {}) {
  const normalized = String(value || "").trim();
  const blocked = new Set(["", "unknown", "undefined", "null", "HEAD"]);
  if (options.rejectLocal) blocked.add("local");
  return !blocked.has(normalized);
}

function firstUseful(values = [], options = {}) {
  return values.find((value) => useful(value, options)) || "";
}

function git(args = []) {
  try {
    return execFileSync("git", args, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

function readClientRelease() {
  const source = fs.readFileSync("app.js", "utf8");
  const assetBuildId = source.match(/const\s+OROACTIVE_CLIENT_BUILD_ID\s*=\s*"([^"]+)"/)?.[1] || "";
  const catalogCount = Number(source.match(/const\s+EXPECTED_GOLD_COIN_CATALOG_COUNT\s*=\s*(\d+)/)?.[1] || 0);
  if (!assetBuildId || !Number.isInteger(catalogCount) || catalogCount <= 0) {
    throw new Error("Identita build frontend o numero monete non valido in app.js.");
  }
  return { assetBuildId, catalogCount };
}

const gitCommit = git(["rev-parse", "HEAD"]);
const gitBranch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
const gitBuildNumber = git(["rev-list", "--count", "HEAD"]);
const commit = firstUseful([
  process.env.GIT_COMMIT,
  process.env.SOURCE_COMMIT,
  process.env.GITHUB_SHA,
  gitCommit
]) || "unknown";
const shortCommit = useful(commit) ? commit.slice(0, 12) : "unknown";
const buildNumber = firstUseful([
  process.env.BUILD_NUMBER,
  process.env.GITHUB_RUN_NUMBER,
  gitBuildNumber
], { rejectLocal: true }) || (shortCommit !== "unknown" ? `git-${shortCommit}` : "local");
const { assetBuildId, catalogCount } = readClientRelease();
const metadata = {
  ok: true,
  app: "OroActive",
  service: "oroactive-gestionale",
  commit,
  shortCommit,
  buildTime: firstUseful([process.env.BUILD_TIME]) || new Date().toISOString(),
  buildNumber,
  branch: firstUseful([process.env.SOURCE_BRANCH, process.env.GITHUB_REF_NAME, gitBranch]) || "main",
  packageVersion: JSON.parse(fs.readFileSync("package.json", "utf8")).version,
  environment: process.env.NODE_ENV || "production",
  assetBuildId,
  catalogCount
};

fs.writeFileSync("version.json", `${JSON.stringify(metadata, null, 2)}\n`);
