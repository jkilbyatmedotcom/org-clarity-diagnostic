import { useEffect, useState } from "react";
import { STYLES, STRATEGY } from "../../lib/culture/instrument.js";
import { ANGLES, CODES } from "../../lib/culture/analyse.js";

// Admin results view for culture survey pilots. Aggregates only.

const NAVY = "#0A2A43", CAMEL = "#C9A46A", LBLUE = "#AFCBE3", SAND = "#E8DCC2", CHARCOAL = "#2E2E2E", WHITE = "#FFFFFF";
const FONT = "Calibri, Carlito, 'Segoe UI', system-ui, sans-serif";
const KEY_STORE = "ecf-admin-key";

const CSS = `
  .ecr-btn { border:none; border-radius:8px; padding:12px 20px; font:inherit; font-size:15px; font-weight:700; cursor:pointer; }
  .ecr-btn:focus-visible, .ecr-input:focus-visible { outline:3px solid ${CAMEL}; outline-offset:2px; }
  .ecr-input { width:100%; padding:11px 12px; border:1.5px solid #D0D8E0; border-radius:8px; font:inherit; font-size:15px; color:${CHARCOAL}; background:${WHITE}; }
  .ecr-table { width:100%; border-collapse:collapse; font-size:14px; }
  .ecr-table th { text-align:left; font-size:12px; text-transform:uppercase; letter-spacing:.6px; color:#5A6B7B; padding:8px 8px; border-bottom:2px solid ${SAND}; }
  .ecr-table td { padding:8px 8px; border-bottom:1px solid #EEF1F4; vertical-align:top; }
  .ecr-table td.num, .ecr-table th.num { text-align:right; font-variant-numeric: tabular-nums; }
  .ecr-scroll { overflow-x:auto; }
  details > summary { cursor:pointer; font-weight:700; color:${NAVY}; font-size:16px; }
  @media print {
    .ecr-noprint { display:none !important; }
    body, .ecr-page { background:${WHITE} !important; }
    .ecr-card { box-shadow:none !important; break-inside:avoid; border:1px solid #DDD; }
    details { display:block; } details > summary { list-style:none; }
  }
`;

const S = {
  page: { minHeight: "100vh", background: NAVY, fontFamily: FONT, color: CHARCOAL },
  header: { padding: "22px 20px 16px", borderBottom: `3px solid ${CAMEL}`, maxWidth: 980, margin: "0 auto" },
  tag: { fontSize: 11, letterSpacing: "1.5px", textTransform: "uppercase", color: CAMEL, display: "block", marginBottom: 4 },
  title: { fontSize: 24, fontWeight: 700, color: WHITE },
  sub: { fontSize: 14, color: LBLUE, marginTop: 4 },
  body: { maxWidth: 980, margin: "0 auto", padding: "20px 16px 60px", display: "grid", gap: 16 },
  card: { background: WHITE, borderRadius: 10, padding: "22px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.12)", minWidth: 0 },
  kicker: { fontSize: 12, fontWeight: 700, color: CAMEL, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 },
  h2: { fontSize: 20, fontWeight: 700, color: NAVY, lineHeight: 1.3, marginBottom: 8 },
  p: { fontSize: 15, lineHeight: 1.6, marginBottom: 10 },
  hint: { fontSize: 13, color: "#5A6B7B", lineHeight: 1.5 },
  error: { background: "#FEF2F2", border: "1.5px solid #C0392B", color: "#A93226", borderRadius: 8, padding: "12px 14px", fontSize: 15, marginTop: 12 },
  note: { background: "#F4F7FA", borderLeft: `4px solid ${NAVY}`, borderRadius: 6, padding: "12px 14px", fontSize: 14, lineHeight: 1.55, marginTop: 12 },
  tiles: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 8 },
  tile: { border: `1.5px solid ${SAND}`, borderRadius: 8, padding: "14px 14px" },
};

const store = {
  get: () => { try { return sessionStorage.getItem(KEY_STORE) || ""; } catch { return ""; } },
  set: v => { try { sessionStorage.setItem(KEY_STORE, v); } catch { /* not available */ } },
  clear: () => { try { sessionStorage.removeItem(KEY_STORE); } catch { /* not available */ } },
};

async function api(path, key) {
  const res = await fetch(path, { headers: { "x-admin-key": key } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Request failed (${res.status})`);
  return data;
}

// Fit bands are provisional until the pilot data calibrates them.
function fitBand(v) {
  if (v === null || v === undefined) return { label: "Not enough data", color: "#8A97A5" };
  if (v >= 75) return { label: "Closely aligned", color: "#1E7B4B" };
  if (v >= 60) return { label: "Partly aligned", color: "#B7791F" };
  if (v >= 45) return { label: "Weakly related", color: "#C05621" };
  return { label: "Pulling in different directions", color: "#A93226" };
}

const leanText = l => {
  if (!l) return "-";
  const dirs = [l.vertical, l.horizontal].filter(Boolean);
  return `${l.top.join(" and ")}${dirs.length ? `, leaning towards ${dirs.join(" and ")}` : ", no strong lean"}`;
};

// ─── Circumplex chart ────────────────────────────────────────────────────────
function Circumplex({ series }) {
  const size = 360, c = size / 2, r = 120;
  const max = Math.max(30, ...series.flatMap(s => (s.profile ? CODES.map(k => s.profile[k]) : [])));
  const scale = Math.ceil(max / 10) * 10;
  const pt = (code, v) => {
    const a = (ANGLES[code] * Math.PI) / 180;
    return [c + Math.cos(a) * (v / scale) * r, c - Math.sin(a) * (v / scale) * r];
  };
  const ordered = [...CODES].sort((a, b) => ANGLES[a] - ANGLES[b]);
  const rings = [0.25, 0.5, 0.75, 1].map(f => f * scale);

  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Culture fingerprint on the eight-style circumplex" style={{ width: "100%", maxWidth: 420, display: "block", margin: "0 auto" }}>
        {rings.map(v => (
          <polygon key={v} points={ordered.map(k => pt(k, v).join(",")).join(" ")} fill="none" stroke="#E3E8EE" strokeWidth="1" />
        ))}
        {ordered.map(k => { const [x, y] = pt(k, scale); return <line key={k} x1={c} y1={c} x2={x} y2={y} stroke="#E3E8EE" />; })}
        <text x={c + 4} y={c - (rings[1] / scale) * r - 3} fontSize="9" fill="#8A97A5">{rings[1]}</text>
        <text x={c + 4} y={c - r - 3} fontSize="9" fill="#8A97A5">{scale} pts</text>
        {series.filter(s => s.profile).map(s => (
          <polygon key={s.label} points={ordered.map(k => pt(k, s.profile[k]).join(",")).join(" ")}
            fill={s.fill || "none"} fillOpacity={s.fill ? 0.18 : 0} stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dash || "none"} strokeLinejoin="round" />
        ))}
        {ordered.map(k => {
          const [x, y] = pt(k, scale * 1.2);
          return <text key={k} x={x} y={y} fontSize="13" fontWeight="700" fill={NAVY} textAnchor="middle" dominantBaseline="middle">{STYLES[k]}</text>;
        })}
        <text x={c} y={14} fontSize="10" fill="#8A97A5" textAnchor="middle">FLEXIBILITY</text>
        <text x={c} y={size - 6} fontSize="10" fill="#8A97A5" textAnchor="middle">STABILITY</text>
      </svg>
      <figcaption style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", marginTop: 6, fontSize: 13 }}>
        {series.filter(s => s.profile).map(s => (
          <span key={s.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width="26" height="10" aria-hidden="true"><line x1="0" y1="5" x2="26" y2="5" stroke={s.color} strokeWidth="3" strokeDasharray={s.dash || "none"} /></svg>
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

// Stacked percentage bar for decision questions.
const BAR_COLORS = [NAVY, "#3E6A8F", LBLUE, CAMEL, SAND, "#C9CFD6"];
function StackBar({ parts }) {
  const shown = parts.filter(p => p.pct > 0);
  return (
    <div>
      <div style={{ display: "flex", height: 14, borderRadius: 4, overflow: "hidden", background: "#EEF1F4" }}>
        {shown.map(p => <div key={p.id} title={`${p.text}: ${p.pct}%`} style={{ width: `${p.pct}%`, background: BAR_COLORS[parts.indexOf(p) % BAR_COLORS.length] }} />)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 6, fontSize: 12, color: "#4A5A6A" }}>
        {shown.map(p => (
          <span key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: BAR_COLORS[parts.indexOf(p) % BAR_COLORS.length], display: "inline-block" }} />
            {p.text} {p.pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

function FitTile({ label, value, help }) {
  const b = fitBand(value);
  return (
    <div style={S.tile}>
      <div style={{ fontSize: 13, color: "#5A6B7B", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: NAVY, lineHeight: 1 }}>{value ?? "–"}<span style={{ fontSize: 14, color: "#8A97A5" }}>{value != null ? " / 100" : ""}</span></div>
      <div style={{ fontSize: 13, fontWeight: 700, color: b.color, marginTop: 6 }}>{b.label}</div>
      <div style={{ ...S.hint, marginTop: 6 }}>{help}</div>
    </div>
  );
}

const Card = ({ kicker, title, children }) => (
  <section className="ecr-card" style={S.card}>
    {kicker && <div style={S.kicker}>{kicker}</div>}
    {title && <h2 style={S.h2}>{title}</h2>}
    {children}
  </section>
);

const textFor = (list, id) => list.find(x => x.id === id)?.text || id || "-";

// ─── Report ──────────────────────────────────────────────────────────────────
function Report({ data }) {
  const o = data.owners, staff = data.staff, L = data.leaders;
  const bench = L ? "Leaders" : "Owner";
  const enough = !staff.suppressed;
  const series = [
    { label: `Staff, how it works now (n=${staff.n})`, profile: enough ? staff.partA : null, color: NAVY, fill: NAVY },
    { label: `${bench}, what the business needs`, profile: o?.intended, color: CAMEL, dash: "6 4" },
    { label: `${bench}, how it works now`, profile: o?.current, color: "#6F9CC2", dash: "2 3" },
  ];
  const gap = c => (enough && o?.intended ? Math.round(staff.partA[c] - o.intended[c]) : null);

  return (
    <>
      <Card kicker="Overview" title={`${data.pilot.org}: culture fingerprint`}>
        <p style={S.p}>
          <strong>{data.counts.total}</strong> responses: {data.counts.owners} owner{data.counts.owners === 1 ? "" : "s"}, {data.counts.byRole.senior} senior leaders, {data.counts.byRole.lead} team leaders, {data.counts.byRole.member} team members.
          {data.counts.lastAt && <> Latest response {new Date(data.counts.lastAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}.</>}
        </p>
        {!enough && (
          <div style={S.note}>Staff results appear once at least {data.minGroup} staff have responded (currently {staff.n}). This protects anonymity and keeps the picture meaningful.</div>
        )}
        {!o && <div style={S.note}>No owner response yet. The owner's view of what the business needs is the benchmark for the fit scores, so the owner should complete the survey too.</div>}
      </Card>

      <Card kicker="1 · Fingerprint" title="How the culture works now, against what the business needs">
        <Circumplex series={series} />
        <div className="ecr-scroll" style={{ marginTop: 14 }}>
          <table className="ecr-table">
            <thead><tr>
              <th>Style</th><th className="num">Staff now</th><th className="num">Staff stories</th>
              <th className="num">{bench}: now</th><th className="num">{bench}: needed</th><th className="num">Gap</th>
            </tr></thead>
            <tbody>
              {CODES.map(c => {
                const g = gap(c);
                return (
                  <tr key={c}>
                    <td><strong>{STYLES[c]}</strong></td>
                    <td className="num">{enough ? staff.partA[c] : "–"}</td>
                    <td className="num">{enough ? staff.scenarios?.[c] ?? "–" : "–"}</td>
                    <td className="num">{o?.current?.[c] ?? "–"}</td>
                    <td className="num">{o?.intended?.[c] ?? "–"}</td>
                    <td className="num" style={{ fontWeight: 700, color: g == null ? CHARCOAL : g >= 5 ? "#A93226" : g <= -5 ? "#1F5F8B" : CHARCOAL }}>{g == null ? "–" : g > 0 ? `+${g}` : g}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ ...S.hint, marginTop: 10 }}>
          Points out of 100, averaged. "Staff now" is the points split (Part A). "Staff stories" comes from the ten recent-experience scenarios, weighted by how typical each was.
          Gap = staff now minus {L ? "leaders'" : "the owner's"} needed; red means more of that style than the business needs, blue means less.
        </p>
        {enough && <p style={S.p}><strong>Staff describe:</strong> {leanText(staff.lean)}.</p>}
        {o?.intendedLean && <p style={S.p}><strong>{L ? "The leadership team wants" : "The owner wants"}:</strong> {leanText(o.intendedLean)}.</p>}
        {data.benchmark && <p style={S.hint}>Benchmark: {data.benchmark.label}{L ? ", from the leader survey" : ", from the owner questions in the staff survey"}.</p>}
      </Card>

      <Card kicker="2 · Fit" title="How closely the pieces line up">
        <div style={S.tiles}>
          <FitTile label={`Staff now vs ${L ? "leaders'" : "owner's"} needed`} value={data.fit.staffVsIntended} help="The headline gap: the culture staff experience against the one the strategy needs." />
          <FitTile label={`Staff now vs ${L ? "leaders'" : "owner's"} view of now`} value={data.fit.staffVsOwnerView} help={`Do ${L ? "leaders" : "owners"} see today's culture the way staff do? A low score is a blind spot.`} />
          <FitTile label={`${L ? "Leaders'" : "Owner's"} now vs needed`} value={data.fit.ownerViewVsIntended} help={`The change ${L ? "leaders believe" : "the owner believes"} is needed.`} />
          <FitTile label="Says vs stories (staff)" value={staff.saysVsStories ?? null} help="Whether the points split matches what staff describe actually happening. Low means espoused and enacted culture differ." />
        </div>
        <p style={{ ...S.hint, marginTop: 10 }}>100 = the same shape, 50 = unrelated, 0 = opposite. Bands are provisional until the pilot data calibrates them.</p>
      </Card>

      {L && <Leadership L={L} />}

      <Card kicker={L ? "4 · Breakdown" : "3 · Breakdown"} title="By site and by level">
        {!enough ? <p style={S.p}>Available once {data.minGroup} or more staff have responded.</p> : (
          <>
            <div className="ecr-scroll">
              <table className="ecr-table">
                <thead><tr><th>Group</th><th className="num">n</th><th>Strongest styles</th><th className="num">Fit to needed</th><th className="num">Says vs stories</th></tr></thead>
                <tbody>
                  {[...data.levels, ...data.sites].map(g => {
                    const b = fitBand(g.fitToIntended);
                    return (
                      <tr key={g.label}>
                        <td><strong>{g.label}</strong></td>
                        <td className="num">{g.n}</td>
                        <td>{g.lean?.top.join(", ")}</td>
                        <td className="num" style={{ color: b.color, fontWeight: 700 }}>{g.fitToIntended ?? "–"}</td>
                        <td className="num">{g.saysVsStories ?? "–"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {(data.sitesWithheld > 0 || data.levelsWithheld > 0) && (
              <p style={{ ...S.hint, marginTop: 10 }}>
                {data.sitesWithheld > 0 && <>{data.sitesWithheld} response{data.sitesWithheld === 1 ? "" : "s"} from small sites withheld (fewer than {data.minGroup} even when combined). </>}
                {data.levelsWithheld > 0 && <>{data.levelsWithheld} response{data.levelsWithheld === 1 ? "" : "s"} withheld from the level breakdown (group under {data.minGroup}).</>}
              </p>
            )}
            <p style={{ ...S.hint, marginTop: 6 }}>Sites with fewer than {data.minGroup} responses are combined into "Other sites (combined)".</p>
          </>
        )}
      </Card>

      <Card kicker={L ? "5 · Decision rights" : "4 · Decision rights"} title="Who actually decides">
        {data.decisions.suppressed ? <p style={S.p}>Available once {data.minGroup} or more staff have responded.</p> : data.decisions.areas.map(a => (
          <div key={a.area} style={{ padding: "12px 0", borderBottom: "1px solid #EEF1F4" }}>
            <div style={{ fontWeight: 700, color: NAVY, fontSize: 15, marginBottom: 4 }}>Who decides on {a.label}?</div>
            <div style={{ fontSize: 13, color: "#4A5A6A", marginBottom: 8 }}>
              Owner says: <strong>{a.ownerViewText || "no owner answer"}</strong>
              {a.agreeWithOwner != null && <> · {a.agreeWithOwner}% of staff agree</>}
              {" · "}{a.dontKnow}% don't know · {a.checksWithOwner}% check with the owner first
            </div>
            <StackBar parts={a.who} />
          </div>
        ))}
        {!data.decisions.suppressed && (
          <p style={{ ...S.hint, marginTop: 10 }}>
            Watch for three patterns: low agreement with the owner (decision rights on paper differ from reality), a high "don't know" share (unclear rights), and a high "check with the owner" share (founder dependency, which weighs on transferable goodwill).
          </p>
        )}
      </Card>

      {!L && o?.strategy?.length > 0 && (
        <Card kicker="5 · Strategy inputs" title="What the owner said about the business">
          {o.strategy.map((s, i) => (
            <div key={i} className="ecr-scroll">
              <table className="ecr-table" style={{ marginBottom: 8 }}>
                <tbody>
                  <tr><td>Industry</td><td>{s["S-01"]}{s["S-01-sub"] ? ` (${s["S-01-sub"]})` : ""}</td></tr>
                  <tr><td>How they win customers</td><td>{textFor(STRATEGY.discipline, s["S-02"])}</td></tr>
                  <tr><td>Second</td><td>{s["S-03"] === "none" ? "Nothing in particular" : textFor(STRATEGY.discipline, s["S-03"])}</td></tr>
                  {STRATEGY.volatility.map(v => <tr key={v.id}><td>{v.text}</td><td>{s[v.id]} / 5</td></tr>)}
                  <tr><td>Priority for the next three years</td><td>{textFor(STRATEGY.archetype, s["S-07"])}</td></tr>
                </tbody>
              </table>
            </div>
          ))}
        </Card>
      )}

      <Card kicker={L ? "6 · Data quality" : "6 · Data quality"} title="Is the survey working?">
        {data.quality.suppressed ? <p style={S.p}>Available once {data.minGroup} or more staff have responded.</p> : <Quality q={data.quality} />}
      </Card>
    </>
  );
}

// ─── Leadership (leader survey) ──────────────────────────────────────────────
function Leadership({ L }) {
  const ag = fitBand(L.agreement.mean), sd = fitBand(L.statedVsDerived.fit);
  return (
    <Card kicker="3 · Leadership" title="Do the leaders agree, and does it match the strategy?">
      <div className="ecr-scroll">
        <table className="ecr-table">
          <thead><tr><th>Leader</th><th>Role</th><th>Wins customers by</th><th>Priority</th><th className="num">Change agenda</th><th className="num">Needed vs strategy</th></tr></thead>
          <tbody>{L.people.map(p => (
            <tr key={p.name}>
              <td><strong>{p.name}</strong><div style={S.hint}>{p.level}{p.team ? `, ${p.team}` : ""}</div></td>
              <td>{p.role}</td>
              <td>{p.discipline}<div style={S.hint}>then {p.secondary.toLowerCase()}</div></td>
              <td>{p.archetype}</td>
              <td className="num">{p.changeAgenda ?? "–"}</td>
              <td className="num" style={{ color: fitBand(p.statedVsDerived).color, fontWeight: 700 }}>{p.statedVsDerived ?? "–"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p style={{ ...S.hint, marginTop: 6 }}>Change agenda: each leader's now against needed (lower = more change wanted). Needed vs strategy: what they say the business needs against what their own strategy answers imply.</p>

      <div style={S.tiles}>
        <div style={S.tile}>
          <div style={{ fontSize: 13, color: "#5A6B7B", marginBottom: 6 }}>Leaders agree on the culture needed</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: NAVY, lineHeight: 1 }}>{L.agreement.mean ?? "–"}<span style={{ fontSize: 14, color: "#8A97A5" }}>{L.agreement.mean != null ? " / 100" : ""}</span></div>
          <div style={{ fontSize: 13, fontWeight: 700, color: ag.color, marginTop: 6 }}>{L.n < 2 ? "Needs two or more leaders" : ag.label}</div>
          {L.agreement.pairs.length > 1 && <div style={{ ...S.hint, marginTop: 6 }}>Lowest pair: {L.agreement.min}</div>}
        </div>
        <div style={S.tile}>
          <div style={{ fontSize: 13, color: "#5A6B7B", marginBottom: 6 }}>Agree on how the business wins</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: L.sameDiscipline ? "#1E7B4B" : "#A93226" }}>{L.sameDiscipline ? "Yes" : "No"}</div>
          <div style={{ ...S.hint, marginTop: 6 }}>{L.disciplines.map(d => `${d.count} × ${d.text.split(":")[0]}`).join(" · ")}</div>
        </div>
        <div style={S.tile}>
          <div style={{ fontSize: 13, color: "#5A6B7B", marginBottom: 6 }}>Culture needed vs culture the strategy implies</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: NAVY, lineHeight: 1 }}>{L.statedVsDerived.fit ?? "–"}<span style={{ fontSize: 14, color: "#8A97A5" }}> / 100</span></div>
          <div style={{ fontSize: 13, fontWeight: 700, color: sd.color, marginTop: 6 }}>{sd.label}</div>
        </div>
      </div>

      <h3 style={{ ...S.h2, fontSize: 17, marginTop: 20 }}>What the leaders say is needed, against what their strategy implies</h3>
      <Circumplex series={[
        { label: "Leaders: needed", profile: L.needed, color: CAMEL, fill: CAMEL },
        { label: "Strategy implies (provisional)", profile: L.derived, color: NAVY, dash: "6 4" },
      ]} />
      <div className="ecr-scroll" style={{ marginTop: 10 }}>
        <table className="ecr-table">
          <thead><tr><th>Style</th><th className="num">Leaders: needed</th><th className="num">Strategy implies</th><th className="num">Difference</th></tr></thead>
          <tbody>{L.statedVsDerived.styles.map(x => (
            <tr key={x.code} style={x.flag ? { background: "#FBF5EA" } : undefined}>
              <td><strong>{x.style}</strong></td><td className="num">{x.stated ?? "–"}</td><td className="num">{x.derived ?? "–"}</td>
              <td className="num" style={{ fontWeight: x.flag ? 700 : 400 }}>{x.diff == null ? "–" : x.diff > 0 ? `+${x.diff}` : x.diff}{x.flag ? " · discuss" : ""}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p style={{ ...S.hint, marginTop: 6 }}>The strategy profile is worked out from each leader's industry, how they win customers and how fast the market is changing (mapping {L.mappingVersion}). Differences of 10 or more are flagged for discussion, not as errors.</p>

      <h3 style={{ ...S.h2, fontSize: 17, marginTop: 20 }}>Decision rights: {L.jdSource ? "written, intended, believed and experienced" : "intended, believed and experienced"}</h3>
      <div className="ecr-scroll">
        <table className="ecr-table">
          <thead><tr><th>Decision</th>{L.jdSource && <th>JDs: stated authority</th>}<th>Leaders: should decide</th><th>Leaders: decides today</th><th>Staff: decides today</th><th className="num">Staff matching "should"</th></tr></thead>
          <tbody>{L.decisions.map(d => (
            <tr key={d.area}>
              <td><strong>{d.label.charAt(0).toUpperCase() + d.label.slice(1)}</strong></td>
              {L.jdSource && <td>{d.jdHolder || <span style={{ color: "#A93226" }}>No role</span>}</td>}
              <td>{d.shouldMode || "–"}{d.leadersAgreeOnShould === false && <div style={{ ...S.hint, color: "#A93226" }}>Leaders disagree</div>}</td>
              <td>{d.doesMode || "–"}{d.shouldMatchesDoes === false && <div style={{ ...S.hint, color: "#B7791F" }}>Differs from intent</div>}</td>
              <td>{d.staffTop || "–"}</td>
              <td className="num">{d.staffAgreeWithShould != null ? `${d.staffAgreeWithShould}%` : "–"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p style={{ ...S.hint, marginTop: 6 }}>Staff columns appear once five or more staff have responded.{L.jdSource ? ` JD column: which role's JD states authority for the decision (${L.jdSource}).` : " Add the Org Clarity Diagnostic's decision-rights grid to this pilot to show what the JDs say."}</p>

      {(L.noJd.length > 0 || L.unclaimedRoles.length > 0) && (
        <div style={S.note}>
          {L.noJd.length > 0 && <div><strong>Leaders without a JD:</strong> {L.noJd.join(", ")}.</div>}
          {L.unclaimedRoles.length > 0 && <div><strong>Leadership roles in the JDs that no leader claimed:</strong> {L.unclaimedRoles.join(", ")}.</div>}
        </div>
      )}

      <details style={{ marginTop: 16 }} open>
        <summary>In their words</summary>
        {L.purpose.statement && <p style={{ ...S.p, marginTop: 8 }}>Purpose statement rated <strong>{L.purpose.meanRating ?? "–"} / 5</strong> on average: <em>{L.purpose.statement}</em></p>}
        <div className="ecr-scroll">
          <table className="ecr-table" style={{ marginTop: 8 }}>
            <thead><tr><th>Leader</th><th>Must do better than anyone</th><th>Keep</th><th>Change</th><th>Purpose guides decisions</th></tr></thead>
            <tbody>{L.people.map(p => (
              <tr key={p.name}><td><strong>{p.name}</strong></td><td>{p.mustDo || p.ownPurpose || "–"}</td><td>{p.keep || "–"}</td><td>{p.change || "–"}</td><td>{p.guides}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}

function Quality({ q }) {
  return (
    <>
      <div style={S.tiles}>
        <div style={S.tile}><div style={S.hint}>Median completion time</div><div style={{ fontSize: 26, fontWeight: 700, color: NAVY }}>{q.medianMinutes ?? "–"} min</div></div>
        <div style={S.tile}><div style={S.hint}>Finished in under 3 minutes</div><div style={{ fontSize: 26, fontWeight: 700, color: NAVY }}>{q.under3Minutes}</div><div style={S.hint}>Possible rushing</div></div>
        <div style={S.tile}><div style={S.hint}>80+ points on one statement</div><div style={{ fontSize: 26, fontWeight: 700, color: NAVY }}>{q.concentratedPartA}</div><div style={S.hint}>Possible disengagement</div></div>
        <div style={S.tile}><div style={S.hint}>Says vs stories, median person</div><div style={{ fontSize: 26, fontWeight: 700, color: NAVY }}>{q.saysVsStoriesMedian ?? "–"}</div><div style={S.hint}>Do the two sections agree?</div></div>
      </div>

      <details style={{ marginTop: 16 }}>
        <summary>Statements (points split)</summary>
        <div className="ecr-scroll" style={{ marginTop: 8 }}>
          <table className="ecr-table">
            <thead><tr><th>Style</th><th className="num">Mean</th><th className="num">Spread (SD)</th><th className="num">Gave 0</th></tr></thead>
            <tbody>{q.statements.map(s => <tr key={s.code}><td>{s.style}</td><td className="num">{s.mean}</td><td className="num">{s.sd ?? "–"}</td><td className="num">{s.zero}</td></tr>)}</tbody>
          </table>
        </div>
        <p style={{ ...S.hint, marginTop: 6 }}>Very low spread means a statement isn't separating people; it may need rewording.</p>
      </details>

      <details style={{ marginTop: 12 }}>
        <summary>Order effect</summary>
        <div className="ecr-scroll" style={{ marginTop: 8 }}>
          <table className="ecr-table">
            <thead><tr><th>Position shown</th>{q.position.map(p => <th key={p.position} className="num">{p.position}</th>)}</tr></thead>
            <tbody><tr><td>Mean points</td>{q.position.map(p => <td key={p.position} className="num">{p.mean ?? "–"}</td>)}</tr></tbody>
          </table>
        </div>
        <p style={{ ...S.hint, marginTop: 6 }}>Statements are shown in random order. If early positions get noticeably more points, people are anchoring on what they read first.</p>
      </details>

      <details style={{ marginTop: 12 }}>
        <summary>Scenarios</summary>
        {q.scenarios.map(sc => (
          <div key={sc.id} style={{ padding: "10px 0", borderBottom: "1px solid #EEF1F4" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{sc.id}. {sc.text}</div>
            <div style={{ fontSize: 13, color: "#4A5A6A", margin: "4px 0" }}>
              {sc.notApplicablePct}% said it hadn't happened or didn't know
              {sc.neverChosen.length > 0 && <> · never chosen: {sc.neverChosen.map(t => `"${t}"`).join(", ")}</>}
            </div>
          </div>
        ))}
        <p style={{ ...S.hint, marginTop: 6 }}>A high "hasn't happened" share means the scenario doesn't fit everyday work; options nobody picks may be candidates to replace.</p>
      </details>
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Results() {
  const [key, setKey] = useState(store.get());
  const [keyInput, setKeyInput] = useState("");
  const [pilots, setPilots] = useState(null);
  const [pilot, setPilot] = useState(() => new URLSearchParams(window.location.search).get("pilot") || "");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!key) return;
    setError("");
    api("/api/culture-results", key)
      .then(d => { setPilots(d.pilots); store.set(key); if (!pilot && d.pilots[0]) setPilot(d.pilots[0].code); })
      .catch(e => { setError(e.message); setKey(""); store.clear(); });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = () => {
    if (!pilot) return;
    setLoading(true); setError("");
    api(`/api/culture-results?pilot=${encodeURIComponent(pilot)}`, key)
      .then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { if (pilots && pilot) load(); }, [pilots, pilot]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="ecr-page" style={S.page}>
      <style>{CSS}</style>
      <header style={S.header}>
        <span style={S.tag}>James Kilby Advisory</span>
        <div style={S.title}>Culture survey results</div>
        <div style={S.sub}>Enabling Culture Fingerprint · pilot · aggregate results only</div>
      </header>
      <main style={S.body}>
        {!key ? (
          <section style={{ ...S.card, maxWidth: 480 }}>
            <h2 style={S.h2}>Admin access</h2>
            <p style={S.hint}>Enter the culture admin key. It's kept only for this browser tab.</p>
            <form onSubmit={e => { e.preventDefault(); if (keyInput.trim()) setKey(keyInput.trim()); }} style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <input className="ecr-input" type="password" autoComplete="current-password" aria-label="Admin key" value={keyInput} onChange={e => setKeyInput(e.target.value)} />
              <button className="ecr-btn" style={{ background: CAMEL, color: WHITE }} type="submit">Open results</button>
            </form>
            {error && <div style={S.error} role="alert">{error}</div>}
          </section>
        ) : (
          <>
            <div className="ecr-noprint" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <select className="ecr-input" style={{ width: "auto", minWidth: 200 }} aria-label="Organisation" value={pilot} onChange={e => { setPilot(e.target.value); setData(null); }}>
                {(pilots || []).map(p => <option key={p.code} value={p.code}>{p.org}</option>)}
              </select>
              <button className="ecr-btn" style={{ background: WHITE, color: NAVY }} onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
              <button className="ecr-btn" style={{ background: "none", color: WHITE, border: `1.5px solid ${LBLUE}` }} onClick={() => window.print()} disabled={!data}>Print / save PDF</button>
              <button className="ecr-btn" style={{ background: "none", color: LBLUE, marginLeft: "auto" }} onClick={() => { store.clear(); setKey(""); setData(null); setPilots(null); }}>Sign out</button>
            </div>
            {error && <div style={S.error} role="alert">{error}</div>}
            {data && <Report data={data} />}
            {!data && !error && <div style={{ color: LBLUE, fontSize: 15 }}>Loading results…</div>}
          </>
        )}
      </main>
    </div>
  );
}
