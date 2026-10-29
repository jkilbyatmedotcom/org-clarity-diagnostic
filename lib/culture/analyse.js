// Turns stored survey responses into the aggregate results view.
// Privacy rule: staff results only ever appear for groups of MIN_GROUP or more.
// Sites below that are pooled into "Other sites (combined)", and if the pool is
// still too small it is withheld. Owner results are shown as a group (owners
// are the client). No individual staff response leaves this function.

import { STYLES, STATEMENTS, SCENARIOS, DECISION_AREAS, DECIDER_OPTIONS, CHECK_OPTIONS, STRATEGY, isOwnerRole } from "./instrument.js";
import { deriveCulture, MAPPING_VERSION } from "./mapping.js";
import { roleLabel, LEADER_LEVELS, GUIDES_OPTIONS } from "./leader.js";

export const MIN_GROUP = 5;
export const CODES = Object.keys(STYLES);

// Circumplex positions (degrees, 0 = right, counter-clockwise).
// Up = flexibility, down = stability, right = interdependence, left = independence.
export const ANGLES = { LRN: 90, PUR: 45, CAR: 0, ORD: 315, SAF: 270, AUT: 225, RES: 180, ENJ: 135 };

const round = (v, dp = 1) => (v === null || v === undefined || Number.isNaN(v) ? null : Math.round(v * 10 ** dp) / 10 ** dp);
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const median = xs => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const sd = xs => {
  if (xs.length < 2) return null;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
};

// Part A / Part B allocations keyed by style code.
const allocA = r => Object.fromEntries(STATEMENTS.map(s => [s.code, Number(r.partA?.[s.aId]) || 0]));
const allocB = r => (r.partB ? Object.fromEntries(STATEMENTS.map(s => [s.code, Number(r.partB?.[s.bId]) || 0])) : null);

// Scenario profile: each answered scenario votes for its style, weighted by
// how typical the respondent said it was; normalised to 100 points.
export function scenarioProfile(r) {
  const tally = Object.fromEntries(CODES.map(c => [c, 0]));
  let total = 0;
  for (const sc of SCENARIOS) {
    const a = r.partC?.[sc.id];
    if (a?.style && a.weight > 0) { tally[a.style] += a.weight; total += a.weight; }
  }
  if (!total) return null;
  return Object.fromEntries(CODES.map(c => [c, (tally[c] / total) * 100]));
}

const meanProfile = profiles => {
  const ps = profiles.filter(Boolean);
  if (!ps.length) return null;
  return Object.fromEntries(CODES.map(c => [c, round(mean(ps.map(p => p[c])))]));
};

// Fit between two profiles: 50 × (1 + r) on centred vectors (p − 12.5).
// 100 = same shape, 50 = unrelated, 0 = opposite.
export function fit(p, q) {
  if (!p || !q) return null;
  const x = CODES.map(c => p[c] - 12.5), y = CODES.map(c => q[c] - 12.5);
  const mx = mean(x), my = mean(y);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < x.length; i++) { num += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) ** 2; dy += (y[i] - my) ** 2; }
  if (!dx || !dy) return null;
  return Math.round(50 * (1 + num / Math.sqrt(dx * dy)));
}

// Where the profile leans on the circumplex: direction and strength.
export function lean(p) {
  if (!p) return null;
  let x = 0, y = 0;
  for (const c of CODES) {
    const w = p[c] - 12.5, a = (ANGLES[c] * Math.PI) / 180;
    x += w * Math.cos(a); y += w * Math.sin(a);
  }
  const strength = Math.sqrt(x * x + y * y);
  const vertical = y > 4 ? "flexibility" : y < -4 ? "stability" : null;
  const horizontal = x > 4 ? "interdependence" : x < -4 ? "independence" : null;
  const top = [...CODES].sort((a, b) => p[b] - p[a]).slice(0, 2).map(c => STYLES[c]);
  return { x: round(x), y: round(y), strength: round(strength), vertical, horizontal, top };
}

function profileBlock(rows) {
  const a = meanProfile(rows.map(allocA));
  const c = meanProfile(rows.map(scenarioProfile));
  return { n: rows.length, partA: a, scenarios: c, saysVsStories: fit(a, c), lean: lean(a) };
}

// Sites: keep those with ≥ MIN_GROUP staff, pool the rest, withhold a small pool.
function siteBlocks(staff, teams) {
  const by = new Map();
  for (const r of staff) {
    const t = r.p0?.["P0-02"] || "Unknown";
    if (!by.has(t)) by.set(t, []);
    by.get(t).push(r);
  }
  const shown = [], pooled = [];
  const order = [...teams, ...[...by.keys()].filter(t => !teams.includes(t))];
  for (const t of order) {
    const rows = by.get(t);
    if (!rows) continue;
    if (rows.length >= MIN_GROUP) shown.push({ label: t, ...profileBlock(rows) });
    else pooled.push(...rows);
  }
  let withheld = 0;
  if (pooled.length >= MIN_GROUP) shown.push({ label: "Other sites (combined)", pooled: true, ...profileBlock(pooled) });
  else withheld = pooled.length;
  return { sites: shown, withheld };
}

function levelBlocks(staff) {
  const groups = [
    { label: "Leaders (senior leaders, team leaders)", roles: ["senior", "lead"] },
    { label: "Team members", roles: ["member"] },
  ];
  const out = [];
  let withheld = 0;
  for (const g of groups) {
    const rows = staff.filter(r => g.roles.includes(r.p0?.["P0-01"]));
    if (rows.length >= MIN_GROUP) out.push({ label: g.label, ...profileBlock(rows) });
    else withheld += rows.length;
  }
  return { levels: out, withheld };
}

const dist = (rows, get, options) => {
  const counts = Object.fromEntries(options.map(o => [o.id, 0]));
  for (const r of rows) { const v = get(r); if (v in counts) counts[v]++; }
  const n = rows.length;
  return options.map(o => ({ id: o.id, text: o.text, count: counts[o.id], pct: n ? Math.round((counts[o.id] / n) * 100) : 0 }));
};

function decisionBlock(staff, owners, areas, spendAmount) {
  if (staff.length < MIN_GROUP) return { suppressed: true, areas: [] };
  return {
    suppressed: false,
    areas: areas.map(area => {
      const answered = staff.filter(r => r.partD?.[area]);
      const who = dist(answered, r => r.partD[area].who, DECIDER_OPTIONS);
      const check = dist(answered, r => r.partD[area].check, CHECK_OPTIONS);
      // An owner answering "don't know" gives no benchmark to agree with.
      const ownerWho = owners.map(r => r.partD?.[area]?.who).filter(w => w && w !== "dk");
      const ownerView = ownerWho.length ? mode(ownerWho) : null;
      const known = answered.filter(r => r.partD[area].who !== "dk");
      const agree = ownerView && known.length ? Math.round((known.filter(r => r.partD[area].who === ownerView).length / known.length) * 100) : null;
      return {
        area,
        label: DECISION_AREAS[area].replace("{amount}", spendAmount || "$1,000"),
        n: answered.length,
        who, check,
        ownerView, ownerViewText: ownerView ? DECIDER_OPTIONS.find(o => o.id === ownerView)?.text : null,
        agreeWithOwner: agree,
        dontKnow: who.find(o => o.id === "dk")?.pct ?? 0,
        checksWithOwner: check.find(o => o.id === "owner")?.pct ?? 0,
      };
    }),
  };
}

function mode(xs) {
  const c = new Map();
  xs.forEach(x => c.set(x, (c.get(x) || 0) + 1));
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

// Data quality: whether people engaged and whether the items are working.
function qualityBlock(rows) {
  const durations = rows.map(r => r.durationSec).filter(v => Number.isFinite(v) && v > 0);
  const fast = durations.filter(d => d < 180).length;
  const concentrated = rows.filter(r => Math.max(...Object.values(allocA(r))) >= 80).length;

  const statements = STATEMENTS.map(s => {
    const pts = rows.map(r => Number(r.partA?.[s.aId]) || 0);
    return { code: s.code, style: STYLES[s.code], mean: round(mean(pts)), sd: round(sd(pts)), zero: pts.filter(p => p === 0).length };
  });

  // Order effect: average points by the position a statement was shown in.
  const byPos = Array.from({ length: 8 }, () => []);
  for (const r of rows) {
    const order = r.order?.a, a = allocA(r);
    if (Array.isArray(order) && order.length === 8) order.forEach((c, i) => byPos[i].push(a[c]));
  }
  const position = byPos.map((xs, i) => ({ position: i + 1, n: xs.length, mean: round(mean(xs)) }));

  const scenarios = SCENARIOS.map(sc => {
    const ans = rows.map(r => r.partC?.[sc.id]).filter(Boolean);
    const na = ans.filter(a => a.optionId === "na").length;
    const counts = Object.fromEntries(sc.options.map(o => [o.id, 0]));
    ans.forEach(a => { if (a.optionId in counts) counts[a.optionId]++; });
    return {
      id: sc.id, text: sc.text, n: ans.length,
      notApplicablePct: ans.length ? Math.round((na / ans.length) * 100) : 0,
      neverChosen: sc.options.filter(o => counts[o.id] === 0).map(o => o.text),
      options: sc.options.map(o => ({ text: o.text, style: o.code ? STYLES[o.code] : null, count: counts[o.id] })),
    };
  });

  const agreement = rows.map(r => fit(allocA(r), scenarioProfile(r))).filter(v => v !== null);

  return {
    n: rows.length,
    medianMinutes: durations.length ? round(median(durations) / 60) : null,
    under3Minutes: fast,
    concentratedPartA: concentrated,
    saysVsStoriesMedian: agreement.length ? Math.round(median(agreement)) : null,
    statements, position, scenarios,
  };
}

const textOf = (list, id) => list.find(x => x.id === id)?.text || id;
const counts = (xs, list) => list.map(o => ({ id: o.id, text: o.text, count: xs.filter(x => x === o.id).length })).filter(o => o.count);

// Leadership block from the named leader survey.
function leaderBlock(leaders, pilot, staff, staffEnough) {
  if (!leaders.length) return null;
  const people = leaders.map(l => {
    const derived = deriveCulture(l.strategy);
    return {
      name: l.name, level: textOf(LEADER_LEVELS, l.level), role: roleLabel(l), team: l.team,
      noJd: l.role === "__no_jd", notListed: l.role === "__not_listed",
      discipline: textOf(STRATEGY.discipline, l.strategy["S-02"]),
      secondary: l.strategy["S-03"] === "none" ? "Nothing in particular" : textOf(STRATEGY.discipline, l.strategy["S-03"]),
      archetype: textOf(STRATEGY.archetype, l.strategy["S-07"]),
      volatility: derived?.volatility ?? null,
      purposeRating: l.purpose?.rating ?? null, ownPurpose: l.purpose?.ownPurpose || "",
      guides: textOf(GUIDES_OPTIONS, l.purpose?.guides),
      mustDo: l.purpose?.mustDo || "", keep: l.keep || "", change: l.change || "",
      now: l.now, needed: l.needed, derived: derived?.profile || null,
      changeAgenda: fit(l.now, l.needed),
      statedVsDerived: fit(l.needed, derived?.profile),
    };
  });

  const needed = meanProfile(leaders.map(l => l.needed));
  const now = meanProfile(leaders.map(l => l.now));
  const derived = meanProfile(people.map(p => p.derived));

  const pairs = [];
  for (let i = 0; i < people.length; i++) for (let j = i + 1; j < people.length; j++) {
    pairs.push({ a: people[i].name, b: people[j].name, fit: fit(people[i].needed, people[j].needed) });
  }
  const pairFits = pairs.map(p => p.fit).filter(v => v !== null);

  const styles = CODES.map(c => {
    const diff = needed && derived ? round(needed[c] - derived[c]) : null;
    return { code: c, style: STYLES[c], stated: needed?.[c] ?? null, derived: derived?.[c] ?? null, diff, flag: diff !== null && Math.abs(diff) >= 10 };
  });

  const decisions = (pilot.decisionAreas || []).map(area => {
    const should = leaders.map(l => l.decisions?.[area]?.should).filter(Boolean);
    const does = leaders.map(l => l.decisions?.[area]?.does).filter(Boolean);
    const check = leaders.map(l => l.decisions?.[area]?.check).filter(Boolean);
    const shouldMode = should.length ? mode(should) : null;
    const doesMode = does.filter(d => d !== "dk").length ? mode(does.filter(d => d !== "dk")) : null;
    let staffAgree = null, staffTop = null;
    if (staffEnough && shouldMode) {
      const known = staff.filter(r => r.partD?.[area] && r.partD[area].who !== "dk");
      if (known.length) {
        staffAgree = Math.round((known.filter(r => r.partD[area].who === shouldMode).length / known.length) * 100);
        staffTop = textOf(DECIDER_OPTIONS, mode(known.map(r => r.partD[area].who)));
      }
    }
    return {
      area, label: DECISION_AREAS[area].replace("{amount}", pilot.spendAmount || "$1,000"),
      should: counts(should, DECIDER_OPTIONS), shouldMode: shouldMode ? textOf(DECIDER_OPTIONS, shouldMode) : null,
      leadersAgreeOnShould: should.length ? should.every(x => x === should[0]) : null,
      does: counts(does, DECIDER_OPTIONS), doesMode: doesMode ? textOf(DECIDER_OPTIONS, doesMode) : null,
      check: counts(check, CHECK_OPTIONS),
      shouldMatchesDoes: shouldMode && doesMode ? shouldMode === doesMode : null,
      staffTop, staffAgreeWithShould: staffAgree,
    };
  });

  return {
    n: leaders.length, people, now, needed, derived, mappingVersion: MAPPING_VERSION,
    agreement: { pairs, mean: pairFits.length ? Math.round(mean(pairFits)) : null, min: pairFits.length ? Math.min(...pairFits) : null },
    disciplines: counts(leaders.map(l => l.strategy["S-02"]), STRATEGY.discipline),
    archetypes: counts(leaders.map(l => l.strategy["S-07"]), STRATEGY.archetype),
    sameDiscipline: leaders.every(l => l.strategy["S-02"] === leaders[0].strategy["S-02"]),
    statedVsDerived: { fit: fit(needed, derived), styles, flagged: styles.filter(x => x.flag).map(x => x.style) },
    purpose: {
      statement: pilot.purpose || null,
      meanRating: leaders.some(l => l.purpose?.rating) ? round(mean(leaders.map(l => l.purpose?.rating).filter(Boolean))) : null,
    },
    decisions,
    noJd: people.filter(p => p.noJd).map(p => p.name),
    unclaimedRoles: (pilot.roles || []).filter(r => !leaders.some(l => l.role === r)),
  };
}

export function analyse(allRows, pilot, { now = Date.now(), leaders: allLeaders = [] } = {}) {
  const rows = allRows.filter(r => r.pilot === pilot.code);
  const owners = rows.filter(r => isOwnerRole(r.p0?.["P0-01"]));
  const staff = rows.filter(r => !isOwnerRole(r.p0?.["P0-01"]));
  const enough = staff.length >= MIN_GROUP;

  const leaderRows = allLeaders.filter(l => l.pilot === pilot.code && l.instrument === "ecf-leader");
  const leaders = leaderBlock(leaderRows, pilot, staff, enough);
  // Benchmark: the leadership team when the leader survey has responses,
  // otherwise the owner questions in the staff survey.
  const ownerIntended = leaders ? leaders.needed : meanProfile(owners.map(allocB));
  const ownerCurrent = leaders ? leaders.now : meanProfile(owners.map(allocA));
  const staffBlock = enough ? profileBlock(staff) : { n: staff.length, suppressed: true };
  const { sites, withheld: siteWithheld } = enough ? siteBlocks(staff, pilot.teams || []) : { sites: [], withheld: staff.length };
  const { levels, withheld: levelWithheld } = enough ? levelBlocks(staff) : { levels: [], withheld: staff.length };

  for (const s of sites) s.fitToIntended = fit(s.partA, ownerIntended);
  for (const l of levels) l.fitToIntended = fit(l.partA, ownerIntended);

  const strategy = owners.map(r => r.strategy).filter(Boolean);

  return {
    pilot: { code: pilot.code, org: pilot.org },
    generatedAt: new Date(now).toISOString(),
    minGroup: MIN_GROUP,
    counts: {
      total: rows.length, owners: owners.length, staff: staff.length,
      byRole: Object.fromEntries(["owner", "senior", "lead", "member"].map(k => [k, rows.filter(r => r.p0?.["P0-01"] === k).length])),
      versions: [...new Set(rows.map(r => r.version))],
      firstAt: rows[0]?.submittedAt || null, lastAt: rows[rows.length - 1]?.submittedAt || null,
    },
    owners: owners.length || leaders ? {
      n: leaders ? leaders.n : owners.length,
      intended: ownerIntended, current: ownerCurrent,
      intendedLean: lean(ownerIntended), currentLean: lean(ownerCurrent),
      strategy,
    } : null,
    benchmark: leaders ? { source: "leaders", n: leaders.n, label: `Leadership team (n=${leaders.n})` } : owners.length ? { source: "owner", n: owners.length, label: "Owner" } : null,
    leaders,
    staff: staffBlock,
    fit: {
      staffVsIntended: enough ? fit(staffBlock.partA, ownerIntended) : null,
      staffVsOwnerView: enough ? fit(staffBlock.partA, ownerCurrent) : null,
      ownerViewVsIntended: fit(ownerCurrent, ownerIntended),
    },
    sites, sitesWithheld: siteWithheld,
    levels, levelsWithheld: levelWithheld,
    decisions: decisionBlock(staff, owners, pilot.decisionAreas || [], pilot.spendAmount),
    quality: enough ? qualityBlock(rows) : { n: rows.length, suppressed: true, medianMinutes: null },
  };
}
