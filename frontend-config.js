(() => {
  const configuredBase = window.OROACTIVE_API_BASE_URL || window.OROACTIVE_API_BASE || "";
  const fallbackBase = window.location.protocol === "file:" ? "https://app.oroactive.it" : window.location.origin;
  const apiBaseUrl = String(configuredBase || fallbackBase)
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");

  window.OroActiveConfig = {
    apiBaseUrl,
    apiBase: `${apiBaseUrl}/api`,
    debug: window.location.search.includes("debug=1")
  };
})();
