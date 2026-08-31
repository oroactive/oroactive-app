import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [appSource, serverSource, stylesSource] = await Promise.all([
  readFile(path.join(repoRoot, "app.js"), "utf8"),
  readFile(path.join(repoRoot, "server.js"), "utf8"),
  readFile(path.join(repoRoot, "styles.css"), "utf8")
]);

function sourceBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `Blocco mancante: ${startMarker}`);
  assert.notEqual(end, -1, `Fine blocco mancante: ${endMarker}`);
  return source.slice(start, end);
}

test("il grafico BullionVault usa un rendering nativo compatibile con Safari e iPad", () => {
  const mainCsp = sourceBlock(serverSource, "const contentSecurityPolicy", "app.use((_request, response, next)");
  assert.doesNotMatch(mainCsp, /bullionvault/i);
  assert.doesNotMatch(serverSource, /bullionvault-widget|bullionvaultchart\.js/i);
  const chartBlock = sourceBlock(appSource, "async function initBullionVaultChart", "async function refreshBullionVaultPrices");
  assert.match(appSource, /function bullionVaultNativeChartPoints/);
  assert.match(appSource, /function renderBullionVaultNativeChart/);
  assert.match(chartBlock, /state\.metalPredictionHistory\?\.gold/);
  assert.match(chartBlock, /renderBullionVaultNativeChart/);
  assert.match(chartBlock, /source=bullionvault/);
  assert.doesNotMatch(chartBlock, /createElement\("iframe"\)|waitForBullionVaultChartRender/);
  assert.match(chartBlock, /bullionVaultChartFallback\.hidden = false/);
  assert.match(stylesSource, /\.bullionvault-native-chart/);
  assert.match(stylesSource, /\.bullionvault-native-svg/);
  assert.match(serverSource, /queryMetalPriceHistory\(\{ metal, currency, days, limit: 365, source \}\)/);
});

test("il grafico nativo ordina lo storico, scarta valori non validi e usa il prezzo spot come fallback", () => {
  const pointBlock = sourceBlock(appSource, "function bullionVaultNativeChartPoints", "function bullionVaultNativeDateLabel");
  const evaluatePoints = (history, spot) => vm.runInNewContext(
    `${pointBlock}; bullionVaultNativeChartPoints(history, spot)`,
    { history, spot }
  );
  const history = [
    { source: "bullionvault", currency: "EUR", price_per_kg: "121000", provider_timestamp: "2026-08-01T10:00:00.000Z" },
    { source: "BULLIONVAULT", currency: "eur", price_per_gram: "122", created_at: "2026-08-02T10:00:00.000Z" },
    { source: "bullionvault", currency: "EUR", price_per_kg: 0, provider_timestamp: "2026-08-03T10:00:00.000Z" },
    { source: "bullionvault", currency: "EUR", price_per_kg: "non-valido", provider_timestamp: "2026-08-04T10:00:00.000Z" },
    { source: "manual", currency: "EUR", price_per_kg: 999999, provider_timestamp: "2026-08-05T10:00:00.000Z" },
    { source: "bullionvault", currency: "USD", price_per_kg: 888888, provider_timestamp: "2026-08-06T10:00:00.000Z" }
  ];
  const spot = { value: 123000, currency: "EUR", fetchedAt: "2026-08-03T10:00:00.000Z" };
  const points = evaluatePoints(history, spot);
  assert.equal(points.length, 3);
  assert.equal(points.map((point) => point.value).join(","), "121000,122000,123000");
  assert.equal(evaluatePoints([], spot).length, 1);
  assert.equal(evaluatePoints([], { ...spot, stale: true }).length, 0);
  assert.equal(evaluatePoints([], { ...spot, currency: "USD" }).length, 0);
  assert.equal(evaluatePoints([], null).length, 0);
});

test("il renderer nativo produce un SVG visibile e una vista spot senza dipendenze esterne", () => {
  const rendererBlock = sourceBlock(appSource, "function bullionVaultNativeChartPoints", "async function initBullionVaultChart");
  const render = (history, spot) => vm.runInNewContext(
    `${rendererBlock}; renderBullionVaultNativeChart(history, spot); bullionVaultChart.innerHTML`,
    {
      history,
      spot,
      bullionVaultChart: { innerHTML: "" },
      escapeHtml: (value) => String(value),
      formatBullionPrice: (value) => Number(value).toFixed(2)
    }
  );
  const history = [
    { source: "bullionvault", currency: "EUR", price_per_kg: 120000, created_at: "2026-08-01T10:00:00.000Z" },
    { source: "bullionvault", currency: "EUR", price_per_kg: 121500, created_at: "2026-08-02T10:00:00.000Z" },
    { source: "bullionvault", currency: "EUR", price_per_kg: 123000, created_at: "2026-08-03T10:00:00.000Z" }
  ];
  const chartHtml = render(history, null);
  assert.match(chartHtml, /class="bullionvault-native-svg"/);
  assert.match(chartHtml, /<polyline/);
  assert.match(chartHtml, /123000\.00 EUR\/kg/);
  assert.doesNotMatch(chartHtml, /iframe|bullionvaultchart\.js/);

  const spotHtml = render([], { value: 124000, currency: "EUR", fetchedAt: "2026-08-04T10:00:00.000Z" });
  assert.match(spotHtml, /class="bullionvault-native-point current"/);
  assert.match(spotHtml, /124000\.00 EUR\/kg/);
});

test("aggiorna quotazioni sincronizza spot e storico senza lasciare l'analisi su valori vecchi", () => {
  assert.match(appSource, /async function refreshQuoteDashboardData/);
  assert.match(appSource, /apiRequest\("\/quotazioni\/metals\/sync-bullionvault"/);
  assert.match(appSource, /withButtonBusy\([^\n]*"Aggiorno\.\.\."[^\n]*refreshQuoteDashboardData/);
  assert.match(appSource, /\/quotazioni\/buyback-preview/);
  assert.match(serverSource, /calculateMetalBuyback\(input, request\.user, request, \{ persist: false \}\)/);
  assert.match(serverSource, /unavailable_metals/);
  assert.match(serverSource, /partial:/);
  const loaderBlock = sourceBlock(appSource, "async function loadGoldPredictionPanel", "async function syncGoldHistory");
  assert.match(loaderBlock, /return \{ ok: true \}/);
  assert.match(loaderBlock, /setGoldPredictionAvailability\(false, error\)/);
  assert.match(loaderBlock, /return \{ ok: false, error \}/);
  const availabilityBlock = sourceBlock(appSource, "function setGoldPredictionAvailability", "async function loadGoldPredictionPanel");
  assert.match(availabilityBlock, /state\.buybackCalculations = \[\]/);
  assert.match(availabilityBlock, /state\.competitorQuotes = \[\]/);
  assert.match(availabilityBlock, /runGoldPredictionButton\.disabled = !available/);
  const refreshBlock = sourceBlock(appSource, "async function refreshQuoteDashboardData", "function formatGoldPerGram");
  assert.match(refreshBlock, /const analysisResult = await loadGoldPredictionPanel/);
  assert.match(refreshBlock, /await initBullionVaultChart\(\{ force: true, refreshHistory: true \}\)/);
  assert.match(refreshBlock, /if \(!analysisResult\?\.ok\)/);
  assert.match(refreshBlock, /valori decisionali sono stati disabilitati/);
  const screenLoadBlock = sourceBlock(appSource, "async function handleScreenDataLoad", "function renderProfileCard");
  assert.match(
    screenLoadBlock,
    /if \(id === "quotazione"\)[\s\S]*await refreshBullionVaultPrices\(\);[\s\S]*await loadGoldPredictionPanel\(\);[\s\S]*await initBullionVaultChart\(\{ force: true, refreshHistory: true \}\)/
  );
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
