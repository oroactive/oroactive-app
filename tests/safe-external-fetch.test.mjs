import test from "node:test";
import assert from "node:assert/strict";
import {
  assertPublicExternalUrl,
  isPrivateOrReservedIp,
  safeExternalFetch
} from "../services/security/safeExternalFetch.js";

const publicResolver = async () => [{ address: "93.184.216.34", family: 4 }];

test("blocca protocolli, credenziali, host locali e indirizzi riservati", async () => {
  await assert.rejects(() => assertPublicExternalUrl("http://example.com", { resolver: publicResolver }), /HTTPS/);
  await assert.rejects(() => assertPublicExternalUrl("https://user:pass@example.com", { resolver: publicResolver }), /credenziali/);
  await assert.rejects(() => assertPublicExternalUrl("https://localhost"), /locale|interno/);
  await assert.rejects(
    () => assertPublicExternalUrl("https://example.com", { resolver: async () => [{ address: "127.0.0.1", family: 4 }] }),
    /privata|riservata/
  );
  for (const address of [
    "10.0.0.1", "169.254.169.254", "192.168.1.1", "::1", "[::1]", "::2",
    "::ffff:7f00:1", "::ffff:a9fe:a9fe", "64:ff9b::7f00:1", "100::1",
    "fd00::1", "fec0::1", "fed0::1", "feff::1", "2001::1", "2001:db8::1", "2002:7f00:1::", "3fff::1"
  ]) {
    assert.equal(isPrivateOrReservedIp(address), true, address);
  }
  await assert.rejects(() => assertPublicExternalUrl("https://[::1]"), /privata|riservata/);
  assert.equal(isPrivateOrReservedIp("93.184.216.34"), false);
  assert.equal(isPrivateOrReservedIp("2606:4700:4700::1111"), false);
});

test("esegue una sola risoluzione DNS validata per ogni hop", async () => {
  let lookups = 0;
  const resolver = async () => {
    lookups += 1;
    return [{ address: "93.184.216.34", family: 4 }];
  };
  await safeExternalFetch("https://example.com", {
    resolver,
    fetchImpl: async () => new Response("ok", { status: 200 })
  });
  assert.equal(lookups, 1);
});

test("non inoltra credenziali applicative nei redirect verso un'altra origine", async () => {
  const seen = [];
  const fetchImpl = async (url, options) => {
    seen.push({ url: url.href, headers: new Headers(options.headers) });
    if (seen.length === 1) return new Response(null, { status: 302, headers: { location: "https://other.example/result" } });
    return new Response("ok", { status: 200 });
  };
  await safeExternalFetch("https://example.com/start", {
    fetchImpl,
    resolver: publicResolver,
    allowedHosts: ["example.com", "other.example"],
    headers: { Authorization: "Bearer segreto", Cookie: "sessione=segreta", Accept: "text/plain" }
  });
  assert.equal(seen[0].headers.get("authorization"), "Bearer segreto");
  assert.equal(seen[1].headers.get("authorization"), null);
  assert.equal(seen[1].headers.get("cookie"), null);
  assert.equal(seen[1].headers.get("accept"), "text/plain");
});

test("segue soltanto redirect nuovamente validati", async () => {
  const visited = [];
  const fetchImpl = async (url) => {
    visited.push(url.href);
    return new Response(null, { status: 302, headers: { location: "https://internal.example/secret" } });
  };
  const resolver = async (hostname) => hostname === "internal.example"
    ? [{ address: "10.0.0.5", family: 4 }]
    : [{ address: "93.184.216.34", family: 4 }];
  await assert.rejects(
    () => safeExternalFetch("https://example.com", { fetchImpl, resolver }),
    /privata|riservata/
  );
  assert.deepEqual(visited, ["https://example.com/"]);
});

test("limita la risposta prima di consegnarla al chiamante", async () => {
  const fetchImpl = async () => new Response("x".repeat(2048), { status: 200 });
  await assert.rejects(
    () => safeExternalFetch("https://example.com", { fetchImpl, resolver: publicResolver, maxBytes: 1024 }),
    (error) => error?.code === "EXTERNAL_RESPONSE_TOO_LARGE"
  );
});

test("restituisce una risposta compatibile per JSON pubblico entro i limiti", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
  const response = await safeExternalFetch("https://example.com/api", {
    fetchImpl,
    resolver: publicResolver,
    maxBytes: 4096
  });
  assert.equal(response.ok, true);
  assert.deepEqual(await response.json(), { ok: true });
});
