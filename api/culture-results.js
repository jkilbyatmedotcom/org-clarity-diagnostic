import { adminCheck } from "../lib/culture/adminAuth.js";
import { loadResponses, loadLeaders, storageConfigured } from "../lib/culture/store.js";
import { getPilot, PILOTS } from "../lib/culture/pilots.js";
import { analyse } from "../lib/culture/analyse.js";

// Aggregate results for the admin results page.
//   GET /api/culture-results?pilot=padre   (header: x-admin-key)
//   GET /api/culture-results               → list of pilots
// Only aggregates are returned; groups under five staff are pooled or withheld.

export default async function handler(req, res) {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).end(); }
  const denied = adminCheck(req);
  if (denied) return res.status(denied.status).json({ error: { message: denied.message } });
  res.setHeader("Cache-Control", "no-store");

  if (!req.query?.pilot) {
    return res.status(200).json({ pilots: Object.entries(PILOTS).map(([code, p]) => ({ code, org: p.org })) });
  }
  const pilot = getPilot(req.query.pilot);
  if (!pilot) return res.status(404).json({ error: { message: "Unknown pilot" } });
  if (!storageConfigured()) return res.status(503).json({ error: { message: "Storage not configured" } });

  try {
    const [rows, leaders] = await Promise.all([loadResponses(), loadLeaders()]);
    return res.status(200).json(analyse(rows, pilot, { leaders }));
  } catch (err) {
    console.error("[culture-results]", err);
    return res.status(502).json({ error: { message: "Couldn't load responses. Try again in a minute." } });
  }
}
