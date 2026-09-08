const QUOTE_CACHE_MS = 5_000;

// This cache contains only public market data. A failed refresh still rejects
// for the Quotazione page; only the widget may explicitly use the last value.
export function createBullionVaultQuoteCache({ fetchPrice, now = Date.now } = {}) {
  if (typeof fetchPrice !== "function") throw new TypeError("Quote provider required");
  const entries = new Map();
  const keyFor = (metal, market) => `${metal}:${market?.securityId || ""}`;

  async function getPrice(metal, market) {
    const key = keyFor(metal, market);
    let entry = entries.get(key);
    if (!entry) {
      entry = { quote: null, error: null, expiresAt: 0, inFlight: null };
      entries.set(key, entry);
    }
    if (entry.inFlight) return entry.inFlight;
    if (now() < entry.expiresAt) {
      if (entry.error) throw entry.error;
      if (entry.quote) return entry.quote;
    }

    entry.inFlight = Promise.resolve().then(() => fetchPrice(metal, market)).then((quote) => {
      if (!Number.isFinite(quote?.value) || quote.value <= 0
        || quote.currency !== "EUR" || quote.unit !== "KG"
        || !Number.isFinite(Date.parse(quote.fetchedAt))) {
        throw new Error("Quotazione BullionVault non valida");
      }
      entry.quote = quote;
      entry.error = null;
      entry.expiresAt = now() + QUOTE_CACHE_MS;
      return quote;
    }).catch((error) => {
      entry.error = error;
      // Coalesce retries during a provider outage as well as successful reads.
      entry.expiresAt = now() + QUOTE_CACHE_MS;
      throw error;
    }).finally(() => {
      entry.inFlight = null;
    });
    return entry.inFlight;
  }

  return {
    getPrice,
    latestPrice: (metal, market) => entries.get(keyFor(metal, market))?.quote || null
  };
}

export async function buildWidgetGoldQuote(quoteCache, goldMarket) {
  let quote;
  let stale = false;
  try {
    quote = await quoteCache.getPrice("Oro", goldMarket);
  } catch {
    quote = quoteCache.latestPrice("Oro", goldMarket);
    stale = true;
  }
  // Explicit allowlist: never serialize a provider payload or account data.
  return {
    available: Boolean(quote),
    pricePerKg: quote?.value ?? null,
    fetchedAt: quote?.fetchedAt ?? null,
    source: "BullionVault",
    currency: "EUR",
    unit: "kg",
    stale: stale || !quote
  };
}

export function createWidgetGoldQuoteHandler(quoteCache, goldMarket) {
  return async (_request, response, next) => {
    try {
      response.setHeader("Cache-Control", "no-store");
      response.json(await buildWidgetGoldQuote(quoteCache, goldMarket));
    } catch (error) {
      next(error);
    }
  };
}
