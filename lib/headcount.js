// Optional headcount per role. Owners tick a box to add it; it is never required.

export function cleanHeadcount(v) {
  const n = typeof v === "string" ? parseInt(v, 10) : v;
  return Number.isInteger(n) && n >= 1 && n <= 9999 ? n : null;
}

// Suffix for the role header in prompts: "ROLE 3: Barista (people in this role: 12)".
export const headcountTag = r => (r.headcount ? ` (people in this role: ${r.headcount})` : "");

const key = t => String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Copies headcounts from the input roles onto the report's role assessments
// (matched by title, then by position) and adds a summary. Leaves the report
// untouched when no headcount was given.
export function attachHeadcount(report, inputRoles) {
  const given = inputRoles.filter(r => r.headcount);
  if (!given.length || !report) return report;
  const byTitle = new Map(inputRoles.map(r => [key(r.title), r.headcount]));
  (report.roleAssessments || []).forEach((a, i) => {
    const n = byTitle.get(key(a.roleTitle)) ?? inputRoles[i]?.headcount ?? null;
    if (n) a.headcount = n;
  });
  report.headcount = {
    total: given.reduce((s, r) => s + r.headcount, 0),
    rolesWithHeadcount: given.length,
    roles: inputRoles.length,
  };
  return report;
}

// Extra instruction, added only when at least one headcount was given, so
// prompts without headcounts are unchanged.
export const headcountInstruction = roles => roles.some(r => r.headcount)
  ? "\n- HEADCOUNT: \"(people in this role: N)\" after a role title is the owner's count of people in that role, not part of the title. Never include it in roleTitle. Use it only where it sharpens a point already supported by the documents, such as one person holding a critical function or one manager across a large team; never infer accountabilities from it."
  : "";

export function headcountLine(h) {
  if (!h) return "";
  const people = `${h.total} ${h.total === 1 ? "person" : "people"}`;
  return h.rolesWithHeadcount === h.roles
    ? `${people} across ${h.roles} roles.`
    : `${people} across the ${h.rolesWithHeadcount} of ${h.roles} roles with a headcount given.`;
}
