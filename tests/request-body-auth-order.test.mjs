import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function freePort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  server.close();
  await once(server, "close");
  return port;
}

async function waitForLive(baseUrl) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/live`);
      if (response.ok) return;
    } catch {
      // Il processo sta ancora avviandosi.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Server locale non avviato in tempo");
}

test("durante l'inizializzazione le API operative vengono chiuse prima di auth e parser", async (context) => {
  const port = await freePort();
  const child = spawn(process.execPath, ["server.js"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "test",
      REQUIRE_DATABASE_ON_START: "false",
      DATABASE_URL: "postgresql://invalid:invalid@127.0.0.1:1/unavailable",
      DATABASE_CONNECTION_TIMEOUT_MS: "100",
      HEALTH_CHECK_TIMEOUT_MS: "100",
      METAL_PRICE_AUTO_SYNC_ENABLED: "false",
      COMPETITOR_AUTO_SYNC_ENABLED: "false"
    },
    stdio: "ignore"
  });
  context.after(() => child.kill("SIGTERM"));
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForLive(baseUrl);

  const protectedResponse = await fetch(`${baseUrl}/api/ai/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data: "x".repeat(1024 * 1024) })
  });
  assert.equal(protectedResponse.status, 503);
  assert.equal((await protectedResponse.json()).code, "SERVICE_NOT_READY");

  const publicResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "x".repeat(300 * 1024), password: "x" })
  });
  assert.equal(publicResponse.status, 503);
  assert.equal((await publicResponse.json()).code, "SERVICE_NOT_READY");
});
