// Leader survey v0 (named). Source of truth: "Leader survey v0" tab in the
// Survey Item Bank doc. Item IDs are permanent; change wording → bump version.

import { STATEMENTS, STRATEGY, INDUSTRIES, DECIDER_OPTIONS, CHECK_OPTIONS, DECISION_AREAS } from "./instrument.js";
import { getPilot } from "./pilots.js";

export const LEADER_INSTRUMENT_ID = "ecf-leader";
export const LEADER_VERSION = "0.1.0";

export const LEADER_LEVELS = [
  { id: "owner", text: "Owner or managing director" },
  { id: "senior", text: "Senior leader" },
  { id: "dept", text: "Department or site lead" },
];
export const ROLE_NOT_LISTED = "__not_listed";
export const ROLE_NO_JD = "__no_jd";

export const GUIDES_OPTIONS = [
  { id: "never", text: "Never" }, { id: "rarely", text: "Rarely" }, { id: "sometimes", text: "Sometimes" },
  { id: "often", text: "Often" }, { id: "always", text: "Almost always" },
];

export const SHOULD_OPTIONS = DECIDER_OPTIONS.filter(o => o.id !== "dk");
export const SHOULD_CHECK_OPTIONS = CHECK_OPTIONS.filter(o => o.id !== "dk");
export const NOW_INSTRUCTION = "Think about day-to-day work here over the last three months. Split 100 points to show how things actually work, not how they should.";
export const NEEDED_INSTRUCTION = "Now think about what this business needs to succeed over the next three years. Split 100 points to show how things should work.";

const CODES = STATEMENTS.map(s => s.code);
const TEXT_MAX = 200;
const text = (v, max = TEXT_MAX) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isInt = v => Number.isInteger(v);

function allocation(obj, label) {
  if (!obj || typeof obj !== "object") return `${label} is missing.`;
  let total = 0;
  for (const c of CODES) {
    const v = obj[c];
    if (!isInt(v) || v < 0 || v > 100) return `${label} has an invalid value.`;
    total += v;
  }
  return total === 100 ? null : `${label} must add up to 100.`;
}

export function validateLeader(body, { now = Date.now() } = {}) {
  if (!body || typeof body !== "object" || body.hp_check) return { error: "Invalid submission." };
  const pilot = getPilot(body.pilot);
  if (!pilot) return { error: "This survey link isn't recognised. Please check the link you were sent." };

  const name = text(body.name, 80);
  if (name.length < 2) return { error: "Please enter your name." };
  if (!LEADER_LEVELS.some(l => l.id === body.level)) return { error: "Please choose your leadership level." };
  const roles = pilot.roles || [];
  if (![...roles, ROLE_NOT_LISTED, ROLE_NO_JD].includes(body.role)) return { error: "Please choose your role." };
  const roleOther = body.role === ROLE_NOT_LISTED ? text(body.roleOther, 80) : "";
  if (body.role === ROLE_NOT_LISTED && !roleOther) return { error: "Please type your role title." };
  let team = null;
  if (body.level === "dept") {
    if (!(pilot.teams || []).includes(body.team)) return { error: "Please choose the team or site you lead." };
    team = body.team;
  }

  // L1 purpose
  const p = body.purpose || {};
  let rating = null, ownPurpose = "";
  if (pilot.purpose) {
    if (!isInt(p.rating) || p.rating < 1 || p.rating > 5) return { error: "Please rate the purpose statement." };
    rating = p.rating;
  } else {
    ownPurpose = text(p.ownPurpose, 300);
    if (!ownPurpose) return { error: "Please write the organisation's purpose in one sentence." };
  }
  if (!GUIDES_OPTIONS.some(o => o.id === p.guides)) return { error: "Please say how often the purpose guides your decisions." };
  const mustDo = text(p.mustDo);

  // L2 strategy (same checks as the staff survey's owner questions)
  const s = body.strategy || {};
  const disc = STRATEGY.discipline.map(d => d.id);
  if (!INDUSTRIES.includes(s.industry)) return { error: "Please choose your industry." };
  if (!disc.includes(s.discipline)) return { error: "Please choose how you mainly win customers." };
  if (!(s.secondary === "none" || (disc.includes(s.secondary) && s.secondary !== s.discipline))) return { error: "Please choose what comes second." };
  const vol = {};
  for (const v of STRATEGY.volatility) {
    const n = s.volatility?.[v.id];
    if (!isInt(n) || n < 1 || n > 5) return { error: "Please answer the questions about change in your market." };
    vol[v.id] = n;
  }
  if (!STRATEGY.archetype.some(x => x.id === s.archetype)) return { error: "Please choose your priority for the next three years." };

  // L3 culture
  const eNow = allocation(body.now, "How things work now");
  if (eNow) return { error: eNow };
  const eNeed = allocation(body.needed, "What the business needs");
  if (eNeed) return { error: eNeed };

  // L4 decisions
  const decisions = {};
  for (const area of pilot.decisionAreas) {
    const d = body.decisions?.[area];
    if (!d || !SHOULD_OPTIONS.some(o => o.id === d.should) || !SHOULD_CHECK_OPTIONS.some(o => o.id === d.check) || !DECIDER_OPTIONS.some(o => o.id === d.does)) {
      return { error: "Please answer every decision question." };
    }
    decisions[area] = { should: d.should, check: d.check, does: d.does };
  }

  const started = Number(body.startedAt);
  const durationSec = Number.isFinite(started) && started > 0 && started < now ? Math.round((now - started) / 1000) : null;

  return {
    pilot,
    record: {
      instrument: LEADER_INSTRUMENT_ID, version: LEADER_VERSION,
      pilot: pilot.code, org: pilot.org, submittedAt: new Date(now).toISOString(), durationSec,
      name, level: body.level, role: body.role, roleOther, team,
      purpose: { statement: pilot.purpose || null, rating, ownPurpose, guides: p.guides, mustDo },
      strategy: { "S-01": s.industry, "S-01-sub": text(s.subSector, 120), "S-02": s.discipline, "S-03": s.secondary, ...vol, "S-07": s.archetype },
      now: Object.fromEntries(CODES.map(c => [c, body.now[c]])),
      needed: Object.fromEntries(CODES.map(c => [c, body.needed[c]])),
      keep: text(body.keep), change: text(body.change),
      decisions,
    },
  };
}

export const roleLabel = r => (r.role === ROLE_NO_JD ? "No JD" : r.role === ROLE_NOT_LISTED ? `${r.roleOther} (not in JD set)` : r.role);
export const areaLabel = (area, pilot) => DECISION_AREAS[area].replace("{amount}", pilot.spendAmount || "a set amount");
