import dns from "node:dns/promises";
import https from "node:https";
import net from "node:net";
import { Readable } from "node:stream";

const DEFAULT_ALLOWED_MIME_TYPES = Object.freeze([
  "text/html",
  "text/plain",
  "application/json",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const blockedHostnames = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "169.254.169.254"
]);

function fetchError(message, code = "AURUM_SOURCE_FETCH_BLOCKED") {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeHostname(value = "") {
  return String(value || "").trim().toLowerCase().replace(/\.$/, "");
}

function ipv4Number(address) {
  const parts = String(address).split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
}

function inIpv4Range(address, base, bits) {
  const value = ipv4Number(address);
  const start = ipv4Number(base);
  if (value === null || start === null) return false;
  const size = 2 ** (32 - bits);
  return Math.floor(value / size) === Math.floor(start / size);
}

export function isPrivateOrReservedIp(address = "") {
  const normalized = String(address || "").trim().toLowerCase().split("%")[0];
  const family = net.isIP(normalized);
  if (!family) return true;
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
    ].some(([base, bits]) => inIpv4Range(normalized, base, bits));
  }
  if (normalized === "::" || normalized === "::1") return true;
  if (/^(?:fc|fd)/.test(normalized) || /^fe[89ab]/.test(normalized) || /^ff/.test(normalized)) return true;
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateOrReservedIp(mapped[1]) : false;
}

function hostnameAllowed(hostname, allowlist, allowSubdomains = true) {
  const normalized = normalizeHostname(hostname);
  return allowlist.some((domain) => normalized === domain || (allowSubdomains && normalized.endsWith(`.${domain}`)));
}

async function resolvePublicAddresses(hostname, lookup) {
  if (net.isIP(hostname)) return [{ address: hostname, family: net.isIP(hostname) }];
  const records = await lookup(hostname, { all: true, verbatim: true });
  const addresses = (Array.isArray(records) ? records : [records])
    .map((record) => {
      const address = record?.address || record;
      return address ? { address, family: Number(record?.family || net.isIP(address)) } : null;
    })
    .filter(Boolean);
  if (!addresses.length) throw fetchError("La fonte non risolve a un indirizzo pubblico.", "AURUM_SOURCE_DNS_EMPTY");
  if (addresses.some((record) => isPrivateOrReservedIp(record.address))) {
    throw fetchError("La fonte risolve a un indirizzo privato o riservato.");
  }
  return addresses;
}

async function validateSourceTarget(value, options = {}) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    throw fetchError("URL fonte non valido.");
  }
  if (url.protocol !== "https:") throw fetchError("Sono consentite soltanto fonti HTTPS.");
  if (url.username || url.password) throw fetchError("Le URL con credenziali incorporate non sono consentite.");
  if (url.port && url.port !== "443") throw fetchError("La fonte deve usare la porta HTTPS standard.");
  const hostname = normalizeHostname(url.hostname);
  if (!hostname || blockedHostnames.has(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw fetchError("Hostname locale o metadata cloud non consentito.");
  }
  const allowlist = [...new Set((options.allowedDomains || []).map(normalizeHostname).filter(Boolean))];
  if (!allowlist.length || !hostnameAllowed(hostname, allowlist, options.allowSubdomains !== false)) {
    throw fetchError(`Dominio non autorizzato: ${hostname || "sconosciuto"}.`);
  }
  const addresses = await resolvePublicAddresses(hostname, options.lookup || dns.lookup);
  return { url, addresses };
}

export async function validateSourceUrl(value, options = {}) {
  return (await validateSourceTarget(value, options)).url;
}

function normalizedMimeType(value = "") {
  return String(value || "").split(";")[0].trim().toLowerCase();
}

async function readBoundedBody(response, maxBytes) {
  const contentLength = Number(response.headers?.get?.("content-length") || 0);
  if (contentLength > maxBytes) throw fetchError("La fonte supera la dimensione massima consentita.", "AURUM_SOURCE_TOO_LARGE");
  if (!response.body?.getReader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) throw fetchError("La fonte supera la dimensione massima consentita.", "AURUM_SOURCE_TOO_LARGE");
    return buffer;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw fetchError("La fonte supera la dimensione massima consentita.", "AURUM_SOURCE_TOO_LARGE");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

function headersFromIncomingMessage(message) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(message.headers || {})) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, String(value));
  }
  return headers;
}

function fetchPinnedHttps(url, requestOptions, addresses, requestImpl = https.request) {
  return new Promise((resolve, reject) => {
    const pinnedLookup = (_hostname, lookupOptions, callback) => {
      const options = typeof lookupOptions === "object" && lookupOptions ? lookupOptions : {};
      const done = typeof lookupOptions === "function" ? lookupOptions : callback;
      const requestedFamily = Number(options.family || 0);
      const compatible = requestedFamily
        ? addresses.filter((record) => record.family === requestedFamily)
        : addresses;
      const selected = compatible[0] || addresses[0];
      if (!selected) return done(fetchError("Nessun indirizzo pubblico fissato per la fonte."));
      if (options.all) return done(null, compatible.length ? compatible : addresses);
      return done(null, selected.address, selected.family);
    };
    const request = requestImpl(url, {
      method: "GET",
      headers: requestOptions.headers,
      signal: requestOptions.signal,
      redirect: undefined,
      agent: false,
      servername: url.hostname,
      lookup: pinnedLookup
    }, (incoming) => {
      const status = Number(incoming.statusCode || 500);
      const body = [204, 205, 304].includes(status) ? null : Readable.toWeb(incoming);
      resolve(new Response(body, {
        status,
        statusText: incoming.statusMessage || "",
        headers: headersFromIncomingMessage(incoming)
      }));
    });
    request.once("error", reject);
    request.end();
  });
}

export function createSourceFetcher(options = {}) {
  const fetchImpl = options.fetchImpl;
  if (fetchImpl !== undefined && typeof fetchImpl !== "function") throw new Error("L'implementazione fetch iniettata non è valida.");
  const allowedDomains = [...new Set((options.allowedDomains || options.registry?.allowedDomains?.() || []).map(normalizeHostname))];
  const allowedMimeTypes = new Set((options.allowedMimeTypes || DEFAULT_ALLOWED_MIME_TYPES).map(normalizedMimeType));
  const maxBytes = Math.max(1024, Number(options.maxBytes || 5 * 1024 * 1024));
  const timeoutMs = Math.max(250, Number(options.timeoutMs || 15_000));
  const maxRedirects = Math.max(0, Math.min(5, Number(options.maxRedirects ?? 3)));
  const lookup = options.lookup || dns.lookup;
  const clock = options.clock || (() => new Date());

  async function fetchSource(inputUrl, requestOptions = {}) {
    let currentUrl = String(inputUrl || "");
    const visited = new Set();
    const requestAllowedDomains = requestOptions.allowedDomains === undefined
      ? allowedDomains
      : [...new Set(requestOptions.allowedDomains.map(normalizeHostname).filter(Boolean))];
    const allowSubdomains = requestOptions.allowSubdomains !== false;
    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      const target = await validateSourceTarget(currentUrl, {
        allowedDomains: requestAllowedDomains,
        allowSubdomains,
        lookup
      });
      const validated = target.url;
      if (visited.has(validated.href)) throw fetchError("Catena di redirect ciclica.", "AURUM_SOURCE_REDIRECT_LOOP");
      visited.add(validated.href);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), Number(requestOptions.timeoutMs || timeoutMs));
      let response;
      try {
        const transportOptions = {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            Accept: requestOptions.accept || [...allowedMimeTypes].join(", "),
            "User-Agent": requestOptions.userAgent || "OroActive-Aurum-Knowledge/1.0"
          }
        };
        response = fetchImpl
          ? await fetchImpl(validated.href, transportOptions)
          : await fetchPinnedHttps(validated, transportOptions, target.addresses, options.httpsRequest || https.request);
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          if (redirectCount >= maxRedirects) throw fetchError("Troppi redirect nella fonte.", "AURUM_SOURCE_REDIRECT_LIMIT");
          const location = response.headers.get("location");
          if (!location) throw fetchError("Redirect privo di destinazione.");
          await response.body?.cancel?.().catch(() => {});
          currentUrl = new URL(location, validated).href;
          continue;
        }
        if (!response.ok) throw fetchError(`Fonte non disponibile: HTTP ${response.status}.`, "AURUM_SOURCE_HTTP_ERROR");
        const contentType = normalizedMimeType(response.headers.get("content-type"));
        if (!allowedMimeTypes.has(contentType)) {
          throw fetchError(`MIME non consentito: ${contentType || "assente"}.`, "AURUM_SOURCE_MIME_BLOCKED");
        }
        const buffer = await readBoundedBody(response, Number(requestOptions.maxBytes || maxBytes));
        return Object.freeze({
          finalUrl: validated.href,
          requestedUrl: String(inputUrl || ""),
          status: response.status,
          contentType,
          contentLength: buffer.length,
          retrievedAt: clock().toISOString(),
          buffer,
          text: contentType.startsWith("text/") || contentType === "application/json" ? buffer.toString("utf8") : null
        });
      } catch (error) {
        if (error?.name === "AbortError") throw fetchError("Timeout nel recupero della fonte.", "AURUM_SOURCE_TIMEOUT");
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }
    throw fetchError("Fonte non recuperabile.");
  }

  return Object.freeze({
    fetchSource,
    validateUrl: (url, requestOptions = {}) => validateSourceUrl(url, {
      allowedDomains: requestOptions.allowedDomains || allowedDomains,
      allowSubdomains: requestOptions.allowSubdomains !== false,
      lookup
    })
  });
}
