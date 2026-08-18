import dns from "node:dns/promises";
import https from "node:https";
import net from "node:net";
import { Readable } from "node:stream";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 3;

function externalFetchError(message, code = "EXTERNAL_FETCH_BLOCKED") {
  const error = new Error(message);
  error.code = code;
  return error;
}

function ipv4ToNumber(address = "") {
  const parts = String(address).split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

function ipv4InCidr(address, base, prefix) {
  const value = ipv4ToNumber(address);
  const network = ipv4ToNumber(base);
  if (value === null || network === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (network & mask);
}

function ipv6ToBigInt(address = "") {
  let value = String(address || "").trim().toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  if (!value || value.includes(":::")) return null;
  if (value.includes(".")) {
    const lastColon = value.lastIndexOf(":");
    const ipv4 = ipv4ToNumber(value.slice(lastColon + 1));
    if (lastColon < 0 || ipv4 === null) return null;
    value = `${value.slice(0, lastColon)}:${((ipv4 >>> 16) & 0xffff).toString(16)}:${(ipv4 & 0xffff).toString(16)}`;
  }
  const halves = value.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const groups = [...left, ...Array(missing).fill("0"), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.reduce((result, group) => (result << 16n) | BigInt(Number.parseInt(group, 16)), 0n);
}

function ipv6InCidr(address, base, prefix) {
  const value = ipv6ToBigInt(address);
  const network = ipv6ToBigInt(base);
  if (value === null || network === null || prefix < 0 || prefix > 128) return false;
  const shift = 128n - BigInt(prefix);
  return shift === 128n ? true : (value >> shift) === (network >> shift);
}

export function isPrivateOrReservedIp(address = "") {
  const value = String(address || "").trim().toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  const mappedIpv4 = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) return isPrivateOrReservedIp(mappedIpv4);
  const mappedHex = value.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const high = Number.parseInt(mappedHex[1], 16);
    const low = Number.parseInt(mappedHex[2], 16);
    return isPrivateOrReservedIp(`${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`);
  }

  const family = net.isIP(value);
  if (family === 4) {
    return [
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["100.64.0.0", 10],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.0.0.0", 24],
      ["192.0.2.0", 24],
      ["192.168.0.0", 16],
      ["198.18.0.0", 15],
      ["198.51.100.0", 24],
      ["203.0.113.0", 24],
      ["224.0.0.0", 4],
      ["240.0.0.0", 4]
    ].some(([base, prefix]) => ipv4InCidr(value, base, prefix));
  }
  if (family === 6) {
    if (!ipv6InCidr(value, "2000::", 3)) return true;
    return [
      ["2001::", 23],
      ["2001:db8::", 32],
      ["2002::", 16],
      ["3fff::", 20]
    ].some(([base, prefix]) => ipv6InCidr(value, base, prefix));
  }
  return true;
}

export function normalizeExternalHttpsUrl(input) {
  let url;
  try {
    url = input instanceof URL ? new URL(input.href) : new URL(String(input || ""));
  } catch {
    throw externalFetchError("URL esterno non valido.");
  }
  if (url.protocol !== "https:") throw externalFetchError("Sono consentite soltanto fonti HTTPS pubbliche.");
  if (url.username || url.password) throw externalFetchError("Le credenziali non sono consentite negli URL esterni.");
  if (url.port && url.port !== "443") throw externalFetchError("La porta della fonte esterna non è consentita.");
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || /\.(?:local|internal|home|lan)$/.test(hostname)) {
    throw externalFetchError("Host locale o interno non consentito.");
  }
  return url;
}

function validateExternalUrlPolicy(input, options = {}) {
  const url = normalizeExternalHttpsUrl(input);
  const allowedHosts = (options.allowedHosts || []).map((host) => String(host).toLowerCase());
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (allowedHosts.length && !allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
    throw externalFetchError("Dominio esterno non autorizzato.");
  }
  return { url, hostname };
}

async function resolvePublicExternalUrl(input, options = {}) {
  const { url, hostname } = validateExternalUrlPolicy(input, options);
  const resolver = options.resolver || dns.lookup;
  const addresses = net.isIP(hostname)
    ? [{ address: hostname, family: net.isIP(hostname) }]
    : await resolver(hostname, { all: true, verbatim: true });
  if (!Array.isArray(addresses) || !addresses.length) throw externalFetchError("La fonte esterna non è risolvibile.", "EXTERNAL_DNS_FAILED");
  if (addresses.some((entry) => isPrivateOrReservedIp(entry?.address))) {
    throw externalFetchError("La fonte esterna risolve verso una rete privata o riservata.");
  }
  return { url, addresses };
}

export async function assertPublicExternalUrl(input, options = {}) {
  return (await resolvePublicExternalUrl(input, options)).url;
}

function secureLookup(addresses) {
  const normalized = addresses.map((entry) => ({ address: entry.address, family: Number(entry.family) || net.isIP(entry.address) }));
  return (_hostname, options, callback) => {
    if (options?.all) return callback(null, normalized);
    const selected = normalized[0];
    callback(null, selected.address, selected.family);
  };
}

function nativeHttpsFetch(url, options, addresses) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: options.method || "GET",
      headers: options.headers,
      signal: options.signal,
      lookup: secureLookup(addresses),
      servername: url.hostname.replace(/^\[|\]$/g, "")
    }, (incoming) => {
      const status = Number(incoming.statusCode || 500);
      const hasBody = ![101, 204, 205, 304].includes(status) && String(options.method || "GET").toUpperCase() !== "HEAD";
      resolve(new Response(hasBody ? Readable.toWeb(incoming) : null, {
        status,
        statusText: incoming.statusMessage || "",
        headers: incoming.headers
      }));
    });
    request.once("error", reject);
    if (options.body === undefined || options.body === null) {
      request.end();
    } else if (typeof options.body === "string" || Buffer.isBuffer(options.body) || options.body instanceof Uint8Array) {
      request.end(options.body);
    } else {
      request.destroy(externalFetchError("Corpo della richiesta esterna non supportato."));
    }
  });
}

function abortable(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(signal.reason || externalFetchError("Richiesta annullata."));
  return Promise.race([
    promise,
    new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }))
  ]);
}

async function discardBody(response) {
  try {
    await response.body?.cancel?.();
  } catch {
    // La risposta viene abbandonata intenzionalmente prima del redirect.
  }
}

function headersForRedirect(headers, previousUrl, nextUrl) {
  if (!headers || previousUrl.origin === nextUrl.origin) return headers;
  const sanitized = new Headers(headers);
  for (const name of ["authorization", "cookie", "proxy-authorization", "x-api-key", "x-subscription-token"]) {
    sanitized.delete(name);
  }
  return sanitized;
}

async function readLimitedBody(response, maxBytes) {
  const declared = Number(response.headers?.get?.("content-length") || 0);
  if (declared > maxBytes) throw externalFetchError("Risposta esterna oltre il limite consentito.", "EXTERNAL_RESPONSE_TOO_LARGE");
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw externalFetchError("Risposta esterna oltre il limite consentito.", "EXTERNAL_RESPONSE_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function bufferedResponse(response, body, finalUrl, redirected) {
  const decode = () => new TextDecoder().decode(body);
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    url: finalUrl,
    redirected,
    text: async () => decode(),
    json: async () => JSON.parse(decode()),
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)
  };
}

export async function safeExternalFetch(input, options = {}) {
  const timeoutMs = Math.min(Math.max(Number(options.timeoutMs || DEFAULT_TIMEOUT_MS), 250), 60_000);
  const maxBytes = Math.min(Math.max(Number(options.maxBytes || DEFAULT_MAX_BYTES), 1024), 20 * 1024 * 1024);
  const maxRedirects = Math.min(Math.max(Number(options.maxRedirects ?? DEFAULT_MAX_REDIRECTS), 0), 5);
  const fetchImpl = options.fetchImpl;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(externalFetchError("Timeout della fonte esterna.", "EXTERNAL_FETCH_TIMEOUT")), timeoutMs);
  const onAbort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener?.("abort", onAbort, { once: true });
  let currentUrl = input;
  let requestHeaders = options.headers;

  try {
    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      const resolved = await abortable(resolvePublicExternalUrl(currentUrl, options), controller.signal);
      const safeUrl = resolved.url;
      const requestOptions = {
        ...options,
        headers: requestHeaders,
        timeoutMs: undefined,
        maxBytes: undefined,
        maxRedirects: undefined,
        fetchImpl: undefined,
        resolver: undefined,
        allowedHosts: undefined,
        signal: controller.signal,
        redirect: "manual"
      };
      const response = fetchImpl
        ? await abortable(fetchImpl(safeUrl, requestOptions), controller.signal)
        : await nativeHttpsFetch(safeUrl, requestOptions, resolved.addresses);
      if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
        if (redirectCount >= maxRedirects) throw externalFetchError("Troppi reindirizzamenti dalla fonte esterna.", "EXTERNAL_REDIRECT_LIMIT");
        const nextUrl = new URL(response.headers.get("location"), safeUrl);
        requestHeaders = headersForRedirect(requestHeaders, safeUrl, nextUrl);
        await discardBody(response);
        currentUrl = nextUrl;
        continue;
      }
      const allowedContentTypes = (options.allowedContentTypes || []).map((value) => String(value).toLowerCase());
      const contentType = String(response.headers?.get?.("content-type") || "").toLowerCase();
      if (allowedContentTypes.length && contentType && !allowedContentTypes.some((value) => contentType.includes(value))) {
        await discardBody(response);
        throw externalFetchError("Tipo di contenuto esterno non consentito.", "EXTERNAL_CONTENT_TYPE_BLOCKED");
      }
      const body = await readLimitedBody(response, maxBytes);
      return bufferedResponse(response, body, safeUrl.href, redirectCount > 0);
    }
    throw externalFetchError("Reindirizzamento esterno non valido.", "EXTERNAL_REDIRECT_LIMIT");
  } catch (error) {
    if (controller.signal.aborted && error?.code !== "EXTERNAL_FETCH_TIMEOUT") {
      throw externalFetchError("Timeout della fonte esterna.", "EXTERNAL_FETCH_TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener?.("abort", onAbort);
  }
}
