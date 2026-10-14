// Demo seed: the fictional "Volta demo data pack" (db/seed/volta-demo-data-pack.csv,
// provided by Rishab). No real founder data until Volta approves the build.
//
// The CSV's free-text answers ("Stuck on", "Working on now", "Lived through",
// "Can help with") are NOT stored. They stand in for private monthly-update
// answers (C1); only the topic tags below, picked by hand from that text, are shared.
import type { Founder, Group, GroupMember, PinboardEvent, Rsvp, Share, ShareKind, Topic, Update } from "./types";

const OCT_UPDATE = "2026-10-02T15:00:00.000Z";
const SEP_UPDATE = "2026-09-04T13:00:00.000Z";

// Categories follow the CSV's Happier Hour sign-up topics, plus Operations and Early stage.
export const topicsSeed: Topic[] = [
  { id: "t-sales-hire", category: "Hiring", label: "Hiring a first salesperson", keywords: ["first sales hire", "first salesperson", "sales hire", "sales reps", "salespeople", "sales team", "sales lead", "account manager"] },
  { id: "t-hr", category: "Hiring", label: "HR, payroll and benefits", keywords: ["hr", "payroll", "benefits", "performance review"] },
  { id: "t-tech-hire", category: "Hiring", label: "Hiring a developer or technical co-founder", keywords: ["developer", "technical co-founder", "contract developer"] },
  { id: "t-procurement", category: "Sales", label: "Enterprise procurement", keywords: ["procurement", "rfp", "rfps", "security review", "security questionnaires", "soc 2", "port authorities", "school board", "health authority", "utility", "enterprise"] },
  { id: "t-growth", category: "Sales", label: "Marketing and launch growth", keywords: ["paid social", "downloads", "kickstarter", "waitlist", "crowdfunding", "cost per signup"] },
  { id: "t-pricing", category: "Pricing", label: "Pricing and contracts", keywords: ["pricing", "per seat", "paid tier", "annual", "contracts", "paid plans", "free trials"] },
  { id: "t-fundraising", category: "Fundraising", label: "Raising a round", keywords: ["fundraising", "round", "investors", "investor", "seed", "series a", "pre-seed"] },
  { id: "t-grants", category: "Grants", label: "Grants and SR&ED", keywords: ["grant", "grants", "irap", "sr&ed", "provincial funding"] },
  { id: "t-us", category: "Expansion", label: "Expanding to the US", keywords: ["us", "boston", "maine", "new england", "cross-border", "fda", "us entity"] },
  { id: "t-privacy", category: "Product and tech", label: "Health data and privacy", keywords: ["privacy", "canadian-hosted", "patient data", "privacy impact assessment"] },
  { id: "t-hardware", category: "Product and tech", label: "Hardware prototyping", keywords: ["prototype", "machine shop", "hardware", "sea trials", "lab testing"] },
  { id: "t-pilots", category: "First customers", label: "Running a paid pilot", keywords: ["pilot", "pilots"] },
  { id: "t-cash", category: "Operations", label: "Cash flow", keywords: ["cash flow", "revenue gaps"] },
  { id: "t-fulltime", category: "Early stage", label: "Going full-time on the startup", keywords: ["quit", "full-time", "leaving a corporate"] },
].map((t) => ({ ...t, hidden: false, mergedInto: null }));

interface PackRow {
  key: string;
  name: string;
  email: string;
  company: string;
  role: string;
  does: string;
  stage: string;
  teamSize: number;
  location: string;
  visits: string;
  happierHour: string;
  lunch: boolean;
  breakfast: boolean;
}

// Generated from the CSV (emails are invented @example.com addresses).
const pack: PackRow[] = [
  {"key": "ana", "name": "Ana Lund", "email": "ana.lund@example.com", "company": "Plinthly", "role": "Co-founder and CEO", "does": "Booking and patient notes software for physio clinics", "stage": "Early revenue", "teamSize": 4, "location": "Halifax", "visits": "Weekly", "happierHour": "Pricing", "lunch": true, "breakfast": false},
  {"key": "theo", "name": "Theo Marchand", "email": "theo.marchand@example.com", "company": "Plinthly", "role": "Co-founder and CTO", "does": "Booking and patient notes software for physio clinics", "stage": "Early revenue", "teamSize": 4, "location": "Halifax", "visits": "Daily", "happierHour": "Product and tech", "lunch": true, "breakfast": false},
  {"key": "mira", "name": "Mira Kowalczyk", "email": "mira.kowalczyk@example.com", "company": "Brinewater Acoustics", "role": "CEO", "does": "Underwater noise monitoring for offshore wind farms and ports", "stage": "Series A", "teamSize": 34, "location": "Halifax", "visits": "Rarely", "happierHour": "Fundraising", "lunch": false, "breakfast": true},
  {"key": "desmond", "name": "Desmond Achebe", "email": "desmond.achebe@example.com", "company": "Brinewater Acoustics", "role": "Head of Sales", "does": "Underwater noise monitoring for offshore wind farms and ports", "stage": "Series A", "teamSize": 34, "location": "Halifax", "visits": "Weekly", "happierHour": "Sales", "lunch": true, "breakfast": false},
  {"key": "leila", "name": "Leila Rahimi", "email": "leila.rahimi@example.com", "company": "Ferrybill", "role": "Co-founder and CEO", "does": "Invoicing and payments software for trades contractors", "stage": "Growing", "teamSize": 22, "location": "Halifax", "visits": "Weekly", "happierHour": "Fundraising", "lunch": false, "breakfast": true},
  {"key": "colm", "name": "Colm Byrne", "email": "colm.byrne@example.com", "company": "Ferrybill", "role": "Head of People and Operations", "does": "Invoicing and payments software for trades contractors", "stage": "Growing", "teamSize": 22, "location": "Halifax", "visits": "Daily", "happierHour": "Hiring", "lunch": true, "breakfast": false},
  {"key": "jordan", "name": "Jordan Gallant", "email": "jordan.gallant@example.com", "company": "Spatwell", "role": "Founder and CEO", "does": "Underwater cameras that track oyster and mussel growth for farmers", "stage": "Early revenue", "teamSize": 3, "location": "Charlottetown", "visits": "Never", "happierHour": "Grants", "lunch": false, "breakfast": false},
  {"key": "anjali", "name": "Anjali Raman", "email": "anjali.raman@example.com", "company": "Wardline Health", "role": "Co-founder and COO", "does": "Remote monitoring for home-care nurses and their patients", "stage": "Growing", "teamSize": 14, "location": "Halifax", "visits": "Weekly", "happierHour": "Hiring", "lunch": true, "breakfast": false},
  {"key": "owen", "name": "Owen MacIsaac", "email": "owen.macisaac@example.com", "company": "Gritmark", "role": "Founder", "does": "AI that writes job quotes for small construction contractors", "stage": "Idea", "teamSize": 1, "location": "Halifax", "visits": "Daily", "happierHour": "First customers", "lunch": true, "breakfast": false},
  {"key": "luc", "name": "Luc Thibodeau", "email": "luc.thibodeau@example.com", "company": "Ember North", "role": "CEO", "does": "Heat recovery systems that cut energy use in fish plants", "stage": "Growing", "teamSize": 12, "location": "Moncton", "visits": "Never", "happierHour": "Hiring", "lunch": false, "breakfast": false},
  {"key": "grace", "name": "Grace Oduya", "email": "grace.oduya@example.com", "company": "Pebblepath Learning", "role": "Co-founder and CEO", "does": "Reading practice app for kids in grades 1 to 3", "stage": "Early revenue", "teamSize": 5, "location": "Halifax", "visits": "Weekly", "happierHour": "Sales", "lunch": true, "breakfast": false},
  {"key": "rosalie", "name": "Rosalie Cormier", "email": "rosalie.cormier@example.com", "company": "Briny Kitchen", "role": "Founder and CEO", "does": "Ready-to-eat seafood chowders sold in grocery stores", "stage": "Growing", "teamSize": 9, "location": "Halifax", "visits": "Rarely", "happierHour": "Sales", "lunch": false, "breakfast": true},
  {"key": "arjun", "name": "Arjun Sethi", "email": "arjun.sethi@example.com", "company": "Gullwing Robotics", "role": "Co-founder and CTO", "does": "Robots that clean ship hulls in port", "stage": "Pre-revenue", "teamSize": 6, "location": "Halifax", "visits": "Daily", "happierHour": "Fundraising", "lunch": true, "breakfast": false},
  {"key": "tomasz", "name": "Tomasz Nowak", "email": "tomasz.nowak@example.com", "company": "Crewlight", "role": "CEO", "does": "Shift scheduling software for long-term care homes", "stage": "Early revenue", "teamSize": 7, "location": "Halifax", "visits": "Weekly", "happierHour": "Hiring", "lunch": true, "breakfast": true},
  {"key": "leah", "name": "Leah Morin", "email": "leah.morin@example.com", "company": "Grantwright", "role": "Founder and CEO", "does": "AI that drafts and tracks grant applications for nonprofits", "stage": "Early revenue", "teamSize": 3, "location": "Halifax", "visits": "Daily", "happierHour": "Pricing", "lunch": true, "breakfast": false},
  {"key": "siobhan", "name": "Siobhan Walsh", "email": "siobhan.walsh@example.com", "company": "Ebbline Data", "role": "Co-founder and Head of Sales", "does": "Wave and current data for marine construction firms", "stage": "Early revenue", "teamSize": 2, "location": "St. John's", "visits": "Never", "happierHour": "Expansion", "lunch": false, "breakfast": false},
  {"key": "felix", "name": "Felix Arsenault", "email": "felix.arsenault@example.com", "company": "Ashgrove Materials", "role": "Co-founder and CEO", "does": "Lower-carbon concrete mixes for precast plants", "stage": "Pre-revenue", "teamSize": 2, "location": "Fredericton", "visits": "Rarely", "happierHour": "Grants", "lunch": false, "breakfast": false},
  {"key": "imani", "name": "Imani Brooks", "email": "imani.brooks@example.com", "company": "Quietwell", "role": "Founder", "does": "Sleep coaching app for nurses and other shift workers", "stage": "Pre-revenue", "teamSize": 1, "location": "Halifax", "visits": "Rarely", "happierHour": "Product and tech", "lunch": true, "breakfast": false},
  {"key": "kiran", "name": "Kiran Desai", "email": "kiran.desai@example.com", "company": "Claimsmith AI", "role": "Co-founder and CEO", "does": "AI that drafts insurance claim summaries for adjusters", "stage": "Post-seed", "teamSize": 8, "location": "Halifax", "visits": "Daily", "happierHour": "Sales", "lunch": true, "breakfast": true},
  {"key": "josie", "name": "Josie Langille", "email": "josie.langille@example.com", "company": "Bramblecove", "role": "Founder and CEO", "does": "Wild blueberry snacks and juices", "stage": "Early revenue", "teamSize": 1, "location": "Halifax", "visits": "Never", "happierHour": "Expansion", "lunch": false, "breakfast": false},
  {"key": "ewan", "name": "Ewan Reid", "email": "ewan.reid@example.com", "company": "Haulsight", "role": "Co-founder and CEO", "does": "Camera-based catch logging for fishing boats", "stage": "Pre-revenue", "teamSize": 2, "location": "Halifax", "visits": "Weekly", "happierHour": "Fundraising", "lunch": true, "breakfast": false},
  {"key": "sofia", "name": "Sofia Martel", "email": "sofia.martel@example.com", "company": "Loomstack", "role": "COO", "does": "Inventory and compliance software for craft breweries and distilleries", "stage": "Growing", "teamSize": 11, "location": "Halifax", "visits": "Weekly", "happierHour": "Hiring", "lunch": true, "breakfast": false},
  {"key": "mateo", "name": "Mateo Ruiz", "email": "mateo.ruiz@example.com", "company": "Hollowtree Games", "role": "Founder and CEO", "does": "Learning games for high school science", "stage": "Early revenue", "teamSize": 5, "location": "Halifax", "visits": "Rarely", "happierHour": "Product and tech", "lunch": false, "breakfast": false},
  {"key": "amara", "name": "Amara Nwosu", "email": "amara.nwosu@example.com", "company": "Tuckaway", "role": "Head of Growth", "does": "Allowance and savings app for kids and parents", "stage": "Early revenue", "teamSize": 5, "location": "Halifax", "visits": "Daily", "happierHour": "Pricing", "lunch": true, "breakfast": false},
];

export const foundersSeed: Founder[] = [
  ...pack.map((r) => ({
    id: `f-${r.key}`,
    email: r.email,
    displayName: r.name,
    companyName: r.company,
    isAdmin: false,
    role: r.role,
    companyDescription: r.does,
    stage: r.stage,
    teamSize: r.teamSize,
    location: r.location,
    visitsVolta: r.visits,
  })),
  {
    id: "f-laura",
    email: "laura@example.com",
    displayName: "Laura",
    companyName: "Volta",
    isAdmin: true,
    role: "Residency lead",
    companyDescription: "",
    stage: "",
    teamSize: null,
    location: "Halifax",
    visitsVolta: "Daily",
  },
];

// Tags per founder, picked from the CSV text. "working" = Stuck on + Working on now;
// "lived" = Lived through + Can help with. Industry know-how ("How hospitals and
// nurses really work") isn't a topic, so it has no tag.
// Owen, Rosalie and Mateo submitted updates but chose not to share anything.
const tags: Record<string, { working: string[]; lived: string[] }> = {
  ana: { working: ["t-pricing"], lived: ["t-tech-hire"] },
  theo: { working: ["t-procurement", "t-privacy"], lived: ["t-privacy"] },
  mira: { working: ["t-us"], lived: ["t-fundraising"] },
  desmond: { working: ["t-procurement", "t-sales-hire"], lived: ["t-sales-hire"] },
  leila: { working: ["t-fundraising"], lived: ["t-sales-hire"] },
  colm: { working: ["t-hr"], lived: ["t-hr"] },
  jordan: { working: ["t-grants", "t-pilots"], lived: [] },
  anjali: { working: ["t-hr", "t-sales-hire"], lived: ["t-procurement"] },
  owen: { working: [], lived: [] },
  luc: { working: ["t-sales-hire"], lived: ["t-procurement"] },
  grace: { working: ["t-procurement"], lived: ["t-growth"] },
  rosalie: { working: [], lived: [] },
  arjun: { working: ["t-fundraising", "t-hardware"], lived: ["t-hardware"] },
  tomasz: { working: ["t-sales-hire"], lived: ["t-pricing"] },
  leah: { working: ["t-pricing"], lived: ["t-grants"] },
  siobhan: { working: ["t-us"], lived: [] },
  felix: { working: ["t-grants", "t-hardware"], lived: ["t-fulltime"] },
  imani: { working: ["t-tech-hire"], lived: [] },
  kiran: { working: ["t-procurement"], lived: ["t-fundraising", "t-procurement"] },
  josie: { working: ["t-us"], lived: ["t-growth"] },
  ewan: { working: ["t-fundraising"], lived: ["t-pilots"] },
  sofia: { working: ["t-hr", "t-us"], lived: ["t-us"] },
  mateo: { working: [], lived: [] },
  amara: { working: ["t-pricing", "t-growth"], lived: ["t-growth"] },
};

// Tomasz (the default persona) also has a September update, so History shows
// one share replaced by October's update and one he withdrew himself.
export const updatesSeed: Update[] = [
  { id: "u-tomasz-2026-09", founderId: "f-tomasz", submittedAt: SEP_UPDATE },
  ...pack.map((r) => ({ id: `u-${r.key}-2026-10`, founderId: `f-${r.key}`, submittedAt: OCT_UPDATE })),
];

export const sharesSeed: Share[] = [
  {
    id: "s-tomasz-2026-09-pricing",
    founderId: "f-tomasz",
    topicId: "t-pricing",
    updateId: "u-tomasz-2026-09",
    kind: "working",
    consentedAt: SEP_UPDATE,
    withdrawnAt: OCT_UPDATE,
    endedReason: "replaced",
  },
  {
    id: "s-tomasz-2026-09-pilots",
    founderId: "f-tomasz",
    topicId: "t-pilots",
    updateId: "u-tomasz-2026-09",
    kind: "lived",
    consentedAt: SEP_UPDATE,
    withdrawnAt: "2026-09-20T18:30:00.000Z",
    endedReason: "withdrawn",
  },
  ...Object.entries(tags).flatMap(([key, t]) =>
    (["working", "lived"] as ShareKind[]).flatMap((kind) =>
      t[kind].map((topicId) => ({
        id: `s-${key}-${kind}-${topicId.slice(2)}`,
        founderId: `f-${key}`,
        topicId,
        updateId: `u-${key}-2026-10`,
        kind,
        consentedAt: OCT_UPDATE,
        withdrawnAt: null,
        endedReason: null,
      })),
    ),
  ),
];

// Luc is waiting in the first-sales-hire conversation, so Tomasz joining triggers the intro (C5).
// Felix is alone in Grants, so the weekly nudge has something to do (C6).
export const groupsSeed: Group[] = [
  { id: "g-sales-hire", topicId: "t-sales-hire", status: "open", introducedAt: null },
  { id: "g-grants", topicId: "t-grants", status: "open", introducedAt: null },
];

export const membersSeed: GroupMember[] = [
  { id: "m-sales-hire-luc", groupId: "g-sales-hire", founderId: "f-luc", confirmedAt: "2026-10-05T14:00:00.000Z", leftAt: null },
  { id: "m-grants-felix", groupId: "g-grants", founderId: "f-felix", confirmedAt: "2026-10-06T10:00:00.000Z", leftAt: null },
];

// Times are Halifax local (ADT, UTC-3).
export const eventsSeed: PinboardEvent[] = [
  { id: "ev-lunch", title: "Founders Lunch", startsAt: "2026-10-15T15:00:00.000Z", location: "Volta", kind: "lunch", listByDefault: true },
  { id: "ev-happier", title: "Founders Happier Hour", startsAt: "2026-10-21T19:30:00.000Z", location: "Online, breakout rooms by topic", kind: "happier_hour", listByDefault: true },
  { id: "ev-breakfast", title: "CEO Breakfast", startsAt: "2026-10-28T11:00:00.000Z", location: "Volta", kind: "breakfast", listByDefault: false },
];

// Lunch and breakfast from the "Going to next…" columns; everyone in the pack
// signed up for the Happier Hour with a topic, which becomes their room.
export const rsvpsSeed: Rsvp[] = pack.flatMap((r) => {
  const rsvp = (ev: PinboardEvent, signupTopic: string | null): Rsvp => ({
    id: `r-${ev.id}-${r.key}`,
    eventId: ev.id,
    founderId: `f-${r.key}`,
    showOnList: ev.listByDefault,
    signupTopic,
    createdAt: "2026-10-05T12:00:00.000Z",
    cancelledAt: null,
  });
  const [lunch, happier, breakfast] = eventsSeed;
  return [
    ...(r.lunch ? [rsvp(lunch, null)] : []),
    rsvp(happier, r.happierHour),
    ...(r.breakfast ? [rsvp(breakfast, null)] : []),
  ];
});

// Demo text for the "Where are you stuck?" box, from the CSV. It only prefills the
// form in the browser and is never sent to the database (C1).
export const sampleUpdateText: Record<string, string> = {
  "f-ana": "Signing the first clinic group with more than five locations. Pricing for clinic groups with many locations.",
  "f-theo": "Moving patient data to Canadian-hosted servers. Security questionnaires from larger clinic groups.",
  "f-mira": "Opening a small sales office in Boston. US expansion: hiring and paying staff in the US.",
  "f-desmond": "Hiring two more sales reps. Enterprise procurement with port authorities.",
  "f-leila": "Preparing a seed round to expand into Ontario. Fundraising: a first institutional round after growing on revenue.",
  "f-colm": "Rolling out a first performance review process. Group benefits for staff in three provinces.",
  "f-jordan": "Paid pilots with three mussel growers. Applying for a first IRAP grant.",
  "f-anjali": "Hiring three nurses and a sales lead. Choosing an HR and payroll platform (still on spreadsheets at 14 staff).",
  "f-owen": "Interviewing 20 contractors about how they quote jobs. Whether to quit his job and go full-time.",
  "f-luc": "Hiring a first salesperson outside Atlantic Canada. First sales hire: commission or salary.",
  "f-grace": "Responding to a school board RFP. Enterprise procurement: school board RFPs and approvals.",
  "f-rosalie": "Getting listed with a national grocer. Cash flow before large grocery orders.",
  "f-arjun": "Sea trials of the second prototype. Fundraising: explaining hardware timelines to pre-seed investors.",
  "f-tomasz": "Writing the job post for a first salesperson. First sales hire: who to hire and how to pay them.",
  "f-leah": "Turning free trials into paid plans. Pricing: per seat or per application.",
  "f-siobhan": "Closing a first US customer in Maine. US expansion: cross-border tax and contracts.",
  "f-felix": "Lab testing with a university partner. Applying for first grants: IRAP and provincial funding.",
  "f-imani": "Building a first version with a contract developer. Finding a technical co-founder.",
  "f-kiran": "First enterprise contract with a national insurer. Enterprise procurement: security review and legal at a large insurer.",
  "f-josie": "Finding a US distributor in New England. US expansion: FDA labels and a US distributor.",
  "f-ewan": "Closing a pre-seed round. Fundraising: writing investor updates and finding a lead investor.",
  "f-sofia": "Hiring a first US-based account manager. Choosing an HR and payroll platform that handles US staff.",
  "f-mateo": "Pitching a first publisher deal. Revenue gaps between game releases.",
  "f-amara": "Lowering cost per signup on paid social. Pricing: when to add a paid tier.",
};
