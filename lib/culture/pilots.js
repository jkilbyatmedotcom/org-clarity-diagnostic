// Pilot organisations. Each gets its own survey link:
//   https://<app>/culture?pilot=<code>
// The code is not a secret, just a label that keeps pilots apart.
// To add a pilot, copy an entry, change the values and redeploy.

export const PILOTS = {
  padre: {
    org: "Padre Coffee",
    teams: [
      "Brunswick East café",
      "South Melbourne Market café",
      "Paddington café",
      "Noosa café",
      "Roastery & Ops — Brunswick East",
      "Roastery & Ops — Noosa",
      "I work across several sites",
    ],
    decisionAreas: ["PRC", "HIR", "SPD", "CMP", "SCH"],
    spendAmount: "$1,000",
    // Leader survey: purpose from the Org Clarity Diagnostic, and the role
    // titles exactly as written in Padre's JD library (31 roles, Oct 2026).
    purpose: "To inspire, encourage and support people through their specialty coffee journey.",
    // Decision rights read from Padre's JDs by the Org Clarity Diagnostic
    // (31-role run, 30 Oct 2026): no role's JD states authority in any area;
    // all were implied only. null = no role holds stated authority.
    // Roles that would take the leader survey: functional heads and site managers.
    leaderRoles: [
      "Managing Director", "General Manager / COO", "Finance Manager", "People & Culture Manager",
      "Director of Coffee", "Head Roaster / Roastery Manager", "Head of Retail", "Head of Wholesale",
      "Ecommerce Manager", "Marketing & Brand Manager", "Cafe / Store Manager",
    ],
    jdDecisionRights: {
      source: "Org Clarity Diagnostic, 30 Oct 2026",
      areas: { PRC: null, HIR: null, SPD: null, CMP: null, SCH: null, SUP: null, NEW: null },
    },
    roles: [
      "Assistant Cafe Manager / Shift Supervisor",
      "Barista / Customer Experience Team Member",
      "Business Development Manager",
      "Business Operations / Systems Coordinator",
      "Cafe / Store Manager",
      "Coffee Equipment Technician",
      "Coffee Trainer / Education Lead",
      "Content & Social Media Coordinator",
      "Customer Support / Online Orders Officer",
      "Delivery Driver / Logistics Officer",
      "Director of Coffee",
      "Ecommerce Manager",
      "Finance Manager",
      "General Manager / COO",
      "Green Coffee Buyer / Sourcing Coordinator",
      "Head Barista",
      "Head Roaster / Roastery Manager",
      "Head of Retail",
      "Head of Wholesale",
      "Managing Director",
      "Marketing & Brand Manager",
      "Partnerships & Community Coordinator",
      "People & Culture Manager",
      "Production Roaster",
      "Production / Packaging Operator",
      "Production & Packaging Supervisor",
      "Quality Assurance / Food Safety Coordinator",
      "Retail Sales / Front of House Associate",
      "Technical Service Coordinator",
      "Warehouse & Inventory Coordinator",
      "Wholesale Account Manager",
    ],
  },
  demo: {
    org: "Demo organisation",
    teams: ["Team A", "Team B"],
    decisionAreas: ["PRC", "HIR", "CMP", "SCH"],
    spendAmount: "$1,000",
    purpose: "To make everyday work simpler for small teams.",
    roles: ["General Manager", "Operations Manager", "Team Leader"],
    leaderRoles: ["General Manager", "Operations Manager"],
  },
};

export function getPilot(code) {
  const key = String(code || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  return PILOTS[key] ? { code: key, ...PILOTS[key] } : null;
}
