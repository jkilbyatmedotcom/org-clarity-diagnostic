import { useEffect, useMemo, useRef, useState } from "react";
import {
  PART0, STATEMENTS, PART_A_INSTRUCTION, PART_B_INSTRUCTION, SCENARIOS, NA_OPTION,
  TYPICALITY, DECISION_AREAS, DECIDER_OPTIONS, CHECK_OPTIONS, INDUSTRIES, STRATEGY,
  INSTRUMENT_VERSION, isOwnerRole,
} from "../../lib/culture/instrument.js";
import { getPilot } from "../../lib/culture/pilots.js";

// ─── Brand ───────────────────────────────────────────────────────────────────
const NAVY = "#0A2A43", CAMEL = "#C9A46A", LBLUE = "#AFCBE3", SAND = "#E8DCC2", CHARCOAL = "#2E2E2E", WHITE = "#FFFFFF";
const FONT = "Calibri, Carlito, 'Segoe UI', system-ui, sans-serif";

const CSS = `
  .ecf-opt { display:block; width:100%; text-align:left; background:${WHITE}; border:1.5px solid #D0D8E0; border-radius:8px;
    padding:14px 16px; margin-bottom:10px; font:inherit; font-size:16px; color:${CHARCOAL}; cursor:pointer; line-height:1.4; }
  .ecf-opt:hover { border-color:${NAVY}; }
  .ecf-opt[aria-checked="true"] { border-color:${NAVY}; background:#EEF4F8; box-shadow: inset 4px 0 0 ${CAMEL}; }
  .ecf-opt:focus-visible, .ecf-btn:focus-visible, .ecf-pill:focus-visible, .ecf-step:focus-visible { outline:3px solid ${CAMEL}; outline-offset:2px; }
  .ecf-pill { flex:1; min-width:0; background:${WHITE}; border:1.5px solid #D0D8E0; border-radius:999px; padding:10px 8px; font:inherit; font-size:15px; color:${CHARCOAL}; cursor:pointer; }
  .ecf-pill[aria-checked="true"] { background:${NAVY}; border-color:${NAVY}; color:${WHITE}; font-weight:700; }
  .ecf-step { width:44px; height:44px; border-radius:8px; border:1.5px solid #D0D8E0; background:${WHITE}; font-size:22px; line-height:1; color:${NAVY}; cursor:pointer; }
  .ecf-step:disabled { opacity:0.35; cursor:default; }
  .ecf-btn { border:none; border-radius:8px; padding:14px 24px; font:inherit; font-size:16px; font-weight:700; cursor:pointer; }
  .ecf-btn:disabled { opacity:0.45; cursor:default; }
  .ecf-input { width:100%; padding:12px; border:1.5px solid #D0D8E0; border-radius:8px; font:inherit; font-size:16px; color:${CHARCOAL}; background:${WHITE}; }
  .ecf-input:focus { outline:none; border-color:${NAVY}; }
`;

const S = {
  page: { minHeight: "100vh", background: NAVY, fontFamily: FONT, color: CHARCOAL },
  header: { padding: "20px 20px 16px", borderBottom: `3px solid ${CAMEL}`, maxWidth: 680, margin: "0 auto" },
  tag: { fontSize: 11, letterSpacing: "1.5px", textTransform: "uppercase", color: CAMEL, display: "block", marginBottom: 4 },
  title: { fontSize: 22, fontWeight: 700, color: WHITE },
  progressTrack: { height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 2, marginTop: 14, overflow: "hidden" },
  body: { maxWidth: 680, margin: "0 auto", padding: "20px 16px 120px" },
  card: { background: WHITE, borderRadius: 10, padding: "24px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.12)" },
  kicker: { fontSize: 12, fontWeight: 700, color: CAMEL, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 },
  h2: { fontSize: 20, fontWeight: 700, color: NAVY, lineHeight: 1.3, marginBottom: 10 },
  p: { fontSize: 16, lineHeight: 1.6, marginBottom: 12 },
  hint: { fontSize: 14, color: "#666", lineHeight: 1.5, marginBottom: 16 },
  label: { display: "block", fontSize: 15, fontWeight: 700, color: NAVY, margin: "18px 0 10px" },
  footer: { position: "fixed", left: 0, right: 0, bottom: 0, background: WHITE, borderTop: `1px solid ${SAND}`, padding: "12px 16px" },
  footerInner: { maxWidth: 680, margin: "0 auto", display: "flex", gap: 12, alignItems: "center" },
  error: { background: "#FEF2F2", border: "1.5px solid #C0392B", color: "#A93226", borderRadius: 8, padding: "12px 14px", fontSize: 15, marginTop: 14 },
};

const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

const blankAlloc = () => Object.fromEntries(STATEMENTS.map(s => [s.code, 0]));

function freshState() {
  return {
    step: 0,
    startedAt: null,
    p0: { role: "", team: "", tenure: "" },
    a: blankAlloc(),
    b: blankAlloc(),
    c: {},
    d: {},
    s: { industry: "", subSector: "", discipline: "", secondary: "", volatility: {}, archetype: "" },
    order: {
      a: shuffle(STATEMENTS.map(s => s.code)),
      c: Object.fromEntries(SCENARIOS.map(sc => [sc.id, shuffle(sc.options.map(o => o.id))])),
    },
  };
}

const draftKey = code => `ecf-${INSTRUMENT_VERSION}-draft-${code}`;
function loadDraft(code) {
  try { const raw = localStorage.getItem(draftKey(code)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function saveDraft(code, state) { try { localStorage.setItem(draftKey(code), JSON.stringify(state)); } catch { /* storage unavailable */ } }
function clearDraft(code) { try { localStorage.removeItem(draftKey(code)); } catch { /* storage unavailable */ } }

// ─── Small components ────────────────────────────────────────────────────────
function Choice({ options, value, onChange, name }) {
  return (
    <div role="radiogroup" aria-label={name}>
      {options.map(o => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className="ecf-opt" onClick={() => onChange(o.id)}>
          {o.text}
        </button>
      ))}
    </div>
  );
}

function Pills({ options, value, onChange, name }) {
  return (
    <div role="radiogroup" aria-label={name} style={{ display: "flex", gap: 8 }}>
      {options.map(o => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className="ecf-pill" onClick={() => onChange(o.id)}>
          {o.text}
        </button>
      ))}
    </div>
  );
}

function Allocation({ order, value, onChange }) {
  const total = Object.values(value).reduce((a, b) => a + b, 0);
  const set = (code, v) => onChange({ ...value, [code]: Math.max(0, Math.min(100, Number.isFinite(v) ? Math.round(v) : 0)) });
  const statements = order.map(code => STATEMENTS.find(s => s.code === code));
  const colour = total === 100 ? "#1E7A44" : total > 100 ? "#A93226" : NAVY;
  return (
    <div>
      <div style={{ position: "sticky", top: 0, zIndex: 2, background: WHITE, padding: "10px 0 12px", borderBottom: `1px solid ${SAND}`, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: colour }}>
          <span>Points used</span>
          <span aria-live="polite">{total} of 100{total > 100 ? ` (${total - 100} too many)` : total < 100 ? ` (${100 - total} left)` : " ✓"}</span>
        </div>
        <div style={{ height: 8, background: "#E6ECF1", borderRadius: 4, marginTop: 6, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(100, total)}%`, height: "100%", background: total > 100 ? "#C0392B" : total === 100 ? "#27AE60" : CAMEL, transition: "width .15s" }} />
        </div>
      </div>
      {statements.map(st => (
        <div key={st.code} style={{ padding: "14px 0", borderBottom: "1px solid #EEF1F4" }}>
          <p style={{ fontSize: 16, lineHeight: 1.5, marginBottom: 10 }}>{st.text}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" className="ecf-step" aria-label="Remove 5 points" disabled={value[st.code] <= 0} onClick={() => set(st.code, value[st.code] - 5)}>−</button>
            <input className="ecf-input" style={{ width: 76, textAlign: "center", fontWeight: 700 }} inputMode="numeric" aria-label="Points"
              value={value[st.code]} onChange={e => set(st.code, parseInt(e.target.value.replace(/\D/g, "") || "0", 10))} />
            <button type="button" className="ecf-step" aria-label="Add 5 points" disabled={value[st.code] >= 100} onClick={() => set(st.code, value[st.code] + 5)}>+</button>
            <div style={{ flex: 1, height: 6, background: "#EEF1F4", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${value[st.code]}%`, height: "100%", background: LBLUE }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Scale({ value, onChange, name }) {
  return (
    <div>
      <div role="radiogroup" aria-label={name} style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" role="radio" aria-checked={value === n} className="ecf-pill" onClick={() => onChange(n)}>{n}</button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#666", marginTop: 6 }}>
        <span>Hardly at all</span><span>Completely</span>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function Survey() {
  const pilot = useMemo(() => getPilot(new URLSearchParams(window.location.search).get("pilot")), []);
  const [st, setSt] = useState(() => (pilot && loadDraft(pilot.code)) || freshState());
  const [hp, setHp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [done, setDone] = useState(false);
  const typicalRef = useRef(null);

  useEffect(() => { if (pilot && !done) saveDraft(pilot.code, st); }, [st, pilot, done]);
  useEffect(() => { window.scrollTo?.(0, 0); }, [st.step, done]);

  if (!pilot) {
    return (
      <div style={S.page}><style>{CSS}</style>
        <Header progress={null} org={null} />
        <div style={S.body}><div style={S.card}>
          <h2 style={S.h2}>This survey link isn't recognised</h2>
          <p style={S.p}>Please check the link you were sent, or ask the person who sent it for a new one.</p>
        </div></div>
      </div>
    );
  }

  const owner = isOwnerRole(st.p0.role);
  const steps = [
    "welcome", "about", "partA", ...(owner ? ["partB"] : []),
    ...SCENARIOS.map(sc => `c:${sc.id}`),
    ...pilot.decisionAreas.map(a => `d:${a}`),
    ...(owner ? ["strategy1", "strategy2"] : []),
    "review",
  ];
  const stepId = steps[Math.min(st.step, steps.length - 1)];
  const update = patch => setSt(prev => ({ ...prev, ...patch }));
  const go = delta => setSt(prev => ({ ...prev, step: Math.max(0, Math.min(steps.length - 1, prev.step + delta)) }));

  const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
  const valid = (() => {
    if (stepId === "about") return st.p0.role && st.p0.team && st.p0.tenure;
    if (stepId === "partA") return sum(st.a) === 100;
    if (stepId === "partB") return sum(st.b) === 100;
    if (stepId.startsWith("c:")) { const a = st.c[stepId.slice(2)]; return a && (a.option === "na" || a.typicality); }
    if (stepId.startsWith("d:")) { const a = st.d[stepId.slice(2)]; return a?.who && a?.check; }
    if (stepId === "strategy1") return st.s.industry && st.s.discipline && st.s.secondary;
    if (stepId === "strategy2") return STRATEGY.volatility.every(v => st.s.volatility[v.id]) && st.s.archetype;
    return true;
  })();

  async function submit() {
    setSubmitting(true); setSubmitError(null);
    try {
      const res = await fetch("/api/culture-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pilot: pilot.code, hp_check: hp, startedAt: st.startedAt,
          p0: st.p0, a: st.a, b: owner ? st.b : null, c: st.c, d: st.d,
          s: owner ? st.s : null, order: st.order,
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

  const answeredSteps = steps.length - 1; // welcome excluded
  const progress = done ? 1 : st.step === 0 ? 0 : st.step / answeredSteps;

  if (done) {
    return (
      <div style={S.page}><style>{CSS}</style>
        <Header progress={1} org={pilot.org} />
        <div style={S.body}><div style={S.card}>
          <p style={S.kicker}>All done</p>
          <h2 style={S.h2}>Thank you. Your answers have been saved.</h2>
          <p style={S.p}>You can close this page now.</p>
          <p style={S.hint}>This survey is in an early pilot, and your answers help shape it.</p>
        </div></div>
      </div>
    );
  }

  let content = null;
  if (stepId === "welcome") {
    content = (<>
      <p style={S.kicker}>Culture survey · pilot</p>
      <h2 style={S.h2}>How do things actually work at {pilot.org}?</h2>
      <p style={S.p}>This short survey asks about your day-to-day experience at work. It takes about 10 minutes, and there are no right or wrong answers. Answer from what has actually happened to you recently, not what should happen.</p>
      <p style={S.p}><strong>Your answers are anonymous.</strong> We don't ask for your name. {pilot.org} will only ever see results combined by team, and never for a group of fewer than five people. James Kilby Advisory sees the anonymous responses so it can improve the survey.</p>
      <p style={S.hint}>Your progress is saved on this device, so you can come back to it if you're interrupted.</p>
    </>);
  } else if (stepId === "about") {
    content = (<>
      <p style={S.kicker}>About you</p>
      <h2 style={S.h2}>A few quick details</h2>
      <p style={S.hint}>These are only used to group answers. They never identify you.</p>
      <label style={S.label}>{PART0[0].text}</label>
      <Choice name={PART0[0].text} options={PART0[0].options} value={st.p0.role} onChange={v => update({ p0: { ...st.p0, role: v } })} />
      <label style={S.label}>{PART0[1].text}</label>
      <Choice name={PART0[1].text} options={pilot.teams.map(t => ({ id: t, text: t }))} value={st.p0.team} onChange={v => update({ p0: { ...st.p0, team: v } })} />
      <label style={S.label}>{PART0[2].text}</label>
      <Choice name={PART0[2].text} options={PART0[2].options} value={st.p0.tenure} onChange={v => update({ p0: { ...st.p0, tenure: v } })} />
      <div aria-hidden="true" style={{ position: "absolute", left: -10000, width: 1, height: 1, overflow: "hidden" }}>
        <label>Leave this empty<input tabIndex={-1} autoComplete="off" value={hp} onChange={e => setHp(e.target.value)} /></label>
      </div>
    </>);
  } else if (stepId === "partA" || stepId === "partB") {
    const isA = stepId === "partA";
    content = (<>
      <p style={S.kicker}>{isA ? "How things work today" : "What success needs"}</p>
      <h2 style={S.h2}>{isA ? "Split 100 points across these statements" : "Now split 100 points for what's needed"}</h2>
      <p style={S.hint}>{isA ? PART_A_INSTRUCTION : PART_B_INSTRUCTION}</p>
      <Allocation order={st.order.a} value={isA ? st.a : st.b} onChange={v => update(isA ? { a: v } : { b: v })} />
    </>);
  } else if (stepId.startsWith("c:")) {
    const sc = SCENARIOS.find(x => x.id === stepId.slice(2));
    const idx = SCENARIOS.indexOf(sc) + 1;
    const ans = st.c[sc.id] || {};
    const opts = [...st.order.c[sc.id].map(id => sc.options.find(o => o.id === id)), NA_OPTION];
    const setAns = patch => {
      update({ c: { ...st.c, [sc.id]: { ...ans, ...patch } } });
      if (patch.option && patch.option !== "na" && !ans.typicality) {
        setTimeout(() => typicalRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" }), 50);
      }
    };
    content = (<>
      <p style={S.kicker}>Situation {idx} of {SCENARIOS.length}</p>
      <h2 style={S.h2}>{sc.text}</h2>
      <p style={S.hint}>Pick the one closest to what happened.</p>
      <Choice name={sc.text} options={opts} value={ans.option} onChange={v => setAns({ option: v, ...(v === "na" ? { typicality: null } : {}) })} />
      {ans.option && ans.option !== "na" && (<>
        <label ref={typicalRef} style={S.label}>Was that typical of how things go here?</label>
        <Pills name="Was that typical?" options={TYPICALITY} value={ans.typicality} onChange={v => setAns({ typicality: v })} />
      </>)}
    </>);
  } else if (stepId.startsWith("d:")) {
    const area = stepId.slice(2);
    const idx = pilot.decisionAreas.indexOf(area) + 1;
    const ans = st.d[area] || {};
    const areaText = DECISION_AREAS[area].replace("{amount}", pilot.spendAmount || "a set amount");
    const setAns = patch => update({ d: { ...st.d, [area]: { ...ans, ...patch } } });
    content = (<>
      <p style={S.kicker}>Decisions {idx} of {pilot.decisionAreas.length}</p>
      <h2 style={S.h2}>Think about the most recent decision you know of about {areaText}. Who actually made it?</h2>
      <Choice name="Who made it?" options={DECIDER_OPTIONS} value={ans.who} onChange={v => setAns({ who: v })} />
      <label style={S.label}>Did they need to check with someone else before acting?</label>
      <Choice name="Did they need to check?" options={CHECK_OPTIONS} value={ans.check} onChange={v => setAns({ check: v })} />
    </>);
  } else if (stepId === "strategy1") {
    const s = st.s;
    const setS = patch => update({ s: { ...s, ...patch } });
    const second = STRATEGY.discipline.filter(d => d.id !== s.discipline).concat([{ id: "none", text: "Neither" }]);
    content = (<>
      <p style={S.kicker}>Your strategy · owner questions</p>
      <h2 style={S.h2}>How your business competes</h2>
      <label style={S.label}>Which industry are you in?</label>
      <select className="ecf-input" value={s.industry} onChange={e => setS({ industry: e.target.value })}>
        <option value="">Choose your industry</option>
        {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
      </select>
      <input className="ecf-input" style={{ marginTop: 10 }} placeholder="More specifically (optional), e.g. specialty coffee" value={s.subSector} onChange={e => setS({ subSector: e.target.value })} />
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
      <p style={S.kicker}>Your strategy · owner questions</p>
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
  } else if (stepId === "review") {
    content = (<>
      <p style={S.kicker}>Nearly done</p>
      <h2 style={S.h2}>Ready to send your answers?</h2>
      <p style={S.p}>You can go back and change anything before you send. Once sent, your answers can't be changed.</p>
      {submitError && <div role="alert" style={S.error}>{submitError}</div>}
    </>);
  }

  const isFirst = stepId === "welcome";
  const isLast = stepId === "review";
  const onNext = () => {
    if (isFirst && !st.startedAt) update({ startedAt: Date.now() });
    if (isLast) submit(); else go(1);
  };

  return (
    <div style={S.page}><style>{CSS}</style>
      <Header progress={progress} org={pilot.org} />
      <div style={S.body}><div style={S.card}>{content}</div></div>
      <div style={S.footer}><div style={S.footerInner}>
        {!isFirst && <button type="button" className="ecf-btn" style={{ background: "none", color: NAVY, border: `1.5px solid ${NAVY}` }} onClick={() => go(-1)} disabled={submitting}>Back</button>}
        <div style={{ flex: 1, fontSize: 13, color: "#888", textAlign: "right" }}>
          {!valid && !isFirst && !isLast ? (stepId === "partA" || stepId === "partB" ? "Use exactly 100 points to continue" : "Answer to continue") : ""}
        </div>
        <button type="button" className="ecf-btn" style={{ background: CAMEL, color: WHITE }} onClick={onNext} disabled={!valid || submitting}>
          {isFirst ? "Start" : isLast ? (submitting ? "Sending…" : "Send my answers") : "Continue"}
        </button>
      </div></div>
    </div>
  );
}

function Header({ progress, org }) {
  return (
    <div style={{ background: NAVY }}>
      <div style={S.header}>
        <span style={S.tag}>James Kilby Advisory</span>
        <div style={S.title}>Culture survey{org ? ` · ${org}` : ""}</div>
        {progress !== null && (
          <div style={S.progressTrack} aria-hidden="true">
            <div style={{ width: `${Math.round(progress * 100)}%`, height: "100%", background: CAMEL, transition: "width .2s" }} />
          </div>
        )}
      </div>
    </div>
  );
}
