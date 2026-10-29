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
  },
  demo: {
    org: "Demo organisation",
    teams: ["Team A", "Team B"],
    decisionAreas: ["PRC", "HIR", "CMP", "SCH"],
    spendAmount: "$1,000",
  },
};

export function getPilot(code) {
  const key = String(code || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  return PILOTS[key] ? { code: key, ...PILOTS[key] } : null;
}
