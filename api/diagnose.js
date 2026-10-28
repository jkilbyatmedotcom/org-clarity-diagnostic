import { buildPrompt } from "../lib/prompt.js";
import { deliverReport } from "../lib/deliver.js";

// ─── Fixed server-side settings ───────────────────────────────────────────────
// The browser can no longer choose the model, token budget or prompt.
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 8000;

const LIMITS = {
  roles: 10,
  filesPerRole: 3,
  charsPerFile: 40000,    // longer files are truncated, not rejected
  totalChars: 250000,     // whole request
  field: 4000,            // purpose text, scaffold answers, manual role text
  short: 200,             // names, titles, industry
};

const EMAIL_RE = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[a-z]{2,}$/i;

// Best-effort throttle. Serverless instances don't share memory, so this slows
// abuse from one source rather than guaranteeing a hard cap.
const hits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 6;
function throttled(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  let o;
  try { o = new URL(origin); } catch { return false; }
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (o.host === host) return true; // same deployment (production, previews, custom domain)
  if (o.hostname === "localhost" || o.hostname === "127.0.0.1") return true;
  const extra = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  return extra.includes(o.origin);
}

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function fail(res, status, message) {
  return res.status(status).json({ error: { message } });
}

function parseInput(body) {
  if (!body || typeof body !== "object") return { error: "Invalid request." };

  // Honeypot: real users never see or fill this field.
  if (str(body.website, 100)) return { error: "Invalid request." };

  const contact = {
    name: str(body.contact?.name, LIMITS.short),
    email: str(body.contact?.email, LIMITS.short).toLowerCase(),
    optIn: body.contact?.optIn === true,
  };
  if (!contact.name) return { error: "Please enter your name." };
  if (!EMAIL_RE.test(contact.email)) return { error: "Please enter a valid email address." };

  const purposeMode = body.purposeMode === "have" || body.purposeMode === "build" ? body.purposeMode : null;
  if (!purposeMode) return { error: "Please select whether you have an org purpose statement." };

  const purposeText = str(body.purposeText, LIMITS.field);
  const scaffold = {
    what: str(body.scaffold?.what, LIMITS.field),
    whom: str(body.scaffold?.whom, LIMITS.field),
    outcome: str(body.scaffold?.outcome, LIMITS.field),
    why: str(body.scaffold?.why, LIMITS.field),
  };
  if (purposeMode === "have" && !purposeText) return { error: "Please enter your org purpose statement." };
  if (purposeMode === "build" && !scaffold.what) return { error: "Please answer at least the first purpose question." };

  if (!Array.isArray(body.roles)) return { error: "Please add at least one role." };
  const roles = body.roles.slice(0, LIMITS.roles).map(r => ({
    title: str(r?.title, LIMITS.short),
    manualText: str(r?.manualText, LIMITS.field),
    files: (Array.isArray(r?.files) ? r.files : []).slice(0, LIMITS.filesPerRole).map(f => ({
      name: str(f?.name, LIMITS.short) || "document",
      text: typeof f?.text === "string" ? f.text.slice(0, LIMITS.charsPerFile) : "",
    })).filter(f => f.text.trim()),
  })).filter(r => r.files.length > 0 || r.manualText);
  if (roles.length === 0) return { error: "Please add at least one role — upload a JD or enter role details manually." };

  const input = {
    orgName: str(body.orgName, LIMITS.short),
    industry: str(body.industry, LIMITS.short),
    purposeMode, purposeText, scaffold, roles,
  };
  if (JSON.stringify(input).length > LIMITS.totalChars) {
    return { error: "That's more text than the diagnostic can read in one go. Try fewer roles or shorter documents." };
  }
  return { contact, input };
}

function extractJson(raw) {
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  const s = first !== -1 && last !== -1 ? raw.slice(first, last + 1) : raw.replace(/```json|```/g, "").trim();
  return JSON.parse(s);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(res, 405, "Method not allowed");
  }
  if (!originAllowed(req)) return fail(res, 403, "Forbidden");

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
  if (throttled(ip)) return fail(res, 429, "You've run several diagnostics in a short time. Please wait a few minutes and try again.");

  const parsed = parseInput(req.body);
  if (parsed.error) return fail(res, 400, parsed.error);
  const { contact, input } = parsed;

  let report;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: buildPrompt(input) }],
      }),
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      console.error("[diagnose] Anthropic error", response.status, JSON.stringify(data.error || data).slice(0, 500));
      return fail(res, 502, "The diagnostic service is busy. Please try again in a minute.");
    }
    const raw = data.content?.find(b => b.type === "text")?.text || "";
    report = extractJson(raw);
  } catch (err) {
    console.error("[diagnose] failed", err);
    return fail(res, 502, "The diagnostic couldn't be completed. Please try again — if it keeps happening, try fewer roles or shorter documents.");
  }

  // Report is ready. Deliver it (emails + CRM) before responding, because the
  // function may be frozen as soon as the response is sent.
  let delivery = { emailed: false, ownerNotified: false, crm: false };
  try {
    delivery = await deliverReport(contact, report);
  } catch (err) {
    console.error("[diagnose] delivery failed", err);
  }

  return res.status(200).json({ report, delivery });
}
