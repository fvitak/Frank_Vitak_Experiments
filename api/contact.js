function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("CONTACT_TIMEOUT")), ms);
    })
  ]);
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

  try {
    const response = await withTimeout(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: [contactToEmail],
          subject: `Portfolio contact from ${name}`,
          reply_to: email,
          text: `New portfolio contact\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
          html: `
            <h2>New portfolio contact</h2>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Message:</strong></p>
            <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
          `
        })
      }),
      10000
    );

    const rawBody = await withTimeout(response.text(), 5000);
    const payload = rawBody ? JSON.parse(rawBody) : {};
    if (!response.ok) {
      return json(
        { error: payload.message || payload.error || "Unable to send message." },
        response.status
      );
    }

    return json({ ok: true });
  } catch (error) {
    return json(
      {
        error:
          error.message === "CONTACT_TIMEOUT"
            ? "Contact request timed out."
            : "Unable to send message."
      },
      500
    );
  }
}
