import { useState, useRef } from "react";
import { renderReportHtml, verifiedIdentity, ctaCopy } from "../lib/reportHtml.js";
import { DR_AREAS } from "../lib/decisionRights.js";
import { extractText, titleFromFileName } from "./extractText.js";

const MAX_ROLES = 40;          // must match LIMITS.roles in api/diagnose.js
const SINGLE_PASS_ROLES = 10;  // above this the server runs large-organisation mode

const DrDot = () => <span aria-label="Authority stated" style={{ display: "inline-block", width: 12, height: 12, borderRadius: 6, background: "#0A2A43", verticalAlign: "middle" }} />;
const DrRing = () => <span aria-label="Implied" style={{ display: "inline-block", width: 8, height: 8, borderRadius: 6, border: "2px solid #C9A46A", verticalAlign: "middle" }} />;

// ─── Brand Palette ───────────────────────────────────────────────────────────
const NAVY    = "#0A2A43";
const CAMEL   = "#C9A46A";
const LBLUE   = "#AFCBE3";
const SAND    = "#E8DCC2";
const CHARCOAL= "#2E2E2E";
const WHITE   = "#FFFFFF";

// ─── Purpose Scaffold Questions ──────────────────────────────────────────────
const SCAFFOLD_QUESTIONS = [
  { id: "what",   label: "What does your business do?",                         placeholder: "e.g. We manufacture custom timber furniture" },
  { id: "whom",   label: "Who do you do it for?",                               placeholder: "e.g. Architects and interior designers in regional Victoria" },
  { id: "outcome",label: "What outcome does it create for them?",               placeholder: "e.g. Pieces that outlast trends and hold their value" },
  { id: "why",    label: "Why does that outcome matter — to them and to you?",  placeholder: "e.g. Because quality craftsmanship is disappearing and someone has to keep the standard" },
];

const INDUSTRY_OPTIONS = [
  "Trades & Construction",
  "Professional Services",
  "Retail & Hospitality",
  "Manufacturing",
  "Health & Allied Health",
  "Other",
];

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  app: {
    fontFamily: "Calibri, 'Segoe UI', sans-serif",
    background: NAVY,
    minHeight: "100vh",
    color: CHARCOAL,
  },
  header: {
    background: NAVY,
    padding: "32px 40px 24px",
    borderBottom: `3px solid ${CAMEL}`,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: WHITE,
    margin: 0,
    letterSpacing: "-0.5px",
  },
  headerSub: {
    fontSize: 13,
    color: LBLUE,
    marginTop: 4,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  practiceTag: {
    fontSize: 11,
    color: CAMEL,
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    marginBottom: 8,
    display: "block",
  },
  body: {
    maxWidth: 860,
    margin: "0 auto",
    padding: "32px 24px 80px",
  },
  card: {
    background: WHITE,
    borderRadius: 8,
    padding: "28px 32px",
    marginBottom: 20,
    boxShadow: "0 2px 12px rgba(10,42,67,0.10)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: NAVY,
    marginBottom: 6,
    marginTop: 0,
  },
  sectionHint: {
    fontSize: 13,
    color: "#666",
    marginBottom: 18,
    marginTop: 0,
    lineHeight: 1.5,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: NAVY,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: `1.5px solid #D0D8E0`,
    borderRadius: 5,
    fontSize: 14,
    fontFamily: "Calibri, 'Segoe UI', sans-serif",
    color: CHARCOAL,
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.15s",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    border: `1.5px solid #D0D8E0`,
    borderRadius: 5,
    fontSize: 14,
    fontFamily: "Calibri, 'Segoe UI', sans-serif",
    color: CHARCOAL,
    boxSizing: "border-box",
    outline: "none",
    resize: "vertical",
    minHeight: 80,
    lineHeight: 1.5,
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    border: `1.5px solid #D0D8E0`,
    borderRadius: 5,
    fontSize: 14,
    fontFamily: "Calibri, 'Segoe UI', sans-serif",
    color: CHARCOAL,
    background: WHITE,
    boxSizing: "border-box",
    outline: "none",
  },
  toggleRow: {
    display: "flex",
    gap: 12,
    marginBottom: 20,
  },
  toggleBtn: (active) => ({
    flex: 1,
    padding: "12px 16px",
    borderRadius: 6,
    border: `2px solid ${active ? NAVY : "#D0D8E0"}`,
    background: active ? NAVY : WHITE,
    color: active ? WHITE : CHARCOAL,
    fontFamily: "Calibri, 'Segoe UI', sans-serif",
    fontSize: 14,
    fontWeight: active ? 700 : 400,
    cursor: "pointer",
    transition: "all 0.15s",
    textAlign: "left",
  }),
  toggleBtnLabel: {
    display: "block",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 2,
  },
  toggleBtnHint: {
    display: "block",
    fontSize: 11,
    opacity: 0.75,
  },
  roleCard: {
    background: SAND,
    borderRadius: 6,
    padding: "18px 20px",
    marginBottom: 12,
    border: `1px solid #D8CEB4`,
  },
  roleHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  roleNum: {
    fontSize: 12,
    fontWeight: 700,
    color: NAVY,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#999",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1,
    padding: "0 4px",
  },
  addBtn: {
    background: "none",
    border: `2px dashed ${CAMEL}`,
    borderRadius: 6,
    padding: "12px 20px",
    color: CAMEL,
    fontFamily: "Calibri, 'Segoe UI', sans-serif",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    textAlign: "center",
    marginTop: 4,
  },
  uploadBox: {
    border: `2px dashed #AFCBE3`,
    borderRadius: 6,
    padding: "20px",
    textAlign: "center",
    cursor: "pointer",
    background: "#F7FAFC",
    transition: "background 0.15s",
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 13,
    color: "#666",
    margin: 0,
  },
  uploadedFile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#EEF4F8",
    borderRadius: 5,
    padding: "8px 12px",
    marginBottom: 6,
    fontSize: 13,
    color: NAVY,
  },
  primaryBtn: {
    background: CAMEL,
    color: WHITE,
    border: "none",
    borderRadius: 6,
    padding: "14px 32px",
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "Calibri, 'Segoe UI', sans-serif",
    cursor: "pointer",
    width: "100%",
    letterSpacing: "0.3px",
    transition: "opacity 0.15s",
  },
  secondaryBtn: {
    background: NAVY,
    color: WHITE,
    border: "none",
    borderRadius: 6,
    padding: "12px 24px",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "Calibri, 'Segoe UI', sans-serif",
    cursor: "pointer",
    letterSpacing: "0.3px",
  },
  outlineBtn: {
    background: "none",
    color: NAVY,
    border: `2px solid ${NAVY}`,
    borderRadius: 6,
    padding: "12px 24px",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "Calibri, 'Segoe UI', sans-serif",
    cursor: "pointer",
  },
  loadingWrap: {
    textAlign: "center",
    padding: "48px 24px",
  },
  spinner: {
    width: 40,
    height: 40,
    border: `4px solid ${SAND}`,
    borderTop: `4px solid ${CAMEL}`,
    borderRadius: "50%",
    animation: "spin 0.9s linear infinite",
    margin: "0 auto 20px",
  },
  loadingText: {
    color: WHITE,
    fontSize: 15,
    margin: 0,
  },
  loadingHint: {
    color: LBLUE,
    fontSize: 13,
    marginTop: 8,
  },
  // Report styles
  reportWrap: {
    background: WHITE,
    borderRadius: 8,
    overflow: "hidden",
    boxShadow: "0 4px 24px rgba(10,42,67,0.15)",
  },
  reportHeader: {
    background: NAVY,
    padding: "32px 36px",
    borderBottom: `4px solid ${CAMEL}`,
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: WHITE,
    margin: 0,
  },
  reportMeta: {
    fontSize: 12,
    color: LBLUE,
    marginTop: 6,
    letterSpacing: "0.5px",
  },
  reportBody: {
    padding: "28px 36px",
  },
  passBlock: {
    marginBottom: 28,
    paddingBottom: 28,
    borderBottom: `1px solid #E8E8E8`,
  },
  passTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: CAMEL,
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginBottom: 6,
    marginTop: 0,
  },
  passHeading: {
    fontSize: 18,
    fontWeight: 700,
    color: NAVY,
    marginBottom: 12,
    marginTop: 0,
  },
  passText: {
    fontSize: 14,
    color: CHARCOAL,
    lineHeight: 1.65,
    marginBottom: 10,
    marginTop: 0,
  },
  findingItem: {
    background: "#F4F7FA",
    borderLeft: `4px solid ${NAVY}`,
    borderRadius: "0 5px 5px 0",
    padding: "12px 16px",
    marginBottom: 10,
    fontSize: 14,
    color: CHARCOAL,
    lineHeight: 1.6,
  },
  flagItem: {
    background: "#FFF8EC",
    borderLeft: `4px solid ${CAMEL}`,
    borderRadius: "0 5px 5px 0",
    padding: "12px 16px",
    marginBottom: 10,
    fontSize: 14,
    color: CHARCOAL,
    lineHeight: 1.6,
  },
  gapItem: {
    background: "#FEF2F2",
    borderLeft: `4px solid #C0392B`,
    borderRadius: "0 5px 5px 0",
    padding: "12px 16px",
    marginBottom: 10,
    fontSize: 14,
    color: CHARCOAL,
    lineHeight: 1.6,
  },
  ctaBlock: {
    background: NAVY,
    borderRadius: 8,
    padding: "28px 32px",
    marginTop: 8,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: WHITE,
    margin: 0,
  },
  ctaText: {
    fontSize: 13,
    color: LBLUE,
    margin: 0,
    lineHeight: 1.5,
  },
  ctaRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 16,
  },
  checkRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    fontSize: 13,
    color: "#555",
    lineHeight: 1.5,
    cursor: "pointer",
  },
  compareRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 8,
  },
  compareCell: {
    borderRadius: 5,
    padding: "10px 12px",
    fontSize: 13,
    color: CHARCOAL,
    lineHeight: 1.5,
  },
  compareLabel: {
    display: "block",
    fontSize: 11,
    color: "#666",
    marginBottom: 2,
  },
  sentBox: {
    background: "#EEF6EF",
    border: "1.5px solid #27AE60",
    borderRadius: 6,
    padding: "14px 18px",
    fontSize: 14,
    color: "#1E7A44",
    marginBottom: 16,
    lineHeight: 1.5,
  },
  divider: {
    border: "none",
    borderTop: `1px solid #E0E0E0`,
    margin: "4px 0 20px",
  },
  purposeBox: {
    background: "#F0F6FB",
    border: `1.5px solid ${LBLUE}`,
    borderRadius: 6,
    padding: "14px 18px",
    fontSize: 14,
    color: NAVY,
    lineHeight: 1.6,
    marginBottom: 16,
    fontStyle: "italic",
  },
  scoreRow: {
    display: "flex",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  scorePill: (color) => ({
    background: color,
    color: WHITE,
    borderRadius: 20,
    padding: "4px 14px",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.3px",
  }),
  errorBox: {
    background: "#FEF2F2",
    border: `1.5px solid #C0392B`,
    borderRadius: 6,
    padding: "14px 18px",
    fontSize: 14,
    color: "#C0392B",
    marginBottom: 16,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ratingColor(rating) {
  if (!rating) return "#999";
  const r = rating.toLowerCase();
  if (r.includes("strong") || r.includes("clear") || r.includes("good")) return "#27AE60";
  if (r.includes("partial") || r.includes("moderate") || r.includes("developing")) return "#E67E22";
  return "#C0392B";
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OrgClarityDiagnostic() {
  // Step: "input" | "loading" | "report"
  const [step, setStep] = useState("input");

  // Org context
  const [orgName, setOrgName]       = useState("");
  const [industry, setIndustry]     = useState("");
  const [purposeMode, setPurposeMode] = useState(null); // "have" | "build"
  const [purposeText, setPurposeText] = useState("");
  const [scaffold, setScaffold]     = useState({ what: "", whom: "", outcome: "", why: "" });

  // Roles — each has title, uploadedFiles[], manualText
  const [roles, setRoles] = useState([
    { id: 1, title: "", files: [], manualText: "" },
  ]);

  // Report state
  const [report, setReport]   = useState(null);
  const [error, setError]     = useState(null);
  const [loadingMsg, setLoadingMsg] = useState("");

  // Contact details — required before the diagnostic runs
  const [contactName, setContactName]   = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [optIn, setOptIn]               = useState(false);
  const [hpCheck, setHpCheck]           = useState(""); // honeypot, hidden from people
  const [websiteUrl, setWebsiteUrl]     = useState("");
  const [abn, setAbn]                   = useState("");
  const [delivery, setDelivery]         = useState(null);

  const fileRefs = useRef({});
  const bulkRef = useRef(null);
  const [reading, setReading] = useState(null);   // "Reading 3 of 31 files…"
  const [fileProblems, setFileProblems] = useState([]);
  const reportRef = useRef(null);

  // ── Role helpers ────────────────────────────────────────────────────────────
  function addRole() {
    if (roles.length >= MAX_ROLES) return;
    setRoles(r => [...r, { id: Date.now(), title: "", files: [], manualText: "" }]);
  }

  function removeRole(id) {
    setRoles(r => r.filter(x => x.id !== id));
  }

  function updateRole(id, field, value) {
    setRoles(r => r.map(x => x.id === id ? { ...x, [field]: value } : x));
  }

  // Reads files one at a time; returns the readable ones and lists the rest.
  async function readFiles(fileList) {
    const files = Array.from(fileList);
    const ok = [], problems = [];
    for (let i = 0; i < files.length; i++) {
      if (files.length > 1) setReading(`Reading ${i + 1} of ${files.length} files…`);
      try { ok.push({ name: files[i].name, text: await extractText(files[i]) }); }
      catch (err) { problems.push(err.message); }
    }
    setReading(null);
    setFileProblems(problems);
    return ok;
  }

  async function handleFileUpload(id, files) {
    const loaded = await readFiles(Array.from(files).slice(0, 3));
    setRoles(r => r.map(x => x.id === id ? { ...x, files: [...x.files, ...loaded] } : x));
  }

  // One role per file: for organisations uploading a whole JD library.
  async function handleBulkUpload(files) {
    const loaded = await readFiles(files);
    if (!loaded.length) return;
    setRoles(prev => {
      const kept = prev.filter(r => r.title.trim() || r.files.length || r.manualText.trim());
      const room = Math.max(0, MAX_ROLES - kept.length);
      if (loaded.length > room) setFileProblems(p => [...p, `Only ${MAX_ROLES} roles can be assessed at once, so ${loaded.length - room} file${loaded.length - room === 1 ? " was" : "s were"} left out.`]);
      const added = loaded.slice(0, room).map((f, i) => ({ id: Date.now() + i, title: titleFromFileName(f.name), files: [f], manualText: "", bulk: true }));
      const next = [...kept, ...added];
      return next.length ? next : [{ id: 1, title: "", files: [], manualText: "" }];
    });
  }

  function removeFile(roleId, fileName) {
    setRoles(r => r.map(x => x.id === roleId
      ? { ...x, files: x.files.filter(f => f.name !== fileName) }
      : x));
  }

  // ── Run diagnostic ──────────────────────────────────────────────────────────
  async function runDiagnostic() {
    setError(null);

    // Validation
    if (!contactName.trim()) { setError("Please enter your name so we can send you your report."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contactEmail.trim())) { setError("Please enter a valid email address so we can send you your report."); return; }
    if (websiteUrl.trim() && !/^(https?:\/\/)?[^\s/]+\.[^\s/]{2,}(\/\S*)?$/i.test(websiteUrl.trim())) { setError("Please check your website address — for example, yourcompany.com.au"); return; }
    if (abn.trim() && abn.replace(/\D/g, "").length !== 11) { setError("An ABN has 11 digits. Please check it, or leave the field blank."); return; }
    if (!purposeMode) { setError("Please select whether you have an org purpose statement."); return; }
    if (purposeMode === "have" && !purposeText.trim()) { setError("Please enter your org purpose statement."); return; }
    if (purposeMode === "build" && !scaffold.what.trim()) { setError("Please answer at least the first purpose question."); return; }
    const validRoles = roles.filter(r => r.files.length > 0 || r.manualText.trim());
    if (validRoles.length === 0) { setError("Please add at least one role — upload a JD or enter role details manually."); return; }

    setStep("loading");
    setLoadingMsg("Reading your documents and org context...");
    const large = validRoles.length > SINGLE_PASS_ROLES;

    const timers = large ? [
      setTimeout(() => setLoadingMsg(`Assessing ${validRoles.length} roles in batches — this takes two to three minutes...`), 4000),
      setTimeout(() => setLoadingMsg("Still assessing roles and reading decision rights..."), 60000),
      setTimeout(() => setLoadingMsg("Reviewing the whole role set for gaps and overlaps..."), 100000),
      setTimeout(() => setLoadingMsg("Building your report and sending your copy..."), 150000),
    ] : [
      setTimeout(() => setLoadingMsg("Running Pass 1 — assessing your purpose statement..."), 4000),
      setTimeout(() => setLoadingMsg("Running Pass 2 — assessing individual roles..."), 10000),
      setTimeout(() => setLoadingMsg("Running Pass 3 — mapping collective alignment..."), 18000),
      setTimeout(() => setLoadingMsg("Building your report and sending your copy..."), 26000),
    ];
    const controller = new AbortController();
    const hardTimeout = setTimeout(() => controller.abort(), large ? 310000 : 120000);
    const clearTimers = () => { timers.forEach(clearTimeout); clearTimeout(hardTimeout); };

    try {
      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contact: { name: contactName.trim(), email: contactEmail.trim(), optIn },
          hp_check: hpCheck,
          website_url: websiteUrl.trim(),
          abn: abn.replace(/\D/g, ""),
          orgName, industry, purposeMode, purposeText, scaffold,
          roles: validRoles.map(r => ({ title: r.title, manualText: r.manualText, files: r.files })),
        }),
      });

      const data = await response.json().catch(() => ({}));
      clearTimers();
      if (!response.ok || data.error || !data.report) {
        throw new Error(data.error?.message || "The diagnostic couldn't be completed. Please try again.");
      }
      setReport(data.report);
      setDelivery(data.delivery || null);
      setStep("report");
      window.scrollTo?.(0, 0);
    } catch (err) {
      clearTimers();
      setError(err.name === "AbortError"
        ? "The diagnostic is taking longer than expected. Please try again — if it keeps happening, try fewer roles or shorter documents."
        : err.message);
      setStep("input");
    }
  }

  // ── PDF generation ──────────────────────────────────────────────────────────
  function generatePDF() {
    if (!report) return;
    const w = window.open("", "_blank");
    if (!w) { setError("Your browser blocked the PDF window. Please allow pop-ups for this page and try again."); return; }
    w.document.write(renderReportHtml(report, { mode: "print" }));
    w.document.close();
    setTimeout(() => w.print(), 600);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={S.app}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, textarea:focus, select:focus { border-color: #0A2A43 !important; }
        button:hover { opacity: 0.88; }
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <span style={S.practiceTag}>James Kilby Advisory</span>
        <h1 style={S.headerTitle}>Org Clarity Diagnostic</h1>
        <p style={S.headerSub}>Purpose · Roles · Alignment</p>
      </div>

      <div style={S.body}>

        {/* ── INPUT STEP ── */}
        {step === "input" && (
          <>
            {error && <div style={S.errorBox}>{error}</div>}

            {/* Contact details */}
            <div style={S.card}>
              <h2 style={S.sectionTitle}>Where should we send your report?</h2>
              <p style={S.sectionHint}>Your report appears on screen when it's ready, and a copy is emailed to you to keep.</p>
              <div style={S.twoCol}>
                <div>
                  <label style={S.label} htmlFor="ocd-name">Your name</label>
                  <input id="ocd-name" style={S.input} value={contactName} onChange={e => setContactName(e.target.value)} placeholder="e.g. Sam Taylor" autoComplete="name" />
                </div>
                <div>
                  <label style={S.label} htmlFor="ocd-email">Work email</label>
                  <input id="ocd-email" type="email" style={S.input} value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="you@company.com.au" autoComplete="email" />
                </div>
              </div>
              <label style={S.checkRow}>
                <input type="checkbox" checked={optIn} onChange={e => setOptIn(e.target.checked)} style={{ marginTop: 3 }} />
                <span>Send me occasional insights from James Kilby Advisory. Unsubscribe any time.</span>
              </label>
              <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
                <label>Leave this field empty<input tabIndex={-1} autoComplete="off" name="hp_check" value={hpCheck} onChange={e => setHpCheck(e.target.value)} /></label>
              </div>
            </div>

            {/* Org context */}
            <div style={S.card}>
              <h2 style={S.sectionTitle}>About your organisation</h2>
              <p style={S.sectionHint}>This helps the diagnostic speak to your specific context rather than giving you generic output.</p>
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Organisation name <span style={{ fontWeight: 400, color: "#999" }}>(optional)</span></label>
                <input style={S.input} value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Timber & Trade Co." />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={S.label} htmlFor="ocd-abn">ABN <span style={{ fontWeight: 400, color: "#999" }}>(optional)</span></label>
                <input id="ocd-abn" style={S.input} value={abn} onChange={e => setAbn(e.target.value)} placeholder="e.g. 51 824 753 556" inputMode="numeric" autoComplete="off" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={S.label} htmlFor="ocd-website">Website <span style={{ fontWeight: 400, color: "#999" }}>(optional)</span></label>
                <input id="ocd-website" style={S.input} value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="e.g. yourcompany.com.au" autoComplete="url" inputMode="url" />
                <p style={{ fontSize: 12, color: "#888", margin: "6px 0 0", lineHeight: 1.5 }}>Add it and your report will compare what your purpose says with what your website tells the market.</p>
              </div>
              <div>
                <label style={S.label}>Industry</label>
                <select style={S.select} value={industry} onChange={e => setIndustry(e.target.value)}>
                  <option value="">Select your industry</option>
                  {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* Purpose */}
            <div style={S.card}>
              <h2 style={S.sectionTitle}>Your organisational purpose</h2>
              <p style={S.sectionHint}>This is the anchor for everything. Your roles will be assessed against it.</p>

              <div style={S.toggleRow}>
                <button style={S.toggleBtn(purposeMode === "have")} onClick={() => setPurposeMode("have")}>
                  <span style={S.toggleBtnLabel}>I have a purpose statement</span>
                  <span style={S.toggleBtnHint}>I'll paste or type it in</span>
                </button>
                <button style={S.toggleBtn(purposeMode === "build")} onClick={() => setPurposeMode("build")}>
                  <span style={S.toggleBtnLabel}>I don't have one yet</span>
                  <span style={S.toggleBtnHint}>Answer a few questions and we'll construct it</span>
                </button>
              </div>

              {purposeMode === "have" && (
                <div>
                  <label style={S.label}>Your purpose statement</label>
                  <textarea
                    style={S.textarea}
                    value={purposeText}
                    onChange={e => setPurposeText(e.target.value)}
                    placeholder="Enter your organisation's purpose statement..."
                    rows={4}
                  />
                </div>
              )}

              {purposeMode === "build" && (
                <div>
                  <p style={{ fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 1.5 }}>
                    Answer as many as you can. We'll synthesise a purpose statement and include it in your report.
                  </p>
                  {SCAFFOLD_QUESTIONS.map(q => (
                    <div key={q.id} style={{ marginBottom: 14 }}>
                      <label style={S.label}>{q.label}</label>
                      <input
                        style={S.input}
                        value={scaffold[q.id]}
                        onChange={e => setScaffold(s => ({ ...s, [q.id]: e.target.value }))}
                        placeholder={q.placeholder}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Roles */}
            <div style={S.card}>
              <h2 style={S.sectionTitle}>Your roles</h2>
              <p style={S.sectionHint}>
                Upload up to {MAX_ROLES} JDs as PDF, Word (.docx) or text. No JD? Enter what you know about the role manually.
              </p>

              <div
                style={{ ...S.uploadBox, background: "#F0F6FB", borderColor: LBLUE, marginBottom: 16 }}
                onClick={() => bulkRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleBulkUpload(e.dataTransfer.files); }}
              >
                <p style={{ ...S.uploadText, fontWeight: 700, color: NAVY }}>Got a whole set of JDs? Upload them all at once</p>
                <p style={{ ...S.uploadText, fontSize: 12 }}>One file per role · select or drop up to {MAX_ROLES} files</p>
                <input type="file" accept=".txt,.docx,.pdf,.rtf" multiple style={{ display: "none" }} ref={bulkRef}
                  aria-label="Upload all JDs" onChange={e => { handleBulkUpload(e.target.files); e.target.value = ""; }} />
              </div>
              {reading && <p style={{ ...S.sectionHint, color: NAVY, fontWeight: 700 }} aria-live="polite">{reading}</p>}
              {fileProblems.length > 0 && (
                <div role="alert" style={{ background: "#FFF8EC", border: `1.5px solid ${CAMEL}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, lineHeight: 1.5 }}>
                  {fileProblems.map((p, i) => <div key={i}>{p}</div>)}
                </div>
              )}
              {roles.length > SINGLE_PASS_ROLES && (
                <p style={{ ...S.sectionHint, background: "#F4F7FA", padding: "10px 14px", borderRadius: 8 }}>
                  <strong>{roles.length} roles.</strong> Larger role sets are assessed in batches and then reviewed together, so the report takes two to three minutes. Check the role titles below; they come from the file names.
                </p>
              )}

              {roles.map((role, idx) => role.bulk ? (
                <div key={role.id} style={{ ...S.roleCard, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ ...S.roleNum, minWidth: 28 }}>{idx + 1}</span>
                  <input style={{ ...S.input, flex: 1 }} aria-label={`Role ${idx + 1} title`} value={role.title} onChange={e => updateRole(role.id, "title", e.target.value)} />
                  <span style={{ fontSize: 12, color: "#888", flex: "0 1 180px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={role.files[0]?.name}>✓ {role.files[0]?.name}</span>
                  <button style={S.removeBtn} aria-label={`Remove ${role.title}`} onClick={() => removeRole(role.id)}>×</button>
                </div>
              ) : (
                <div key={role.id} style={S.roleCard}>
                  <div style={S.roleHeader}>
                    <span style={S.roleNum}>Role {idx + 1}</span>
                    {roles.length > 1 && (
                      <button style={S.removeBtn} onClick={() => removeRole(role.id)}>×</button>
                    )}
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Role title</label>
                    <input
                      style={S.input}
                      value={role.title}
                      onChange={e => updateRole(role.id, "title", e.target.value)}
                      placeholder="e.g. General Manager"
                    />
                  </div>

                  {/* File upload */}
                  <div
                    style={S.uploadBox}
                    onClick={() => fileRefs.current[role.id]?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handleFileUpload(role.id, e.dataTransfer.files); }}
                  >
                    <p style={S.uploadText}>📄 Click to upload JD or drag & drop &nbsp;·&nbsp; PDF, .docx or .txt</p>
                    <input
                      type="file"
                      accept=".txt,.docx,.pdf,.rtf"
                      multiple
                      style={{ display: "none" }}
                      ref={el => fileRefs.current[role.id] = el}
                      onChange={e => handleFileUpload(role.id, e.target.files)}
                    />
                  </div>

                  {role.files.map(f => (
                    <div key={f.name} style={S.uploadedFile}>
                      <span>✓ {f.name}</span>
                      <button style={{ ...S.removeBtn, fontSize: 14 }} onClick={() => removeFile(role.id, f.name)}>×</button>
                    </div>
                  ))}

                  {role.files.length === 0 && (
                    <div style={{ marginTop: 10 }}>
                      <label style={S.label}>Or describe the role manually</label>
                      <textarea
                        style={S.textarea}
                        value={role.manualText}
                        onChange={e => updateRole(role.id, "manualText", e.target.value)}
                        placeholder="Paste the role purpose, key responsibilities, or anything you know about what this person is supposed to do..."
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              ))}

              {roles.length < MAX_ROLES && (
                <button style={S.addBtn} onClick={addRole}>+ Add another role</button>
              )}
            </div>

            <button style={S.primaryBtn} onClick={runDiagnostic}>
              Run Diagnostic →
            </button>
          </>
        )}

        {/* ── LOADING STEP ── */}
        {step === "loading" && (
          <div style={S.loadingWrap}>
            <div style={S.spinner} />
            <p style={S.loadingText}>{loadingMsg}</p>
            <p style={S.loadingHint}>This takes 20–30 seconds. We're reading every document carefully.</p>
          </div>
        )}

        {/* ── REPORT STEP ── */}
        {step === "report" && report && (
          <>
            {delivery?.emailed && (
              <div style={S.sentBox}>
                ✓ A copy of this report has been sent to <strong>{contactEmail.trim()}</strong>. If it isn't in your inbox in a few minutes, check your junk folder.
              </div>
            )}
            <div style={S.reportWrap} ref={reportRef}>

              {/* Report header */}
              <div style={S.reportHeader}>
                <p style={{ fontSize: 11, color: CAMEL, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>
                  James Kilby Advisory — Org Clarity Diagnostic
                </p>
                <h2 style={S.reportTitle}>{report.orgName || "Your Organisation"}</h2>
                <p style={S.reportMeta}>
                  {report.industry && `${report.industry} · `}
                  {new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                {verifiedIdentity(report) && (
                  <p style={{ ...S.reportMeta, marginTop: 4, fontSize: 11, opacity: 0.85 }}>{verifiedIdentity(report)}</p>
                )}
              </div>

              <div style={S.reportBody}>

                {/* Pass 1 */}
                <div style={S.passBlock}>
                  <p style={S.passTitle}>Pass 1 — Org Purpose Assessment</p>
                  <h3 style={S.passHeading}>Your Purpose Statement</h3>
                  <div style={S.purposeBox}>{report.purposeAssessment.purposeStatement}</div>
                  <div style={S.scoreRow}>
                    <span style={S.scorePill(ratingColor(report.purposeAssessment.rating))}>
                      {report.purposeAssessment.rating}
                    </span>
                  </div>
                  <div style={S.findingItem}>{report.purposeAssessment.headline}</div>
                  {report.purposeAssessment.coaching && (
                    <p style={{ ...S.passText, color: "#555", fontStyle: "italic" }}>
                      {report.purposeAssessment.coaching}
                    </p>
                  )}
                  <hr style={S.divider} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {Object.entries(report.purposeAssessment.criteria || {}).map(([k, v]) => (
                      <div key={k} style={{ background: "#F4F7FA", padding: "10px 14px", borderRadius: 5, fontSize: 13 }}>
                        <strong style={{ color: NAVY, textTransform: "capitalize" }}>
                          {k.replace(/([A-Z])/g, " $1")}:
                        </strong><br />{v}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Purpose in the market */}
                {report.purposeMarketAlignment?.status === "ok" && (() => {
                  const a = report.purposeMarketAlignment;
                  const rows = [
                    ["Audience", a.audience?.purpose, a.audience?.website, a.audience?.observation],
                    ["Promise", a.promise?.purpose, a.promise?.website, a.promise?.observation],
                    ["Value discipline", a.valueDiscipline?.purposeImplies, a.valueDiscipline?.websiteSignals, a.valueDiscipline?.observation],
                  ];
                  return (
                    <div style={S.passBlock}>
                      <p style={S.passTitle}>Purpose in the Market</p>
                      <h3 style={S.passHeading}>
                        Purpose–Market Alignment: <span style={{ color: ratingColor(a.rating === "Aligned" ? "strong" : a.rating === "Partially aligned" ? "partial" : "weak") }}>{a.rating}</span>
                      </h3>
                      <div style={S.findingItem}>{a.headline}</div>
                      {rows.map(([lbl, p, w, obs]) => (
                        <div key={lbl} style={{ marginTop: 14 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: NAVY, margin: "0 0 6px" }}>{lbl}</p>
                          <div style={S.compareRow}>
                            <div style={{ ...S.compareCell, background: "#F0F6FB" }}><span style={S.compareLabel}>Purpose says</span>{p}</div>
                            <div style={{ ...S.compareCell, background: "#FFF8EC" }}><span style={S.compareLabel}>Website says</span>{w}</div>
                          </div>
                          <p style={{ ...S.passText, fontSize: 13, marginTop: 6 }}>{obs}</p>
                        </div>
                      ))}
                      <div style={{ ...S.flagItem, marginTop: 8 }}>
                        <strong>Distinctiveness — {a.distinctiveness?.rating}:</strong> {a.distinctiveness?.observation}
                      </div>
                      <div style={{ background: "#F0F6FB", border: `1.5px solid ${LBLUE}`, borderRadius: 6, padding: "14px 18px", marginTop: 12 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: CAMEL, margin: "0 0 6px" }}>Fix First</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: NAVY, lineHeight: 1.5, margin: 0 }}>{a.fixFirst}</p>
                      </div>
                      <p style={{ fontSize: 11, color: "#888", marginTop: 10 }}>
                        {a.websiteRole ? `Website role: ${a.websiteRole} · ` : ""}Based on {(a.pagesRead || []).length} page{(a.pagesRead || []).length === 1 ? "" : "s"} of {a.url}
                      </p>
                    </div>
                  );
                })()}
                {report.purposeMarketAlignment?.status === "unavailable" && (
                  <div style={S.passBlock}>
                    <p style={S.passTitle}>Purpose in the Market</p>
                    <p style={{ ...S.passText, color: "#666", fontSize: 13 }}>
                      We couldn't assess {report.purposeMarketAlignment.url || "your website"} this time. {report.purposeMarketAlignment.reason}
                    </p>
                  </div>
                )}

                {/* Pass 2 */}
                <div style={S.passBlock}>
                  <p style={S.passTitle}>Pass 2 — Role Assessments</p>
                  <h3 style={S.passHeading}>Your Roles</h3>
                  {(report.roleAssessments || []).map((r, i) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                        <strong style={{ fontSize: 15, color: NAVY }}>{r.roleTitle}</strong>
                        <div style={{ display: "flex", gap: 6 }}>
                          <span style={{ ...S.scorePill(ratingColor(r.purposeRating)), fontSize: 11 }}>
                            Purpose: {r.purposeRating}
                          </span>
                          <span style={{ ...S.scorePill(ratingColor(r.kraRating)), fontSize: 11 }}>
                            KRAs: {r.kraRating}
                          </span>
                        </div>
                      </div>
                      <div style={S.findingItem}>{r.headline}</div>
                      {r.recommendation && (
                        <p style={{ fontSize: 13, color: "#666", fontStyle: "italic", marginTop: 4, paddingLeft: 4 }}>
                          → {r.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Decision rights (from the JDs) */}
                {report.decisionRights?.roles?.length > 0 && (
                  <div style={S.passBlock}>
                    <p style={S.passTitle}>Decision Rights</p>
                    <h3 style={S.passHeading}>Who your JDs say decides</h3>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr>
                            <th style={{ borderBottom: `2px solid ${SAND}` }}></th>
                            {Object.entries(DR_AREAS).map(([code, lbl]) => (
                              <th key={code} style={{ padding: "6px 4px", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.3, color: "#5A6B7B", borderBottom: `2px solid ${SAND}`, verticalAlign: "bottom", fontWeight: 700 }}>{lbl}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {report.decisionRights.roles.map(r => (
                            <tr key={r.roleTitle}>
                              <td style={{ padding: "8px 6px", fontWeight: 700, color: NAVY, borderBottom: "1px solid #EEF1F4" }}>{r.roleTitle}</td>
                              {Object.keys(DR_AREAS).map(code => (
                                <td key={code} title={r.areas[code]} style={{ textAlign: "center", padding: "8px 4px", borderBottom: "1px solid #EEF1F4", fontSize: 15, color: r.areas[code] === "explicit" ? NAVY : r.areas[code] === "implied" ? CAMEL : "#BBB" }}>
                                  {r.areas[code] === "explicit" ? <DrDot /> : r.areas[code] === "implied" ? <DrRing /> : "–"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p style={{ fontSize: 11, color: "#666", margin: "8px 0 12px", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}><span><DrDot /> Authority stated</span><span><DrRing /> Implied by the role, not stated</span><span>– Not covered</span></p>
                    {report.decisionRights.unowned?.length > 0 && (
                      <p style={S.passText}><strong>No role holds stated authority for:</strong> {report.decisionRights.unowned.map(c => DR_AREAS[c].toLowerCase()).join(", ")}.</p>
                    )}
                    {(report.decisionRights.areas || []).map((a, i) => (
                      <div key={i} style={{ ...S.findingItem, borderLeft: `4px solid ${CAMEL}` }}>
                        <strong>{a.label}{a.holder && a.holder !== "No role" ? ` (${a.holder})` : " (no role)"}:</strong> {a.observation}
                      </div>
                    ))}
                  </div>
                )}

                {/* Pass 3 */}
                <div style={{ ...S.passBlock, borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
                  <p style={S.passTitle}>Pass 3 — Collective Alignment</p>
                  <h3 style={S.passHeading}>
                    Structural Health: <span style={{ color: ratingColor(report.collectiveAlignment.structuralHealth) }}>
                      {report.collectiveAlignment.structuralHealth}
                    </span>
                  </h3>
                  <p style={S.passText}>{report.collectiveAlignment.summaryObservation}</p>

                  {(report.collectiveAlignment.coverageGaps || []).length > 0 && (
                    <>
                      <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8, marginTop: 16 }}>Coverage Gaps</p>
                      {report.collectiveAlignment.coverageGaps.map((g, i) => (
                        <div key={i} style={S.gapItem}>
                          <strong>{g.function}:</strong> {g.observation}
                        </div>
                      ))}
                    </>
                  )}

                  {(report.collectiveAlignment.overlapGaps || []).length > 0 && (
                    <>
                      <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8, marginTop: 16 }}>Overlap Gaps</p>
                      {report.collectiveAlignment.overlapGaps.map((g, i) => (
                        <div key={i} style={S.flagItem}>
                          <strong>{g.roles}:</strong> {g.observation}
                        </div>
                      ))}
                    </>
                  )}

                  {(report.collectiveAlignment.alignmentGaps || []).length > 0 && (
                    <>
                      <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 8, marginTop: 16 }}>Alignment Gaps</p>
                      {report.collectiveAlignment.alignmentGaps.map((g, i) => (
                        <div key={i} style={S.flagItem}>
                          <strong>{g.role}:</strong> {g.observation}
                        </div>
                      ))}
                    </>
                  )}

                  {/* What This Means in Practice */}
                  {report.collectiveAlignment.whatThisMeansInPractice && (
                    <div style={{ marginTop: 24 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: NAVY, marginBottom: 8 }}>
                        What This Means in Practice
                      </p>
                      <div style={{ background: SAND, border: `1px solid #D8CEB4`, borderRadius: 6, padding: "16px 20px", fontSize: 14, color: CHARCOAL, lineHeight: 1.7 }}>
                        {report.collectiveAlignment.whatThisMeansInPractice}
                      </div>
                    </div>
                  )}

                  {/* What Remains Impossible */}
                  {(report.collectiveAlignment.whatRemainsImpossible || []).length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: NAVY, marginBottom: 8 }}>
                        What Remains Impossible Until This Changes
                      </p>
                      {report.collectiveAlignment.whatRemainsImpossible.map((item, i) => (
                        <div key={i} style={{ background: "#FFF8EC", borderLeft: `4px solid ${CAMEL}`, borderRadius: "0 5px 5px 0", padding: "12px 16px", marginBottom: 8, fontSize: 14, color: CHARCOAL, lineHeight: 1.6 }}>
                          <strong style={{ color: NAVY }}>{item.gap}:</strong> {item.observation}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Next step */}
                  <div style={{ background: "#F0F6FB", border: `1.5px solid ${LBLUE}`, borderRadius: 6, padding: "16px 20px", marginTop: 20 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: CAMEL, marginBottom: 6 }}>
                      Most Important Next Step
                    </p>
                    <p style={{ fontSize: 15, fontWeight: 600, color: NAVY, lineHeight: 1.5, margin: 0 }}>
                      {report.collectiveAlignment.nextStep}
                    </p>
                  </div>
                </div>

              </div>

              {/* CTA block */}
              <div style={S.ctaBlock}>
                {(() => {
                  const cta = ctaCopy(report);
                  return (
                    <>
                      <p style={S.ctaTitle}>{cta.title}</p>
                      <p style={S.ctaText}>
                        {cta.text}
                      </p>
                      <div style={{ marginTop: 8 }}>
                        <a
                          href="https://calendly.com/j-kilby/30min"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-block",
                            background: CAMEL,
                            color: WHITE,
                            borderRadius: 5,
                            padding: "12px 28px",
                            fontSize: 15,
                            fontWeight: 700,
                            fontFamily: "Calibri, 'Segoe UI', sans-serif",
                            textDecoration: "none",
                            letterSpacing: "0.2px",
                          }}
                        >
                          Book a 45-minute call →
                        </a>
                      </div>
                      <p style={{ ...S.ctaText, marginTop: 12, fontSize: 12 }}>
                        jameskilbyadvisory.com.au
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
              <button style={S.secondaryBtn} onClick={generatePDF}>
                Download PDF Report
              </button>
              <button style={S.outlineBtn} onClick={() => { setStep("input"); setReport(null); setDelivery(null); window.scrollTo?.(0, 0); }}>
                Run Another Diagnostic
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
