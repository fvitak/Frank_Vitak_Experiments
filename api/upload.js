import { put } from "@vercel/blob";

const ALLOWED_FIELDS = new Set([
  "resume_pdf",
  "csm_url",
  "cspo_url",
  "escape_image",
  "dnd_image",
  "common_core_image"
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function extensionFor(fileName) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "bin";
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return json({ error: "ADMIN_PASSWORD is not configured." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const password = body.password;
  const field = body.field;
  const fileName = body.fileName;
  const contentType = body.contentType;
  const base64 = body.base64;

  if (password !== adminPassword) {
    return json({ error: "Incorrect password." }, 401);
  }

  if (!ALLOWED_FIELDS.has(field)) {
    return json({ error: "Unsupported upload field." }, 400);
  }

  if (!fileName || !base64) {
    return json({ error: "Missing file upload." }, 400);
  }

  try {
    const extension = extensionFor(fileName);
    const pathname = `site-assets/${field}.${extension}`;
    const bytes = Buffer.from(base64, "base64");

    const blob = await put(pathname, bytes, {
      access: "public",
      allowOverwrite: true,
      contentType: contentType || undefined
    });

    return json({ ok: true, field, url: blob.url });
  } catch (error) {
    return json(
      {
        error: error?.message || `Unable to upload file for ${field}.`
      },
      500
    );
  }
}
