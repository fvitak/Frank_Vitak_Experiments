export const config = { runtime: "edge" };

import { Resend } from "resend";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return json({ error: "RESEND_API_KEY is not configured." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const name = body.name?.trim();
  const email = body.email?.trim();
  const message = body.message?.trim();

  if (!name || !email || !message) {
    return json({ error: "Name, email, and message are required." }, 400);
  }

  try {
    const resend = new Resend(resendApiKey);

    const sendPromise = resend.emails.send({
      from: "Frank Vitak <onboarding@resend.dev>",
      to: ["fvitak@gmail.com"],
      subject: `Portfolio contact from ${name}`,
      replyTo: email,
      text: `New portfolio contact\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `
        <h2>New portfolio contact</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
      `
    });

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Resend timed out")), 8000)
    );

    await Promise.race([sendPromise, timeout]);

    return json({ ok: true });
  } catch (error) {
    console.error("Resend error:", error);
    return json({ error: "Unable to send message." }, 500);
  }
}
