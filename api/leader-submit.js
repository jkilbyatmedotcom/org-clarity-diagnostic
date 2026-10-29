import crypto from "node:crypto";
import { validateLeader } from "../lib/culture/leader.js";
import { saveLeader, storageConfigured } from "../lib/culture/store.js";

// Best-effort throttle per server instance.
const hits = new Map();
function throttled(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 10;
}

function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    const o = new URL(origin);
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    return o.host === host || o.hostname === "localhost" || o.hostname === "127.0.0.1";
  } catch { return false; }
}

const fail = (res, status, message) => res.status(status).json({ error: { message } });

export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return fail(res, 405, "Method not allowed"); }
  if (!originAllowed(req)) return fail(res, 403, "Forbidden");
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (throttled(ip)) return fail(res, 429, "Too many submissions from this connection. Please try again later.");
  if (!storageConfigured()) {
    console.error("[leader] storage not configured — response NOT saved");
    return fail(res, 503, "The survey isn't accepting responses yet. Please try again later.");
  }

  const { record, error } = validateLeader(req.body);
  if (error) return fail(res, 400, error);

  try {
    await saveLeader({ id: crypto.randomUUID(), ...record });
  } catch (err) {
    console.error("[leader] save failed", err);
    return fail(res, 502, "Your answers couldn't be saved. Please try again in a minute.");
  }
  return res.status(200).json({ ok: true });
}
