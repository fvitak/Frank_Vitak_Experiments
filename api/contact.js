import { Resend } from "resend";

const CONTACT_SEGMENT_ID = "7f67cf1b-9598-4baf-9aa4-0a120ba1941d";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;
  const contactToEmail = process.env.CONTACT_TO_EMAIL || "fvitak@gmail.com";

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

  try {
    await resend.emails.send({
      from: resendFromEmail,
      to: [contactToEmail],
      subject: `Portfolio contact from ${name}`,
      replyTo: email,
      html: `
        <h2>New portfolio contact</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `
    });

    try {
      await resend.contacts.segments.add({
        email,
        segmentId: CONTACT_SEGMENT_ID
      });
    } catch (error) {
      console.warn("Unable to add contact to Resend segment.", error);
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: "Unable to send message." }, 500);
  }
}
