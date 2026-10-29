// Decision rights read from the JDs by the diagnostic. Shared area codes with
// the culture and leader surveys so the three views compare one to one.

export const DR_AREAS = {
  PRC: "Pricing or discounts",
  HIR: "Hiring",
  SPD: "Spending above a limit",
  CMP: "Complaints or refunds",
  SCH: "Rosters and allocation",
  SUP: "Suppliers",
  NEW: "New products or offers",
};
export const DR_LEVELS = ["explicit", "implied", "silent"];

// Keep only well-formed output; never let a bad model answer break the report.
export function normaliseDecisionRights(dr, report) {
  if (!dr || typeof dr !== "object") return null;
  const titles = new Set((report?.roleAssessments || []).map(r => r.roleTitle));
  const roles = (Array.isArray(dr.roles) ? dr.roles : [])
    .filter(r => r && typeof r.roleTitle === "string" && (titles.size === 0 || titles.has(r.roleTitle)))
    .map(r => ({
      roleTitle: r.roleTitle,
      areas: Object.fromEntries(Object.keys(DR_AREAS).map(a => {
        const v = String(r.areas?.[a] || "").toLowerCase().trim();
        return [a, DR_LEVELS.includes(v) ? v : "silent"];
      })),
    }));
  if (!roles.length) return null;
  const areas = (Array.isArray(dr.areas) ? dr.areas : [])
    .filter(a => a && a.area in DR_AREAS && typeof a.observation === "string")
    .map(a => ({ area: a.area, label: DR_AREAS[a.area], holder: String(a.holder || "No role").slice(0, 120), observation: a.observation.slice(0, 400) }));
  // Areas with no explicit holder, computed from the grid so the summary can't contradict it.
  const unowned = Object.keys(DR_AREAS).filter(a => !roles.some(r => r.areas[a] === "explicit"));
  const contested = Object.keys(DR_AREAS).filter(a => roles.filter(r => r.areas[a] === "explicit").length > 1);
  return { roles, areas, unowned, contested };
}
