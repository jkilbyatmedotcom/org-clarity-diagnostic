import { adminCheck } from "../lib/culture/adminAuth.js";
import { loadResponses, loadLeaders, storageConfigured } from "../lib/culture/store.js";
import { STATEMENTS, SCENARIOS, STRATEGY } from "../lib/culture/instrument.js";

// Admin export of pilot responses for analysis.
//   GET /api/culture-export?pilot=padre&format=csv   (header: x-admin-key: <CULTURE_ADMIN_KEY>)
// A browser download can pass ?key=… instead of the header.

const csvCell = v => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows) {
  const areas = [...new Set(rows.flatMap(r => Object.keys(r.partD || {})))].sort();
  const cols = [
    "id", "version", "pilot", "org", "submittedAt", "durationSec", "P0-01", "P0-02", "P0-03",
    ...STATEMENTS.map(s => s.aId), ...STATEMENTS.map(s => s.bId),
    ...SCENARIOS.flatMap(sc => [`${sc.id}_option`, `${sc.id}_style`, `${sc.id}_typicality`]),
    ...areas.flatMap(a => [`D_${a}_who`, `D_${a}_check`]),
    "S-01", "S-01-sub", "S-02", "S-03", ...STRATEGY.volatility.map(v => v.id), "S-07",
  ];
  const line = r => [
    r.id, r.version, r.pilot, r.org, r.submittedAt, r.durationSec,
    r.p0?.["P0-01"], r.p0?.["P0-02"], r.p0?.["P0-03"],
    ...STATEMENTS.map(s => r.partA?.[s.aId]), ...STATEMENTS.map(s => r.partB?.[s.bId]),
    ...SCENARIOS.flatMap(sc => [r.partC?.[sc.id]?.optionId, r.partC?.[sc.id]?.style, r.partC?.[sc.id]?.typicality]),
    ...areas.flatMap(a => [r.partD?.[a]?.who, r.partD?.[a]?.check]),
    r.strategy?.["S-01"], r.strategy?.["S-01-sub"], r.strategy?.["S-02"], r.strategy?.["S-03"],
    ...STRATEGY.volatility.map(v => r.strategy?.[v.id]), r.strategy?.["S-07"],
  ].map(csvCell).join(",");
  return [cols.join(","), ...rows.map(line)].join("\n");
}

export function leaderCsv(rows) {
  const areas = [...new Set(rows.flatMap(r => Object.keys(r.decisions || {})))].sort();
  const codes = STATEMENTS.map(s => s.code);
  const cols = ["id", "version", "pilot", "submittedAt", "durationSec", "name", "level", "role", "roleOther", "team",
    "L-P02", "L-P02-own", "L-P03", "L-P04", "S-01", "S-01-sub", "S-02", "S-03", "S-04", "S-05", "S-06", "S-07",
    ...codes.map(c => `L-A_${c}`), ...codes.map(c => `L-B_${c}`), "L-C01", "L-C02",
    ...areas.flatMap(a => [`L-D_${a}_should`, `L-D_${a}_check`, `L-D_${a}_does`])];
  const line = r => [r.id, r.version, r.pilot, r.submittedAt, r.durationSec, r.name, r.level, r.role, r.roleOther, r.team,
    r.purpose?.rating, r.purpose?.ownPurpose, r.purpose?.guides, r.purpose?.mustDo,
    ...["S-01", "S-01-sub", "S-02", "S-03", "S-04", "S-05", "S-06", "S-07"].map(k => r.strategy?.[k]),
    ...codes.map(c => r.now?.[c]), ...codes.map(c => r.needed?.[c]), r.keep, r.change,
    ...areas.flatMap(a => [r.decisions?.[a]?.should, r.decisions?.[a]?.check, r.decisions?.[a]?.does]),
  ].map(csvCell).join(",");
  return [cols.join(","), ...rows.map(line)].join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).end(); }
  const denied = adminCheck(req);
  if (denied) return res.status(denied.status).json({ error: { message: denied.message } });
  if (!storageConfigured()) return res.status(503).json({ error: { message: "Storage not configured" } });

  const pilot = String(req.query?.pilot || "").toLowerCase();
  if (String(req.query?.survey || "") === "leader") {
    const leaders = (await loadLeaders()).filter(r => !pilot || r.pilot === pilot);
    res.setHeader("Cache-Control", "no-store");
    if (String(req.query?.format || "csv") === "json") return res.status(200).json(leaders);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="leader-responses${pilot ? `-${pilot}` : ""}.csv"`);
    return res.status(200).send(leaderCsv(leaders));
  }
  const rows = (await loadResponses()).filter(r => !pilot || r.pilot === pilot);
  res.setHeader("Cache-Control", "no-store");
  if (String(req.query?.format || "csv") === "json") return res.status(200).json(rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="culture-responses${pilot ? `-${pilot}` : ""}.csv"`);
  return res.status(200).send(toCsv(rows));
}
