// Renders a diagnostic report as a standalone HTML document.
// Used in two places so they always match:
//   - the browser's "Download PDF Report" (mode: "print")
//   - the emailed copy sent by /api/diagnose (mode: "email")
// Styles are inline and layout uses tables so the email renders in Gmail/Outlook.

import { DR_AREAS } from "./decisionRights.js";

export const BOOKING_URL = "https://calendly.com/j-kilby/30min";

const NAVY = "#0A2A43";
const CAMEL = "#C9A46A";
const LBLUE = "#AFCBE3";
const SAND = "#E8DCC2";
const CHARCOAL = "#2E2E2E";

export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function ratingHex(rating) {
  const r = String(rating || "").toLowerCase();
  if (r.includes("strong") || r.includes("clear") || r.includes("good")) return "#27AE60";
  if (r.includes("partial") || r.includes("moderate") || r.includes("developing")) return "#E67E22";
  if (!r) return "#999999";
  return "#C0392B";
}

export function countGaps(report) {
  const ca = report?.collectiveAlignment || {};
  return (ca.coverageGaps || []).length + (ca.overlapGaps || []).length + (ca.alignmentGaps || []).length;
}

const label = (t, color = CAMEL) =>
  `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${color};margin:0 0 6px;">${esc(t)}</div>`;

const h2 = t => `<div style="font-size:17px;font-weight:700;color:${NAVY};margin:0 0 14px;">${t}</div>`;

const h3 = t => `<div style="font-size:14px;font-weight:700;color:${NAVY};margin:16px 0 10px;">${esc(t)}</div>`;

const pill = (t, hex) =>
  `<span style="display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;color:#ffffff;background:${hex};margin-right:6px;">${esc(t)}</span>`;

const callout = (inner, bg, border) =>
  `<div style="margin:0 0 10px;padding:12px 16px;background:${bg};border-left:4px solid ${border};font-size:14px;color:${CHARCOAL};line-height:1.6;">${inner}</div>`;

const section = inner =>
  `<tr><td style="padding:28px 40px;border-bottom:1px solid #E8E8E8;">${inner}</td></tr>`;

// Shown only when the user supplied their ABN, so a name-search guess is
// never presented to them as fact.
export function verifiedIdentity(report) {
  const br = report?.businessRegister;
  if (br?.status !== "ok" || br.matchedBy !== "abn") return null;
  const parts = [br.legalName, `ABN ${br.abnFormatted}`];
  if (br.abnStatus && br.abnStatus !== "Active") parts.push(`ABN ${br.abnStatus.toLowerCase()}`);
  // The ABN's start date, not the business's age: a business may have traded under an earlier entity.
  else if (/^\d{4}/.test(br.activeSince || "")) parts.push(`ABN active since ${br.activeSince.slice(0, 4)}`);
  if (br.state) parts.push(br.state);
  return parts.filter(Boolean).join(" · ");
}

const verifiedLine = report => {
  const v = verifiedIdentity(report);
  return v ? `<div style="font-size:11px;color:${LBLUE};margin-top:4px;opacity:0.85;">${esc(v)}</div>` : "";
};

/**
 * @param {object} report  Parsed diagnostic JSON
 * @param {object} opts
 * @param {"print"|"email"} opts.mode
 * @param {string} [opts.dateStr]
 * @param {string} [opts.recipientName]  Greeting line in the email version
 * @param {string} [opts.preheader]      Hidden inbox preview text (email)
 * @param {string} [opts.topNote]        Extra HTML block above the report (owner copy)
 */
export function renderReportHtml(report, opts = {}) {
  const mode = opts.mode || "print";
  const dateStr = opts.dateStr ||
    new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Melbourne" });
  const pa = report.purposeAssessment || {};
  const ca = report.collectiveAlignment || {};
  const gapCount = countGaps(report);

  const criteria = Object.entries(pa.criteria || {});
  const criteriaRows = [];
  for (let i = 0; i < criteria.length; i += 2) {
    const cell = ([k, v]) =>
      `<td width="50%" valign="top" style="padding:10px 14px;background:#F4F7FA;font-size:13px;color:${CHARCOAL};line-height:1.5;"><strong style="color:${NAVY};">${esc(k.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()))}:</strong><br/>${esc(v)}</td>`;
    criteriaRows.push(`<tr>${cell(criteria[i])}<td width="10"></td>${criteria[i + 1] ? cell(criteria[i + 1]) : "<td></td>"}</tr><tr><td colspan="3" height="10"></td></tr>`);
  }

  const roles = (report.roleAssessments || []).map(r => `
    <div style="margin:0 0 14px;padding:14px 18px;background:#F4F7FA;border-left:4px solid ${NAVY};">
      <div style="font-weight:700;font-size:14px;color:${NAVY};margin:0 0 6px;">${esc(r.roleTitle)}</div>
      <div style="margin:0 0 8px;">${pill(`Purpose: ${r.purposeRating}`, ratingHex(r.purposeRating))}${pill(`KRAs: ${r.kraRating}`, ratingHex(r.kraRating))}</div>
      <div style="font-size:14px;color:${CHARCOAL};line-height:1.6;">${esc(r.headline)}</div>
      ${r.recommendation ? `<div style="font-size:13px;color:#666666;margin-top:6px;font-style:italic;">&rarr; ${esc(r.recommendation)}</div>` : ""}
    </div>`).join("");

  const gaps = (items, key, bg, border) =>
    (items || []).map(g => callout(`<strong>${esc(g[key])}:</strong> ${esc(g.observation)}`, bg, border)).join("");

  const coverage = gaps(ca.coverageGaps, "function", "#FEF2F2", "#C0392B");
  const overlap = gaps(ca.overlapGaps, "roles", "#FFF8EC", CAMEL);
  const align = gaps(ca.alignmentGaps, "role", "#FFF8EC", CAMEL);
  const impossible = gaps(ca.whatRemainsImpossible, "gap", "#FFF8EC", CAMEL);

  const pma = report.purposeMarketAlignment;
  let alignmentSection = "";
  if (pma?.status === "ok") {
    const row = (lbl, left, right, obs) => `
      <tr>
        <td width="22%" valign="top" style="padding:10px 12px;background:#F4F7FA;font-size:12px;font-weight:700;color:${NAVY};text-transform:uppercase;letter-spacing:0.5px;">${esc(lbl)}</td>
        <td width="39%" valign="top" style="padding:10px 12px;background:#F0F6FB;font-size:13px;color:${CHARCOAL};"><span style="color:#666666;font-size:11px;">Purpose says</span><br/>${esc(left)}</td>
        <td width="39%" valign="top" style="padding:10px 12px;background:#FFF8EC;font-size:13px;color:${CHARCOAL};"><span style="color:#666666;font-size:11px;">Website says</span><br/>${esc(right)}</td>
      </tr>
      <tr><td colspan="3" style="padding:6px 12px 14px;font-size:13px;color:${CHARCOAL};line-height:1.55;">${esc(obs)}</td></tr>`;
    alignmentSection = section(`
      ${label("Purpose in the Market")}
      ${h2(`Purpose–Market Alignment: <span style="color:${ratingHex(pma.rating === "Aligned" ? "strong" : pma.rating === "Partially aligned" ? "partial" : "weak")};">${esc(pma.rating)}</span>`)}
      <div style="font-size:15px;font-weight:600;color:${NAVY};line-height:1.5;margin:0 0 14px;">${esc(pma.headline)}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${row("Audience", pma.audience?.purpose, pma.audience?.website, pma.audience?.observation)}
        ${row("Promise", pma.promise?.purpose, pma.promise?.website, pma.promise?.observation)}
        ${row("Value discipline", pma.valueDiscipline?.purposeImplies, pma.valueDiscipline?.websiteSignals, pma.valueDiscipline?.observation)}
      </table>
      ${callout(`<strong>Distinctiveness — ${esc(pma.distinctiveness?.rating)}:</strong> ${esc(pma.distinctiveness?.observation)}`, "#FFF8EC", CAMEL)}
      <div style="margin-top:14px;background:#F0F6FB;border:1.5px solid ${LBLUE};padding:14px 18px;">
        ${label("Fix First")}
        <div style="font-size:14px;font-weight:600;color:${NAVY};line-height:1.5;">${esc(pma.fixFirst)}</div>
      </div>
      <div style="font-size:11px;color:#888888;margin-top:10px;">${pma.websiteRole ? `Website role: ${esc(pma.websiteRole)} &middot; ` : ""}Based on ${esc((pma.pagesRead || []).length)} page${(pma.pagesRead || []).length === 1 ? "" : "s"} of ${esc(pma.url)}</div>
    `);
  } else if (pma?.status === "unavailable") {
    alignmentSection = section(`
      ${label("Purpose in the Market")}
      <div style="font-size:13px;color:#666666;line-height:1.6;">We couldn't assess ${esc(pma.url || "your website")} this time. ${esc(pma.reason || "")}</div>
    `);
  }

  const dr = report.decisionRights;
  let decisionSection = "";
  if (dr?.roles?.length) {
    const codes = Object.keys(DR_AREAS);
    const dot = `<span style="display:inline-block;width:12px;height:12px;border-radius:6px;background:${NAVY};"></span>`;
    const ring = `<span style="display:inline-block;width:8px;height:8px;border-radius:6px;border:2px solid ${CAMEL};"></span>`;
    const mark = v => (v === "explicit" ? dot : v === "implied" ? ring : `<span style="color:#BBBBBB;">&ndash;</span>`);
    const head = codes.map(c => `<td align="center" valign="bottom" style="padding:6px 4px;font-size:10px;font-weight:700;color:#5A6B7B;text-transform:uppercase;letter-spacing:0.3px;border-bottom:2px solid ${SAND};">${esc(DR_AREAS[c])}</td>`).join("");
    const rows = dr.roles.map(r => `<tr><td style="padding:8px 6px;font-size:13px;font-weight:700;color:${NAVY};border-bottom:1px solid #EEF1F4;">${esc(r.roleTitle)}</td>${codes.map(c => `<td align="center" style="padding:8px 4px;border-bottom:1px solid #EEF1F4;">${mark(r.areas[c])}</td>`).join("")}</tr>`).join("");
    const notes = (dr.areas || []).map(a => callout(`<strong>${esc(a.label)}${a.holder && a.holder !== "No role" ? ` (${esc(a.holder)})` : " (no role)"}:</strong> ${esc(a.observation)}`, "#FFF8EC", CAMEL)).join("");
    decisionSection = section(`
      ${label("Decision Rights")}
      ${h2("Who your JDs say decides")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="border-bottom:2px solid ${SAND};"></td>${head}</tr>
        ${rows}
      </table>
      <div style="font-size:11px;color:#666666;margin:8px 0 14px;">${dot} Authority stated &nbsp;&nbsp; ${ring} Implied by the role, not stated &nbsp;&nbsp; &ndash; Not covered</div>
      ${dr.unowned?.length ? `<div style="font-size:14px;color:${CHARCOAL};line-height:1.6;margin:0 0 10px;"><strong>No role holds stated authority for:</strong> ${esc(dr.unowned.map(c => DR_AREAS[c].toLowerCase()).join(", "))}.</div>` : ""}
      ${notes}
    `);
  }

  const ctaTitle = gapCount > 0
    ? `Your report has identified ${gapCount} structural ${gapCount === 1 ? "gap" : "gaps"}.`
    : "Your structure is sound. Here's how to keep it that way.";
  const ctaText = gapCount > 0
    ? "The conversation that matters now is which one to fix first and what that looks like in practice. Book a 45-minute call with James."
    : "A 45-minute call with James will identify what to protect and what to build on as you scale.";

  const greeting = mode === "email" && opts.recipientName
    ? `<tr><td style="padding:28px 40px 0;font-size:15px;color:${CHARCOAL};line-height:1.6;">Hi ${esc(opts.recipientName)},<br/><br/>Here's your Org Clarity Diagnostic. Keep it for reference, or forward it to anyone who should see it.</td></tr>`
    : "";

  const body = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:720px;margin:0 auto;background:#ffffff;font-family:Calibri,'Segoe UI',Arial,sans-serif;color:${CHARCOAL};">
  ${opts.topNote ? `<tr><td style="padding:20px 40px;background:${SAND};">${opts.topNote}</td></tr>` : ""}
  <tr><td style="background:${NAVY};padding:36px 40px 28px;border-bottom:4px solid ${CAMEL};">
    ${label("James Kilby Advisory")}
    <div style="font-size:26px;font-weight:700;color:#ffffff;margin:0;">Org Clarity Diagnostic</div>
    <div style="font-size:12px;color:${LBLUE};margin-top:6px;">${esc(report.orgName || "Your Organisation")}${report.industry ? ` &middot; ${esc(report.industry)}` : ""} &middot; ${esc(dateStr)}</div>
    ${verifiedLine(report)}
  </td></tr>
  ${greeting}
  ${section(`
    ${label("Pass 1 — Org Purpose Assessment")}
    ${h2("Your Purpose Statement")}
    <div style="background:#F0F6FB;border:1.5px solid ${LBLUE};padding:14px 18px;font-size:14px;color:${NAVY};line-height:1.6;font-style:italic;margin:0 0 14px;">${esc(pa.purposeStatement)}</div>
    ${pill(pa.rating, ratingHex(pa.rating))}
    <div style="font-size:15px;font-weight:600;color:${NAVY};line-height:1.5;margin:14px 0 8px;">${esc(pa.headline)}</div>
    ${pa.coaching ? `<div style="font-size:13px;color:#555555;line-height:1.6;margin:0 0 8px;">${esc(pa.coaching)}</div>` : ""}
    ${criteriaRows.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">${criteriaRows.join("")}</table>` : ""}
  `)}
  ${alignmentSection}
  ${section(`
    ${label("Pass 2 — Role Assessments")}
    ${h2("Your Roles")}
    ${roles || `<div style="font-size:14px;color:#666666;">No roles assessed.</div>`}
  `)}
  ${decisionSection}
  ${section(`
    ${label("Pass 3 — Collective Alignment")}
    ${h2(`Structural Health: <span style="color:${ratingHex(ca.structuralHealth)};">${esc(ca.structuralHealth)}</span>`)}
    <div style="font-size:14px;line-height:1.65;color:${CHARCOAL};margin:0 0 16px;">${esc(ca.summaryObservation)}</div>
    ${coverage ? h3("Coverage Gaps") + coverage : ""}
    ${overlap ? h3("Overlap Gaps") + overlap : ""}
    ${align ? h3("Alignment Gaps") + align : ""}
    ${ca.whatThisMeansInPractice ? `${h3("What This Means in Practice")}<div style="background:${SAND};padding:16px 20px;font-size:14px;color:${CHARCOAL};line-height:1.7;">${esc(ca.whatThisMeansInPractice)}</div>` : ""}
    ${impossible ? h3("What Remains Impossible Until This Changes") + impossible : ""}
    <div style="margin-top:20px;background:#F0F6FB;border:1.5px solid ${LBLUE};padding:16px 20px;">
      ${label("Most Important Next Step")}
      <div style="font-size:15px;font-weight:600;color:${NAVY};line-height:1.5;">${esc(ca.nextStep)}</div>
    </div>
  `)}
  <tr><td style="background:${NAVY};padding:28px 40px;">
    <div style="font-size:17px;font-weight:700;color:#ffffff;margin:0 0 8px;">${esc(ctaTitle)}</div>
    <div style="font-size:13px;color:${LBLUE};line-height:1.5;margin:0 0 18px;">${esc(ctaText)}</div>
    <a href="${BOOKING_URL}" style="display:inline-block;background:${CAMEL};color:#ffffff;padding:12px 26px;text-decoration:none;font-weight:700;font-size:14px;border-radius:5px;">Book a 45-minute call &rarr;</a>
    <div style="margin-top:16px;color:${CAMEL};font-weight:600;font-size:13px;">jameskilbyadvisory.com.au</div>
  </td></tr>
</table>`;

  const printExtras = mode === "print"
    ? `<style>@media print{.no-print{display:none!important}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>`
    : "";
  const printButton = mode === "print"
    ? `<div class="no-print" style="max-width:720px;margin:0 auto;padding:16px 40px;"><button onclick="window.print()" style="background:${CAMEL};color:#fff;border:none;padding:12px 28px;font-size:14px;font-weight:700;border-radius:5px;cursor:pointer;font-family:Calibri,sans-serif;">Save as PDF</button></div>`
    : "";
  const preheader = mode === "email" && opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Org Clarity Diagnostic — ${esc(report.orgName || "Your Organisation")}</title>
${printExtras}
</head>
<body style="margin:0;padding:${mode === "email" ? "24px 0" : "0 0 40px"};background:${mode === "email" ? "#F2F2F2" : "#ffffff"};">
${preheader}
${body}
${printButton}
</body>
</html>`;
}
