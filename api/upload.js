import { handleUpload } from "@vercel/blob/client";

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return new Response(JSON.stringify({ error: "ADMIN_PASSWORD is not configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        if (clientPayload?.password !== adminPassword) {
          throw new Error("Incorrect password.");
        }

        const field = clientPayload?.field;
        const allowedFields = new Set([
          "resume_pdf",
          "csm_url",
          "cspo_url",
          "escape_image",
          "dnd_image",
          "common_core_image"
        ]);

        if (!allowedFields.has(field)) {
          throw new Error("Unsupported upload field.");
        }

        const imageFields = new Set([
          "escape_image",
          "dnd_image",
          "common_core_image"
        ]);

        return {
          addRandomSuffix: false,
          allowedContentTypes: imageFields.has(field)
            ? ["image/jpeg", "image/png", "image/webp", "image/gif"]
            : ["application/pdf"],
          tokenPayload: JSON.stringify({ field })
        };
      },
      onUploadCompleted: async () => {
        return;
      }
    });

    return Response.json(jsonResponse);
  } catch (error) {
    return Response.json(
      { error: error.message || "Upload failed." },
      { status: 400 }
    );
  }
}
