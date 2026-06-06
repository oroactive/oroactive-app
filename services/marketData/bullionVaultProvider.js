export function parseBullionVaultPrices(xml = "") {
  const buyMatch = String(xml).match(/<buyPrices>[\s\S]*?<price\b[^>]*\blimit="([^"]+)"/i);
  const sellMatch = String(xml).match(/<sellPrices>[\s\S]*?<price\b[^>]*\blimit="([^"]+)"/i);
  const buy = buyMatch ? Number(buyMatch[1]) : null;
  const sell = sellMatch ? Number(sellMatch[1]) : null;
  const validPrices = [buy, sell].filter((value) => Number.isFinite(value) && value > 0);
  if (!validPrices.length) return null;
  const value = validPrices.length === 2 ? (validPrices[0] + validPrices[1]) / 2 : validPrices[0];
  return { value, buy, sell };
}

export async function fetchBullionVaultSpotPrice({
  metal,
  market,
  currency = "EUR",
  marketUrl = "https://www.bullionvault.com/view_market_xml.do",
  fetchImpl = fetch,
  timeoutMs = 7000
} = {}) {
  if (!market?.securityId) throw new Error("Mercato BullionVault non configurato");
  const url = new URL(marketUrl);
  url.searchParams.set("considerationCurrency", currency);
  url.searchParams.set("securityId", market.securityId);
  url.searchParams.set("quantity", "0.001");
  url.searchParams.set("marketWidth", "1");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { Accept: "application/xml,text/xml,*/*" }
    });
    if (!response.ok) throw new Error(`BullionVault HTTP ${response.status}`);
    const xml = await response.text();
    const prices = parseBullionVaultPrices(xml);
    if (!prices) throw new Error("Prezzo BullionVault non disponibile");
    return {
      metal,
      securityId: market.securityId,
      currency,
      unit: "KG",
      source: market.source,
      fetchedAt: new Date().toISOString(),
      rawPayload: {
        provider: "bullionvault",
        security_id: market.securityId,
        market_source: market.source,
        buy: prices.buy,
        sell: prices.sell,
        url: url.toString()
      },
      ...prices
    };
  } finally {
    clearTimeout(timeout);
  }
}
