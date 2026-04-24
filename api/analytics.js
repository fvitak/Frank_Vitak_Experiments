export const config = { runtime: "edge" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get access token from Google.");
  return data.access_token;
}

async function runReport(accessToken, propertyId, body) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `GA4 API error ${res.status}`);
  return data;
}

export default async function handler(request) {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed." }, 405);
  }

  const propertyId = process.env.GA4_PROPERTY_ID;
  const missing = ["GA4_PROPERTY_ID", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"]
    .filter(k => !process.env[k]);
  if (missing.length) {
    return json({ error: `Missing env vars: ${missing.join(", ")}` }, 500);
  }

  const url = new URL(request.url);
  const daysParam = parseInt(url.searchParams.get("days") || "30");
  const days = [7, 30, 90].includes(daysParam) ? daysParam : 30;
  const dateRange = { startDate: `${days}daysAgo`, endDate: "today" };

  try {
    const accessToken = await getAccessToken();

    const [overview, clicks, trend] = await Promise.all([
      runReport(accessToken, propertyId, {
        dateRanges: [dateRange],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "screenPageViews" }
        ]
      }),
      runReport(accessToken, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: "customEvent:label" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            stringFilter: { matchType: "EXACT", value: "portfolio_click" }
          }
        },
        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }]
      }).catch(() => ({ rows: [] })),
      runReport(accessToken, propertyId, {
        dateRanges: [dateRange],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }]
      }).catch(() => ({ rows: [] }))
    ]);

    const overviewRow = overview.rows?.[0];
    const summary = {
      sessions: overviewRow?.metricValues?.[0]?.value || "0",
      users: overviewRow?.metricValues?.[1]?.value || "0",
      pageViews: overviewRow?.metricValues?.[2]?.value || "0"
    };

    const clickRows = (clicks.rows || []).map(row => ({
      label: row.dimensionValues[0].value,
      count: parseInt(row.metricValues[0].value)
    }));

    const trendRows = (trend.rows || []).map(row => ({
      date: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value)
    }));

    return json({ summary, clicks: clickRows, trend: trendRows, days });
  } catch (error) {
    console.error("Analytics error:", error);
    return json({ error: error.message }, 500);
  }
}
