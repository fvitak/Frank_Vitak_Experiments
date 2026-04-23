const GA_MEASUREMENT_ID = "G-XXXXXXXXXX";

function setupGoogleAnalytics(measurementId) {
  if (!measurementId || measurementId === "G-XXXXXXXXXX") {
    return false;
  }

  const scriptTag = document.createElement("script");
  scriptTag.async = true;
  scriptTag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(scriptTag);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag("js", new Date());
  window.gtag("config", measurementId);
  return true;
}

const analyticsEnabled = setupGoogleAnalytics(GA_MEASUREMENT_ID);

function trackClick(label, href) {
  if (analyticsEnabled && typeof window.gtag === "function") {
    window.gtag("event", "portfolio_click", {
      event_category: "engagement",
      event_label: label,
      link_url: href || "not_provided"
    });
    return;
  }

  console.info("[tracking preview]", { label, href });
}

document.querySelectorAll(".tracked-link").forEach((link) => {
  link.addEventListener("click", () => {
    const label = link.dataset.analyticsLabel || "unlabeled_click";
    trackClick(label, link.getAttribute("href"));
  });
});
