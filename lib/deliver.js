// Delivery after a successful diagnostic:
//   1. Email the report to the person who ran it      (Resend)
//   2. Email a copy, with their details, to JKA         (Resend)
//   3. Create/update them as a HubSpot contact + note   (HubSpot private app)
//
// Each step is optional: if its environment variable is missing, it is skipped
// and logged, so the diagnostic itself never breaks because of delivery.

import { renderReportHtml, countGaps, esc } from "./reportHtml.js";

const DEFAULT_OWNER = "james@jameskilbyadvisory.com.au";
const DEFAULT_FROM = "James Kilby Advisory <reports@jameskilbyadvisory.com.au>";

async function withTimeout(promise, ms, what) {
  let t;
  const timeout = new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`${what} timed out`)), ms); });
  try { return await Promise.race([promise, timeout]); } finally { clearTimeout(t); }
}

async function sendResend(payload) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

function splitName(full) {
  const parts = String(full).trim().split(/\s+/);
  return { firstname: parts[0] || "", lastname: parts.slice(1).join(" ") };
}

async function hubspot(path, body) {
  const res = await fetch(`https://api.hubapi.com${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HubSpot ${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

function leadSummaryText(contact, report) {
  const ca = report.collectiveAlignment || {};
  const lines = [
    `Org Clarity Diagnostic completed`,
    `Name: ${contact.name}`,
    `Email: ${contact.email}`,
    `Organisation: ${report.orgName || "Not given"}`,
    `Industry: ${report.industry || "Not given"}`,
    `Marketing opt-in: ${contact.optIn ? "Yes" : "No"}`,
    ``,
    `Purpose rating: ${report.purposeAssessment?.rating || "-"}`,
    `Structural health: ${ca.structuralHealth || "-"}`,
    `Structural gaps: ${countGaps(report)}`,
    `Roles assessed: ${(report.roleAssessments || []).map(r => r.roleTitle).join(", ") || "-"}`,
    ``,
    `Summary: ${ca.summaryObservation || "-"}`,
    `Next step: ${ca.nextStep || "-"}`,
  ];
  return lines.join("\n");
}

async function upsertHubspot(contact, report) {
  const { firstname, lastname } = splitName(contact.name);
  const properties = { email: contact.email, firstname, lastname };
  if (report.orgName && report.orgName !== "Not specified") properties.company = report.orgName;

  const upsert = await hubspot("/crm/v3/objects/contacts/batch/upsert", {
    inputs: [{ idProperty: "email", id: contact.email, properties }],
  });
  const contactId = upsert?.results?.[0]?.id;
  if (!contactId) throw new Error("HubSpot upsert returned no contact id");

  const noteHtml = esc(leadSummaryText(contact, report)).replace(/\n/g, "<br>");
  await hubspot("/crm/v3/objects/notes", {
    properties: { hs_timestamp: new Date().toISOString(), hs_note_body: noteHtml },
    associations: [{
      to: { id: contactId },
      types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }], // note → contact
    }],
  });
  return contactId;
}

/**
 * @returns {Promise<{emailed: boolean, ownerNotified: boolean, crm: boolean}>}
 */
export async function deliverReport(contact, report) {
  const status = { emailed: false, ownerNotified: false, crm: false };
  const owner = process.env.OWNER_EMAIL || DEFAULT_OWNER;
  const from = process.env.REPORT_FROM_EMAIL || DEFAULT_FROM;
  const org = report.orgName && report.orgName !== "Not specified" ? report.orgName : "your organisation";
  const gapCount = countGaps(report);
  const tasks = [];

  if (process.env.RESEND_API_KEY) {
    const firstName = splitName(contact.name).firstname;

    tasks.push(withTimeout(sendResend({
      from,
      to: [contact.email],
      reply_to: owner,
      subject: `Your Org Clarity Diagnostic — ${org}`,
      html: renderReportHtml(report, {
        mode: "email",
        recipientName: firstName,
        preheader: gapCount > 0
          ? `${gapCount} structural ${gapCount === 1 ? "gap" : "gaps"} identified, and the next step to take.`
          : "Your structure is sound. Here's what to protect as you grow.",
      }),
    }), 8000, "Report email").then(() => { status.emailed = true; }));

    const note = `
      <div style="font-family:Calibri,'Segoe UI',Arial,sans-serif;font-size:14px;color:#0A2A43;line-height:1.6;">
        <strong>New diagnostic lead</strong><br/>
        ${esc(contact.name)} &middot; <a href="mailto:${esc(contact.email)}" style="color:#0A2A43;">${esc(contact.email)}</a><br/>
        ${esc(report.orgName || "No organisation given")}${report.industry ? ` &middot; ${esc(report.industry)}` : ""}<br/>
        Structural health: <strong>${esc(report.collectiveAlignment?.structuralHealth || "-")}</strong> &middot; Gaps: <strong>${gapCount}</strong> &middot; Marketing opt-in: <strong>${contact.optIn ? "Yes" : "No"}</strong><br/>
        <span style="color:#2E2E2E;">Reply to this email to respond to them directly.</span>
      </div>`;

    tasks.push(withTimeout(sendResend({
      from,
      to: [owner],
      reply_to: contact.email,
      subject: `Diagnostic lead: ${contact.name}${report.orgName && report.orgName !== "Not specified" ? `, ${report.orgName}` : ""} (${gapCount} ${gapCount === 1 ? "gap" : "gaps"})`,
      html: renderReportHtml(report, { mode: "email", topNote: note }),
    }), 8000, "Owner email").then(() => { status.ownerNotified = true; }));
  } else {
    console.warn("[deliver] RESEND_API_KEY not set — skipping emails");
  }

  if (process.env.HUBSPOT_TOKEN) {
    tasks.push(withTimeout(upsertHubspot(contact, report), 8000, "HubSpot").then(() => { status.crm = true; }));
  } else {
    console.warn("[deliver] HUBSPOT_TOKEN not set — skipping CRM");
  }

  const results = await Promise.allSettled(tasks);
  results.filter(r => r.status === "rejected").forEach(r => console.error("[deliver]", r.reason?.message || r.reason));
  return status;
}
