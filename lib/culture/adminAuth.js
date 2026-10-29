import crypto from "node:crypto";

// Shared admin-key check for the export and results endpoints.
// Returns null when allowed, or { status, message } to send back.
export function adminCheck(req) {
  const expected = String(process.env.CULTURE_ADMIN_KEY || "").trim();
  if (!expected) return { status: 503, message: "Admin key not configured on this deployment" };
  // Trim: pasted keys often carry a stray space or line break.
  const given = String(req.headers["x-admin-key"] || req.query?.key || "").trim();
  if (!given) return { status: 401, message: "Unauthorised: no key supplied" };
  const a = Buffer.from(given), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { status: 401, message: "Unauthorised: key does not match" };
  return null;
}
