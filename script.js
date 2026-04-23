const GA_MEASUREMENT_ID = "G-XXXXXXXXXX";
const ADMIN_STORAGE_KEY = "frank-vitak-portfolio-config";
const ADMIN_SAVE_PASSWORD = "Ravens4theWin#1";
const DEFAULT_SITE_CONFIG = {
  summary_copy: "Certified Scrum Product Owner (CSPO) and Certified ScrumMaster (CSM) with four years of hands-on experience owning backlogs, writing user stories and acceptance criteria, and keeping cross-functional teams aligned in JIRA. I've worked across consumer-facing marketplaces and enterprise SaaS platforms, and I'm most effective at the translation layer: turning complex business requirements and stakeholder needs into clear, buildable specs. Data-driven by habit, documentation-disciplined by practice. The projects below are what I build when I'm not at work.",
  resume_page: "./resume.html",
  resume_pdf: "./documents/frank-vitak-resume.pdf",
  resume_back_home: "./index.html",
  linkedin_url: "https://www.linkedin.com/in/frankvitak",
  email_url: "mailto:fvitak@gmail.com",
  csm_url: "./documents/frank-vitak-csm-certificate.pdf",
  cspo_url: "./documents/frank-vitak-cspo-certificate.pdf",
  escape_url: "https://escape-the-cubes.vercel.app/",
  escape_image: "./images/escape-the-cube.png",
  dnd_url: "https://spring-ridge-dnd.vercel.app/",
  dnd_image: "./images/dnd-simulator.png",
  common_core_url: "https://common-core-for-old-people.vercel.app/",
  common_core_image: "./images/common-core-old-brains.png"
};

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

function getStoredConfig() {
  try {
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("Unable to load stored portfolio config.", error);
    return {};
  }
}

function getSiteConfig() {
  return {
    ...DEFAULT_SITE_CONFIG,
    ...getStoredConfig()
  };
}

function applySiteConfig() {
  const config = getSiteConfig();

  document.querySelectorAll("[data-config-text]").forEach((element) => {
    const key = element.dataset.configText;
    if (config[key]) {
      element.textContent = config[key];
    }
  });

  document.querySelectorAll("[data-config-link]").forEach((element) => {
    const key = element.dataset.configLink;
    if (config[key]) {
      element.setAttribute("href", config[key]);
    }
  });

  document.querySelectorAll("[data-config-src]").forEach((element) => {
    const key = element.dataset.configSrc;
    if (config[key]) {
      element.setAttribute("src", config[key]);
    }
  });
}

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

function bindTrackedLinks() {
  document.querySelectorAll(".tracked-link").forEach((link) => {
    if (link.dataset.trackingBound === "true") {
      return;
    }

    link.addEventListener("click", () => {
      const label = link.dataset.analyticsLabel || "unlabeled_click";
      trackClick(label, link.getAttribute("href"));
    });

    link.dataset.trackingBound = "true";
  });
}

function injectAdminButton() {
  const adminButton = document.createElement("a");
  adminButton.href = "./admin.html";
  adminButton.className = "admin-launch";
  adminButton.textContent = "Admin";
  document.body.appendChild(adminButton);
}

function initializeAdminPage() {
  const form = document.querySelector("#admin-form");
  if (!form) {
    return;
  }

  const status = document.querySelector("#admin-status");
  const resetButton = document.querySelector("#reset-config");
  const config = getSiteConfig();

  Object.entries(DEFAULT_SITE_CONFIG).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) {
      field.value = config[key] || value;
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const password = form.elements.namedItem("save_password").value;

    if (password !== ADMIN_SAVE_PASSWORD) {
      status.textContent = "Incorrect password. Changes were not saved.";
      status.dataset.state = "error";
      return;
    }

    const nextConfig = {};
    Object.keys(DEFAULT_SITE_CONFIG).forEach((key) => {
      nextConfig[key] = form.elements.namedItem(key).value.trim() || DEFAULT_SITE_CONFIG[key];
    });

    window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(nextConfig));
    status.textContent = "Changes saved in this browser.";
    status.dataset.state = "success";
    form.elements.namedItem("save_password").value = "";
  });

  resetButton.addEventListener("click", () => {
    window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    Object.entries(DEFAULT_SITE_CONFIG).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (field) {
        field.value = value;
      }
    });
    form.elements.namedItem("save_password").value = "";
    status.textContent = "Browser-side changes reset to defaults.";
    status.dataset.state = "success";
  });
}

applySiteConfig();
bindTrackedLinks();
injectAdminButton();
initializeAdminPage();
