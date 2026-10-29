import { STATEMENTS } from "../../lib/culture/instrument.js";

// Shared survey UI for the staff and leader surveys.

// ─── Brand ───────────────────────────────────────────────────────────────────
export const NAVY = "#0A2A43", CAMEL = "#C9A46A", LBLUE = "#AFCBE3", SAND = "#E8DCC2", CHARCOAL = "#2E2E2E", WHITE = "#FFFFFF";
export const FONT = "Calibri, Carlito, 'Segoe UI', system-ui, sans-serif";

export const CSS = `
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

export const S = {
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

// ─── Small components ────────────────────────────────────────────────────────
export function Choice({ options, value, onChange, name }) {
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

export function Pills({ options, value, onChange, name }) {
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

export function Allocation({ order, value, onChange }) {
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

export function Scale({ value, onChange, name, low = "Hardly at all", high = "Completely" }) {
  return (
    <div>
      <div role="radiogroup" aria-label={name} style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" role="radio" aria-checked={value === n} className="ecf-pill" onClick={() => onChange(n)}>{n}</button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#666", marginTop: 6 }}>
        <span>{low}</span><span>{high}</span>
      </div>
    </div>
  );
}

export function Header({ progress, org, title = "Culture survey" }) {
  return (
    <div style={{ background: NAVY }}>
      <div style={S.header}>
        <span style={S.tag}>James Kilby Advisory</span>
        <div style={S.title}>{title}{org ? ` · ${org}` : ""}</div>
        {progress !== null && (
          <div style={S.progressTrack} aria-hidden="true">
            <div style={{ width: `${Math.round(progress * 100)}%`, height: "100%", background: CAMEL, transition: "width .2s" }} />
          </div>
        )}
      </div>
    </div>
  );
}
