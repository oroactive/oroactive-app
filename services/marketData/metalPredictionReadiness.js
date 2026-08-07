export function analyzeMetalPredictionHistory(history = [], options = {}) {
  const now = Number(options.now || Date.now());
  const minimumDays = Math.max(2, Number(options.minimumDays || 10));
  const maximumAgeHours = Math.max(1, Number(options.maximumAgeHours || 72));
  const byUtcDay = new Map();
  const observedAt = (row) => new Date(row?.provider_timestamp || row?.created_at || 0).getTime();
  for (const row of history) {
    const timestamp = observedAt(row);
    if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > now + 5 * 60 * 1000) continue;
    if (!Number.isFinite(Number(row?.price_per_gram)) || Number(row.price_per_gram) <= 0) continue;
    const day = new Date(timestamp).toISOString().slice(0, 10);
    const existing = byUtcDay.get(day);
    const existingTimestamp = existing ? observedAt(existing) : 0;
    if (!existing || timestamp >= existingTimestamp) byUtcDay.set(day, row);
  }
  const dailyHistory = [...byUtcDay.values()]
    .sort((first, second) => observedAt(first) - observedAt(second));
  const firstTimestamp = dailyHistory.length ? observedAt(dailyHistory[0]) : 0;
  const latest = dailyHistory.at(-1) || null;
  const latestTimestamp = latest ? observedAt(latest) : 0;
  const spanDays = firstTimestamp && latestTimestamp ? (latestTimestamp - firstTimestamp) / 864e5 : 0;
  const latestAgeHours = latestTimestamp ? Math.max(0, (now - latestTimestamp) / 36e5) : Infinity;
  let warning = "";
  if (dailyHistory.length < minimumDays) {
    warning = `Storico insufficiente: servono almeno ${minimumDays} giornate distinte, disponibili ${dailyHistory.length}.`;
  } else if (spanDays < minimumDays - 1) {
    warning = `Storico insufficiente: servono almeno ${minimumDays - 1} giorni di copertura temporale.`;
  } else if (latestAgeHours > maximumAgeHours) {
    warning = `Ultima quotazione troppo vecchia per calcolare un trend affidabile (${Math.round(latestAgeHours)} ore).`;
  }
  return {
    sufficient: !warning,
    history: dailyHistory,
    latest,
    spot: latestAgeHours <= maximumAgeHours ? latest : null,
    raw_points: history.length,
    daily_points: dailyHistory.length,
    span_days: spanDays,
    latest_age_hours: latestAgeHours,
    warning
  };
}
