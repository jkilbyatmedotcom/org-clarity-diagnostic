// Strategy → enabling culture (PROVISIONAL).
// Works out the culture a strategy implies, in points out of 100 across the
// eight styles, in three layers: sector floor + value-discipline spike +
// volatility tilt. Source of truth for the numbers: "Draft sector floors" in
// the Survey Item Bank doc. The base follows Groysberg et al. (HBR 2018):
// Results and Caring lead across industries. Industry shifts, spike sizes and
// tilt sizes are judgement calls until the pilot dataset can calibrate them.

export const MAPPING_VERSION = "0.1.0-provisional";
const CODES = ["LRN", "PUR", "CAR", "ORD", "SAF", "AUT", "RES", "ENJ"];

export const SECTOR_FLOORS = {
  base:                     { LRN: 12, PUR: 11, CAR: 17, ORD: 13, SAF: 10, AUT: 9, RES: 20, ENJ: 8 },
  "Trades & Construction":  { LRN: 9,  PUR: 9,  CAR: 14, ORD: 16, SAF: 18, AUT: 9, RES: 20, ENJ: 5 },
  "Professional Services":  { LRN: 16, PUR: 11, CAR: 17, ORD: 11, SAF: 7,  AUT: 8, RES: 22, ENJ: 8 },
  "Retail & Hospitality":   { LRN: 12, PUR: 11, CAR: 20, ORD: 14, SAF: 8,  AUT: 7, RES: 17, ENJ: 11 },
  "Manufacturing":          { LRN: 9,  PUR: 8,  CAR: 15, ORD: 19, SAF: 15, AUT: 9, RES: 21, ENJ: 4 },
  "Health & Allied Health": { LRN: 11, PUR: 16, CAR: 22, ORD: 13, SAF: 15, AUT: 5, RES: 13, ENJ: 5 },
};

// Value discipline (Treacy & Wiersema) → the styles it draws on.
export const DISCIPLINE_STYLES = {
  opex: ["ORD", "SAF", "RES"],     // operational excellence
  intimacy: ["CAR", "PUR"],        // customer intimacy
  product: ["LRN", "ENJ", "RES"],  // product leadership
};
export const SPIKE_POINTS = 12;          // primary discipline
export const SECONDARY_SPIKE_POINTS = 6; // secondary, half weight

// Volatility: average of S-04..S-06 (1–5).
export const TILT_POINTS = 8;
export const FLEX_STYLES = ["LRN", "PUR", "ENJ"];   // upper half of the circumplex
export const STABLE_STYLES = ["ORD", "SAF", "AUT"]; // lower half
export const FLEX_THRESHOLD = 3.5;
export const STABLE_THRESHOLD = 2.0;

const round1 = v => Math.round(v * 10) / 10;

// Move `points` into the `to` styles (split equally), taking them from all
// other styles in proportion to what each holds. Never goes below zero.
function shift(profile, to, points) {
  const from = CODES.filter(c => !to.includes(c));
  const pool = from.reduce((a, c) => a + profile[c], 0);
  const take = Math.min(points, pool);
  if (!take) return { ...profile };
  const out = { ...profile };
  for (const c of from) out[c] -= take * (profile[c] / pool);
  for (const c of to) out[c] += take / to.length;
  return out;
}

// Move `points` from one set of styles to another, proportionally on both sides.
function tilt(profile, fromSet, toSet, points) {
  const pool = fromSet.reduce((a, c) => a + profile[c], 0);
  const take = Math.min(points, pool);
  const toPool = toSet.reduce((a, c) => a + profile[c], 0) || toSet.length;
  const out = { ...profile };
  for (const c of fromSet) out[c] -= take * (profile[c] / pool);
  for (const c of toSet) out[c] += take * ((profile[c] || 1) / toPool);
  return out;
}

const finish = p => {
  const rounded = Object.fromEntries(CODES.map(c => [c, round1(Math.max(0, p[c]))]));
  const drift = round1(100 - CODES.reduce((a, c) => a + rounded[c], 0));
  if (drift) { const top = [...CODES].sort((a, b) => rounded[b] - rounded[a])[0]; rounded[top] = round1(rounded[top] + drift); }
  return rounded;
};

// strategy: { "S-01": industry, "S-02": discipline, "S-03": secondary|"none", "S-04".."S-06": 1–5 }
export function deriveCulture(strategy) {
  if (!strategy) return null;
  const industry = strategy["S-01"];
  const floor = SECTOR_FLOORS[industry] || SECTOR_FLOORS.base;
  let p = { ...floor };
  const steps = [{ step: "floor", label: SECTOR_FLOORS[industry] ? `${industry} floor` : "Base floor (no sector match)", profile: finish(p) }];

  const primary = DISCIPLINE_STYLES[strategy["S-02"]];
  if (primary) { p = shift(p, primary, SPIKE_POINTS); steps.push({ step: "spike", label: `+${SPIKE_POINTS} towards ${strategy["S-02"]}`, profile: finish(p) }); }
  const secondary = DISCIPLINE_STYLES[strategy["S-03"]];
  if (secondary && strategy["S-03"] !== strategy["S-02"]) { p = shift(p, secondary, SECONDARY_SPIKE_POINTS); steps.push({ step: "secondary", label: `+${SECONDARY_SPIKE_POINTS} towards ${strategy["S-03"]}`, profile: finish(p) }); }

  const vols = ["S-04", "S-05", "S-06"].map(k => Number(strategy[k])).filter(n => n >= 1 && n <= 5);
  const volatility = vols.length ? vols.reduce((a, b) => a + b, 0) / vols.length : null;
  let tiltDir = null;
  if (volatility !== null && volatility >= FLEX_THRESHOLD) { p = tilt(p, STABLE_STYLES, FLEX_STYLES, TILT_POINTS); tiltDir = "flexibility"; }
  else if (volatility !== null && volatility <= STABLE_THRESHOLD) { p = tilt(p, FLEX_STYLES, STABLE_STYLES, TILT_POINTS); tiltDir = "stability"; }
  if (tiltDir) steps.push({ step: "tilt", label: `${TILT_POINTS} points towards ${tiltDir} (volatility ${round1(volatility)})`, profile: finish(p) });

  return { version: MAPPING_VERSION, profile: finish(p), volatility: volatility === null ? null : round1(volatility), tilt: tiltDir, steps };
}
