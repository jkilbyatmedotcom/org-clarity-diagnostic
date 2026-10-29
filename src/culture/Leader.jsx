import { useEffect, useMemo, useState } from "react";
import { STATEMENTS, STRATEGY, INDUSTRIES, DECIDER_OPTIONS } from "../../lib/culture/instrument.js";
import {
  LEADER_LEVELS, LEADER_VERSION, ROLE_NOT_LISTED, ROLE_NO_JD, GUIDES_OPTIONS,
  SHOULD_OPTIONS, SHOULD_CHECK_OPTIONS, NOW_INSTRUCTION, NEEDED_INSTRUCTION, areaLabel,
} from "../../lib/culture/leader.js";
import { getPilot } from "../../lib/culture/pilots.js";
import { NAVY, CAMEL, WHITE, CSS, S, Choice, Pills, Allocation, Scale, Header } from "./ui.jsx";

// Leader survey (named). Owners, senior leaders and department or site leads.

const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const blank = () => Object.fromEntries(STATEMENTS.map(s => [s.code, 0]));
const fresh = () => ({
  step: 0, startedAt: null,
  name: "", level: "", role: "", roleOther: "", team: "",
  purpose: { rating: null, ownPurpose: "", guides: "", mustDo: "" },
  s: { industry: "", subSector: "", discipline: "", secondary: "", volatility: {}, archetype: "" },
  now: blank(), needed: blank(), keep: "", change: "", d: {},
  order: shuffle(STATEMENTS.map(s => s.code)),
});

const draftKey = code => `ecf-leader-${LEADER_VERSION}-draft-${code}`;
const loadDraft = code => { try { const raw = localStorage.getItem(draftKey(code)); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const saveDraft = (code, st) => { try { localStorage.setItem(draftKey(code), JSON.stringify(st)); } catch { /* unavailable */ } };
const clearDraft = code => { try { localStorage.removeItem(draftKey(code)); } catch { /* unavailable */ } };

function TextArea({ value, onChange, label, placeholder, max = 200 }) {
  return (
    <>
      <textarea className="ecf-input" rows={3} maxLength={max} aria-label={label} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)} style={{ resize: "vertical", lineHeight: 1.5 }} />
      <div style={{ fontSize: 12, color: "#888", textAlign: "right", marginTop: 4 }}>{value.length}/{max}</div>
    </>
  );
}

export default function Leader() {
  const pilot = useMemo(() => getPilot(new URLSearchParams(window.location.search).get("pilot")), []);
  const [st, setSt] = useState(() => (pilot && loadDraft(pilot.code)) || fresh());
  const [hp, setHp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => { if (pilot && !done) saveDraft(pilot.code, st); }, [st, pilot, done]);
  useEffect(() => { window.scrollTo?.(0, 0); }, [st.step, done]);

  if (!pilot) {
    return (
      <div style={S.page}><style>{CSS}</style>
        <Header progress={null} org={null} title="Leader survey" />
        <div style={S.body}><div style={S.card}>
          <h2 style={S.h2}>This survey link isn't recognised</h2>
          <p style={S.p}>Please check the link you were sent, or ask the person who sent it for a new one.</p>
        </div></div>
      </div>
    );
  }

  const steps = ["welcome", "about", "purpose", "strategy1", "strategy2", "now", "needed", "keepChange",
    ...pilot.decisionAreas.map(a => `d:${a}`), "review"];
  const stepId = steps[Math.min(st.step, steps.length - 1)];
  const update = patch => setSt(prev => ({ ...prev, ...patch }));
  const go = delta => setSt(prev => ({ ...prev, step: Math.max(0, Math.min(steps.length - 1, prev.step + delta)) }));
  const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
  const roles = pilot.roles || [];

  const valid = (() => {
    if (stepId === "about") {
      return st.name.trim().length >= 2 && st.level && st.role
        && (st.role !== ROLE_NOT_LISTED || st.roleOther.trim()) && (st.level !== "dept" || st.team);
    }
    if (stepId === "purpose") return (pilot.purpose ? st.purpose.rating : st.purpose.ownPurpose.trim()) && st.purpose.guides;
    if (stepId === "strategy1") return st.s.industry && st.s.discipline && st.s.secondary;
    if (stepId === "strategy2") return STRATEGY.volatility.every(v => st.s.volatility[v.id]) && st.s.archetype;
    if (stepId === "now") return sum(st.now) === 100;
    if (stepId === "needed") return sum(st.needed) === 100;
    if (stepId.startsWith("d:")) { const a = st.d[stepId.slice(2)]; return a?.should && a?.check && a?.does; }
    return true;
  })();

  async function submit() {
    setSubmitting(true); setSubmitError(null);
    try {
      const res = await fetch("/api/leader-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pilot: pilot.code, hp_check: hp, startedAt: st.startedAt,
          name: st.name, level: st.level, role: st.role, roleOther: st.roleOther, team: st.level === "dept" ? st.team : null,
          purpose: st.purpose, strategy: st.s, now: st.now, needed: st.needed, keep: st.keep, change: st.change,
          decisions: st.d,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error?.message || "Your answers couldn't be sent. Please try again.");
      clearDraft(pilot.code);
      setDone(true);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const progress = done ? 1 : st.step === 0 ? 0 : st.step / (steps.length - 1);

  if (done) {
    return (
      <div style={S.page}><style>{CSS}</style>
        <Header progress={1} org={pilot.org} title="Leader survey" />
        <div style={S.body}><div style={S.card}>
          <p style={S.kicker}>All done</p>
          <h2 style={S.h2}>Thank you, {st.name.split(" ")[0]}. Your answers have been saved.</h2>
          <p style={S.p}>James will bring the leadership team's answers together with the staff survey and talk them through with you.</p>
        </div></div>
      </div>
    );
  }

  let content = null;
  if (stepId === "welcome") {
    content = (<>
      <p style={S.kicker}>Leader survey · pilot</p>
      <h2 style={S.h2}>Where is {pilot.org} heading, and what will it take?</h2>
      <p style={S.p}>This survey is for the owners and leaders of {pilot.org}. It asks about strategy, the culture the business needs, and who should make which decisions. It takes about 12 minutes.</p>
      <p style={S.p}><strong>This survey is named, not anonymous.</strong> With a small leadership team, anonymity isn't possible, and comparing leaders' views openly is the point. Your answers are seen by James Kilby Advisory and discussed with the leadership team.</p>
      <p style={S.hint}>Staff take a separate, anonymous survey. Your progress is saved on this device if you're interrupted.</p>
    </>);
  } else if (stepId === "about") {
    const roleOpts = [...roles.map(r => ({ id: r, text: r })), { id: ROLE_NOT_LISTED, text: "My role isn't listed" }, { id: ROLE_NO_JD, text: "I don't have a JD" }];
    content = (<>
      <p style={S.kicker}>About you</p>
      <h2 style={S.h2}>Who's answering?</h2>
      <label style={S.label} htmlFor="ldr-name">Your name</label>
      <input id="ldr-name" className="ecf-input" autoComplete="name" value={st.name} onChange={e => update({ name: e.target.value })} />
      <label style={S.label}>Your leadership level</label>
      <Choice name="Leadership level" options={LEADER_LEVELS} value={st.level} onChange={v => update({ level: v })} />
      {st.level === "dept" && (<>
        <label style={S.label}>Which team or site do you lead?</label>
        <Choice name="Team or site" options={pilot.teams.map(t => ({ id: t, text: t }))} value={st.team} onChange={v => update({ team: v })} />
      </>)}
      <label style={S.label}>Which of these is your role?</label>
      <p style={S.hint}>{roles.length ? "These are the role titles from the organisation's job descriptions." : "Choose the option that fits."}</p>
      {roleOpts.length > 10 ? (
        <select className="ecf-input" aria-label="Your role" value={st.role} onChange={e => update({ role: e.target.value })}>
          <option value="">Choose your role</option>
          {roleOpts.map(o => <option key={o.id} value={o.id}>{o.text}</option>)}
        </select>
      ) : (
        <Choice name="Your role" options={roleOpts} value={st.role} onChange={v => update({ role: v })} />
      )}
      {st.role === ROLE_NOT_LISTED && (
        <input className="ecf-input" style={{ marginTop: 4 }} aria-label="Your role title" placeholder="Your role title" value={st.roleOther} onChange={e => update({ roleOther: e.target.value })} />
      )}
      <div aria-hidden="true" style={{ position: "absolute", left: -10000, width: 1, height: 1, overflow: "hidden" }}>
        <label>Leave this empty<input tabIndex={-1} autoComplete="off" value={hp} onChange={e => setHp(e.target.value)} /></label>
      </div>
    </>);
  } else if (stepId === "purpose") {
    const p = st.purpose;
    const setP = patch => update({ purpose: { ...p, ...patch } });
    content = (<>
      <p style={S.kicker}>Purpose</p>
      <h2 style={S.h2}>Why the business exists</h2>
      {pilot.purpose ? (<>
        <div style={{ background: "#F4F7FA", borderLeft: `4px solid ${CAMEL}`, borderRadius: 6, padding: "12px 14px", fontStyle: "italic", fontSize: 16, lineHeight: 1.5 }}>{pilot.purpose}</div>
        <label style={S.label}>How well does this describe why the business exists?</label>
        <Scale name="Purpose fit" value={p.rating} onChange={n => setP({ rating: n })} low="Not at all" high="Exactly" />
      </>) : (<>
        <label style={S.label}>Write the organisation's purpose in one sentence.</label>
        <TextArea label="Purpose" value={p.ownPurpose} onChange={v => setP({ ownPurpose: v })} max={300} />
      </>)}
      <label style={S.label}>How often does this purpose actually guide a decision you make?</label>
      <Choice name="How often" options={GUIDES_OPTIONS} value={p.guides} onChange={v => setP({ guides: v })} />
      <label style={S.label}>In one sentence, what must this business do better than anyone else over the next three years? <span style={{ fontWeight: 400, color: "#888" }}>(optional)</span></label>
      <TextArea label="Must do better" value={p.mustDo} onChange={v => setP({ mustDo: v })} />
    </>);
  } else if (stepId === "strategy1") {
    const s = st.s;
    const setS = patch => update({ s: { ...s, ...patch } });
    const second = STRATEGY.discipline.filter(d => d.id !== s.discipline).concat([{ id: "none", text: "Neither" }]);
    content = (<>
      <p style={S.kicker}>Strategy</p>
      <h2 style={S.h2}>How the business competes</h2>
      <label style={S.label}>Which industry are you in?</label>
      <select className="ecf-input" value={s.industry} onChange={e => setS({ industry: e.target.value })}>
        <option value="">Choose your industry</option>
        {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
      </select>
      <input className="ecf-input" style={{ marginTop: 10 }} placeholder="More specifically (optional)" value={s.subSector} onChange={e => setS({ subSector: e.target.value })} />
      <label style={S.label}>Which of these is closest to how you win customers?</label>
      <Choice name="How you win customers" options={STRATEGY.discipline} value={s.discipline} onChange={v => setS({ discipline: v, secondary: s.secondary === v ? "" : s.secondary })} />
      {s.discipline && (<>
        <label style={S.label}>And which comes second?</label>
        <Choice name="Second" options={second} value={s.secondary} onChange={v => setS({ secondary: v })} />
      </>)}
    </>);
  } else if (stepId === "strategy2") {
    const s = st.s;
    const setS = patch => update({ s: { ...s, ...patch } });
    content = (<>
      <p style={S.kicker}>Strategy</p>
      <h2 style={S.h2}>How fast your market is changing</h2>
      {STRATEGY.volatility.map(v => (
        <div key={v.id}>
          <label style={S.label}>{v.text}</label>
          <Scale name={v.text} value={s.volatility[v.id]} onChange={n => setS({ volatility: { ...s.volatility, [v.id]: n } })} />
        </div>
      ))}
      <label style={S.label}>Over the next three years, is the priority to grow, to run tighter, or a balance?</label>
      <Pills name="Priority" options={STRATEGY.archetype} value={s.archetype} onChange={v => setS({ archetype: v })} />
    </>);
  } else if (stepId === "now" || stepId === "needed") {
    const isNow = stepId === "now";
    content = (<>
      <p style={S.kicker}>{isNow ? "Culture today" : "Culture needed"}</p>
      <h2 style={S.h2}>{isNow ? "How things actually work now" : "What the business needs"}</h2>
      <p style={S.hint}>{isNow ? NOW_INSTRUCTION : NEEDED_INSTRUCTION}</p>
      <Allocation order={st.order} value={isNow ? st.now : st.needed} onChange={v => update(isNow ? { now: v } : { needed: v })} />
    </>);
  } else if (stepId === "keepChange") {
    content = (<>
      <p style={S.kicker}>In your words</p>
      <h2 style={S.h2}>Keep and change</h2>
      <label style={S.label}>Which one thing about how we work now must we keep? <span style={{ fontWeight: 400, color: "#888" }}>(optional)</span></label>
      <TextArea label="Keep" value={st.keep} onChange={v => update({ keep: v })} />
      <label style={S.label}>Which one thing must change? <span style={{ fontWeight: 400, color: "#888" }}>(optional)</span></label>
      <TextArea label="Change" value={st.change} onChange={v => update({ change: v })} />
    </>);
  } else if (stepId.startsWith("d:")) {
    const area = stepId.slice(2);
    const idx = pilot.decisionAreas.indexOf(area) + 1;
    const ans = st.d[area] || {};
    const setAns = patch => update({ d: { ...st.d, [area]: { ...ans, ...patch } } });
    content = (<>
      <p style={S.kicker}>Decisions {idx} of {pilot.decisionAreas.length}</p>
      <h2 style={S.h2}>Decisions about {areaLabel(area, pilot)}</h2>
      <label style={S.label}>Who should decide?</label>
      <Choice name="Who should decide" options={SHOULD_OPTIONS} value={ans.should} onChange={v => setAns({ should: v })} />
      <label style={S.label}>Should they need to check with someone first?</label>
      <Choice name="Should they check" options={SHOULD_CHECK_OPTIONS} value={ans.check} onChange={v => setAns({ check: v })} />
      <label style={S.label}>In practice today, who decides?</label>
      <Choice name="Who decides today" options={DECIDER_OPTIONS} value={ans.does} onChange={v => setAns({ does: v })} />
    </>);
  } else if (stepId === "review") {
    content = (<>
      <p style={S.kicker}>Nearly done</p>
      <h2 style={S.h2}>Ready to send your answers?</h2>
      <p style={S.p}>You can go back and change anything before you send. Once sent, your answers can't be changed.</p>
      {submitError && <div role="alert" style={S.error}>{submitError}</div>}
    </>);
  }

  const isFirst = stepId === "welcome", isLast = stepId === "review";
  const onNext = () => {
    if (isFirst && !st.startedAt) update({ startedAt: Date.now() });
    if (isLast) submit(); else go(1);
  };

  return (
    <div style={S.page}><style>{CSS}</style>
      <Header progress={progress} org={pilot.org} title="Leader survey" />
      <div style={S.body}><div style={S.card}>{content}</div></div>
      <div style={S.footer}><div style={S.footerInner}>
        {!isFirst && <button type="button" className="ecf-btn" style={{ background: "none", color: NAVY, border: `1.5px solid ${NAVY}` }} onClick={() => go(-1)} disabled={submitting}>Back</button>}
        <div style={{ flex: 1, fontSize: 13, color: "#888", textAlign: "right" }}>
          {!valid && !isFirst && !isLast ? (stepId === "now" || stepId === "needed" ? "Use exactly 100 points to continue" : "Answer to continue") : ""}
        </div>
        <button type="button" className="ecf-btn" style={{ background: CAMEL, color: WHITE }} onClick={onNext} disabled={!valid || submitting}>
          {isFirst ? "Start" : isLast ? (submitting ? "Sending…" : "Send my answers") : "Continue"}
        </button>
      </div></div>
    </div>
  );
}
