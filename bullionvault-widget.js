(() => {
  "use strict";

  const container = document.getElementById("bullionVaultIsolatedChart");
  const fallback = document.getElementById("bullionVaultIsolatedFallback");

  function notifyParent(status) {
    window.parent.postMessage({ type: "OROACTIVE_BULLIONVAULT_WIDGET", status }, "*");
  }

  function fail() {
    if (container) container.replaceChildren();
    if (fallback) fallback.hidden = false;
    notifyParent("failed");
  }

  if (!container || typeof window.BullionVaultChart !== "function") {
    fail();
    return;
  }

  try {
    new window.BullionVaultChart({
      bullion: "gold",
      currency: "EUR",
      timeframe: "1w",
      chartType: "line",
      containerDefinedSize: true,
      displayLatestPriceLine: true,
      switchBullion: true,
      switchCurrency: true,
      switchTimeframe: true,
      switchChartType: false,
      exportButton: false
    }, "bullionVaultIsolatedChart");

    const deadline = Date.now() + 10000;
    const checkRender = () => {
      if (container.querySelector(".highcharts-container svg, svg.highcharts-root")) {
        notifyParent("ready");
        return;
      }
      if (Date.now() >= deadline) {
        fail();
        return;
      }
      window.setTimeout(checkRender, 200);
    };
    checkRender();
  } catch {
    fail();
  }
})();
