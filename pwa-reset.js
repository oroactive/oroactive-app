(() => {
  async function reset() {
    const build = document.body?.dataset?.build || Date.now();
    const target = `/?v=${encodeURIComponent(build)}&cache-reset=1`;
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } finally {
      window.location.replace(target);
    }
  }
  void reset();
})();
