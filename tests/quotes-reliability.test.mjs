import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [appSource, serverSource] = await Promise.all([
  readFile(path.join(repoRoot, "app.js"), "utf8"),
  readFile(path.join(repoRoot, "server.js"), "utf8")
]);

function sourceBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `Blocco mancante: ${startMarker}`);
  assert.notEqual(end, -1, `Fine blocco mancante: ${endMarker}`);
  return source.slice(start, end);
}

test("il grafico BullionVault autorizza soltanto le dipendenze ufficiali e verifica il rendering", () => {
  assert.match(serverSource, /"style-src 'self' 'unsafe-inline' https:\/\/www\.bullionvault\.com"/);
  assert.match(serverSource, /"connect-src 'self' https:\/\/www\.bullionvault\.com https:\/\/chart-data\.bullionvault\.com wss:\/\/chart-data\.bullionvault\.com"/);
  const chartBlock = sourceBlock(appSource, "async function initBullionVaultChart", "async function refreshBullionVaultPrices");
  assert.match(appSource, /\.highcharts-container svg, svg\.highcharts-root/);
  assert.match(chartBlock, /waitForBullionVaultChartRender/);
  assert.match(chartBlock, /bullionVaultChartFallback\.hidden = false/);
  assert.match(appSource, /script\.remove\(\)/);
  assert.match(appSource, /setTimeout\(handleError, timeoutMs\)/);
});

test("aggiorna quotazioni sincronizza spot e storico senza lasciare l'analisi su valori vecchi", () => {
  assert.match(appSource, /async function refreshQuoteDashboardData/);
  assert.match(appSource, /apiRequest\("\/quotazioni\/metals\/sync-bullionvault"/);
  assert.match(appSource, /withButtonBusy\([^\n]*"Aggiorno\.\.\."[^\n]*refreshQuoteDashboardData/);
  assert.match(appSource, /\/quotazioni\/buyback-preview/);
  assert.match(serverSource, /calculateMetalBuyback\(input, request\.user, request, \{ persist: false \}\)/);
  assert.match(serverSource, /unavailable_metals/);
  assert.match(serverSource, /partial:/);
});

test("lo storico usa i campioni piu recenti e non inventa trend con rilevazioni insufficienti", () => {
  const historyBlock = sourceBlock(serverSource, "async function queryMetalPriceHistory", "async function latestMetalPriceHistory");
  assert.match(historyBlock, /WITH daily_history AS \([\s\S]*ORDER BY \(created_at AT TIME ZONE 'UTC'\)::date DESC, created_at DESC, id DESC[\s\S]*recent_history AS \([\s\S]*LIMIT \$4::int[\s\S]*ORDER BY created_at ASC, id ASC/);
  assert.match(serverSource, /function metalPredictionHistoryReadiness/);
  assert.match(serverSource, /function buildSpotOnlyPrediction/);
  const predictionBlock = sourceBlock(serverSource, "async function runMetalPredictions", "function canSyncGoldPriceHistory");
  assert.match(predictionBlock, /historyBundle\.usable/);
  assert.match(predictionBlock, /options\.persist !== false/);
});

test("la sincronizzazione automatica mantiene oro e argento aggiornati senza duplicare i click utente", () => {
  assert.match(serverSource, /METAL_PRICE_AUTO_SYNC_ENABLED/);
  assert.match(serverSource, /function startMetalPriceAutoSync/);
  assert.match(serverSource, /startMetalPriceAutoSync\(\)/);
  assert.match(appSource, /useGrouping: "always"/);
});
