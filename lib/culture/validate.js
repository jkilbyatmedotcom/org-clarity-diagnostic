// Validates a survey submission against the instrument and the pilot's
// configuration, and turns it into the stored record (keyed by permanent
// item IDs, with style codes attached for analysis).

import {
  INSTRUMENT_ID, INSTRUMENT_VERSION, STYLES, STATEMENTS, SCENARIOS, TYPICALITY,
  PART0, DECIDER_OPTIONS, CHECK_OPTIONS, INDUSTRIES, STRATEGY, isOwnerRole,
} from "./instrument.js";
import { getPilot } from "./pilots.js";

const CODES = Object.keys(STYLES);
const isInt = v => Number.isInteger(v);

function allocation(obj, label) {
  if (!obj || typeof obj !== "object") return { error: `${label} is missing.` };
  let total = 0;
  for (const c of CODES) {
    const v = obj[c];
    if (!isInt(v) || v < 0 || v > 100) return { error: `${label} has an invalid value.` };
    total += v;
  }
  if (total !== 100) return { error: `${label} must add up to 100.` };
  return { ok: true };
}

const optIds = q => q.options.map(o => o.id);

export function validateSubmission(body, { now = Date.now() } = {}) {
  if (!body || typeof body !== "object") return { error: "Invalid submission." };
  if (body.hp_check) return { error: "Invalid submission." };

  const pilot = getPilot(body.pilot);
  if (!pilot) return { error: "This survey link isn't recognised. Please check the link you were sent." };

  // Part 0
  const p0 = body.p0 || {};
  if (!optIds(PART0[0]).includes(p0.role)) return { error: "Please choose your role." };
  if (!pilot.teams.includes(p0.team)) return { error: "Please choose your team or site." };
  if (!optIds(PART0[2]).includes(p0.tenure)) return { error: "Please choose how long you've worked here." };
  const owner = isOwnerRole(p0.role);

  // Part A (+ B for owners)
  const a = allocation(body.a, "Part A");
  if (a.error) return a;
  if (owner) {
    const b = allocation(body.b, "Part B");
    if (b.error) return b;
  }

  // Part C
  const typ = Object.fromEntries(TYPICALITY.map(t => [t.id, t.weight]));
  const partC = {};
  for (const sc of SCENARIOS) {
    const ans = body.c?.[sc.id];
    if (!ans) return { error: `Please answer ${sc.id}.` };
    if (ans.option === "na") { partC[sc.id] = { optionId: "na", style: null, typicality: null, weight: 0 }; continue; }
    const opt = sc.options.find(o => o.id === ans.option);
    if (!opt) return { error: `Invalid answer for ${sc.id}.` };
    if (!(ans.typicality in typ)) return { error: `Please say how typical ${sc.id} was.` };
    partC[sc.id] = { optionId: opt.id, style: opt.code, typicality: ans.typicality, weight: opt.code ? typ[ans.typicality] : 0 };
  }

  // Part D
  const partD = {};
  for (const area of pilot.decisionAreas) {
    const ans = body.d?.[area];
    if (!ans || !DECIDER_OPTIONS.some(o => o.id === ans.who) || !CHECK_OPTIONS.some(o => o.id === ans.check)) {
      return { error: "Please answer every decision question." };
    }
    partD[area] = { who: ans.who, check: ans.check };
  }

  // Strategy inputs (owner only)
  let strategy = null;
  if (owner) {
    const st = body.s || {};
    const disc = STRATEGY.discipline.map(d => d.id);
    if (!INDUSTRIES.includes(st.industry)) return { error: "Please choose your industry." };
    if (!disc.includes(st.discipline)) return { error: "Please choose how you mainly win customers." };
    if (!(st.secondary === "none" || (disc.includes(st.secondary) && st.secondary !== st.discipline))) {
      return { error: "Please choose what comes second." };
    }
    const vol = {};
    for (const v of STRATEGY.volatility) {
      const n = st.volatility?.[v.id];
      if (!isInt(n) || n < 1 || n > 5) return { error: "Please answer the questions about change in your market." };
      vol[v.id] = n;
    }
    if (!STRATEGY.archetype.some(x => x.id === st.archetype)) return { error: "Please choose your priority for the next three years." };
    strategy = {
      "S-01": st.industry,
      "S-01-sub": typeof st.subSector === "string" ? st.subSector.trim().slice(0, 120) : "",
      "S-02": st.discipline, "S-03": st.secondary, ...vol, "S-07": st.archetype,
    };
  }

  const started = Number(body.startedAt);
  const durationSec = Number.isFinite(started) && started > 0 && started < now ? Math.round((now - started) / 1000) : null;

  const byItem = (alloc, key) => Object.fromEntries(STATEMENTS.map(s => [s[key], alloc[s.code]]));

  const record = {
    instrument: INSTRUMENT_ID,
    version: INSTRUMENT_VERSION,
    pilot: pilot.code,
    org: pilot.org,
    submittedAt: new Date(now).toISOString(),
    durationSec,
    p0: { "P0-01": p0.role, "P0-02": p0.team, "P0-03": p0.tenure },
    partA: byItem(body.a, "aId"),
    partB: owner ? byItem(body.b, "bId") : null,
    partC,
    partD,
    strategy,
    order: sanitiseOrder(body.order),
  };
  return { record, pilot };
}

// Display order shown to the respondent (kept to test for order effects).
function sanitiseOrder(order) {
  if (!order || typeof order !== "object") return null;
  const out = {};
  if (Array.isArray(order.a)) out.a = order.a.filter(c => CODES.includes(c)).slice(0, 8);
  if (order.c && typeof order.c === "object") {
    out.c = {};
    for (const sc of SCENARIOS) {
      const ids = order.c[sc.id];
      if (Array.isArray(ids)) out.c[sc.id] = ids.filter(id => optIds(sc).includes(id));
    }
  }
  return out;
}
