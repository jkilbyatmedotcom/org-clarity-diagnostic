// Australian Business Register enrichment via the free ABN Lookup web services.
// Gives the report and the CRM record a verified legal identity: legal name,
// entity type, ABN status and date, GST registration and state.
//
// Requires ABR_GUID (free registration: https://abr.business.gov.au/Tools/WebServices).
// Never throws — a lookup problem must not affect the diagnostic.

const ABR_BASE = "https://abr.business.gov.au/json";
const TIMEOUT_MS = 5000;

// Name search is only trusted when it is clear-cut, so we never attach the
// wrong business to a lead.
const MIN_NAME_SCORE = 95;
const MIN_SCORE_LEAD = 5;

export function cleanAbn(input) {
  return String(input || "").replace(/\D/g, "");
}

// Official ABN checksum: subtract 1 from the first digit, weight, sum, mod 89.
export function isValidAbn(input) {
  const abn = cleanAbn(input);
  if (abn.length !== 11) return false;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const digits = abn.split("").map(Number);
  digits[0] -= 1;
  return digits.reduce((sum, d, i) => sum + d * weights[i], 0) % 89 === 0;
}

export function formatAbn(abn) {
  const a = cleanAbn(abn);
  return a.length === 11 ? `${a.slice(0, 2)} ${a.slice(2, 5)} ${a.slice(5, 8)} ${a.slice(8)}` : a;
}

// ABR's JSON services wrap responses in a JavaScript callback: callback({...})
export function parseJsonp(text) {
  const start = text.indexOf("(");
  const end = text.lastIndexOf(")");
  if (start === -1 || end <= start) throw new Error("Unexpected ABR response");
  return JSON.parse(text.slice(start + 1, end));
}

async function abrGet(path, params) {
  const qs = new URLSearchParams({ ...params, callback: "c", guid: process.env.ABR_GUID });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${ABR_BASE}/${path}?${qs}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`ABR HTTP ${res.status}`);
    return parseJsonp(await res.text());
  } finally {
    clearTimeout(timer);
  }
}

function yearsSince(dateStr) {
  const d = dateStr ? new Date(dateStr) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const years = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  return years >= 0 ? Math.floor(years) : null;
}

function toRecord(d, matchedBy, matchScore) {
  return {
    status: "ok",
    matchedBy,                       // "abn" | "name"
    matchScore: matchScore ?? null,
    abn: d.Abn,
    abnFormatted: formatAbn(d.Abn),
    abnStatus: d.AbnStatus || null,  // "Active" | "Cancelled"
    activeSince: d.AbnStatusEffectiveFrom || null,
    yearsActive: yearsSince(d.AbnStatusEffectiveFrom),
    legalName: d.EntityName || null,
    businessNames: Array.isArray(d.BusinessName) ? d.BusinessName.slice(0, 5) : [],
    entityType: d.EntityTypeName || null,
    gstRegistered: Boolean(d.Gst),
    gstSince: d.Gst || null,
    state: d.AddressState || null,
    postcode: d.AddressPostcode || null,
  };
}

/**
 * Look up a business by ABN (preferred) or, failing that, by name.
 * @returns {Promise<object|null>} null when nothing was requested or the
 *   service isn't configured; { status: "ok", ... } or
 *   { status: "not_found" | "unavailable", reason } otherwise.
 */
export async function lookupBusiness({ abn, name }) {
  if (!process.env.ABR_GUID) {
    if (abn || name) console.warn("[abn] ABR_GUID not set — skipping ABN Lookup");
    return null;
  }
  const cleaned = cleanAbn(abn);

  try {
    if (cleaned) {
      if (!isValidAbn(cleaned)) return { status: "not_found", reason: "That ABN isn't valid." };
      const d = await abrGet("AbnDetails.aspx", { abn: cleaned });
      if (d.Message && /GUID/i.test(d.Message)) {
        console.warn("[abn] ABR message:", d.Message);
        return { status: "unavailable", reason: "The business register couldn't be reached." };
      }
      if (d.Message || !d.Abn) return { status: "not_found", reason: "No business found for that ABN." };
      return toRecord(d, "abn");
    }

    const q = String(name || "").trim();
    if (q.length < 3) return null;
    const res = await abrGet("MatchingNames.aspx", { name: q, maxResults: "10" });
    if (res.Message) {
      console.warn("[abn] ABR message:", res.Message);
      if (/GUID/i.test(res.Message)) return { status: "unavailable", reason: "The business register couldn't be reached." };
    }
    const names = (res.Names || [])
      .filter(n => n.Abn && (n.AbnStatus === "0000000001" || n.AbnStatus === "Active" || n.IsCurrent))
      .sort((a, b) => (b.Score || 0) - (a.Score || 0));
    const [top, second] = names;
    if (!top || (top.Score || 0) < MIN_NAME_SCORE) {
      return { status: "not_found", reason: "No clear match on the business register." };
    }
    // Several listings for the same ABN (e.g. trading names) aren't ambiguity.
    if (second && second.Abn !== top.Abn && (top.Score - (second.Score || 0)) < MIN_SCORE_LEAD) {
      return { status: "not_found", reason: "Several businesses match that name." };
    }
    const d = await abrGet("AbnDetails.aspx", { abn: top.Abn });
    if (d.Message || !d.Abn) return { status: "not_found", reason: "No clear match on the business register." };
    return toRecord(d, "name", top.Score);
  } catch (err) {
    console.error("[abn] lookup failed", err?.message || err);
    return { status: "unavailable", reason: "The business register couldn't be reached." };
  }
}
