export const config = { runtime: "edge" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

function getEnv() {
  return {
    propertyId: process.env.GA4_PROPERTY_ID,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    serviceAccountPrivateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  };
}

function base64UrlEncode(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToArrayBuffer(pem) {
  const normalized = pem.replace(/\\n/g, "\n");
  const body = normalized
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

async function fetchToken(body) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.access_token) {
    const oauthMessage = data.error_description || data.error || `HTTP ${res.status}`;
    throw new Error(`Google OAuth token request failed: ${oauthMessage}`);
  }

  return data.access_token;
}

async function getServiceAccountAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = { alg: "RS256", typ: "JWT" };
  const jwtClaimSet = {
    iss: env.serviceAccountEmail,
    scope: ANALYTICS_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now
  };

  const unsignedJwt = `${base64UrlEncode(JSON.stringify(jwtHeader))}.${base64UrlEncode(JSON.stringify(jwtClaimSet))}`;
  const signingKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(env.serviceAccountPrivateKey),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    signingKey,
    new TextEncoder().encode(unsignedJwt)
  );

  return fetchToken(
    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsignedJwt}.${base64UrlEncode(new Uint8Array(signature))}`
    })
  );
}

async function getRefreshTokenAccessToken(env) {
  return fetchToken(
    new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      refresh_token: env.refreshToken,
      grant_type: "refresh_token"
    })
  );
}

function getConfiguredAuthMode(env) {
  if (env.serviceAccountEmail && env.serviceAccountPrivateKey) {
    return "service_account";
  }

  if (env.clientId && env.clientSecret && env.refreshToken) {
    return "refresh_token";
  }

  return null;
}

function getMissingEnv(env, authMode) {
  const required = authMode === "service_account"
    ? {
        GA4_PROPERTY_ID: env.propertyId,
        GOOGLE_SERVICE_ACCOUNT_EMAIL: env.serviceAccountEmail,
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: env.serviceAccountPrivateKey
      }
    : {
        GA4_PROPERTY_ID: env.propertyId,
        GOOGLE_CLIENT_ID: env.clientId,
        GOOGLE_CLIENT_SECRET: env.clientSecret,
        GOOGLE_REFRESH_TOKEN: env.refreshToken
      };

  return Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

async function getAccessToken(env) {
  const authMode = getConfiguredAuthMode(env);

  if (authMode === "service_account") {
    return getServiceAccountAccessToken(env);
  }

  return getRefreshTokenAccessToken(env);
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

  const env = getEnv();
  const authMode = getConfiguredAuthMode(env) || "service_account";
  const missingEnv = getMissingEnv(env, authMode);
  if (missingEnv.length) {
    return json({ error: `Analytics not configured. Missing: ${missingEnv.join(", ")}` }, 500);
  }

  const url = new URL(request.url);
  const daysParam = parseInt(url.searchParams.get("days") || "30");
  const days = [7, 30, 90].includes(daysParam) ? daysParam : 30;
  const dateRange = { startDate: `${days}daysAgo`, endDate: "today" };

  try {
    const accessToken = await getAccessToken(env);

    const [overview, clicks, trend] = await Promise.all([
      runReport(accessToken, env.propertyId, {
        dateRanges: [dateRange],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "screenPageViews" }
        ]
      }),
      runReport(accessToken, env.propertyId, {
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
      runReport(accessToken, env.propertyId, {
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
