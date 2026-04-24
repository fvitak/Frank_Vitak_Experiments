export const config = { runtime: "edge" };

const DEFAULT_SITE_CONFIG = {
  summary_copy:
    "Certified Scrum Product Owner (CSPO) and Certified ScrumMaster (CSM) with four years of hands-on experience owning backlogs, writing user stories and acceptance criteria, and keeping cross-functional teams aligned in JIRA. I've worked across consumer-facing marketplaces and enterprise SaaS platforms, and I'm most effective at the translation layer: turning complex business requirements and stakeholder needs into clear, buildable specs. Data-driven by habit, documentation-disciplined by practice. The projects below are what I build when I'm not at work.",
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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

export default function handler(request) {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed." }, 405);
  }

  return json({ config: DEFAULT_SITE_CONFIG });
}
