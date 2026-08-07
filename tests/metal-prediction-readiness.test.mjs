import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeMetalPredictionHistory } from "../services/marketData/metalPredictionReadiness.js";

const now = Date.parse("2026-08-07T12:00:00.000Z");

function point(daysAgo, hour = 10, price = 120) {
  return {
    metal: "gold",
    price_per_gram: price,
    created_at: new Date(now - daysAgo * 864e5 + (hour - 12) * 36e5).toISOString()
  };
}

test("dieci click nello stesso giorno non diventano un falso trend", () => {
  const result = analyzeMetalPredictionHistory(Array.from({ length: 10 }, (_, index) => point(0, index + 1, 120 + index / 100)), { now });
  assert.equal(result.sufficient, false);
  assert.equal(result.daily_points, 1);
  assert.match(result.warning, /10 giornate distinte/);
});

test("dieci giornate aggiornate sono ordinate e sufficienti", () => {
  const history = Array.from({ length: 10 }, (_, index) => point(index, 10, 120 + index)).reverse();
  const result = analyzeMetalPredictionHistory(history, { now });
  assert.equal(result.sufficient, true);
  assert.equal(result.daily_points, 10);
  assert.ok(new Date(result.history[0].created_at) < new Date(result.history.at(-1).created_at));
});

test("uno storico vecchio non produce neppure un prezzo spot operativo", () => {
  const history = Array.from({ length: 10 }, (_, index) => point(index + 7));
  const result = analyzeMetalPredictionHistory(history, { now });
  assert.equal(result.sufficient, false);
  assert.equal(result.spot, null);
  assert.match(result.warning, /troppo vecchia/);
});

test("un dato provider vecchio non diventa recente soltanto perché importato oggi", () => {
  const history = Array.from({ length: 10 }, (_, index) => ({
    ...point(index),
    provider_timestamp: point(index + 7).created_at,
    created_at: point(index).created_at
  }));
  const result = analyzeMetalPredictionHistory(history, { now });
  assert.equal(result.sufficient, false);
  assert.equal(result.spot, null);
  assert.match(result.warning, /troppo vecchia/);
});

test("date future, invalide e prezzi non validi vengono ignorati", () => {
  const valid = point(0);
  const result = analyzeMetalPredictionHistory([
    valid,
    { ...valid, created_at: "data-non-valida" },
    { ...valid, created_at: new Date(now + 864e5).toISOString() },
    { ...valid, price_per_gram: 0 }
  ], { now });
  assert.equal(result.raw_points, 4);
  assert.equal(result.daily_points, 1);
  assert.equal(result.latest, valid);
});
