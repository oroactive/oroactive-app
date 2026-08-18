import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fetchCompetitorPage } from "../services/competitors/aiCompetitorQuoteExtractor.js";
import { createCompetitorExtractionTrainer } from "../services/competitors/competitorExtractionTrainer.js";
import { fetchAmicoOroPage } from "../services/competitors/extractors/amicoOroExtractor.js";
import { fetchBancoPreziosiPage } from "../services/competitors/extractors/bancoPreziosiExtractor.js";
import { fetchBordinPage } from "../services/competitors/extractors/bordinExtractor.js";
import { fetchGoldStandardPage } from "../services/competitors/extractors/goldStandardExtractor.js";
import { fetchGruppoOro24kPage } from "../services/competitors/extractors/gruppoOro24kExtractor.js";
import { fetchOroDOroPage } from "../services/competitors/extractors/oroDOroExtractor.js";
import { fetchOroExpressPage } from "../services/competitors/extractors/oroExpressExtractor.js";
import { fetchOroInEuroPage } from "../services/competitors/extractors/oroInEuroExtractor.js";
import { fetchProntoGoldPage } from "../services/competitors/extractors/prontoGoldExtractor.js";

const COMPETITOR_FILES = [
  ["services/competitors/aiCompetitorQuoteExtractor.js", null],
  ["services/competitors/competitorExtractionTrainer.js", null],
  ["services/competitors/extractors/amicoOroExtractor.js", "amico-oro.it"],
  ["services/competitors/extractors/bancoPreziosiExtractor.js", "bancopreziosimilano.it"],
  ["services/competitors/extractors/bordinExtractor.js", "oroemetallipreziosi.com"],
  ["services/competitors/extractors/goldStandardExtractor.js", "goldstandard.gold"],
  ["services/competitors/extractors/gruppoOro24kExtractor.js", "comprooromilano.org"],
  ["services/competitors/extractors/oroDOroExtractor.js", "comproorodoro.it"],
  ["services/competitors/extractors/oroExpressExtractor.js", "oro-express.it"],
  ["services/competitors/extractors/oroInEuroExtractor.js", "quotazioneritirooro.it"],
  ["services/competitors/extractors/prontoGoldExtractor.js", "prontogold.com"]
];

const PROVIDER_FETCHES = [
  ["Amico Oro", fetchAmicoOroPage, "https://www.amico-oro.it"],
  ["Banco Preziosi", fetchBancoPreziosiPage, "https://www.bancopreziosimilano.it"],
  ["Bordin", fetchBordinPage, "https://oroemetallipreziosi.com"],
  ["Gold Standard", fetchGoldStandardPage, "https://www.goldstandard.gold"],
  ["Gruppo Oro 24K", fetchGruppoOro24kPage, "https://www.comprooromilano.org"],
  ["Oro D'Oro", fetchOroDOroPage, "https://www.comproorodoro.it"],
  ["Oro Express", fetchOroExpressPage, "https://www.oro-express.it"],
  ["Oro in Euro", fetchOroInEuroPage, "https://www.quotazioneritirooro.it"],
  ["Pronto Gold", fetchProntoGoldPage, "https://www.prontogold.com"]
];

const publicResolver = async () => [{ address: "8.8.8.8", family: 4 }];
const htmlResponse = (body = "<html><body>quotazione oro</body></html>", init = {}) => new Response(body, {
  status: init.status || 200,
  headers: { "content-type": "text/html; charset=utf-8", ...(init.headers || {}) }
});

test("all competitor network access uses bounded safeExternalFetch and no Playwright path", async () => {
  for (const [relativePath, allowedHost] of COMPETITOR_FILES) {
    const source = await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
    assert.match(source, /safeExternalFetch\s*\(/, `${relativePath} must use safeExternalFetch`);
    assert.doesNotMatch(source, /\bfetch\s*\(/, `${relativePath} must not call global fetch`);
    assert.doesNotMatch(source, /import\s*\(\s*["']playwright["']\s*\)|chromium\.launch\s*\(|page\.goto\s*\(/, `${relativePath} must not expose an unguarded browser path`);
    assert.match(source, /timeoutMs\s*:/, `${relativePath} must bound request duration`);
    assert.match(source, /maxBytes\s*:/, `${relativePath} must bound response size`);
    assert.match(source, /allowedHosts\s*:/, `${relativePath} must constrain redirect and destination hosts`);
    if (allowedHost) assert.ok(source.includes(allowedHost), `${relativePath} must pin ${allowedHost}`);
  }
});

test("dedicated extractors reject cross-domain URLs before opening a connection", async () => {
  for (const [name, fetchPage] of PROVIDER_FETCHES) {
    let calls = 0;
    await assert.rejects(
      () => fetchPage("https://attacker.example/quotes", {
        resolver: publicResolver,
        fetchImpl: async () => {
          calls += 1;
          return htmlResponse();
        }
      }),
      /Dominio esterno non autorizzato/,
      `${name} must reject a foreign host`
    );
    assert.equal(calls, 0, `${name} must reject before network I/O`);
  }
});

test("dedicated extractors accept their pinned host through the safe fetch wrapper", async () => {
  for (const [name, fetchPage, url] of PROVIDER_FETCHES) {
    const result = await fetchPage(url, {
      resolver: publicResolver,
      fetchImpl: async () => htmlResponse(`<html><body>${name}</body></html>`)
    });
    assert.equal(result.method, "safe_external_fetch");
    assert.match(result.html, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("redirects cannot escape a provider allowlist and oversized pages are rejected", async () => {
  let redirectCalls = 0;
  await assert.rejects(
    () => fetchAmicoOroPage("https://www.amico-oro.it", {
      resolver: publicResolver,
      fetchImpl: async () => {
        redirectCalls += 1;
        return new Response(null, { status: 302, headers: { location: "https://attacker.example/steal" } });
      }
    }),
    /Dominio esterno non autorizzato/
  );
  assert.equal(redirectCalls, 1);

  await assert.rejects(
    () => fetchAmicoOroPage("https://www.amico-oro.it", {
      resolver: publicResolver,
      maxBytes: 1024,
      fetchImpl: async () => htmlResponse("x".repeat(1025))
    }),
    (error) => error?.code === "EXTERNAL_RESPONSE_TOO_LARGE"
  );
});

test("user-agent retry remains inside safeExternalFetch", async () => {
  const agents = [];
  const result = await fetchGoldStandardPage("https://www.goldstandard.gold", {
    resolver: publicResolver,
    fetchImpl: async (_url, options) => {
      agents.push(new Headers(options.headers).get("user-agent"));
      return agents.length === 1 ? htmlResponse("forbidden", { status: 403 }) : htmlResponse("quotazione oro");
    }
  });
  assert.equal(result.method, "safe_external_fetch");
  assert.equal(agents.length, 2);
  assert.notEqual(agents[0], agents[1]);
});

test("generic AI extractor pins redirects to the configured competitor host", async () => {
  let calls = 0;
  await assert.rejects(
    () => fetchCompetitorPage("https://quotes.example", {
      resolver: publicResolver,
      fetchImpl: async () => {
        calls += 1;
        return new Response(null, { status: 302, headers: { location: "https://other.example/quotes" } });
      }
    }),
    /Dominio esterno non autorizzato/
  );
  assert.equal(calls, 1);
});

test("guided trainer pins a rule page to its source website", async () => {
  let calls = 0;
  let legacyBypassCalls = 0;
  const trainer = createCompetitorExtractionTrainer({
    fetchPage: async () => {
      legacyBypassCalls += 1;
      return { body: "untrusted bypass" };
    },
    resolver: publicResolver,
    fetchImpl: async () => {
      calls += 1;
      return htmlResponse("oro 18kt 50,00 euro");
    }
  });
  await assert.rejects(
    () => trainer.testExtractionRule({ page_url: "https://attacker.example/quotes" }, { website_url: "https://merchant.example" }),
    /Dominio esterno non autorizzato/
  );
  assert.equal(calls, 0);
  assert.equal(legacyBypassCalls, 0);
});
