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
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch("/api/config", {
      cache: "no-store",
      signal: controller.signal
    });
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
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function readJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      error: text
    };
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

function initializeContactModal() {
  const modal = document.querySelector("#contact-modal");
  const dialog = modal?.querySelector(".contact-modal-dialog");
  const form = document.querySelector("#contact-form");
  const status = document.querySelector("#contact-status");

  if (!modal || !dialog || !form || !status) {
    return;
  }

  const setState = (state) => {
    dialog.dataset.contactState = state;
  };

  const openModal = () => {
    setState("form");
    form.reset();
    status.textContent = "";
    status.dataset.state = "";
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    modal.hidden = true;
    document.body.style.overflow = "";
  };

  window.__openContactModal = openModal;
  window.__closeContactModal = closeModal;

  document.querySelectorAll("[data-contact-trigger='true']").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openModal();
    });
  });

  modal.querySelectorAll("[data-contact-close='true']").forEach((closer) => {
    closer.addEventListener("click", closeModal);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setState("sending");

    const payload = {
      name: form.elements.namedItem("name").value.trim(),
      email: form.elements.namedItem("email").value.trim(),
      message: form.elements.namedItem("message").value.trim()
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to send message.");
      }

      setState("success");
    } catch (error) {
      setState("form");
      status.textContent = error.message || "Unable to send message.";
      status.dataset.state = "error";
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });
}

function initializeAdminPage() {
  const form = document.querySelector("#admin-form");
  if (!form) {
    return;
  }

  const status = document.querySelector("#admin-status");
  const saveButton = document.querySelector("#admin-save-button");
  const passwordModal = document.querySelector("#admin-password-modal");
  const passwordInput = document.querySelector("#admin-password-input");
  const passwordStatus = document.querySelector("#admin-password-status");
  const passwordConfirm = document.querySelector("#admin-password-confirm");

  const openPasswordModal = () => {
    passwordModal.hidden = false;
    passwordInput.value = "";
    passwordStatus.textContent = "";
    document.body.style.overflow = "hidden";
    passwordInput.focus();
  };

  const closePasswordModal = () => {
    passwordModal.hidden = true;
    passwordInput.value = "";
    passwordStatus.textContent = "";
    document.body.style.overflow = "";
  };

  getSiteConfig().then((config) => {
    Object.entries(DEFAULT_SITE_CONFIG).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (field) {
        field.value = config[key] || value;
      }
    });
  });

  const runSave = async () => {
    const password = passwordInput.value;

    if (!password) {
      passwordStatus.textContent = "Password is required.";
      passwordStatus.dataset.state = "error";
      return;
    }

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
    passwordStatus.textContent = "";
    passwordStatus.dataset.state = "";

    try {
      for (const fieldName of uploadFields) {
        const fileField = form.elements.namedItem(`${fieldName}_file`);
        const file = fileField?.files?.[0];

        if (!file) {
          continue;
        }

        const uploadData = new FormData();
        uploadData.append("password", password);
        uploadData.append("field", fieldName);
        uploadData.append("file", file);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadData
        });

        const uploadPayload = await readJsonResponse(uploadResponse);
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
          password,
          config: nextConfig
        })
      });

      const savePayload = await readJsonResponse(saveResponse);
      if (!saveResponse.ok) {
        throw new Error(savePayload.error || "Unable to save config.");
      }

      closePasswordModal();
      status.textContent = "Changes saved for all visitors. Refresh the public page to confirm the update.";
      status.dataset.state = "success";
    } catch (error) {
      const message = error.message || "Unable to save changes.";
      passwordStatus.textContent = message;
      passwordStatus.dataset.state = "error";
      status.textContent = message;
      status.dataset.state = "error";
    }
  };

  saveButton.addEventListener("click", () => {
    openPasswordModal();
  });

  passwordConfirm.addEventListener("click", () => {
    runSave();
  });

  passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runSave();
    }
  });

  passwordModal.querySelectorAll("[data-admin-password-close='true']").forEach((closer) => {
    closer.addEventListener("click", closePasswordModal);
  });
}

(async function initializeSite() {
  bindTrackedLinks();
  initializeContactModal();
  initializeAdminPage();

  const config = await getSiteConfig();
  applySiteConfig(config);
})();
