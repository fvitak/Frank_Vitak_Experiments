import { Resend } from "resend";

const DEFAULT_SEGMENT_ID = "7f67cf1b-9598-4baf-9aa4-0a120ba1941d";

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
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;
  const contactToEmail = process.env.CONTACT_TO_EMAIL || "fvitak@gmail.com";
  const resendSegmentId = process.env.RESEND_SEGMENT_ID || DEFAULT_SEGMENT_ID;

  if (!resendApiKey || !resendFromEmail) {
    return json({ error: "Resend environment variables are not configured." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const name = body.name?.trim();
  const email = body.email?.trim();
  const message = body.message?.trim();

  if (!name || !email || !message) {
    return json({ error: "Name, email, and message are required." }, 400);
  }

  const resend = new Resend(resendApiKey);

  if (resendSegmentId) {
    try {
      await resend.contacts.create({
        audienceId: resendSegmentId,
        email,
        firstName: name,
        unsubscribed: false
      });
    } catch (error) {
      console.error("Resend contacts.create error:", error);
    }
  }

  try {
    await resend.emails.send({
      from: resendFromEmail,
      to: [contactToEmail],
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

    return json({ ok: true });
  } catch (error) {
    console.error("Resend emails.send error:", error);
    return json({ error: "Unable to send message." }, 500);
  }
}
