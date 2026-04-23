const GA_MEASUREMENT_ID = "G-GLK6VP4QSH";
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

async function getSiteConfig() {
  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    if (!response.ok) {
      return DEFAULT_SITE_CONFIG;
    }

    const payload = await response.json();
    return {
      ...DEFAULT_SITE_CONFIG,
      ...(payload.config || {})
    };
  } catch (error) {
    console.warn("Unable to load portfolio config from server.", error);
    return DEFAULT_SITE_CONFIG;
  }
}

function applySiteConfig(config) {
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
      const isResumeFrame = element.classList.contains("resume-frame");
      const nextSrc = isResumeFrame
        ? `${config[key]}#toolbar=0&navpanes=0&scrollbar=0`
        : config[key];
      element.setAttribute("src", nextSrc);
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
  if (document.querySelector(".admin-launch")) {
    return;
  }

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
  getSiteConfig().then((config) => {
    Object.entries(DEFAULT_SITE_CONFIG).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (field) {
        field.value = config[key] || value;
      }
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nextConfig = {};
    Object.keys(DEFAULT_SITE_CONFIG).forEach((key) => {
      nextConfig[key] = form.elements.namedItem(key).value.trim() || DEFAULT_SITE_CONFIG[key];
    });

    const uploadFields = [
      "resume_pdf",
      "csm_url",
      "cspo_url",
      "escape_image",
      "dnd_image",
      "common_core_image"
    ];

    status.textContent = "Saving changes...";
    status.dataset.state = "";

    try {
      for (const fieldName of uploadFields) {
        const fileField = form.elements.namedItem(`${fieldName}_file`);
        const file = fileField?.files?.[0];

        if (!file) {
          continue;
        }

        const uploadData = new FormData();
        uploadData.append("field", fieldName);
        uploadData.append("file", file);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadData
        });

        const uploadPayload = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadPayload.error || `Upload failed for ${fieldName}.`);
        }

        nextConfig[fieldName] = uploadPayload.url;
        form.elements.namedItem(fieldName).value = uploadPayload.url;
        fileField.value = "";
      }

      const saveResponse = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          config: nextConfig
        })
      });

      const savePayload = await saveResponse.json();
      if (!saveResponse.ok) {
        throw new Error(savePayload.error || "Unable to save config.");
      }

      status.textContent = "Changes saved for all visitors.";
      status.dataset.state = "success";
    } catch (error) {
      status.textContent = error.message || "Unable to save changes.";
      status.dataset.state = "error";
    }
  });
}

(async function initializeSite() {
  const config = await getSiteConfig();
  applySiteConfig(config);
  bindTrackedLinks();
  injectAdminButton();
  initializeAdminPage();
})();
