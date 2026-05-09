import { useState, useRef } from "react";

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
  emailInput: {
    flex: 1,
    minWidth: 200,
    padding: "10px 14px",
    borderRadius: 5,
    border: "none",
    fontSize: 14,
    fontFamily: "Calibri, 'Segoe UI', sans-serif",
  },
  camelBtn: {
    background: CAMEL,
    color: WHITE,
    border: "none",
    borderRadius: 5,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "Calibri, 'Segoe UI', sans-serif",
    cursor: "pointer",
    whiteSpace: "nowrap",
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

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
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

  // CTA state — booking link only, no email capture

  const fileRefs = useRef({});
  const reportRef = useRef(null);

  // ── Role helpers ────────────────────────────────────────────────────────────
  function addRole() {
    if (roles.length >= 10) return;
    setRoles(r => [...r, { id: Date.now(), title: "", files: [], manualText: "" }]);
  }

  function removeRole(id) {
    setRoles(r => r.filter(x => x.id !== id));
  }

  function updateRole(id, field, value) {
    setRoles(r => r.map(x => x.id === id ? { ...x, [field]: value } : x));
  }

  async function handleFileUpload(id, files) {
    const arr = Array.from(files).slice(0, 3);
    const loaded = await Promise.all(arr.map(async f => ({
      name: f.name,
      text: await readFileAsText(f).catch(() => `[Could not read ${f.name}]`),
    })));
    setRoles(r => r.map(x => x.id === id ? { ...x, files: [...x.files, ...loaded] } : x));
  }

  function removeFile(roleId, fileName) {
    setRoles(r => r.map(x => x.id === roleId
      ? { ...x, files: x.files.filter(f => f.name !== fileName) }
      : x));
  }

  // ── Build prompt ────────────────────────────────────────────────────────────
  function buildPrompt() {
    const purpose = purposeMode === "have"
      ? purposeText
      : `[Constructed from founder inputs]\nWhat: ${scaffold.what}\nFor whom: ${scaffold.whom}\nOutcome: ${scaffold.outcome}\nWhy it matters: ${scaffold.why}`;

    const rolesText = roles.map((r, i) => {
      const content = r.files.length > 0
        ? r.files.map(f => `File: ${f.name}\n${f.text}`).join("\n\n")
        : r.manualText;
      return `ROLE ${i + 1}: ${r.title || "Untitled"}\n${content}`;
    }).join("\n\n---\n\n");

    return `You are an expert organisational design advisor working with SME owners. Your job is to run a three-pass diagnostic on an organisation's purpose and role set, then return a structured JSON report.

ORGANISATION: ${orgName || "Not specified"}
INDUSTRY: ${industry || "Not specified"}
PURPOSE MODE: ${purposeMode === "have" ? "Owner provided" : "Constructed from scaffold"}
ORG PURPOSE INPUT:
${purpose}

ROLES PROVIDED:
${rolesText}

---

Run three diagnostic passes and return ONLY valid JSON in this exact structure (no markdown, no preamble):

{
  "orgName": "string",
  "industry": "string",
  "purposeAssessment": {
    "purposeStatement": "string — the org purpose as provided or constructed. If constructed, synthesise the scaffold inputs into a single clear purpose statement.",
    "rating": "Strong | Partial | Weak",
    "criteria": {
      "specificity": "one sentence assessment",
      "directionality": "one sentence assessment",
      "distinctiveness": "one sentence assessment",
      "anchoringUtility": "one sentence assessment"
    },
    "headline": "one plain-language sentence that names the most important thing about this purpose statement — written as if spoken directly to the founder",
    "coaching": "2-3 sentences of direct coaching if the statement is Partial or Weak. Empty string if Strong."
  },
  "roleAssessments": [
    {
      "roleTitle": "string",
      "purposeRating": "Strong | Partial | Weak",
      "kraRating": "Strong | Partial | Weak | Not provided",
      "headline": "one plain-language sentence about this role — specific, direct, written as if spoken to the founder. Name the actual gap or strength. Not generic.",
      "purposeObservation": "one sentence on role purpose quality",
      "kraObservation": "one sentence on KRA quality. Assess whether KRAs have both leading measures (inputs, activity, system health — e.g. audit cadence, training completion, pipeline activity) and lagging measures (outcomes, results — e.g. compliance rate, revenue, defect rate). If only lagging measures are present, name what leading measure types are missing. Do not treat outcome measurement as a weakness — the gap is absence of leading measures alongside lagging ones.",
      "recommendation": "one sentence on what to do — Tune-Up, Rebuild, or No action needed"
    }
  ],
  "collectiveAlignment": {
    "coverageGaps": [
      {
        "function": "name of the function/capability missing",
        "observation": "one plain-language sentence — specific to this org, written as if spoken to the founder. Name what the business cannot do or is at risk of because nobody owns this. CRITICAL: only flag a coverage gap if the function is genuinely absent across ALL provided JDs. If a function appears under a role title like Operations, Supply Chain, or similar, read the full JD before concluding it is unowned. Do not infer a gap from role titles alone — derive it only from what is explicitly missing after reading every role provided."
      }
    ],
    "overlapGaps": [
      {
        "roles": "role names involved",
        "observation": "two sentences. First: name the specific shared accountability and why it creates a boundary problem. Second: identify whether the overlap needs a consolidation owner — a single role accountable for the combined or reported position of that accountability across the business — and name which existing role is most logically positioned to hold it given the full role set provided. Do not stop at describing the overlap. Arrive at the resolution logic."
      }
    ],
    "alignmentGaps": [
      {
        "role": "role title",
        "observation": "one plain-language sentence on how this role's purpose fails to connect to the org purpose"
      }
    ],
    "structuralHealth": "Strong | Developing | At Risk",
    "summaryObservation": "2-3 sentences. Plain language. Specific to this org. Name the most important structural finding and what it means for the business's ability to scale or operate without founder dependency.",
    "whatThisMeansInPractice": "One paragraph, 3-5 sentences. Translate the combined diagnostic findings into lived experience language — the friction, the symptoms, the things the founder feels day to day but may not have connected to structure. Write as if describing something the owner already knows but hasn't been able to name. Specific to this org. Not generic. No consulting language. Examples of the register: 'This is why your ops manager keeps coming back to you for decisions that should be theirs to make.' 'This is why hiring hasn't fixed the capacity problem.' 'This is why sales growth feels harder than the product deserves.'",
    "whatRemainsImpossible": [
      {
        "gap": "name of the specific gap this refers to — role title, coverage gap, or structural issue",
        "observation": "One sentence. Name the specific thing that cannot happen while this gap exists. Not a prediction. Not a motivational statement. A structural inevitability. Frame as what the business cannot do, cannot reach, or cannot sustain — not what it could achieve if fixed. Examples: 'The business cannot scale past its current revenue ceiling without the founder in every client conversation.' 'A second location is not viable while nobody owns the operational rhythm.' 'The next hire will fail for the same reason the last one did.'"
      }
    ],
    "nextStep": "one sentence on the most important single action this founder should take — specific, not generic"
  }
}

CRITICAL INSTRUCTIONS:
- Every observation and headline must be written at the level of RECOGNITION, not analysis. The founder should read it and think "that's exactly what's happening" not "that's an interesting observation."
- Never write generic consulting language. No "it is recommended that", no "this role would benefit from", no "consider exploring".
- Write as if you know this business. Be direct. Be specific. Use the actual role titles and org context provided.
- If the purpose was constructed from scaffold inputs, synthesise it into a clean, single purpose statement before assessing it.
- If no KRAs are present in the uploaded documents, set kraRating to "Not provided" and note this in kraObservation.
- PURPOSE ASSESSMENT STANDARD: You are assessing operational purpose, not vision. A purpose that describes sustained, reliable provision of something valuable is strong if it clearly anchors role design — regardless of whether it describes transformation, a winning condition, or an end state. Do not penalise a purpose for lacking ambition or for describing ongoing provision rather than change. Do not suggest tightening a beneficiary descriptor (e.g. "local communities") unless it is genuinely too vague to derive roles from. A purpose is Weak if it cannot anchor role design. It is not Weak simply because it lacks vision-level aspiration.
- DUAL-FUNCTION ROLES: Do not flag a role as poorly designed solely because it combines two related functions (e.g. new account development and account management in a sales role, or brand and lead generation in a marketing role). Broad, multi-function roles are common and often appropriate in SMEs where one person owns an entire function. The diagnostic question is not whether the role should be split — it is whether the success measures reflect the full scope of what the role owns, and whether there are explicit accountability measures for value delivered to internal stakeholders (e.g. does the marketing role have a KRA covering what it delivers to the sales team?). If internal handoff accountability is missing, name that as the specific gap rather than implying the role scope is wrong.
- Coverage gaps should reflect functions genuinely missing given this org's purpose — not a generic checklist.
- If there are no overlap gaps or alignment gaps, return empty arrays.
- whatThisMeansInPractice must synthesise ALL three passes — purpose, roles, and collective alignment — into one lived-experience paragraph. It should feel like someone who has been watching this business for six months finally said something out loud.
- whatRemainsImpossible must produce one entry per material gap identified. Do not produce generic entries. Each one must follow directly from a specific finding in the diagnostic.
- Return ONLY the JSON object. No markdown fences. No explanation. Just the JSON.
- Be concise in all observation and headline fields. One sentence means one sentence — no run-ons. Prioritise signal over completeness. The goal is a tight, high-signal JSON output, not an exhaustive one.
- STRUCTURAL APEX LANGUAGE: Never assume the person at the top of the structure is a founder, owner, or entrepreneur. They may be a CEO, GM, managing director, or any other senior leader. Never use the words "founder" or "owner" in any output field. Instead, describe the structural behaviour and its cause: decisions routing to the top of the structure, accountability gaps that default upward, or the most senior person absorbing work that has no defined owner. The finding should be true regardless of who sits at the top — write it that way.
- CLEAN BILL OF HEALTH: If the org purpose is strong and the role set is well-designed with no material gaps, say so directly. A clean or near-clean diagnostic is a valid and valuable output — do not manufacture gaps or recommendations to fill the report. If coverageGaps, overlapGaps, or alignmentGaps are genuinely absent, return empty arrays. If whatRemainsImpossible has no material entries, return an empty array. In this case, whatThisMeansInPractice should name what the organisation has gotten structurally right and what to protect as it grows — not invent problems that do not exist. The nextStep in a clean diagnostic should reflect consolidation or scaling guidance, not remediation.`;
  }

  // ── Run diagnostic ──────────────────────────────────────────────────────────
  async function runDiagnostic() {
    setError(null);

    // Validation
    if (!purposeMode) { setError("Please select whether you have an org purpose statement."); return; }
    if (purposeMode === "have" && !purposeText.trim()) { setError("Please enter your org purpose statement."); return; }
    if (purposeMode === "build" && !scaffold.what.trim()) { setError("Please answer at least the first purpose question."); return; }
    const validRoles = roles.filter(r => r.files.length > 0 || r.manualText.trim());
    if (validRoles.length === 0) { setError("Please add at least one role — upload a JD or enter role details manually."); return; }

    setStep("loading");
    setLoadingMsg("Reading your documents and org context...");

    const messages = [
      { role: "user", content: buildPrompt() }
    ];

    try {
      setTimeout(() => setLoadingMsg("Running Pass 1 — assessing your purpose statement..."), 2000);
      setTimeout(() => setLoadingMsg("Running Pass 2 — assessing individual roles..."), 6000);
      setTimeout(() => setLoadingMsg("Running Pass 3 — mapping collective alignment..."), 11000);
      setTimeout(() => setLoadingMsg("Building your report..."), 16000);

      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 8000,
          messages,
        }),
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error.message);

      const raw = data.content?.find(b => b.type === "text")?.text || "";
      // Strip markdown fences, leading/trailing whitespace, and any text before the first {
      const firstBrace = raw.indexOf("{");
      const lastBrace = raw.lastIndexOf("}");
      const extracted = firstBrace !== -1 && lastBrace !== -1
        ? raw.slice(firstBrace, lastBrace + 1)
        : raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(extracted);
      setReport(parsed);
      setStep("report");
    } catch (err) {
      setError(`Something went wrong: ${err.message}. Please try again — if the problem persists, try reducing the number of roles or the length of your JD text.`);
      setStep("input");
    }
  }

  // ── PDF generation ──────────────────────────────────────────────────────────
  function generatePDF() {
    if (!report) return;

    // Build printable HTML, open in new window, trigger print-to-PDF
    const dateStr = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

    const purposeRatingColor = report.purposeAssessment.rating === "Strong" ? "#27AE60"
      : report.purposeAssessment.rating === "Partial" ? "#E67E22" : "#C0392B";

    const structuralColor = report.collectiveAlignment.structuralHealth === "Strong" ? "#27AE60"
      : report.collectiveAlignment.structuralHealth === "Developing" ? "#E67E22" : "#C0392B";

    const roleRows = (report.roleAssessments || []).map(r => `
      <div style="margin-bottom:18px; padding:14px 18px; background:#F4F7FA; border-left:4px solid #0A2A43; border-radius:0 5px 5px 0;">
        <div style="font-weight:700; font-size:14px; color:#0A2A43; margin-bottom:6px;">${r.roleTitle}</div>
        <div style="font-size:13px; color:#2E2E2E; margin-bottom:4px;"><strong>Purpose:</strong> ${r.purposeRating} &nbsp;|&nbsp; <strong>KRAs:</strong> ${r.kraRating}</div>
        <div style="font-size:14px; color:#2E2E2E; margin-top:8px; line-height:1.6;">${r.headline}</div>
        ${r.recommendation ? `<div style="font-size:13px; color:#666; margin-top:6px; font-style:italic;">→ ${r.recommendation}</div>` : ""}
      </div>`).join("");

    const coverageRows = (report.collectiveAlignment.coverageGaps || []).map(g => `
      <div style="margin-bottom:10px; padding:12px 16px; background:#FEF2F2; border-left:4px solid #C0392B; border-radius:0 5px 5px 0; font-size:14px; color:#2E2E2E; line-height:1.6;">
        <strong>${g.function}:</strong> ${g.observation}
      </div>`).join("");

    const overlapRows = (report.collectiveAlignment.overlapGaps || []).map(g => `
      <div style="margin-bottom:10px; padding:12px 16px; background:#FFF8EC; border-left:4px solid #C9A46A; border-radius:0 5px 5px 0; font-size:14px; color:#2E2E2E; line-height:1.6;">
        <strong>${g.roles}:</strong> ${g.observation}
      </div>`).join("");

    const alignRows = (report.collectiveAlignment.alignmentGaps || []).map(g => `
      <div style="margin-bottom:10px; padding:12px 16px; background:#FFF8EC; border-left:4px solid #C9A46A; border-radius:0 5px 5px 0; font-size:14px; color:#2E2E2E; line-height:1.6;">
        <strong>${g.role}:</strong> ${g.observation}
      </div>`).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Org Clarity Diagnostic — ${report.orgName || "Your Organisation"}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Calibri, 'Segoe UI', sans-serif; color: #2E2E2E; background: #fff; }
  @media print {
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  .page { max-width: 800px; margin: 0 auto; padding: 0 0 60px; }
  .cover { background: #0A2A43; padding: 40px 48px 32px; border-bottom: 4px solid #C9A46A; }
  .section { padding: 28px 48px; border-bottom: 1px solid #E8E8E8; }
  .section:last-child { border-bottom: none; }
  h1 { font-size: 26px; font-weight: 700; color: #fff; }
  h2 { font-size: 17px; font-weight: 700; color: #0A2A43; margin-bottom: 14px; }
  .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #C9A46A; margin-bottom: 6px; }
  .meta { font-size: 12px; color: #AFCBE3; margin-top: 6px; }
  .pill { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; color: #fff; margin-right: 8px; }
  .purpose-box { background: #F0F6FB; border: 1.5px solid #AFCBE3; border-radius: 6px; padding: 14px 18px; font-size: 14px; color: #0A2A43; line-height: 1.6; font-style: italic; margin-bottom: 16px; }
  .headline { font-size: 15px; font-weight: 600; color: #0A2A43; line-height: 1.5; margin-bottom: 10px; }
  .cta { background: #0A2A43; padding: 28px 48px; margin-top: 0; }
  .cta h2 { color: #fff; }
  .cta p { color: #AFCBE3; font-size: 13px; line-height: 1.5; margin-top: 8px; }
  .print-btn { background: #C9A46A; color: #fff; border: none; padding: 12px 28px; font-size: 14px; font-weight: 700; border-radius: 5px; cursor: pointer; margin-top: 16px; font-family: Calibri, sans-serif; }
</style>
</head>
<body>
<div class="page">
  <div class="cover">
    <div class="label">James Kilby Advisory</div>
    <h1>Org Clarity Diagnostic</h1>
    <div class="meta">${report.orgName || "Your Organisation"} &nbsp;·&nbsp; ${report.industry || ""} &nbsp;·&nbsp; ${dateStr}</div>
  </div>

  <div class="section">
    <div class="label">Pass 1 — Org Purpose Assessment</div>
    <h2>Your Purpose Statement</h2>
    <div class="purpose-box">${report.purposeAssessment.purposeStatement}</div>
    <span class="pill" style="background:${purposeRatingColor}">${report.purposeAssessment.rating}</span>
    <div style="margin-top:14px; font-size:14px; line-height:1.65; color:#2E2E2E;">
      <div class="headline">${report.purposeAssessment.headline}</div>
      ${report.purposeAssessment.coaching ? `<p style="font-size:13px; color:#555; margin-top:8px;">${report.purposeAssessment.coaching}</p>` : ""}
    </div>
    <div style="margin-top:16px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
      ${Object.entries(report.purposeAssessment.criteria || {}).map(([k, v]) => `
        <div style="background:#F4F7FA; padding:10px 14px; border-radius:5px; font-size:13px;">
          <strong style="color:#0A2A43; text-transform:capitalize;">${k.replace(/([A-Z])/g, " $1")}:</strong><br/>${v}
        </div>`).join("")}
    </div>
  </div>

  <div class="section">
    <div class="label">Pass 2 — Role Assessments</div>
    <h2>Your Roles</h2>
    ${roleRows || "<p style='font-size:14px;color:#666;'>No roles assessed.</p>"}
  </div>

  <div class="section">
    <div class="label">Pass 3 — Collective Alignment</div>
    <h2>Structural Health: <span style="color:${structuralColor}">${report.collectiveAlignment.structuralHealth}</span></h2>
    <p style="font-size:14px; line-height:1.65; color:#2E2E2E; margin-bottom:20px;">${report.collectiveAlignment.summaryObservation}</p>

    ${coverageRows ? `<h3 style="font-size:14px;font-weight:700;color:#0A2A43;margin-bottom:10px;">Coverage Gaps</h3>${coverageRows}` : ""}
    ${overlapRows ? `<h3 style="font-size:14px;font-weight:700;color:#0A2A43;margin:16px 0 10px;">Overlap Gaps</h3>${overlapRows}` : ""}
    ${alignRows ? `<h3 style="font-size:14px;font-weight:700;color:#0A2A43;margin:16px 0 10px;">Alignment Gaps</h3>${alignRows}` : ""}

    <div style="margin-top:20px; background:#F0F6FB; border-radius:6px; padding:16px 20px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#C9A46A;margin-bottom:6px;">Most Important Next Step</div>
      <div style="font-size:15px;font-weight:600;color:#0A2A43;line-height:1.5;">${report.collectiveAlignment.nextStep}</div>
    </div>
  </div>

  <div class="cta">
    <h2>Your report has identified structural gaps. The conversation that matters is which one to fix first.</h2>
    <p>Book a 45-minute call with James Kilby Advisory to identify the highest-priority structural change and what it looks like in practice.</p>
    <p style="margin-top:12px;"><a href="https://calendly.com/j-kilby/30min" style="background:#C9A46A;color:#fff;padding:10px 24px;border-radius:5px;text-decoration:none;font-weight:700;font-size:14px;">Book a 45-minute call →</a></p>
    <p style="margin-top:12px; color:#C9A46A; font-weight:600;">jameskilbyadvisory.com.au</p>
  </div>

  <div style="padding:16px 48px;" class="no-print">
    <button class="print-btn" onclick="window.print()">Save as PDF</button>
  </div>
</div>
</body>
</html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  }

  // ── Email CTA (simulated — no backend) ─────────────────────────────────────
  function handleEmailSubmit() {
    if (!email.trim()) return;
    // In production this would POST to a backend / email service
    setEmailSent(true);
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

            {/* Org context */}
            <div style={S.card}>
              <h2 style={S.sectionTitle}>About your organisation</h2>
              <p style={S.sectionHint}>This helps the diagnostic speak to your specific context rather than giving you generic output.</p>
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Organisation name <span style={{ fontWeight: 400, color: "#999" }}>(optional)</span></label>
                <input style={S.input} value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. Timber & Trade Co." />
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
                Upload up to 10 JDs. Any format — the diagnostic will find what it needs.
                No JD? Enter what you know about the role manually.
              </p>

              {roles.map((role, idx) => (
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
                    <p style={S.uploadText}>📄 Click to upload JD or drag & drop &nbsp;·&nbsp; .txt, .doc, .docx, .pdf accepted</p>
                    <input
                      type="file"
                      accept=".txt,.doc,.docx,.pdf,.rtf"
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

              {roles.length < 10 && (
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
                  const gapCount = [
                    ...(report.collectiveAlignment.coverageGaps || []),
                    ...(report.collectiveAlignment.overlapGaps || []),
                    ...(report.collectiveAlignment.alignmentGaps || []),
                  ].length;
                  const hasGaps = gapCount > 0;
                  return (
                    <>
                      <p style={S.ctaTitle}>
                        {hasGaps
                          ? `Your report has identified ${gapCount} structural ${gapCount === 1 ? 'gap' : 'gaps'}.`
                          : `Your structure is sound — here's how to keep it that way.`}
                      </p>
                      <p style={S.ctaText}>
                        {hasGaps
                          ? `The conversation that matters now is which one to fix first and what that looks like in practice. Book a 45-minute call with James.`
                          : `A 45-minute call with James will identify what to protect and what to build on as you scale.`}
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
              <button style={S.outlineBtn} onClick={() => { setStep("input"); setReport(null); setEmailSent(false); }}>
                Run Another Diagnostic
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
