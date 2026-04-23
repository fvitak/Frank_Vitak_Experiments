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

function isUploadFile(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof value.name === "string" &&
    typeof value.arrayBuffer === "function"
  );
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const formData = await request.formData();
  const field = formData.get("field");
  const file = formData.get("file");

  if (!ALLOWED_FIELDS.has(field)) {
    return json({ error: "Unsupported upload field." }, 400);
  }

  if (!isUploadFile(file)) {
    return json({ error: "Missing file upload." }, 400);
  }

  try {
    const extension = extensionFor(file.name);
    const pathname = `site-assets/${field}.${extension}`;

    const blob = await put(pathname, file, {
      access: "public",
      allowOverwrite: true,
      contentType: file.type || undefined
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
