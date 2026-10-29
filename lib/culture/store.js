// Response storage in Upstash Redis via its REST API (add it in Vercel →
// Storage → Upstash for Redis; Vercel sets the environment variables).
// Each response is one JSON entry appended to a list. Private: readable only
// with the token, which lives in Vercel.

const LIST_KEY = "ecf:responses";

function creds() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export const storageConfigured = () => Boolean(creds());

async function redis(command) {
  const c = creds();
  if (!c) throw new Error("Storage not configured");
  const res = await fetch(c.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`Redis error ${res.status}: ${data.error || ""}`);
  return data.result;
}

export async function saveResponse(record) {
  await redis(["RPUSH", LIST_KEY, JSON.stringify(record)]);
}

export async function loadResponses() {
  const rows = await redis(["LRANGE", LIST_KEY, "0", "-1"]);
  return (rows || []).map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
}
