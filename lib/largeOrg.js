// Large-organisation mode: more roles than one request can handle well.
//
//   1. Role batches (in parallel): each batch of up to BATCH_SIZE roles gets
//      its role assessments, decision-rights grid and a compact summary.
//   2. Collective pass: one request reads the purpose plus every role's
//      summary, and writes the purpose assessment and collective alignment,
//      so gaps and overlaps across the whole business are still found.
//
// The output has the same shape as the single-request diagnostic, so the
// on-screen report, PDF and emails work unchanged. Wording comes from
// lib/prompt.js so both paths assess roles the same way.

import { PURPOSE_SCHEMA, ROLE_SCHEMA, COLLECTIVE_SCHEMA, INSTRUCTIONS } from "./prompt.js";
import { DR_AREAS } from "./decisionRights.js";

export const SINGLE_REQUEST_MAX_ROLES = 10;
export const BATCH_SIZE = 8;
export const BATCH_MAX_TOKENS = 7000;
export const COLLECTIVE_MAX_TOKENS = 7000;

const AREA_CODES = Object.keys(DR_AREAS);
const ins = start => INSTRUCTIONS.find(i => i.startsWith(start));

function purposeBlock({ purposeMode, purposeText, scaffold }) {
  return purposeMode === "have"
    ? purposeText
    : `[Constructed from founder inputs]\nWhat: ${scaffold.what}\nFor whom: ${scaffold.whom}\nOutcome: ${scaffold.outcome}\nWhy it matters: ${scaffold.why}`;
}

const roleText = (r, i) => {
  const content = r.files.length > 0 ? r.files.map(f => `File: ${f.name}\n${f.text}`).join("\n\n") : r.manualText;
  return `ROLE ${i + 1}: ${r.title || "Untitled"}\n${content}`;
};

export function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// Decision-rights instruction, split into its per-role part and its whole-set part.
const DR_INSTRUCTION = ins("- DECISION RIGHTS:");
const DR_ROLE_PART = DR_INSTRUCTION.slice(0, DR_INSTRUCTION.indexOf(" In decisionRights.areas"));
const DR_AREAS_PART = "- DECISION RIGHTS:" + DR_INSTRUCTION.slice(DR_INSTRUCTION.indexOf(" In decisionRights.areas"));

export function buildBatchPrompt(input, batch, { batchIndex, batchCount, allTitles }) {
  return `You are an expert organisational design advisor working with SME owners. This organisation has ${allTitles.length} roles, too many to assess in one pass, so roles are assessed in batches and the whole set is reviewed together afterwards. This is batch ${batchIndex + 1} of ${batchCount}. Assess ONLY the roles in this batch and return a structured JSON result.

ORGANISATION: ${input.orgName || "Not specified"}
INDUSTRY: ${input.industry || "Not specified"}
ORG PURPOSE INPUT:
${purposeBlock(input)}

ALL ROLES IN THE ORGANISATION (for context only; most are assessed in other batches):
${allTitles.map(t => `- ${t}`).join("\n")}

ROLES IN THIS BATCH:
${batch.map(roleText).join("\n\n---\n\n")}

---

Return ONLY valid JSON in this exact structure (no markdown, no preamble), with one entry per role in this batch, in the order given:

{
${ROLE_SCHEMA}
  "decisionRights": {
    "roles": [
      {
        "roleTitle": "exactly as in roleAssessments",
        "areas": { ${AREA_CODES.map(c => `"${c}": "explicit | implied | silent"`).join(", ")} }
      }
    ]
  },
  "roleSummaries": [
    {
      "roleTitle": "exactly as in roleAssessments",
      "purpose": "the role's purpose as the document states it, in one sentence of 25 words or fewer",
      "accountabilities": ["each KRA or main accountability, 10 words or fewer each, up to 6"],
      "reportsTo": "as stated in the document, or Not stated",
      "worksWith": "the main roles or teams it depends on or serves, as stated, or Not stated"
    }
  ]
}

INSTRUCTIONS:
${ins("- Every observation")}
${ins("- Never write generic")}
${ins("- Write as if you know")}
${ins("- If no KRAs are present")}
${ins("- DUAL-FUNCTION ROLES")}
${ins("- Be concise")}
${ins("- STRUCTURAL APEX LANGUAGE")}
${DR_ROLE_PART}
- ROLE TITLES: use each role's title exactly as written in its document. If the document has no title, use the title supplied above.
- Judge each role's purposeRating against the organisation's purpose above.
- Do not state that a function is missing from the organisation. Other roles are assessed in other batches; gaps across the whole business are found in the final review.
- The roleSummaries are read by that final review instead of the full documents, so make them faithful to what each document actually says.
${ins("- Return ONLY the JSON object")}`;
}

const gridText = areas => AREA_CODES.map(c => `${c} ${areas?.[c] || "silent"}`).join(", ");

export function buildCollectivePrompt(input, roles) {
  const summaries = roles.map((r, i) => [
    `ROLE ${i + 1}: ${r.roleTitle}`,
    `Ratings: purpose ${r.purposeRating || "-"}, KRAs ${r.kraRating || "-"}`,
    `Assessment: ${r.headline || "-"}`,
    `Purpose: ${r.summary?.purpose || "Not stated"}`,
    `Accountabilities: ${(r.summary?.accountabilities || []).join("; ") || "Not stated"}`,
    `Reports to: ${r.summary?.reportsTo || "Not stated"} | Works with: ${r.summary?.worksWith || "Not stated"}`,
    `Decision rights: ${gridText(r.decisionAreas)}`,
  ].join("\n")).join("\n\n");

  return `You are an expert organisational design advisor working with SME owners. This is the final pass of a diagnostic on an organisation with ${roles.length} roles. Every role has already been assessed individually. Using the purpose and the role summaries below, assess the purpose and the role set as a whole, and return a structured JSON report.

ORGANISATION: ${input.orgName || "Not specified"}
INDUSTRY: ${input.industry || "Not specified"}
PURPOSE MODE: ${input.purposeMode === "have" ? "Owner provided" : "Constructed from scaffold"}
ORG PURPOSE INPUT:
${purposeBlock(input)}

ROLE SUMMARIES (from each role's document; decision rights use PRC pricing or discounts, HIR hiring, SPD spending above an approval limit, CMP complaints or refunds, SCH rosters and allocation, SUP suppliers, NEW new products or offers):
${summaries}

---

Return ONLY valid JSON in this exact structure (no markdown, no preamble):

{
  "orgName": "string",
  "industry": "string",
${PURPOSE_SCHEMA}
${COLLECTIVE_SCHEMA}
  "decisionRights": {
    "areas": [
      {
        "area": "one of ${AREA_CODES.join(", ")}",
        "holder": "the role title that holds explicit authority, or No role",
        "observation": "one plain-language sentence on what this means for how the decision actually gets made"
      }
    ]
  }
}

CRITICAL INSTRUCTIONS:
${INSTRUCTIONS.filter(i => !i.startsWith("- DECISION RIGHTS:") && !i.startsWith("- If no KRAs are present")).join("\n")}
${DR_AREAS_PART}
- WORKING FROM SUMMARIES: a function counts as covered if any role's purpose or accountabilities cover it. Use the exact role titles above when naming roles. With this many roles, prioritise the few gaps and overlaps that matter most to the business over an exhaustive list.`;
}

// Run the whole pipeline. `call(prompt, maxTokens)` returns parsed JSON.
export async function runLargeOrg(input, call, { log = console } = {}) {
  const batches = chunk(input.roles, BATCH_SIZE);
  const allTitles = input.roles.map(r => r.title || "Untitled");

  const runBatch = async (batch, batchIndex) => {
    const prompt = buildBatchPrompt(input, batch, { batchIndex, batchCount: batches.length, allTitles });
    let lastErr;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const out = await call(prompt, BATCH_MAX_TOKENS);
        if (!Array.isArray(out?.roleAssessments) || !out.roleAssessments.length) throw new Error("Batch returned no role assessments");
        if (out.roleAssessments.length < batch.length) log.warn?.(`[large-org] batch ${batchIndex + 1}: ${out.roleAssessments.length} of ${batch.length} roles returned`);
        return out;
      } catch (err) {
        lastErr = err;
        log.warn?.(`[large-org] batch ${batchIndex + 1} attempt ${attempt + 1} failed`, err.detail || err.message);
      }
    }
    throw lastErr;
  };

  const results = await Promise.all(batches.map(runBatch));

  // Join each role's assessment, grid and summary by title.
  const roles = results.flatMap(out => {
    const grid = new Map((out.decisionRights?.roles || []).map(r => [r.roleTitle, r.areas]));
    const sums = new Map((out.roleSummaries || []).map(s => [s.roleTitle, s]));
    return out.roleAssessments.map(a => ({ ...a, decisionAreas: grid.get(a.roleTitle), summary: sums.get(a.roleTitle) }));
  });

  const collective = await call(buildCollectivePrompt(input, roles), COLLECTIVE_MAX_TOKENS);

  return {
    orgName: collective.orgName || input.orgName,
    industry: collective.industry || input.industry,
    purposeAssessment: collective.purposeAssessment,
    roleAssessments: roles.map(({ decisionAreas, summary, ...a }) => a),
    collectiveAlignment: collective.collectiveAlignment,
    decisionRights: {
      roles: roles.filter(r => r.decisionAreas).map(r => ({ roleTitle: r.roleTitle, areas: r.decisionAreas })),
      areas: collective.decisionRights?.areas || [],
    },
    meta: { mode: "large", roles: input.roles.length, assessed: roles.length, batches: batches.length },
  };
}
