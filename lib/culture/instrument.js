// Enabling Culture Fingerprint — survey instrument v0 (pilot).
// Source of truth for wording: "Enabling Culture Fingerprint — Survey Item Bank v0" doc.
// Item and option IDs are permanent. Change wording → bump INSTRUMENT_VERSION.
// Style codes are never shown to respondents.

export const INSTRUMENT_ID = "ecf";
export const INSTRUMENT_VERSION = "0.1.0";

export const STYLES = {
  LRN: "Learning", PUR: "Purpose", CAR: "Caring", ORD: "Order",
  SAF: "Safety", AUT: "Authority", RES: "Results", ENJ: "Enjoyment",
};

export const PART0 = [
  { id: "P0-01", text: "Which best describes your role?", options: [
    { id: "owner", text: "Owner or managing director" },
    { id: "senior", text: "Senior leader" },
    { id: "lead", text: "Team leader or supervisor" },
    { id: "member", text: "Team member" },
  ] },
  { id: "P0-02", text: "Which team or site do you mainly work in?", options: "TEAMS" },
  { id: "P0-03", text: "How long have you worked here?", options: [
    { id: "lt6m", text: "Under 6 months" },
    { id: "6to24m", text: "6 to 24 months" },
    { id: "2to5y", text: "2 to 5 years" },
    { id: "gt5y", text: "Over 5 years" },
  ] },
];

export const STATEMENTS = [
  { code: "LRN", text: "We're encouraged to try new ways of doing things, and an experiment that doesn't work out is treated as a lesson, not a failure." },
  { code: "PUR", text: "What we do is driven by the difference we make for our customers and community, beyond this year's numbers." },
  { code: "CAR", text: "People look out for each other. Trust, loyalty and working well together come first." },
  { code: "ORD", text: "There's a right way to do things here: clear processes, shared standards and respect for how things are done." },
  { code: "SAF", text: "We plan carefully, think through what could go wrong and avoid unnecessary risks." },
  { code: "AUT", text: "The people in charge make decisions quickly and firmly, and we compete hard to win." },
  { code: "RES", text: "Hitting targets is what counts, and people are recognised for what they achieve." },
  { code: "ENJ", text: "Work is energetic and fun, with room for humour, spontaneity and doing things your own way." },
].map((s, i) => ({ ...s, aId: `A-0${i + 1}`, bId: `B-0${i + 1}` }));

export const PART_A_INSTRUCTION = "Think about your day-to-day work here over the last three months. Split 100 points across these statements to show how things actually work, not how they should. Give more points to what is most true. You don't have to use every statement.";
export const PART_B_INSTRUCTION = "Now think about what this business needs to succeed over the next three years. Split 100 points across the same statements to show how things should work.";

const s = (code, text) => ({ code, text });
export const SCENARIOS = [
  { id: "C-01", text: "Think about the last time you or a colleague made a costly mistake. What happened next?", options: [
    s("LRN", "We worked out what went wrong and changed how we do it."),
    s("CAR", "The team rallied round and helped fix it, without blame."),
    s("AUT", "A manager stepped in and decided how it would be handled."),
    s("ORD", "We checked it against the procedure and tightened the steps."),
    s("RES", "The focus was on recovering the lost result as fast as possible."),
    s("SAF", "It was treated as a risk, and extra checks or sign-offs were added."),
  ] },
  { id: "C-02", text: "Think about the last time someone suggested a new way of doing something. What happened?", options: [
    s("LRN", "We tried it out quickly to see if it worked."),
    s("PUR", "People asked whether it was right for our customers."),
    s("ORD", "People asked whether it fitted the way things are done here."),
    s("SAF", "It was assessed for what could go wrong before anything changed."),
    s("AUT", "The person in charge decided on the spot."),
    s("RES", "It was judged on whether it would improve the numbers."),
    s("ENJ", "People got excited and ran with it."),
  ] },
  { id: "C-03", text: "Think about the last time two priorities clashed and you couldn't do both. How was it settled?", options: [
    s("AUT", "The most senior person decided."),
    s("RES", "We chose whichever would hit the target."),
    s("PUR", "We chose what was best for customers in the long run."),
    s("ORD", "We followed the agreed process or priority list."),
    s("CAR", "We talked it through until the team agreed."),
    s("SAF", "We chose the lower-risk option."),
  ] },
  { id: "C-04", text: "Think about the last time you went above and beyond. What got noticed?", options: [
    s("CAR", "Colleagues thanked me and had my back."),
    s("RES", "The result I achieved."),
    s("ORD", "That I'd done it properly and to standard."),
    s("LRN", "The new idea or approach I'd brought."),
    s("PUR", "The difference it made for a customer."),
    s("ENJ", "It became a fun moment and people made a fuss."),
    s(null, "It wasn't really noticed."),
  ] },
  { id: "C-05", text: "Think about the last person who joined your team. What did their first few weeks focus on most?", options: [
    s("ORD", "Learning our procedures and standards."),
    s("RES", "Getting up to speed and performing quickly."),
    s("CAR", "Getting to know people and fitting in."),
    s("PUR", "Understanding why we exist and who we serve."),
    s("LRN", "Shadowing, asking questions and trying things."),
    s("SAF", "Safety, compliance and what not to do."),
    s("ENJ", "A warm, social welcome."),
  ] },
  { id: "C-06", text: "Think about the last time a target or deadline was missed. What happened next?", options: [
    s("LRN", "We looked at why and tried something different."),
    s("RES", "The pressure went on and expectations were made very clear."),
    s("AUT", "A leader took direct control."),
    s("CAR", "People who were struggling were offered support."),
    s("ORD", "We reviewed which step of the process broke down."),
    s("SAF", "We built in more buffer and contingency for next time."),
  ] },
  { id: "C-07", text: "Think about the last team meeting you attended. What took up most of the time?", options: [
    s("RES", "Progress against numbers and targets."),
    s("AUT", "Updates and instructions from the person running it."),
    s("ORD", "Checking work was being done the right way."),
    s("SAF", "Risks and what could go wrong."),
    s("LRN", "New ideas and improvements."),
    s("CAR", "How people were going."),
    s("PUR", "Customer stories and the difference we're making."),
    s("ENJ", "It was relaxed, with plenty of laughs."),
  ] },
  { id: "C-08", text: "Think about the last time you disagreed with a decision from above. What did you do?", options: [
    s("LRN", "Said so, and it was debated openly."),
    s("AUT", "Kept it to myself, because it wasn't my call."),
    s("CAR", "Raised it quietly with someone I trust."),
    s("ORD", "Checked whether it followed policy."),
    s("RES", "Only pushed back because it put our results at risk."),
    s("SAF", "Raised it as a risk to be managed."),
  ] },
  { id: "C-09", text: "Think about the last time something went really well. How was it marked?", options: [
    s("ENJ", "A celebration, with everyone joining in."),
    s("RES", "The result was announced and the people responsible were recognised."),
    s("CAR", "Everyone who helped was thanked."),
    s("PUR", "It was linked back to what it meant for customers."),
    s("LRN", "We captured what we'd learned so we could repeat it."),
    s(null, "It wasn't really marked; we moved straight on."),
  ] },
  { id: "C-10", text: "Think about the last time a customer asked for something outside what we normally do. What happened?", options: [
    s("PUR", "We found a way to do it for them."),
    s("ORD", "We said no, because it's not how we do things."),
    s("SAF", "We checked the risk or liability first."),
    s("LRN", "We saw it as a chance to try something new."),
    s("RES", "We did it only if it made commercial sense."),
    s("AUT", "The person in charge decided."),
    s("ENJ", "We improvised and had fun with it."),
  ] },
].map(sc => ({
  ...sc,
  // Permanent option IDs in doc order: C-01-a, C-01-b, …
  options: sc.options.map((o, i) => ({ ...o, id: `${sc.id}-${String.fromCharCode(97 + i)}` })),
}));

export const NA_OPTION = { id: "na", text: "This hasn't happened to me, or I don't know", code: null };

export const TYPICALITY = [
  { id: "usually", text: "Usually", weight: 1.0 },
  { id: "sometimes", text: "Sometimes", weight: 0.6 },
  { id: "unusual", text: "Unusual", weight: 0.3 },
];

export const DECISION_AREAS = {
  PRC: "pricing or discounts for a customer",
  HIR: "hiring someone onto the team",
  SPD: "spending above {amount}",
  CMP: "resolving a customer complaint or refund",
  SCH: "rosters, schedules or job allocation",
  SUP: "choosing or changing a supplier",
  NEW: "starting a new product, service or offer",
};

export const DECIDER_OPTIONS = [
  { id: "owner", text: "The owner or managing director" },
  { id: "senior", text: "A senior leader or manager" },
  { id: "lead", text: "A team leader or supervisor" },
  { id: "doer", text: "The person doing the work" },
  { id: "team", text: "The team, together" },
  { id: "dk", text: "I don't know" },
];

export const CHECK_OPTIONS = [
  { id: "owner", text: "Yes, with the owner or managing director" },
  { id: "manager", text: "Yes, with a manager" },
  { id: "no", text: "No" },
  { id: "dk", text: "I don't know" },
];

export const INDUSTRIES = [
  "Trades & Construction", "Professional Services", "Retail & Hospitality",
  "Manufacturing", "Health & Allied Health", "Other",
];

export const STRATEGY = {
  discipline: [
    { id: "opex", text: "Best value and reliability: we do it efficiently and consistently, at a sharp price." },
    { id: "intimacy", text: "Best fit for each customer: we know them well and tailor what we do." },
    { id: "product", text: "Best product or idea: we lead with quality, design or innovation." },
  ],
  volatility: [
    { id: "S-04", text: "Over the last two years, how much have your customers' needs changed?" },
    { id: "S-05", text: "How much have your competitors, or the way they compete, changed?" },
    { id: "S-06", text: "How much have technology or regulation changed how you operate?" },
  ],
  archetype: [
    { id: "growth", text: "Grow" },
    { id: "efficiency", text: "Run tighter" },
    { id: "balanced", text: "A balance" },
  ],
};

export const isOwnerRole = role => role === "owner";
