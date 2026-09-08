import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import express from "express";
import { fetchBullionVaultSpotPrice, parseBullionVaultPrices } from "../services/marketData/bullionVaultProvider.js";
import {
  buildWidgetGoldQuote,
  createBullionVaultQuoteCache,
  createWidgetGoldQuoteHandler
} from "../services/marketData/widgetGoldQuote.js";

const goldMarket = { securityId: "AUXZU", source: "Zurigo" };
const start = Date.parse("2026-09-08T10:00:00.000Z");
function quoteAt(time, value = 120_000) {
  return {
    metal: "Oro", value, currency: "EUR", unit: "KG", source: "Zurigo",
    fetchedAt: new Date(time).toISOString(), buy: value - 100, sell: value + 100,
    rawPayload: { internal: "not-for-widget", url: "https://provider.example/private" }
  };
}

test("il widget usa il prezzo medio reale del parser BullionVault e non genera prezzi mancanti", async () => {
  assert.deepEqual(parseBullionVaultPrices('<buyPrices><price limit="119900"/></buyPrices><sellPrices><price limit="120100"/></sellPrices>'), {
    value: 120_000, buy: 119_900, sell: 120_100
  });
  assert.equal(parseBullionVaultPrices('<buyPrices><price limit="0"/></buyPrices><sellPrices><price limit="-2"/></sellPrices>'), null);
  assert.equal(parseBullionVaultPrices("<market/>"), null);
  let requested;
  const price = await fetchBullionVaultSpotPrice({
    metal: "Oro", market: goldMarket,
    fetchImpl: async (url) => {
      requested = url;
      return { ok: true, text: async () => '<buyPrices><price limit="119900"/></buyPrices><sellPrices><price limit="120100"/></sellPrices>' };
    }
  });
  assert.equal(requested.searchParams.get("securityId"), "AUXZU");
  assert.equal(requested.searchParams.get("considerationCurrency"), "EUR");
  assert.equal(price.value, 120_000);
  assert.equal(price.unit, "KG");
  assert.ok(Number.isFinite(Date.parse(price.fetchedAt)));
});

test("pagina e widget condividono una richiesta e la cache di cinque secondi per metallo", async () => {
  let now = start;
  let calls = 0;
  let release;
  const cache = createBullionVaultQuoteCache({
    now: () => now,
    fetchPrice: async (metal) => {
      calls += 1;
      if (calls === 1) await new Promise((resolve) => { release = resolve; });
      return { ...quoteAt(now), metal };
    }
  });
  const pageRequest = cache.getPrice("Oro", goldMarket);
  const widgetRequest = buildWidgetGoldQuote(cache, goldMarket);
  await Promise.resolve();
  assert.equal(calls, 1);
  release();
  const [page, widget] = await Promise.all([pageRequest, widgetRequest]);
  assert.equal(page.value, widget.pricePerKg);
  assert.equal(page.fetchedAt, widget.fetchedAt);
  now += 4999;
  await cache.getPrice("Oro", goldMarket);
  assert.equal(calls, 1);
  now += 1;
  await cache.getPrice("Oro", goldMarket);
  assert.equal(calls, 2);
  await cache.getPrice("Argento", { securityId: "AGXZU", source: "Zurigo" });
  assert.equal(calls, 3);
});

test("errore e retry mantengono timestamp e ultimo prezzo solo nel widget senza mascherare l'errore della pagina", async () => {
  let now = start;
  let calls = 0;
  let fail = false;
  const cache = createBullionVaultQuoteCache({
    now: () => now,
    fetchPrice: async () => {
      calls += 1;
      if (fail) throw new Error("provider unavailable");
      return quoteAt(now);
    }
  });
  const fresh = await buildWidgetGoldQuote(cache, goldMarket);
  assert.equal(fresh.stale, false);
  fail = true;
  now += 5000;
  await assert.rejects(cache.getPrice("Oro", goldMarket), /provider unavailable/);
  const stale = await buildWidgetGoldQuote(cache, goldMarket);
  assert.equal(stale.available, true);
  assert.equal(stale.stale, true);
  assert.equal(stale.pricePerKg, 120_000);
  assert.equal(stale.fetchedAt, fresh.fetchedAt);
  assert.equal(calls, 2);
  now += 4999;
  await assert.rejects(cache.getPrice("Oro", goldMarket), /provider unavailable/);
  assert.equal(calls, 2);
  now += 1;
  fail = false;
  const recovered = await buildWidgetGoldQuote(cache, goldMarket);
  assert.equal(calls, 3);
  assert.equal(recovered.stale, false);
  assert.equal(recovered.fetchedAt, new Date(now).toISOString());
});

test("assenza o dato non valido non producono un valore dimostrativo o uno zero", async () => {
  for (const invalid of [null, quoteAt(start, 0), quoteAt(start, NaN), { ...quoteAt(start), fetchedAt: "invalid" }]) {
    const cache = createBullionVaultQuoteCache({ fetchPrice: async () => invalid, now: () => start });
    assert.deepEqual(await buildWidgetGoldQuote(cache, goldMarket), {
      available: false, pricePerKg: null, fetchedAt: null,
      source: "BullionVault", currency: "EUR", unit: "kg", stale: true
    });
  }
});

test("la rotta pubblica risponde senza token, espone solo il contratto Swift e non memorizza la risposta HTTP", async (t) => {
  let now = start;
  let providerOffline = false;
  const cache = createBullionVaultQuoteCache({
    fetchPrice: async () => {
      if (providerOffline) throw new Error("private provider diagnostics");
      return quoteAt(now);
    },
    now: () => now
  });
  const app = express();
  const source = await readFile(new URL("../server.js", import.meta.url), "utf8");
  const routeStart = source.indexOf('app.get("/api/widgets/gold",');
  const routeEnd = source.indexOf('app.get("/version.json",', routeStart);
  vm.runInNewContext(source.slice(routeStart, routeEnd), {
    app, createWidgetGoldQuoteHandler, bullionVaultQuoteCache: cache, bullionVaultMarkets: { Oro: goldMarket }
  });
  app.use("/api", (_request, response) => response.status(401).json({ error: "AUTH_REQUIRED" }));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/widgets/gold`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.deepEqual(await response.json(), {
    available: true, pricePerKg: 120_000, fetchedAt: "2026-09-08T10:00:00.000Z",
    source: "BullionVault", currency: "EUR", unit: "kg", stale: false
  });
  providerOffline = true;
  now += 5000;
  const staleResponse = await fetch(`http://127.0.0.1:${server.address().port}/api/widgets/gold`);
  assert.equal(staleResponse.status, 200);
  assert.deepEqual(await staleResponse.json(), {
    available: true, pricePerKg: 120_000, fetchedAt: "2026-09-08T10:00:00.000Z",
    source: "BullionVault", currency: "EUR", unit: "kg", stale: true
  });
  const aasaResponse = await fetch(`http://127.0.0.1:${server.address().port}/.well-known/apple-app-site-association`, { redirect: "manual" });
  assert.equal(aasaResponse.status, 200);
  assert.match(aasaResponse.headers.get("content-type"), /^application\/json/);
  assert.equal(aasaResponse.headers.get("location"), null);
  assert.deepEqual(await aasaResponse.json(), { webcredentials: { apps: ["F9GWSX8N83.it.oroactive.trial"] } });
});

test("il server rende pubblico solo GET widget oro, conserva il rate limit e condivide la fonte con Quotazione", async () => {
  const source = await readFile(new URL("../server.js", import.meta.url), "utf8");
  const publicBlock = source.slice(source.indexOf("const publicApiRequests = new Set("), source.indexOf("function isLargeProtectedApiRequest"));
  const publicRequest = vm.runInNewContext(`${publicBlock}; isPublicApiRequest`);
  assert.equal(publicRequest({ method: "GET", path: "/api/widgets/gold" }), true);
  assert.equal(publicRequest({ method: "POST", path: "/api/widgets/gold" }), false);
  assert.equal(publicRequest({ method: "GET", path: "/api/bullionvault/prices" }), false);
  const route = source.indexOf('app.get("/api/widgets/gold", createWidgetGoldQuoteHandler(bullionVaultQuoteCache, bullionVaultMarkets.Oro))');
  assert.ok(route > source.indexOf("app.use(apiRateLimit)"));
  assert.ok(route < source.indexOf('app.use("/api", authenticate)'));
  const rateBlock = source.slice(source.indexOf("function requestRateLimitClass"), source.indexOf("function cleanupRateLimitBuckets"));
  const rateClass = vm.runInNewContext(`${rateBlock}; requestRateLimitClass`, { isLargeProtectedApiRequest: () => false });
  const limit = rateClass({ method: "GET", path: "/api/widgets/gold" });
  assert.ok(limit.limit > 0 && limit.limit <= 360);
  assert.equal(limit.windowMs, 60_000);
  const fetchBlock = source.slice(source.indexOf("async function fetchBullionVaultPrice"), source.indexOf("function normalizePredictionMetal"));
  assert.match(fetchBlock, /bullionVaultQuoteCache\.getPrice\(metal, market\)/);
});
