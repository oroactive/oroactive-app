import { createSourceVersion } from "./sourceVersioning.js";
import { isSourceStale } from "./sourceRegistry.js";

export function createKnowledgeScheduler({ registry, syncSource, clock = () => new Date(), setIntervalFn = setInterval, clearIntervalFn = clearInterval } = {}) {
  if (!registry || typeof syncSource !== "function") throw new Error("Registry e syncSource obbligatori.");
  let timer = null;
  async function runDue() {
    const now = clock();
    const results = [];
    for (const source of registry.list({ active: true }).filter((item) => isSourceStale(item, now))) {
      try {
        const fetched = await syncSource(source, { autoApprove: false, requiresManualReview: true });
        const version = fetched?.content === undefined ? null : createSourceVersion({ ...fetched, source_key: source.source_key }, { clock });
        results.push({ source_key: source.source_key, status: "pending_review", version });
      } catch (error) {
        results.push({ source_key: source.source_key, status: "failed", error: error.message });
      }
    }
    return results;
  }
  return Object.freeze({
    runDue,
    start(intervalMs = 15 * 60 * 1000) {
      if (timer) return false;
      timer = setIntervalFn(() => { void runDue(); }, Math.max(60_000, Number(intervalMs)));
      return true;
    },
    stop() {
      if (!timer) return false;
      clearIntervalFn(timer);
      timer = null;
      return true;
    }
  });
}
