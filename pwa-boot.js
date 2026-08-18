(() => {
  const htmlBuildId = document.querySelector('meta[name="oroactive-build-id"]')?.content || "";
  const recoveryKey = "oroactive-recovery-build";
  window.__OROACTIVE_BOOT_BUILD_ID__ = htmlBuildId;

  async function resetStalePwa(serverBuildId) {
    if (!serverBuildId || sessionStorage.getItem(recoveryKey) === serverBuildId) return;
    sessionStorage.setItem(recoveryKey, serverBuildId);
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
      await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
    }
    if ("caches" in window) {
      const keys = await window.caches.keys().catch(() => []);
      await Promise.all(keys.map((key) => window.caches.delete(key).catch(() => false)));
    }
    const url = new URL(window.location.href);
    url.searchParams.set("app-build", serverBuildId);
    url.searchParams.set("cache-reset", serverBuildId);
    window.location.replace(url.toString());
  }

  async function verifyBootBuild() {
    try {
      const response = await fetch("/version.json", {
        cache: "no-store",
        headers: { Accept: "application/json", "Cache-Control": "no-cache" }
      });
      if (!response.ok) return;
      const version = await response.json();
      const serverBuildId = String(version.assetBuildId || "").trim();
      if (serverBuildId && htmlBuildId && serverBuildId !== htmlBuildId) {
        await resetStalePwa(serverBuildId);
      } else if (serverBuildId === htmlBuildId) {
        sessionStorage.removeItem(recoveryKey);
      }
    } catch {
      // L'app continua ad avviarsi anche se la verifica versione non è raggiungibile.
    }
  }

  void verifyBootBuild();
})();
