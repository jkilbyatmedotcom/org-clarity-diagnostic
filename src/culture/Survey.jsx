import { useEffect, useMemo, useRef, useState } from "react";
import {
  PART0, STATEMENTS, PART_A_INSTRUCTION, PART_B_INSTRUCTION, SCENARIOS, NA_OPTION,
  TYPICALITY, DECISION_AREAS, DECIDER_OPTIONS, CHECK_OPTIONS, INDUSTRIES, STRATEGY,
  INSTRUMENT_VERSION, isOwnerRole,
} from "../../lib/culture/instrument.js";
import { getPilot } from "../../lib/culture/pilots.js";
import { NAVY, CAMEL, WHITE, CSS, S, Choice, Pills, Allocation, Scale, Header } from "./ui.jsx";

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
