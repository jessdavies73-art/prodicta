// Connected scenario generator for the modular Workspace.
//
// Two public exports:
//   selectBlocks(role_profile, roleTitle)
//     - Deterministic. Looks the role up against the canonical Office
//       shell mapping below in three passes: role_title substring match,
//       then function + seniority match, then level fallback. Returns an
//       ordered array of selected_blocks with suggested durations and
//       diagnostic match info.
//   generateScenario(client, role_profile, { roleTitle, jobDescription, blockOverride })
//     - Calls selectBlocks() (or skips it if blockOverride is supplied)
//       then a single Claude Haiku call that produces the spine, trigger,
//       scenario_arc, and connected per-block content. Returns the full
//       workspace_scenario JSONB shape (with match_info attached) or null
//       on failure. Caller treats null as best-effort: if the generator
//       fails the assessment row is still inserted without
//       workspace_scenario and the legacy Workspace path will run.
//
// Phase 1 implements the Office shell. The Office exports below
// (CANONICAL_ROLE_MAPPING, findCanonicalEntry, selectBlocks,
// generateScenario) are unchanged from Phase 1; the call site in
// /api/assessment/generate gates them on shell_family === 'office'.
//
// Phase 2 adds the Healthcare shell. The healthcare exports
// (HEALTHCARE_CANONICAL_ROLE_MAPPING, findHealthcareCanonicalEntry,
// selectHealthcareBlocks, generateHealthcareScenario) live at the
// bottom of this file. Callers branch on shell_family explicitly so
// the office path is not affected by the new code.

import { BLOCK_CATALOGUE } from '@/lib/workspace-blocks/office/catalogue'
import { BLOCK_CATALOGUE as HEALTHCARE_CATALOGUE } from '@/lib/workspace-blocks/healthcare/catalogue'
import { BLOCK_CATALOGUE as EDUCATION_CATALOGUE } from '@/lib/workspace-blocks/education/catalogue'

// ─────────────────────────────────────────────────────────────────────────
// Canonical Office shell role mapping
// ─────────────────────────────────────────────────────────────────────────
//
// Each entry maps a family of role titles + a function + a set of seniority
// bands to a fixed, ordered list of blocks. The order is the execution
// order in the Workspace (block 1 first, last block at the end).
//
// Selection rules from the brief:
//   Levels 1, 2, 4: 4 blocks per Workspace, target 16-20 minutes total
//   Level 3 (Management): 5 blocks per Workspace, target 20-25 minutes
//   Temporary employment_type: cap at 3 blocks (drop the lowest priority)
//
// Block library reduced to a canonical 10 for Phase 1 default scenarios.
// The four deprioritised stubs (slack-teams, approvals, trade-offs,
// presentation-output) still exist in the catalogue but do not appear in
// any canonical entry. They can still be selected via blockOverride.

export const CANONICAL_ROLE_MAPPING = [
  // ── Level 1: Front desk / Coordination (4 blocks) ──────────────────
  {
    id: 'receptionist',
    label: 'Receptionist',
    role_titles: ['receptionist', 'front of house'],
    function: 'admin_pa',
    seniority_bands: ['junior'],
    level: 1,
    blocks: ['inbox', 'calendar-planning', 'conversation-simulation', 'task-prioritisation'],
  },
  {
    id: 'administrator',
    label: 'Administrator / Office Junior',
    role_titles: ['administrator', 'office junior', 'admin assistant', 'team assistant', 'office assistant'],
    function: 'admin_pa',
    seniority_bands: ['junior'],
    level: 1,
    blocks: ['inbox', 'calendar-planning', 'document-writing', 'task-prioritisation'],
  },
  {
    id: 'office-coordinator',
    label: 'Office Coordinator / Operations Coordinator',
    role_titles: ['office coordinator', 'operations coordinator', 'office manager', 'ops coordinator'],
    function: 'operations',
    seniority_bands: ['junior', 'mid'],
    level: 1,
    blocks: ['inbox', 'calendar-planning', 'stakeholder-conflict', 'decision-queue'],
  },
  {
    id: 'pa-to-ceo',
    label: 'PA to CEO / Executive Assistant',
    role_titles: ['pa to ceo', 'pa to', 'executive assistant', 'personal assistant'],
    function: 'admin_pa',
    seniority_bands: ['junior', 'mid'],
    level: 1,
    blocks: ['inbox', 'calendar-planning', 'stakeholder-conflict', 'task-prioritisation'],
  },

  // ── Level 2: Execution + Judgement (4 blocks) ──────────────────────
  {
    id: 'hr-coordinator',
    label: 'HR Assistant / HR Coordinator',
    role_titles: ['hr coordinator', 'hr assistant', 'people coordinator', 'people assistant'],
    function: 'hr',
    seniority_bands: ['junior'],
    level: 2,
    blocks: ['inbox', 'reading-summarising', 'task-prioritisation', 'conversation-simulation'],
  },
  {
    id: 'hr-advisor',
    label: 'HR Advisor / HR Officer',
    role_titles: ['hr advisor', 'hr officer', 'people partner', 'er advisor', 'employee relations advisor'],
    function: 'hr',
    seniority_bands: ['mid'],
    level: 2,
    blocks: ['conversation-simulation', 'reading-summarising', 'decision-queue', 'stakeholder-conflict'],
  },
  {
    id: 'finance-assistant',
    label: 'Finance Assistant / Accounts Assistant / Bookkeeper',
    role_titles: ['finance assistant', 'accounts assistant', 'bookkeeper', 'junior accountant', 'accounts payable', 'accounts receivable'],
    function: 'finance',
    seniority_bands: ['junior'],
    level: 2,
    blocks: ['spreadsheet-data', 'reading-summarising', 'decision-queue', 'task-prioritisation'],
  },
  {
    id: 'management-accountant',
    label: 'Management Accountant / Junior Accountant',
    role_titles: ['management accountant', 'assistant management accountant', 'assistant accountant', 'staff accountant'],
    function: 'finance',
    seniority_bands: ['mid'],
    level: 2,
    blocks: ['spreadsheet-data', 'reading-summarising', 'decision-queue', 'stakeholder-conflict'],
  },
  {
    id: 'customer-service-advisor',
    label: 'Customer Service Advisor / Representative',
    role_titles: ['customer service advisor', 'customer service representative', 'cs advisor', 'customer support', 'customer service rep', 'cs rep'],
    function: 'customer_service',
    seniority_bands: ['junior', 'mid'],
    level: 2,
    blocks: ['inbox', 'conversation-simulation', 'task-prioritisation', 'decision-queue'],
  },
  {
    id: 'customer-success-executive',
    label: 'Customer Success Executive / CSM (junior)',
    role_titles: ['customer success executive', 'customer success manager', 'csm', 'customer success'],
    function: 'customer_service',
    seniority_bands: ['mid'],
    level: 2,
    blocks: ['inbox', 'conversation-simulation', 'stakeholder-conflict', 'decision-queue'],
  },
  {
    id: 'sales-executive',
    label: 'Sales Executive / Sales Rep / Account Executive',
    role_titles: ['sales executive', 'sales representative', 'account executive', 'sales rep', 'business development executive', 'bde'],
    function: 'sales',
    seniority_bands: ['junior', 'mid'],
    level: 2,
    blocks: ['inbox', 'conversation-simulation', 'decision-queue', 'stakeholder-conflict'],
  },

  // ── Level 3: Management (5 blocks) ─────────────────────────────────
  {
    id: 'hr-manager',
    label: 'HR Manager / HRBP',
    role_titles: ['hr manager', 'hr business partner', 'hrbp', 'people manager', 'head of people', 'head of hr', 'people lead'],
    function: 'hr',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['conversation-simulation', 'decision-queue', 'stakeholder-conflict', 'reading-summarising', 'crisis-simulation'],
  },
  {
    id: 'finance-manager',
    label: 'Finance Manager / Senior Management Accountant',
    role_titles: ['finance manager', 'senior management accountant', 'head of finance', 'finance lead'],
    function: 'finance',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['spreadsheet-data', 'decision-queue', 'conversation-simulation', 'stakeholder-conflict', 'crisis-simulation'],
  },
  {
    id: 'operations-manager',
    label: 'Operations Manager',
    role_titles: ['operations manager', 'ops manager', 'head of operations', 'operations lead', 'procurement manager'],
    function: 'operations',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['spreadsheet-data', 'decision-queue', 'stakeholder-conflict', 'crisis-simulation', 'conversation-simulation'],
  },
  {
    id: 'project-manager',
    label: 'Project Manager / Senior PM',
    role_titles: ['project manager', 'senior project manager', 'senior pm', 'pmo manager', 'programme manager', 'program manager'],
    function: 'project_management',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['calendar-planning', 'task-prioritisation', 'stakeholder-conflict', 'crisis-simulation', 'decision-queue'],
  },
  {
    id: 'account-manager',
    label: 'Account Manager / Senior Account Manager',
    role_titles: ['account manager', 'senior account manager', 'key account manager', 'bd manager', 'business development manager', 'partnerships manager'],
    function: 'sales',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['inbox', 'conversation-simulation', 'task-prioritisation', 'stakeholder-conflict', 'decision-queue'],
  },
  {
    id: 'marketing-manager',
    label: 'Marketing Manager / Head of Marketing',
    role_titles: ['marketing manager', 'senior marketing manager', 'head of marketing', 'brand manager', 'investor relations manager'],
    function: 'marketing',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['spreadsheet-data', 'decision-queue', 'document-writing', 'stakeholder-conflict', 'crisis-simulation'],
  },
  {
    id: 'recruitment-consultant',
    label: 'Recruitment Consultant / Senior Recruitment Consultant',
    role_titles: ['recruitment consultant', 'senior recruitment consultant', 'talent acquisition partner', 'recruiter'],
    function: 'recruitment',
    seniority_bands: ['mid', 'manager', 'senior_manager'],
    level: 3,
    blocks: ['inbox', 'conversation-simulation', 'task-prioritisation', 'decision-queue', 'stakeholder-conflict'],
  },
  {
    id: 'solicitor',
    label: 'Solicitor / Senior Solicitor',
    role_titles: ['solicitor', 'senior solicitor', 'lawyer', 'in-house counsel', 'compliance officer'],
    function: 'legal',
    seniority_bands: ['mid', 'manager', 'senior_manager'],
    level: 3,
    blocks: ['reading-summarising', 'document-writing', 'decision-queue', 'stakeholder-conflict', 'conversation-simulation'],
  },
  {
    id: 'software-developer',
    label: 'Software Developer / Senior Developer',
    role_titles: ['software developer', 'senior developer', 'software engineer', 'senior engineer', 'tech lead', 'engineering manager'],
    function: 'software_dev',
    seniority_bands: ['mid', 'manager', 'senior_manager'],
    level: 3,
    blocks: ['conversation-simulation', 'reading-summarising', 'document-writing', 'decision-queue', 'crisis-simulation'],
  },
  {
    id: 'customer-service-manager',
    label: 'Customer Service Manager / Customer Success Director',
    role_titles: ['customer service manager', 'customer success director', 'head of customer success', 'cx manager', 'head of customer service'],
    function: 'customer_service',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['conversation-simulation', 'decision-queue', 'stakeholder-conflict', 'crisis-simulation', 'reading-summarising'],
  },
  {
    id: 'sales-manager',
    label: 'Sales Manager',
    role_titles: ['sales manager', 'head of sales', 'commercial manager'],
    function: 'sales',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['spreadsheet-data', 'conversation-simulation', 'decision-queue', 'stakeholder-conflict', 'crisis-simulation'],
  },

  // ── Level 4: Senior / Leadership (4 blocks) ────────────────────────
  {
    id: 'finance-controller',
    label: 'Financial Controller / Finance Director',
    role_titles: ['financial controller', 'finance director', 'group financial controller', 'fd', 'cfo', 'chief financial officer'],
    function: 'finance',
    seniority_bands: ['director', 'c_suite'],
    level: 4,
    blocks: ['spreadsheet-data', 'reading-summarising', 'decision-queue', 'stakeholder-conflict'],
  },
  {
    id: 'director',
    label: 'Director (Sales / Marketing / HR / Operations / Engineering / Recruitment / PMO / Legal / Commercial)',
    // Includes specific exec acronyms (CMO, CPO, CTO, COO) which are
    // technically c_suite but read as functional directors in most orgs.
    role_titles: [
      'sales director', 'marketing director', 'hr director', 'operations director',
      'engineering director', 'commercial director', 'recruitment director',
      'pmo director', 'legal director', 'people director', 'product director',
      'cmo', 'cpo', 'cto', 'coo',
      'chief marketing', 'chief technology', 'chief product', 'chief operating',
      'chief people', 'chief revenue',
    ],
    function: null,
    // Includes c_suite so functional execs with chief titles (CMO, CTO,
    // CPO, COO) resolve here rather than falling through. The block list
    // for Managing Director / CEO sits separately and only matches when
    // the role_title is one of those top-of-house variants.
    seniority_bands: ['director', 'senior_manager', 'c_suite'],
    level: 4,
    blocks: ['decision-queue', 'stakeholder-conflict', 'reading-summarising', 'crisis-simulation'],
  },
  {
    id: 'head-of-department',
    label: 'Head of Department',
    // Only used as a director-level catch-all. The L3 entries above
    // include more specific 'head of' patterns (head of marketing, head
    // of sales, etc.); those win when seniority lands in the manager band.
    role_titles: ['head of'],
    function: null,
    seniority_bands: ['director'],
    level: 4,
    blocks: ['decision-queue', 'stakeholder-conflict', 'reading-summarising', 'crisis-simulation'],
  },
  {
    id: 'managing-director',
    label: 'MD / CEO / Chair / C-suite',
    role_titles: [
      'managing director', 'md', 'ceo', 'chief executive', 'chair', 'chairman',
      'chairwoman', 'general counsel',
    ],
    function: 'senior_leadership',
    seniority_bands: ['c_suite'],
    level: 4,
    blocks: ['decision-queue', 'stakeholder-conflict', 'crisis-simulation', 'reading-summarising'],
  },
]

// Default canonical entry per level for the level-fallback pass.
const LEVEL_DEFAULTS = {
  1: 'administrator',
  2: 'customer-service-advisor',
  3: 'account-manager',
  4: 'head-of-department',
}

function levelFromSeniority(seniority) {
  switch (seniority) {
    case 'junior': return 1
    case 'mid': return 2
    case 'manager': return 3
    case 'senior_manager': return 3
    case 'director': return 4
    case 'c_suite': return 4
    default: return 2
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Three-pass canonical lookup
// ─────────────────────────────────────────────────────────────────────────

export function findCanonicalEntry(roleTitle, role_profile) {
  const title = (roleTitle || '').toLowerCase().trim()
  const seniority = role_profile?.seniority_band || null
  const fn = role_profile?.function || null

  const seniorityFits = (entry) =>
    !entry.seniority_bands?.length ||
    !seniority ||
    entry.seniority_bands.includes(seniority)

  // Pass 1: role_title substring match. First entry whose role_titles
  // contains a substring present in the lowercased title AND whose
  // seniority bands accept the detected seniority. Specific entries are
  // ordered before general ones so the first match wins cleanly.
  if (title) {
    for (const entry of CANONICAL_ROLE_MAPPING) {
      const titleHit = entry.role_titles.some(p => title.includes(p))
      if (titleHit && seniorityFits(entry)) {
        return { entry, match_type: 'role_title' }
      }
    }
  }

  // Pass 2: function + seniority match. Used when the role_title is a
  // variant the canonical list does not name verbatim (Procurement
  // Manager, Investor Relations Manager, Compliance Officer, etc.) but
  // the detector's function tag and seniority pin it to a known pattern.
  if (fn) {
    for (const entry of CANONICAL_ROLE_MAPPING) {
      if (!entry.function) continue
      if (entry.function !== fn) continue
      if (!seniorityFits(entry)) continue
      return { entry, match_type: 'function_seniority' }
    }
  }

  // Pass 3: level fallback. Used when neither role_title nor
  // function+seniority hits. Seniority alone selects a default pattern
  // appropriate to the band.
  const level = levelFromSeniority(seniority)
  const defaultId = LEVEL_DEFAULTS[level] || LEVEL_DEFAULTS[2]
  const entry = CANONICAL_ROLE_MAPPING.find(e => e.id === defaultId)
  return { entry, match_type: 'level_fallback' }
}

// ─────────────────────────────────────────────────────────────────────────
// Duration scaling
// ─────────────────────────────────────────────────────────────────────────

// Total target seconds per block count. Permanent levels follow the
// brief's ranges (4 blocks = 16-20min, 5 blocks = 20-25min); temporary
// caps at 3 blocks across all levels.
function targetTotalSeconds(blockCount) {
  if (blockCount <= 3) return 780  // 13 min
  if (blockCount === 4) return 1080 // 18 min
  return 1350 // 22.5 min for 5+
}

function scaledDurations(chosenIds, totalTargetSeconds) {
  const totalDefault = chosenIds.reduce((s, id) => s + (BLOCK_CATALOGUE[id]?.default_duration_seconds || 240), 0)
  if (totalDefault === 0) return chosenIds.map(() => 180)
  const ratio = totalTargetSeconds / totalDefault
  return chosenIds.map(id => {
    const base = BLOCK_CATALOGUE[id]?.default_duration_seconds || 240
    const scaled = base * ratio
    return Math.max(60, Math.round(scaled / 30) * 30)
  })
}

// ─────────────────────────────────────────────────────────────────────────
// selectBlocks: canonical lookup with temporary cap
// ─────────────────────────────────────────────────────────────────────────

// Public selector. Returns ordered array of:
//   { block_id, suggested_duration_seconds, order, canonical_id, match_type, level }
export function selectBlocks(role_profile, roleTitle) {
  if (!role_profile) return []
  const { entry, match_type } = findCanonicalEntry(roleTitle, role_profile)
  if (!entry) return []

  let blocks = entry.blocks.slice()

  // Temporary employment caps at 3 blocks regardless of level. Drop from
  // the end of the canonical list since the order is priority order
  // (setup blocks first, dynamic/resolution last).
  if (role_profile.employment_type === 'temporary') {
    blocks = blocks.slice(0, 3)
  }

  const durations = scaledDurations(blocks, targetTotalSeconds(blocks.length))
  return blocks.map((id, i) => ({
    block_id: id,
    suggested_duration_seconds: durations[i],
    order: i + 1,
    canonical_id: entry.id,
    match_type,
    level: entry.level,
  }))
}

// ─────────────────────────────────────────────────────────────────────────
// generateScenario: AI-generated connected scenario
// ─────────────────────────────────────────────────────────────────────────

function makeScenarioId(roleTitle) {
  const slug = (roleTitle || 'role').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)
  const stamp = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 6)
  return `${slug}-${stamp}-${rand}`
}

function buildBlockBriefList(selected) {
  return selected.map(s => {
    const b = BLOCK_CATALOGUE[s.block_id]
    if (!b) return `  ${s.order}. ${s.block_id} (${Math.round(s.suggested_duration_seconds / 60)} min)`
    const mins = Math.round(s.suggested_duration_seconds / 60)
    return `  ${s.order}. ${b.name} (id "${b.id}", ${mins} min, category: ${b.category})`
  }).join('\n')
}

const FUNCTION_SCENARIO_HINTS = {
  marketing: 'Q3 campaign launch brief due by end of day, agency needs direction; or competitor move overnight requires response.',
  finance: 'Month-end variance flagged Friday afternoon, FD wants the answer by lunch; or budget cut announced over the weekend.',
  hr: 'Grievance landed Friday afternoon and the line manager wants advice today; or a senior hire backed out at the weekend.',
  recruitment: 'Client just changed the role spec mid-process; or a top candidate has a competing offer expiring today.',
  legal: 'Contract due to exchange today, opposing side raised last-minute concerns; or a regulator query landed Friday.',
  sales: 'Pipeline review with the CEO at 2pm and the numbers are soft; or a customer escalation arrived at 8am.',
  software_dev: 'Production bug found over the weekend, sprint planning is at 11am, and the on-call engineer needs help.',
  customer_service: 'A complaint went viral on Twitter overnight; or a repeat customer is escalating to legal.',
  operations: 'Supplier failure at 8am affecting customer deliveries; or a stock count discrepancy flagged Friday.',
  project_management: 'Critical-path slip surfaced Friday and the steering committee meets at 3pm.',
  procurement: 'Preferred supplier missed a delivery commitment with no warning; or a tender deadline shifted forward.',
  admin_pa: 'CEO unexpectedly called away, full diary needs replanning, two VIP visitors arriving at 11am.',
  public_sector: 'Member of Parliament submitted a written question due back by 5pm; or a service complaint escalated to the press.',
  senior_leadership: 'Largest customer threatening to walk after Friday\'s service incident; or a board member raised a governance concern overnight.',
  aerospace: 'A safety report from Friday is sitting on the desk and the production team is asking when they can resume.',
  multilingual: 'A high-stakes overseas client request landed in two languages over the weekend.',
  fmcg_wholesale: 'A key account is renegotiating terms today and a stock allocation decision is due before noon.',
}

// Function-flavoured content guidance for the data-heavy blocks. The
// brief is explicit: a Marketing Manager's spreadsheet shows campaign
// metrics; a Finance Manager's shows variance reports; a Sales Director's
// shows pipeline. We list the function -> data type mapping in the prompt
// so the AI does not default to generic "some numbers" content.
const FUNCTION_DATA_FLAVOUR = {
  marketing: 'campaign metrics: cost-per-MQL, MQL-to-SQL conversion, channel attribution, pipeline contribution',
  finance: 'variance reports: budget vs actual, mix vs price, accruals, supplier reconciliations',
  sales: 'pipeline data: win rate, ACV, days in stage, weighted forecast vs target',
  customer_service: 'queue health, NPS, repeat-contact rate, time-to-first-response, escalation volume',
  operations: 'operational metrics: SLA hits, throughput, defect rate, supplier lead time, stock variance',
  hr: 'workforce data: headcount, attrition, time-to-hire, eNPS, grievance volume',
  software_dev: 'engineering metrics: incident MTTR, deploy frequency, failure rate, change lead time',
  recruitment: 'desk metrics: placements made, fees billed, time-to-fill, candidate-to-placement ratio',
  legal: 'matter data: open matters, hours logged, regulatory deadlines, claim values',
  procurement: 'spend data: supplier mix, contract values, lead time variance, price index',
  project_management: 'project metrics: critical-path slip, burn rate, RAID counts, milestone hit rate',
  admin_pa: 'diary data: meeting load, conflict count, travel windows, room utilisation',
  senior_leadership: 'board-level KPIs: revenue, cash runway, customer concentration, headcount cost',
}

function buildScenarioPrompt({ role_profile, roleTitle, jobDescription, selected, matchInfo }) {
  const fnHint = FUNCTION_SCENARIO_HINTS[role_profile.function]
    || 'Pick a believable Monday morning event specific to this role.'
  const dataFlavour = FUNCTION_DATA_FLAVOUR[role_profile.function]
  const blockList = buildBlockBriefList(selected)
  const blockCount = selected.length
  const isTopBand = ['director', 'c_suite'].includes(role_profile.seniority_band)
  const isTemporary = role_profile.employment_type === 'temporary'
  const sectorContext = role_profile.sector_context || 'unspecified sector'
  const seniority = role_profile.seniority_band || 'unspecified seniority'
  const employment = role_profile.employment_type || 'permanent'
  const displayTitle = roleTitle || role_profile.function

  return `You are generating a Workspace simulation for the role: ${displayTitle} at ${seniority} level in ${sectorContext}, ${employment}.

Your job is NOT to generate generic office work. Your job is to REPLICATE THIS ROLE.

Step 1: Identify what someone in this exact role actually does for a living. What is the WORK? Not "office tasks" but the substantive work this role exists to do. For a Marketing Manager: planning and executing campaigns. For a Solicitor: providing legal advice and drafting documents. For a Receptionist: managing the front of house and coordinating the office. For an MD: making strategic decisions and managing senior stakeholders.

Step 2: Pick a believable Day 1 scenario that involves this role doing real role-specific work. Not "reading emails" but "briefing the agency on the Q3 campaign launch". Not "reviewing documents" but "reviewing a contract clause that could derail today's exchange".

Step 3: Map that work into the ${blockCount} selected blocks. Each block hosts a piece of the role-specific work. The blocks are the tools the candidate uses; the work is the role being performed.

Step 4: Generate the content for each block such that:
- The CONTENT inside each block reflects actual role-specific work
- An expert in this role would recognise their job
- A complete novice in this role would feel out of their depth
- The work flows from block to block as one coherent piece of the role's actual work
- The candidate's outputs in earlier blocks become inputs to later blocks

Test for success: if you showed this Workspace content to a real practitioner of this role, would they say "yes, this is what I actually do" or would they say "this is just generic office work dressed up"? Generic office work is failure. Genuine role replication is success.

Examples of role replication done well:

Marketing Manager (SaaS scaleup, manager level):
- Spine: "You're briefing the agency on the Q3 launch campaign by 5pm. Your CMO wants 200 words by 11am summarising approach. Last quarter's data has flags you need to factor in."
- The Inbox block has the CMO's brief request, the agency asking for direction, the Sales Director questioning marketing's contribution to pipeline
- The Spreadsheet/data block shows last quarter's campaign performance with deliberate anomalies (paid social CPM looks suspect, attribution heavily concentrated in one event)
- The Document writing block is the actual campaign brief the candidate drafts, informed by what they read and analysed
- The Decision queue is real campaign decisions: hold the brief or revise based on agency feedback, push back on Sales' demands, redistribute budget
- The Crisis simulation is a campaign error live-going, what does the Marketing Manager actually do to fix it?

This is Marketing Manager work. Not office work.

Receptionist (corporate law firm, junior, permanent):
- Spine: "It's a busy Monday. Senior partner has a 9.30 client meeting that needs prep. A delivery for one of the partners has gone to the wrong floor. A walk-in client without an appointment is asking to wait. Your colleague is off sick so you're covering reception alone."
- The Inbox block has a partner's diary request, a courier message, a client confirmation, a building services email
- The Calendar planning block is genuinely planning the day around the meeting prep, the absent colleague's bookings, lunch cover
- The Conversation simulation is handling the walk-in client politely but firmly
- The Task prioritisation is the actual juggle: meeting prep vs courier issue vs covering reception vs partner's urgent ask

This is Receptionist work. Not generic admin work.

Solicitor (commercial property, mid-level, permanent):
- Spine: "Today's the day a major lease exchange is due to complete. Client wants reassurance. Opposing solicitor has just raised a last-minute concern about the indemnity clause. Your trainee needs supervision on a separate matter."
- The Reading and summarising block is reading the actual indemnity clause and the opposing party's concern
- The Document writing block is drafting an amendment or advice note that responds
- The Decision queue is real legal calls: stand firm, concede, escalate, recommend hold/exchange
- The Stakeholder conflict block is balancing the client's commercial pressure with the legal risk advice
- The Conversation simulation is the call with opposing counsel or the reassurance call to the client

This is legal work. Not generic professional services work.

When you generate a scenario, you must be able to defend each block's content as "this is what a ${displayTitle} would actually do in this situation, not just what someone in an office would do".

────────────────────────────────────────────────────
Role context for this generation:

Role title: ${displayTitle}
Function: ${role_profile.function}
Seniority: ${seniority}
IC or manager: ${role_profile.ic_or_manager}
Interaction style: ${role_profile.interaction_internal_external}
Sector context: ${sectorContext}
Company size: ${role_profile.company_size || 'unspecified'}
Employment type: ${employment}
Primary work types: ${(role_profile.primary_work_types || []).join(', ')}
Canonical role pattern: ${matchInfo?.canonical_id || 'unknown'} (matched via ${matchInfo?.match_type || 'unknown'})
${jobDescription ? `Job description excerpt:\n${String(jobDescription).slice(0, 800)}\n` : ''}
Selected blocks in order (these are fixed, do not change them):
${blockList}

Function-specific scenario starting points:
${fnHint}

Function-specific block content guidance (apply these on top of the role replication test, not instead of it):
${dataFlavour ? `- Data-heavy blocks (spreadsheet-data, reading-summarising) should focus on ${dataFlavour}.` : ''}
- Document-writing blocks must produce a document this role would actually produce: campaign brief (marketing), contract clause / advice note (legal), variance commentary / board paper (finance), design doc / post-incident note (software), grievance outcome (HR), complaint response (customer service).
- Decision-queue blocks must list decisions this role actually faces: budget approvals (marketing), refund authority (customer service), fee discount (sales), hire/no-hire (recruitment), settle vs litigate (legal), hotfix vs proper fix (software), refer vs hold (clinical adjacent).
- Conversation-simulation blocks must name the counter-party explicitly with a position the candidate must engage: a procurement contact pushing for a discount, an opposing solicitor on a clause, a line manager refusing to performance-manage, a board member raising a governance concern. The opening_message must reference the specific situation in the spine, not a generic opener.
- Stakeholder-conflict blocks must list 3 to 5 named stakeholders pulling in different directions on a real role-specific conflict (commercial vs legal, sales vs marketing, board vs exec, line manager vs HR, finance vs operations). Each stakeholder has a stated want, a reason, and a power level (low / medium / high) that reflects their actual leverage on the candidate's call.

Output requirements:
- Return JSON only. UK English. No emoji. No em dashes.
- The spine and trigger must be specific to this role and sector. State concrete numbers, names, deadlines, products, customers.
- The trigger event appears in the FIRST block's content.
- Each block's content references what the candidate has just done in the previous block (use connects_from). Each block's content sets up what the candidate will do next (use connects_to).
- The scenario_arc maps to the five narrative stages and describes what the candidate experiences across the blocks.
${isTopBand ? '- Because seniority is director or c_suite, escalate the stakes in the later blocks: board, regulator, top customer, press.' : ''}
${isTemporary ? '- Because employment type is temporary, keep the scenario tight (3 blocks total). Focus on the foundational work modes; do not introduce a crisis as the closing block.' : ''}

Output schema:
{
  "title": "string (4-8 words, role-specific)",
  "spine": "string (1-2 sentences describing what's happening today for this person)",
  "trigger": "string (the 9am Monday event that kicks the scenario off)",
  "scenario_arc": {
    "stage_1_setup": "string (what the candidate sees first)",
    "stage_2_context": "string (what they learn from the early research/data blocks)",
    "stage_3_output": "string (what they produce mid-scenario)",
    "stage_4_pressure": "string (what changes or escalates partway through)",
    "stage_5_resolution": "string (the final ask)"
  },
  "block_content": {
${selected.map(s => `    "${s.block_id}": {
${blockSchemaFields(s.block_id)}
    }`).join(',\n')}
  }
}

The "key_items" arrays should each contain 3 to 5 strings that are specific and named (e.g. "Email from Helen Carter, Procurement Director, subject: Q3 budget freeze", not "an email about budgets").

Per-block content rules for the typed fields:
- For inbox blocks: produce ${seniority === 'junior' ? '4 to 5' : seniority === 'mid' ? '5 to 6' : '6 to 7'} emails. Mix relationships across senior, peer, junior, internal, external. The "from_role" is the sender's actual job title (Senior Partner, Account Director at Bright Agency, IT helpdesk, FD, etc.). The body is what they actually say, in 2-5 sentences, with specifics. The trigger event must appear in one of the inbox emails.
- For task-prioritisation blocks: produce ${seniority === 'junior' ? '6 to 7' : seniority === 'mid' ? '7 to 8' : '8 to 10'} tasks. Each task is a real outcome this role would actually face today, not a generic todo. "source" names the asker (CMO, Senior Partner, Helen Carter at agency). "deadline" is one of: today, tomorrow, this_week, no_deadline.
- For calendar-planning blocks: produce 3 to 5 fixed_meetings between 08:00 and 18:00, with realistic start/end times in HH:MM (e.g. 09:30, 14:00). Each meeting has "with" naming who's in it. "can_decline" is true only when this role could realistically push it. Plus 4 to 6 todos that are work outcomes for this role specifically (not "respond to emails" but "draft Q3 brief outline" or "review supplier statement against ledger"). Estimated_minutes is 15, 30, 45, or 60.
- For reading-summarising blocks: the document_text must be 600 to 1200 words of believable role-specific prose. Solicitor: a contract clause + the opposing party's letter raising concerns, or a client advice note from another fee-earner. Marketing: a market research summary, or a creative deck transcript from the agency. Finance: a variance commentary, an audit findings memo, or a board paper extract. HR: an investigation interview transcript, a policy update, or a case file. MD/Director: a board paper extract, an investor update, or an escalated customer complaint. Operations: an incident report or supplier audit findings. Reference specific names, numbers, dates, clause/section/row IDs. The document must be coherent enough that a 3-bullet summary, a recommendation, and a useful clarifying question are all extractable from it.
- For document-writing blocks: pick the document the candidate would actually have to write next given the spine and the previous block's output. Word limit 150 (memo / clause), 250 (advice note / brief), 400 (commentary / outcome letter), or 600 (board update / strategic response). must_include lists the specific points the document MUST hit (named individuals, specific clauses, specific risks). no_gos are the things they must not say at this stage (commitments outside their authority, named third parties for confidentiality, premature conclusions). Audience is a named recipient or a named committee.
- For spreadsheet-data blocks: 15 to 25 rows, 5 to 8 columns, role-appropriate. Finance: budget vs actual variance, P&L lines. Marketing: channel performance with cost, conversions, CPL, attribution share. Operations: SLA hits, throughput, defect rate by line/supplier. Sales: pipeline by stage with deal name, ACV, age, weighted forecast. HR: headcount, attrition, performance distribution by team. Procurement: vendor scorecard with spend, OTIF, defects, contract end date. Plant 1 to 3 deliberate anomalies: a suspicious variance, a concentration in one row, a data quality issue (negative value, missing key field), or a threshold breach. Each anomaly has the row_index and col_index of the actual offending cell, the type, and a one-sentence hint that names what is wrong. Numbers must be numbers in the JSON, not strings. Use null for genuinely missing cells (they may themselves be the anomaly).
- For crisis-simulation blocks: pick a crisis this exact role would actually be on the receiving end of. Customer Service Manager: a VIP customer complaint going viral on social media. Marketing Manager: a campaign launches with a typo and is going live on TV in 2 hours. Finance Manager: payroll system fails the day before payday. Solicitor: opposing counsel calls 2 hours before a deadline saying they will injunct. HR Director: an employment tribunal claim hits and journalists are asking questions. Operations Manager: a supplier failure at 8am with customers already affected. MD: the largest customer just terminated and the CFO wants to call the board. Software Developer: a production bug found over the weekend, sprint planning today. Recruitment Consultant: a candidate has accepted a counter-offer 30 minutes before placement. Project Manager: a critical sprint deliverable misses its deadline and the client demands accountability. The initial_alert is the opening message that creates the crisis (a phone call, an urgent message, or a breaking news alert) in the caller or sender's actual voice. The three stages must escalate: stage_1 is the immediate ask, stage_2 introduces a new constraint or a more senior person stepping in, stage_3 closes the pressure (a deadline, a regulator, the board, the press). Each stage has a specific, in-character prompt the candidate must respond to.`
}

// Per-block content schema fields. Inbox, task-prioritisation, and
// calendar-planning add typed arrays on top of the shared base fields so
// the real block components can render structured content without
// regex-parsing free-form key_items strings. The other 11 blocks ship the
// base shape today; per-block typing arrives with each real component
// build.
function blockSchemaFields(blockId) {
  const base =
`      "summary": "string (1 sentence describing this block's content for this candidate)",
      "setup": "string (what the candidate sees / receives in this block)",
      "expected_output": "string (what the candidate is expected to produce)",
      "connects_from": "string or null (reference to previous block output)",
      "connects_to": "string or null (what this hands off to the next block)",
      "key_items": [
        "string (a specific named item: an email subject, a row label, a decision title, a stakeholder name)"
      ]`
  if (blockId === 'inbox') {
    return base + `,
      "emails": [
        {
          "id": "string (unique within block, e.g. email-1)",
          "from_name": "string",
          "from_role": "string (their actual job title or department)",
          "from_relationship": "string (one of: external, senior, peer, junior, internal)",
          "subject": "string",
          "preview": "string (under 100 chars, the email's opening line)",
          "body": "string (2-5 sentence email body, specific and named)",
          "received_at": "string (relative time, e.g. 09:02 today, Friday 17:30)"
        }
      ]`
  }
  if (blockId === 'task-prioritisation') {
    return base + `,
      "tasks": [
        {
          "id": "string (unique within block, e.g. task-1)",
          "title": "string (5-12 words, role-specific outcome)",
          "description": "string (1-2 sentences explaining the work)",
          "source": "string (who asked, named explicitly)",
          "context": "string (1 line of why this is on the list today)",
          "deadline": "string (one of: today, tomorrow, this_week, no_deadline)"
        }
      ]`
  }
  if (blockId === 'calendar-planning') {
    return base + `,
      "fixed_meetings": [
        {
          "id": "string (unique within block, e.g. meeting-1)",
          "start": "string (HH:MM in 24-hour format, e.g. 09:30)",
          "end": "string (HH:MM, e.g. 10:00)",
          "title": "string",
          "with": "string (who is in the meeting)",
          "can_decline": "boolean (true only if this role could realistically push it)"
        }
      ],
      "todos": [
        {
          "id": "string (unique within block, e.g. todo-1)",
          "title": "string (the work outcome, role-specific, not a generic todo)",
          "description": "string (1 line of context)",
          "estimated_minutes": "number (one of: 15, 30, 45, 60)"
        }
      ]`
  }
  if (blockId === 'decision-queue') {
    return base + `,
      "decisions": [
        {
          "id": "string (unique within block, e.g. decision-1)",
          "title": "string (5-12 words, role-specific decision the candidate must make today)",
          "context": "string (2-3 sentences explaining what's at stake and the constraint)",
          "constraint": "string (the binding constraint or risk on this call)",
          "affects": "string (who is affected by this decision)",
          "deadline_pressure": "string (one of: minutes, hours, today, this_week)",
          "options": [
            {
              "id": "string (unique within decision)",
              "label": "string (5-12 words, the option clearly stated)",
              "implication": "string (1 sentence on what happens if this option is chosen)"
            }
          ]
        }
      ]`
  }
  if (blockId === 'conversation-simulation') {
    return base + `,
      "counterparty": {
        "name": "string (a believable specific name for this role and sector)",
        "role": "string (the counterpart's job title or capacity)",
        "relationship": "string (one of: external, senior, peer, junior, internal)",
        "stance": "string (their position on the issue, in their own voice)",
        "ask": "string (what they want from the candidate)",
        "personality": "string (a short character note: 'direct, time-poor', 'warm but persistent', 'frustrated, semi-professional')"
      },
      "opening_message": "string (the counterpart's first message in this conversation, 2-4 sentences, opens the dialogue with a specific request or pushback)"`
  }
  if (blockId === 'stakeholder-conflict') {
    return base + `,
      "central_decision": "string (1-2 sentences naming the decision the candidate is being pulled in different directions on)",
      "stakeholders": [
        {
          "id": "string (unique within block, e.g. stakeholder-1)",
          "name": "string (named individual, not a generic title)",
          "role": "string (their job title)",
          "wants": "string (what they want the candidate to do, in their voice)",
          "why": "string (their reason or constraint, 1 sentence)",
          "power": "string (one of: low, medium, high)"
        }
      ]`
  }
  if (blockId === 'reading-summarising') {
    return base + `,
      "document_type": "string (the role-specific document label, e.g. 'Indemnity clause and opposing party concern', 'Q3 channel attribution research summary', 'Variance analysis: opex Q2', 'ER investigation interview transcript', 'Board paper extract: Q3 cash position', 'Site incident report')",
      "document_text": "string (600 to 1200 words of fully-formed prose. Must read like a real document this role would actually receive: contract clause + counterparty letter for legal, market research summary for marketing, variance commentary for finance, investigation transcript for HR, board paper extract for MD, incident report for ops. Use paragraph breaks. Reference specific named parties, numbers, dates, sections. No headings unless the document type uses them.)",
      "document_metadata": {
        "author": "string (named individual, role appropriate)",
        "date": "string (recent date, e.g. 'Friday 17:42' or '12 March 2025')",
        "audience": "string (who the document is for, e.g. 'Internal: Solicitor team', 'For: Marketing Director', 'For: Audit Committee')"
      }`
  }
  if (blockId === 'document-writing') {
    return base + `,
      "document_type": "string (the role-specific document the candidate must write, e.g. 'Client advice note on indemnity clause', 'Q3 campaign brief for Bright Agency', 'Variance commentary for Q2 board pack', 'Investigation outcome letter to grievant', 'Customer apology letter from MD', 'Internal memo: SLA breach to operations team')",
      "audience": "string (the named recipient, e.g. 'Helen Carter, Procurement Director at NorthCo', 'Bright Agency creative team', 'Audit Committee', 'Tom Webb, claimant', 'CEO and CFO')",
      "context": "string (2-3 sentences on the situation prompting this document, referencing the spine and the previous block's output where relevant)",
      "word_limit": "number (one of: 150, 250, 400, 600 - choose what suits the document type)",
      "must_include": [
        "string (3 to 5 specific points the candidate's document should hit, role appropriate, named where useful)"
      ],
      "no_gos": [
        "string (1 to 3 things the candidate must NOT do, e.g. 'do not commit to a refund without finance sign-off', 'do not name the third party in this version', optional)"
      ]`
  }
  if (blockId === 'spreadsheet-data') {
    return base + `,
      "table_title": "string (the role-specific table label, e.g. 'Q3 channel performance, last 90 days', 'Opex variance: Q2 actual vs budget', 'Pipeline by stage: top 25 deals', 'Headcount and attrition by team', 'Vendor scorecard: top 10 suppliers')",
      "units": "string (the dominant units for numeric columns, e.g. '£', '%', 'count', 'days', or '' if mixed)",
      "columns": [
        "string (5 to 8 column headers, role appropriate. The first column is usually the row label; the rest are metrics or attributes the role would actually look at)"
      ],
      "rows": [
        ["string or number (one entry per column. 15 to 25 rows. Use real-looking values: campaign names, supplier names, deal names, team names. Numbers as numbers, not strings. Use null for missing cells, never for the first column.)"]
      ],
      "anomalies": [
        {
          "row_index": "number (0-based row index where the anomaly sits)",
          "col_index": "number (0-based column index where the anomaly sits)",
          "type": "string (one of: outlier, suspicious_variance, attribution_concentration, data_quality, missing_value, threshold_breach)",
          "hint": "string (one sentence describing why this cell is the anomaly. Used for scoring, never shown to the candidate.)"
        }
      ]`
  }
  if (blockId === 'crisis-simulation') {
    return base + `,
      "trigger_type": "string (one of: phone_call, urgent_message, breaking_news)",
      "initial_alert": "string (the opening message that creates the crisis, in the caller's or sender's voice, 2-4 sentences, specific and named, lands like a real phone call or urgent message that just hit)",
      "caller_or_sender": {
        "name": "string (named individual, role-appropriate, not generic)",
        "role": "string (their job title or capacity, e.g. 'CFO', 'Senior Partner at NorthCo', 'Sky News journalist')",
        "relationship": "string (one of: external, senior, peer, junior, internal)"
      },
      "stage_1": {
        "new_information": "string (what just happened or what the caller has just told the candidate, 2-4 sentences with specifics)",
        "prompt": "string (the question the candidate must respond to in the moment, e.g. 'What do you say to them in the next 60 seconds?')"
      },
      "stage_2": {
        "new_information": "string (what has escalated or shifted since stage 1, 2-4 sentences naming what changed and who is now involved)",
        "prompt": "string (the next question, e.g. 'OK they have agreed. CFO is calling, what is your update?')"
      },
      "stage_3": {
        "new_information": "string (the third escalation, often a senior figure walking in or a deadline closing, 2-4 sentences)",
        "prompt": "string (the final pressure question, e.g. 'CMO has just walked in. Five minutes until her next meeting.')"
      }`
  }
  return base
}

function parseJsonResponse(text) {
  if (!text || typeof text !== 'string') return null
  const cleaned = text.replace(/[—–]/g, ', ')
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

// Per-block typed-field normalisers. Strict enough that the live UI can
// trust the shapes; permissive enough that an old cached scenario (or a
// model response that drops a field) does not crash the orchestrator.
function normaliseInboxEmails(arr) {
  if (!Array.isArray(arr)) return null
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const REL = ['external', 'senior', 'peer', 'junior', 'internal']
  return arr.slice(0, 10).map((e, i) => ({
    id: typeof e?.id === 'string' && e.id ? e.id : `email-${i + 1}`,
    from_name: safeStr(e?.from_name) || 'Sender',
    from_role: safeStr(e?.from_role),
    from_relationship: REL.includes(e?.from_relationship) ? e.from_relationship : 'internal',
    subject: safeStr(e?.subject) || '(no subject)',
    preview: safeStr(e?.preview).slice(0, 200),
    body: safeStr(e?.body),
    received_at: safeStr(e?.received_at),
  })).filter(e => e.subject !== '(no subject)' || e.body)
}
function normaliseTaskItems(arr) {
  if (!Array.isArray(arr)) return null
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const DLINE = ['today', 'tomorrow', 'this_week', 'no_deadline']
  return arr.slice(0, 12).map((t, i) => ({
    id: typeof t?.id === 'string' && t.id ? t.id : `task-${i + 1}`,
    title: safeStr(t?.title) || `Task ${i + 1}`,
    description: safeStr(t?.description),
    source: safeStr(t?.source),
    context: safeStr(t?.context),
    deadline: DLINE.includes(t?.deadline) ? t.deadline : 'no_deadline',
  }))
}
function normaliseFixedMeetings(arr) {
  if (!Array.isArray(arr)) return null
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
  return arr.slice(0, 8).map((m, i) => ({
    id: typeof m?.id === 'string' && m.id ? m.id : `meeting-${i + 1}`,
    start: HHMM.test(m?.start) ? m.start : '09:00',
    end: HHMM.test(m?.end) ? m.end : '09:30',
    title: safeStr(m?.title) || `Meeting ${i + 1}`,
    with: safeStr(m?.with),
    can_decline: m?.can_decline === true,
  }))
}
function normaliseTodos(arr) {
  if (!Array.isArray(arr)) return null
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const ALLOWED_MINUTES = [15, 30, 45, 60]
  return arr.slice(0, 10).map((t, i) => ({
    id: typeof t?.id === 'string' && t.id ? t.id : `todo-${i + 1}`,
    title: safeStr(t?.title) || `Todo ${i + 1}`,
    description: safeStr(t?.description),
    estimated_minutes: ALLOWED_MINUTES.includes(Number(t?.estimated_minutes)) ? Number(t.estimated_minutes) : 30,
  }))
}
function normaliseDecisions(arr) {
  if (!Array.isArray(arr)) return null
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const PRESSURE = ['minutes', 'hours', 'today', 'this_week']
  return arr.slice(0, 8).map((d, i) => ({
    id: typeof d?.id === 'string' && d.id ? d.id : `decision-${i + 1}`,
    title: safeStr(d?.title) || `Decision ${i + 1}`,
    context: safeStr(d?.context),
    constraint: safeStr(d?.constraint),
    affects: safeStr(d?.affects),
    deadline_pressure: PRESSURE.includes(d?.deadline_pressure) ? d.deadline_pressure : 'today',
    options: Array.isArray(d?.options) ? d.options.slice(0, 5).map((o, j) => ({
      id: typeof o?.id === 'string' && o.id ? o.id : `option-${j + 1}`,
      label: safeStr(o?.label) || `Option ${j + 1}`,
      implication: safeStr(o?.implication),
    })).filter(o => o.label) : [],
  })).filter(d => d.options.length >= 2)
}
function normaliseCounterparty(obj) {
  if (!obj || typeof obj !== 'object') return null
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const REL = ['external', 'senior', 'peer', 'junior', 'internal']
  return {
    name: safeStr(obj.name) || 'Counterpart',
    role: safeStr(obj.role),
    relationship: REL.includes(obj.relationship) ? obj.relationship : 'internal',
    stance: safeStr(obj.stance),
    ask: safeStr(obj.ask),
    personality: safeStr(obj.personality),
  }
}
function normaliseStakeholders(arr) {
  if (!Array.isArray(arr)) return null
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const POWER = ['low', 'medium', 'high']
  return arr.slice(0, 6).map((s, i) => ({
    id: typeof s?.id === 'string' && s.id ? s.id : `stakeholder-${i + 1}`,
    name: safeStr(s?.name) || `Stakeholder ${i + 1}`,
    role: safeStr(s?.role),
    wants: safeStr(s?.wants),
    why: safeStr(s?.why),
    power: POWER.includes(s?.power) ? s.power : 'medium',
  }))
}
function normaliseReadingDocument(entry) {
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const document_type = safeStr(entry?.document_type)
  const document_text = safeStr(entry?.document_text)
  if (!document_text || document_text.length < 200) return null
  const meta = entry?.document_metadata && typeof entry.document_metadata === 'object'
    ? entry.document_metadata : {}
  return {
    document_type: document_type || 'Document',
    document_text,
    document_metadata: {
      author: safeStr(meta.author),
      date: safeStr(meta.date),
      audience: safeStr(meta.audience),
    },
  }
}
function normaliseDocumentBrief(entry) {
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const safeArr = (v) => Array.isArray(v) ? v.map(safeStr).filter(Boolean).slice(0, 6) : []
  const ALLOWED_LIMITS = [150, 250, 400, 600]
  const document_type = safeStr(entry?.document_type)
  const audience = safeStr(entry?.audience)
  const context = safeStr(entry?.context)
  const must_include = safeArr(entry?.must_include)
  const no_gos = safeArr(entry?.no_gos)
  if (!document_type && !audience && !context && must_include.length === 0) return null
  const raw_limit = Number(entry?.word_limit)
  const word_limit = ALLOWED_LIMITS.includes(raw_limit)
    ? raw_limit
    : (raw_limit > 0 ? Math.min(800, Math.max(100, Math.round(raw_limit / 50) * 50)) : 250)
  return { document_type, audience, context, word_limit, must_include, no_gos }
}
function normaliseCrisisSimulation(entry) {
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const REL = ['external', 'senior', 'peer', 'junior', 'internal']
  const TRIGGERS = ['phone_call', 'urgent_message', 'breaking_news']
  const trigger_type = TRIGGERS.includes(entry?.trigger_type) ? entry.trigger_type : 'phone_call'
  const initial_alert = safeStr(entry?.initial_alert)
  const cs = entry?.caller_or_sender || {}
  const caller_or_sender = {
    name: safeStr(cs?.name),
    role: safeStr(cs?.role),
    relationship: REL.includes(cs?.relationship) ? cs.relationship : 'internal',
  }
  const normaliseStage = (s) => {
    if (!s || typeof s !== 'object') return null
    const new_information = safeStr(s.new_information)
    const prompt = safeStr(s.prompt)
    if (!new_information && !prompt) return null
    return { new_information, prompt }
  }
  const stage_1 = normaliseStage(entry?.stage_1)
  const stage_2 = normaliseStage(entry?.stage_2)
  const stage_3 = normaliseStage(entry?.stage_3)
  if (!initial_alert && !stage_1 && !stage_2 && !stage_3) return null
  return {
    trigger_type,
    initial_alert,
    caller_or_sender,
    stage_1,
    stage_2,
    stage_3,
  }
}

function normaliseSpreadsheetData(entry) {
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const table_title = safeStr(entry?.table_title)
  const units = safeStr(entry?.units)
  const columns = Array.isArray(entry?.columns)
    ? entry.columns.map(safeStr).filter(Boolean).slice(0, 10)
    : []
  if (columns.length < 3) return null
  const rawRows = Array.isArray(entry?.rows) ? entry.rows : []
  const rows = rawRows.slice(0, 30).map((r) => {
    if (!Array.isArray(r)) return null
    return r.slice(0, columns.length).map((cell, ci) => {
      if (cell === null || cell === undefined) return ci === 0 ? '—' : null
      if (typeof cell === 'number') return cell
      const s = safeStr(cell)
      if (!s) return ci === 0 ? '—' : null
      const asNumber = Number(s.replace(/,/g, ''))
      if (!Number.isNaN(asNumber) && /^-?\d+(\.\d+)?$/.test(s.replace(/,/g, ''))) return asNumber
      return s
    })
  }).filter(r => r && r.length === columns.length)
  if (rows.length < 5) return null
  const ANOMALY_TYPES = ['outlier', 'suspicious_variance', 'attribution_concentration', 'data_quality', 'missing_value', 'threshold_breach']
  const anomalies = Array.isArray(entry?.anomalies)
    ? entry.anomalies.slice(0, 5).map(a => ({
        row_index: Number.isInteger(a?.row_index) ? a.row_index : -1,
        col_index: Number.isInteger(a?.col_index) ? a.col_index : -1,
        type: ANOMALY_TYPES.includes(a?.type) ? a.type : 'outlier',
        hint: safeStr(a?.hint),
      })).filter(a => a.row_index >= 0 && a.row_index < rows.length && a.col_index >= 0 && a.col_index < columns.length)
    : []
  return {
    table_title: table_title || 'Data table',
    units,
    columns,
    rows,
    anomalies,
  }
}

function normaliseScenario(raw, selected) {
  if (!raw || typeof raw !== 'object') return null
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const safeArr = (v) => Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 8) : []
  const block_content = {}
  for (const s of selected) {
    const entry = raw.block_content?.[s.block_id] || {}
    const blockShape = {
      summary: safeStr(entry.summary),
      setup: safeStr(entry.setup),
      expected_output: safeStr(entry.expected_output),
      connects_from: safeStr(entry.connects_from) || null,
      connects_to: safeStr(entry.connects_to) || null,
      key_items: safeArr(entry.key_items),
    }
    if (s.block_id === 'inbox') {
      const emails = normaliseInboxEmails(entry.emails)
      if (emails && emails.length) blockShape.emails = emails
    } else if (s.block_id === 'task-prioritisation') {
      const tasks = normaliseTaskItems(entry.tasks)
      if (tasks && tasks.length) blockShape.tasks = tasks
    } else if (s.block_id === 'calendar-planning') {
      const meetings = normaliseFixedMeetings(entry.fixed_meetings)
      if (meetings && meetings.length) blockShape.fixed_meetings = meetings
      const todos = normaliseTodos(entry.todos)
      if (todos && todos.length) blockShape.todos = todos
    } else if (s.block_id === 'decision-queue') {
      const decisions = normaliseDecisions(entry.decisions)
      if (decisions && decisions.length) blockShape.decisions = decisions
    } else if (s.block_id === 'conversation-simulation') {
      const cp = normaliseCounterparty(entry.counterparty)
      if (cp && cp.name) blockShape.counterparty = cp
      const opening = safeStr(entry.opening_message)
      if (opening) blockShape.opening_message = opening
    } else if (s.block_id === 'stakeholder-conflict') {
      const stakeholders = normaliseStakeholders(entry.stakeholders)
      if (stakeholders && stakeholders.length) blockShape.stakeholders = stakeholders
      const central = safeStr(entry.central_decision)
      if (central) blockShape.central_decision = central
    } else if (s.block_id === 'reading-summarising') {
      const doc = normaliseReadingDocument(entry)
      if (doc) {
        blockShape.document_type = doc.document_type
        blockShape.document_text = doc.document_text
        blockShape.document_metadata = doc.document_metadata
      }
    } else if (s.block_id === 'document-writing') {
      const brief = normaliseDocumentBrief(entry)
      if (brief) {
        blockShape.document_type = brief.document_type
        blockShape.audience = brief.audience
        blockShape.context = brief.context
        blockShape.word_limit = brief.word_limit
        blockShape.must_include = brief.must_include
        blockShape.no_gos = brief.no_gos
      }
    } else if (s.block_id === 'spreadsheet-data') {
      const sheet = normaliseSpreadsheetData(entry)
      if (sheet) {
        blockShape.table_title = sheet.table_title
        blockShape.units = sheet.units
        blockShape.columns = sheet.columns
        blockShape.rows = sheet.rows
        blockShape.anomalies = sheet.anomalies
      }
    } else if (s.block_id === 'crisis-simulation') {
      const crisis = normaliseCrisisSimulation(entry)
      if (crisis) {
        blockShape.trigger_type = crisis.trigger_type
        blockShape.initial_alert = crisis.initial_alert
        blockShape.caller_or_sender = crisis.caller_or_sender
        if (crisis.stage_1) blockShape.stage_1 = crisis.stage_1
        if (crisis.stage_2) blockShape.stage_2 = crisis.stage_2
        if (crisis.stage_3) blockShape.stage_3 = crisis.stage_3
      }
    }
    block_content[s.block_id] = blockShape
  }
  return {
    title: safeStr(raw.title) || 'Monday morning scenario',
    spine: safeStr(raw.spine),
    trigger: safeStr(raw.trigger),
    scenario_arc: {
      stage_1_setup: safeStr(raw.scenario_arc?.stage_1_setup),
      stage_2_context: safeStr(raw.scenario_arc?.stage_2_context),
      stage_3_output: safeStr(raw.scenario_arc?.stage_3_output),
      stage_4_pressure: safeStr(raw.scenario_arc?.stage_4_pressure),
      stage_5_resolution: safeStr(raw.scenario_arc?.stage_5_resolution),
    },
    block_content,
  }
}

// Public: produce the full workspace_scenario JSONB. Caller persists it on
// assessments.workspace_scenario.
//
// Options:
//   roleTitle: the assessment's role_title string (used for canonical
//     lookup and scenario_id slug).
//   jobDescription: raw job description text (truncated and added to the
//     prompt for extra context).
//   blockOverride: optional array of block ids. When provided, the
//     canonical lookup is skipped and these blocks are used in the given
//     order. Used by the admin test harness to test edge cases.
export async function generateScenario(client, role_profile, { roleTitle, jobDescription, blockOverride } = {}) {
  if (!client || !role_profile) return null

  let selected
  let matchInfo
  if (Array.isArray(blockOverride) && blockOverride.length > 0) {
    const valid = blockOverride.filter(id => BLOCK_CATALOGUE[id])
    if (valid.length === 0) return null
    const durations = scaledDurations(valid, targetTotalSeconds(valid.length))
    selected = valid.map((id, i) => ({
      block_id: id,
      suggested_duration_seconds: durations[i],
      order: i + 1,
      canonical_id: null,
      match_type: 'override',
      level: null,
    }))
    matchInfo = {
      canonical_id: null,
      canonical_label: null,
      match_type: 'override',
      level: null,
    }
  } else {
    selected = selectBlocks(role_profile, roleTitle)
    if (selected.length === 0) return null
    const head = selected[0]
    const canonical = CANONICAL_ROLE_MAPPING.find(e => e.id === head.canonical_id)
    matchInfo = {
      canonical_id: head.canonical_id,
      canonical_label: canonical?.label || null,
      match_type: head.match_type,
      level: head.level,
    }
  }

  const prompt = buildScenarioPrompt({ role_profile, roleTitle, jobDescription, selected, matchInfo })

  let stream
  try {
    stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 7000,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    console.error('[scenario-generator] stream init failed', err)
    return null
  }

  let final
  try {
    final = await stream.finalMessage()
  } catch (err) {
    console.error('[scenario-generator] stream completion failed', err)
    return null
  }

  const text = final?.content?.[0]?.text || ''
  const raw = parseJsonResponse(text)
  const ai = normaliseScenario(raw, selected)
  if (!ai) {
    console.warn('[scenario-generator] no valid scenario JSON, raw:', text.slice(0, 500))
    return null
  }

  const selected_blocks = selected.map(s => ({
    block_id: s.block_id,
    order: s.order,
    duration_seconds: s.suggested_duration_seconds,
    content_ref: s.block_id,
  }))

  return {
    scenario_id: makeScenarioId(roleTitle),
    shell_family: 'office',
    title: ai.title,
    spine: ai.spine,
    trigger: ai.trigger,
    selected_blocks,
    block_content: ai.block_content,
    scenario_arc: ai.scenario_arc,
    match_info: matchInfo,
    generated_at: new Date().toISOString(),
  }
}

// ═════════════════════════════════════════════════════════════════════════
// Phase 2: Healthcare shell
// ═════════════════════════════════════════════════════════════════════════
//
// The Healthcare shell mirrors the Office shape: a canonical role mapping,
// a three-pass lookup (role_title -> function+seniority -> level fallback),
// a duration scaler, and a scenario generator that calls Claude Haiku once
// per assessment and returns the same workspace_scenario JSONB shape.
//
// Phase 2 ships all 10 healthcare blocks as stubs that share the office
// BlockPlaceholder. Per-block typed schemas (analogous to inbox.emails or
// decisions for the office shell) arrive with each real block component
// in subsequent prompts; until then the AI returns the base block shape
// (summary / setup / expected_output / connects_from / connects_to /
// key_items) and the stub renders that.
//
// Healthcare assessments only reach this generator when the call site
// has shell_family === 'healthcare' and (separately) the modular gate
// has healthcare_workspace_enabled === true on the assessment row.

export const HEALTHCARE_CANONICAL_ROLE_MAPPING = [
  // ── Level 1: Direct care delivery (4 blocks) ──────────────────────────
  {
    id: 'healthcare-assistant',
    label: 'Healthcare Assistant (HCA)',
    role_titles: ['hca', 'healthcare assistant', 'health care assistant', 'care assistant'],
    function: 'healthcare_care',
    seniority_bands: ['junior'],
    level: 1,
    blocks: ['patient-handover', 'buzzer-alert-queue', 'family-visitor-interaction', 'safeguarding-incident'],
  },
  {
    id: 'care-worker',
    label: 'Care Worker / Support Worker',
    role_titles: ['care worker', 'support worker', 'home carer', 'domiciliary carer'],
    function: 'healthcare_care',
    seniority_bands: ['junior'],
    level: 1,
    blocks: ['buzzer-alert-queue', 'care-plan-review', 'family-visitor-interaction', 'safeguarding-incident'],
  },
  {
    id: 'junior-nurse-trainee',
    label: 'Nursing Associate / Trainee Nurse / Newly Qualified Nurse',
    role_titles: ['nursing associate', 'trainee nurse', 'student nurse', 'newly qualified nurse'],
    function: 'healthcare_clinical',
    seniority_bands: ['junior'],
    level: 1,
    blocks: ['patient-handover', 'buzzer-alert-queue', 'medication-round', 'safeguarding-incident'],
  },

  // ── Level 2: Experienced delivery + judgement (4 blocks) ───────────────
  {
    id: 'registered-nurse',
    label: 'Registered Nurse (general / specialist)',
    role_titles: ['registered nurse', 'staff nurse', 'rgn', 'rmn', 'mental health nurse', 'paediatric nurse', 'district nurse', 'nurse practitioner', 'specialist nurse'],
    function: 'healthcare_clinical',
    seniority_bands: ['mid'],
    level: 2,
    blocks: ['patient-handover', 'buzzer-alert-queue', 'medication-round', 'clinical-decision-queue'],
  },
  {
    id: 'gp-salaried',
    label: 'GP (Salaried) / Mid-grade Doctor',
    role_titles: ['salaried gp', 'locum gp', 'gp registrar', 'gp', 'general practitioner', 'registrar', 'senior house officer', 'sho', 'junior doctor', 'foundation doctor'],
    function: 'healthcare_clinical',
    seniority_bands: ['mid'],
    level: 2,
    blocks: ['clinical-decision-queue', 'doctor-instruction-handling', 'patient-family-conversation', 'care-plan-review'],
  },
  {
    id: 'social-worker',
    label: 'Social Worker (children / adult / mental health)',
    role_titles: ['social worker', "children's social worker", 'adult social worker', 'mental health social worker', 'amhp'],
    function: 'social_work',
    seniority_bands: ['mid'],
    level: 2,
    blocks: ['care-plan-review', 'safeguarding-incident', 'family-visitor-interaction', 'clinical-decision-queue'],
  },
  {
    id: 'pharmacist-clinical',
    label: 'Pharmacist (clinical / community)',
    role_titles: ['pharmacist', 'clinical pharmacist', 'community pharmacist', 'hospital pharmacist'],
    function: 'healthcare_clinical',
    seniority_bands: ['mid'],
    level: 2,
    blocks: ['medication-round', 'clinical-decision-queue', 'doctor-instruction-handling', 'care-plan-review'],
  },
  {
    id: 'allied-health-therapist',
    label: 'Allied Health Therapist (physio, OT, SLT, dietitian, psychologist)',
    role_titles: ['physiotherapist', 'physio', 'occupational therapist', 'speech and language therapist', 'speech therapist', 'slt', 'dietitian', 'radiographer', 'clinical psychologist', 'psychiatrist', 'therapist', 'counsellor'],
    function: 'healthcare_clinical',
    seniority_bands: ['mid'],
    level: 2,
    blocks: ['care-plan-review', 'patient-family-conversation', 'clinical-decision-queue', 'family-visitor-interaction'],
  },
  {
    id: 'dental-vet-clinician',
    label: 'Dentist / Veterinary Surgeon / Veterinary Nurse',
    role_titles: ['dentist', 'dental surgeon', 'dental nurse', 'veterinary surgeon', 'veterinary nurse', 'vet'],
    function: 'healthcare_clinical',
    seniority_bands: ['mid'],
    level: 2,
    blocks: ['clinical-decision-queue', 'doctor-instruction-handling', 'patient-family-conversation', 'care-plan-review'],
  },
  {
    id: 'senior-hca',
    label: 'Senior HCA / Senior Care Worker / Care Coordinator',
    role_titles: ['senior hca', 'senior care worker', 'care coordinator', 'lead hca'],
    function: 'healthcare_care',
    seniority_bands: ['mid'],
    level: 2,
    blocks: ['patient-handover', 'buzzer-alert-queue', 'care-plan-review', 'safeguarding-incident'],
  },

  // ── Level 3: Clinical and team management (5 blocks) ───────────────────
  {
    id: 'ward-manager',
    label: 'Ward Manager / Senior Nurse',
    role_titles: ['ward manager', 'senior nurse', 'ward sister', 'charge nurse', 'sister'],
    function: 'healthcare_clinical',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['patient-handover', 'clinical-decision-queue', 'doctor-instruction-handling', 'family-visitor-interaction', 'clinical-crisis-simulation'],
  },
  {
    id: 'care-home-manager',
    label: 'Registered Care Home Manager / Care Manager',
    role_titles: ['care home manager', 'registered manager', 'care manager', 'domiciliary care manager', 'home manager'],
    function: 'healthcare_care',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['care-plan-review', 'safeguarding-incident', 'family-visitor-interaction', 'clinical-decision-queue', 'clinical-crisis-simulation'],
  },
  {
    id: 'gp-senior-partner',
    label: 'GP Senior Partner / Practice Lead',
    role_titles: ['gp senior partner', 'gp partner', 'gp lead', 'practice partner', 'senior partner'],
    function: 'healthcare_clinical',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['clinical-decision-queue', 'doctor-instruction-handling', 'patient-family-conversation', 'care-plan-review', 'clinical-crisis-simulation'],
  },
  {
    id: 'social-work-team-manager',
    label: 'Social Work Team Manager / Service Manager',
    role_titles: ['social work team manager', 'team manager', 'service manager', 'senior social worker'],
    function: 'social_work',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['care-plan-review', 'safeguarding-incident', 'family-visitor-interaction', 'clinical-decision-queue', 'clinical-crisis-simulation'],
  },
  {
    id: 'practice-manager',
    label: 'Practice Manager / Clinical Lead',
    role_titles: ['practice manager', 'clinical lead', 'care quality lead', 'clinical operations manager'],
    function: 'healthcare_clinical',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['clinical-decision-queue', 'doctor-instruction-handling', 'family-visitor-interaction', 'safeguarding-incident', 'clinical-crisis-simulation'],
  },

  // ── Level 4: Senior leadership (4 blocks) ──────────────────────────────
  {
    id: 'matron',
    label: 'Matron / Lead Nurse',
    role_titles: ['matron', 'lead nurse'],
    function: 'healthcare_clinical',
    seniority_bands: ['director'],
    level: 4,
    blocks: ['clinical-decision-queue', 'doctor-instruction-handling', 'family-visitor-interaction', 'clinical-crisis-simulation'],
  },
  {
    id: 'director-of-nursing',
    label: 'Director of Nursing / Director of Care',
    role_titles: ['director of nursing', 'director of care', 'head of nursing', 'head of service', 'chief nurse'],
    function: 'healthcare_clinical',
    seniority_bands: ['director', 'c_suite'],
    level: 4,
    blocks: ['clinical-decision-queue', 'doctor-instruction-handling', 'safeguarding-incident', 'clinical-crisis-simulation'],
  },
  {
    id: 'medical-director',
    label: 'Medical Director / Clinical Director',
    role_titles: ['medical director', 'clinical director', 'chief medical officer'],
    function: 'healthcare_clinical',
    seniority_bands: ['director', 'c_suite'],
    level: 4,
    blocks: ['clinical-decision-queue', 'doctor-instruction-handling', 'patient-family-conversation', 'clinical-crisis-simulation'],
  },
]

const HEALTHCARE_LEVEL_DEFAULTS = {
  1: 'healthcare-assistant',
  2: 'registered-nurse',
  3: 'ward-manager',
  4: 'matron',
}

export function findHealthcareCanonicalEntry(roleTitle, role_profile) {
  const title = (roleTitle || '').toLowerCase().trim()
  const seniority = role_profile?.seniority_band || null
  const fn = role_profile?.function || null

  const seniorityFits = (entry) =>
    !entry.seniority_bands?.length ||
    !seniority ||
    entry.seniority_bands.includes(seniority)

  if (title) {
    for (const entry of HEALTHCARE_CANONICAL_ROLE_MAPPING) {
      const titleHit = entry.role_titles.some(p => title.includes(p))
      if (titleHit && seniorityFits(entry)) {
        return { entry, match_type: 'role_title' }
      }
    }
  }

  if (fn) {
    for (const entry of HEALTHCARE_CANONICAL_ROLE_MAPPING) {
      if (!entry.function) continue
      if (entry.function !== fn) continue
      if (!seniorityFits(entry)) continue
      return { entry, match_type: 'function_seniority' }
    }
  }

  const level = levelFromSeniority(seniority)
  const defaultId = HEALTHCARE_LEVEL_DEFAULTS[level] || HEALTHCARE_LEVEL_DEFAULTS[2]
  const entry = HEALTHCARE_CANONICAL_ROLE_MAPPING.find(e => e.id === defaultId)
  return { entry, match_type: 'level_fallback' }
}

function healthcareScaledDurations(chosenIds, totalTargetSeconds) {
  const totalDefault = chosenIds.reduce(
    (s, id) => s + (HEALTHCARE_CATALOGUE[id]?.default_duration_seconds || 240),
    0
  )
  if (totalDefault === 0) return chosenIds.map(() => 180)
  const ratio = totalTargetSeconds / totalDefault
  return chosenIds.map(id => {
    const base = HEALTHCARE_CATALOGUE[id]?.default_duration_seconds || 240
    const scaled = base * ratio
    return Math.max(60, Math.round(scaled / 30) * 30)
  })
}

export function selectHealthcareBlocks(role_profile, roleTitle) {
  if (!role_profile) return []
  const { entry, match_type } = findHealthcareCanonicalEntry(roleTitle, role_profile)
  if (!entry) return []

  let blocks = entry.blocks.slice()
  if (role_profile.employment_type === 'temporary') {
    blocks = blocks.slice(0, 3)
  }

  const durations = healthcareScaledDurations(blocks, targetTotalSeconds(blocks.length))
  return blocks.map((id, i) => ({
    block_id: id,
    suggested_duration_seconds: durations[i],
    order: i + 1,
    canonical_id: entry.id,
    match_type,
    level: entry.level,
  }))
}

// Per-block content schema fields for healthcare. Phase 2 stub stage uses
// a single base shape across all 10 blocks. Each block ships the block's
// setup, expected output, and 3 to 5 named key items the stub renders.
// Typed arrays (analogous to office shell inbox.emails / decisions /
// stakeholders) arrive with each real component build in subsequent
// prompts.
function healthcareBlockSchemaFields(blockId) {
  const base =
`      "summary": "string (1 sentence describing this block's content for this candidate)",
      "setup": "string (what the candidate sees / receives in this block)",
      "expected_output": "string (what the candidate is expected to produce)",
      "connects_from": "string or null (reference to previous block output)",
      "connects_to": "string or null (what this hands off to the next block)",
      "key_items": [
        "string (3 to 5 specific named items: a bed and acuity, a buzzer call from a named resident, a chart row with a planted issue, a clinical decision title, a doctor's instruction, a visitor's stated concern, a care plan section to update, a safeguarding disclosure, a crisis stage prompt, a family conversation opener)"
      ]`
  if (blockId === 'patient-handover') {
    return base + `,
      "patients": [
        {
          "patient_id": "string (unique within block, e.g. patient-1)",
          "bed_or_room": "string (e.g. 'Bed 4', 'Room 12', 'Flat 3')",
          "patient_initials": "string (anonymised, e.g. 'Mr A.B.', 'Mrs K.D.', 'Resident D.S.')",
          "age_range": "string (e.g. '70-79', '50-59', '85+')",
          "primary_condition_placeholder": "string (broad placeholder language only: 'post-operative recovery', 'cardiac monitoring', 'end-of-life care', 'mental health observation', 'mobility decline', 'awaiting specialist review'. Never name a specific drug, dose, or disease in a way that constitutes clinical advice.)",
          "acuity": "string (one of: stable, monitoring, deteriorating)",
          "observations": "string (1-2 sentences from the previous shift's notes: 'NEWS2 score 3 overnight, settled by 06:00. Refused breakfast.')",
          "family_notes": "string or null (1 sentence on family contact / concern, or null if none)",
          "immediate_concerns": "string or null (1 sentence on what needs attention this shift, or null if nothing pressing)"
        }
      ]`
  }
  if (blockId === 'buzzer-alert-queue') {
    return base + `,
      "alerts": [
        {
          "alert_id": "string (unique within block, e.g. alert-1)",
          "bed_or_room": "string (e.g. 'Bed 4', 'Room 12', 'Reception')",
          "time_received": "string (HH:MM 24-hour, e.g. '14:02')",
          "reason": "string (short label, e.g. 'Call light pressed', 'Monitor alarm', 'Patient calling out', 'Family at reception')",
          "urgency_type": "string (one of: clinical_urgent, comfort, welfare, administrative)",
          "context_detail": "string (1-2 sentences naming what is actually happening, e.g. 'Patient reports increasing breathlessness, sat up in bed. Daughter at the bedside is concerned.')"
        }
      ]`
  }
  if (blockId === 'medication-round') {
    return base + `,
      "chart_title": "string (the round label, e.g. 'Bay 3 medication round, 18:00')",
      "units": "string (use the literal value 'placeholder doses only' so no real units appear; never include actual mg, mL, or unit values)",
      "columns": [
        "string (exactly 6 column headers in this order: 'Bed', 'Patient', 'Medication category', 'Prescribed time', 'Actual time given', 'Observation notes')"
      ],
      "rows": [
        ["string or null (one entry per column. 6 to 8 rows total. Bed values like 'Bed 4'. Patient values are anonymised initials like 'Mr A.B.'. Medication category values are placeholders only: 'analgesia', 'anticoagulant', 'diabetic medication', 'anti-infective', 'inhaler', 'laxative', 'cardiac medication', 'sedative', 'antiemetic'. NEVER include real drug names, dose strengths, or trade names. Prescribed time and Actual time given use HH:MM 24-hour. Observation notes is a short string or null. Use null only where the cell genuinely shows a missing entry — that may itself be a planted issue.)"]
      ],
      "planted_issues": [
        {
          "row_index": "number (0-based row index of the planted issue, must be a valid index into rows)",
          "issue_type": "string (one of: missed_dose, contraindication_concern, timing_issue, documentation_gap)",
          "hint": "string (one sentence describing the judgement signal that should trigger the candidate to spot the issue: 'Prescribed time recorded but no actual time given', 'Two medication categories listed for the same patient that are flagged as not to be combined', 'Actual time given is two hours after the prescribed window', 'Observation notes empty when the medication category requires monitoring'. NEVER includes the specific clinical answer or names a drug; describes the indicator only. Used for scoring, not shown to the candidate.)"
        }
      ]`
  }
  if (blockId === 'clinical-decision-queue') {
    return base + `,
      "decisions": [
        {
          "decision_id": "string (unique within block, e.g. decision-1)",
          "title": "string (5-12 words, the call the candidate must make, role-specific. Junior care: 'Escalate Resident A's confusion or document and observe'. Registered Nurse: 'Refer Bed 4 to on-call SHO or continue 30-minute observations'. GP: 'Same-day referral or routine pathway for the chest pain query'. Care Home Manager: 'Hospital admission for Resident D or manage in-house with GP support'.)",
          "clinical_context": "string (2-4 sentences naming the patient or resident, the relevant observations, the clinical or care concern, and the constraint. Use placeholder language for medications: 'the prescribed analgesia', 'the planned anti-infective', 'current medication regime'. NEVER name a specific drug or dose.)",
          "constraint": "string (1 sentence on the binding constraint or risk on this call: 'No on-call doctor available until 19:00', 'Family expecting an answer at 11:00', 'CQC notification window closes today', 'Pharmacy review needed before next round')",
          "who_affected": "string (1 sentence on who is affected: 'The patient and their daughter who is on her way in', 'Bed 4 and the rest of the bay if observations escalate', 'Resident D, the family, and the on-call GP', 'The candidate's caseload and the manager who needs the bundle by 17:00')",
          "urgency_indicator": "string (one of: immediate, within_shift, next_24_hours)",
          "options": [
            {
              "option_id": "string (unique within decision, e.g. option-1)",
              "label": "string (5-12 words, the option clearly stated)",
              "description": "string (1 sentence on what this option means in practice and what trade-off it carries)"
            }
          ]
        }
      ]`
  }
  if (blockId === 'doctor-instruction-handling') {
    return base + `,
      "instruction_type": "string (one of: phone_call, written_note, electronic_order)",
      "sender": {
        "name": "string (named individual: 'Dr Patel', 'Mr Yusuf', 'Sister Owens', 'Dr Hutchinson')",
        "role": "string (their role and grade: 'Registrar, medical take', 'Consultant haematologist', 'Senior Partner', 'Pharmacist on-call', 'Nurse in charge, day team')"
      },
      "instruction_summary": "string (1 sentence summarising what the candidate is being asked to do)",
      "full_instruction_text": "string (3 to 6 sentences in the sender's voice, the actual content of the call note, electronic order, or written instruction. References the patient by bed number or anonymised initials, names the action being requested, and any context the sender added. NEVER includes a specific drug name, dose, or trade name. Uses placeholder language: 'the prescribed analgesia', 'the planned anti-infective', 'continue current medication regime', 'review the noted contraindication concern in the chart'. May be intentionally ambiguous, may have a missing detail, or may carry a planted safety concern. The candidate's job is to read carefully and decide whether to clarify, query, document, or escalate.)",
      "ambiguity_or_concern_planted": {
        "type": "string (one of: ambiguous_dose_or_timing, missing_clinical_detail, scope_concern, safety_signal, no_concern)",
        "hint": "string (one sentence describing the indicator that should trigger the candidate to clarify or query, written for the scorer not the candidate. Examples: 'Sender names the action but not the timing window', 'Instruction asks for an action that is outside the receiver's scope without naming a senior to escalate to', 'Written instruction contradicts a flag already on the chart in the previous block'. Set type to 'no_concern' and hint to an empty string when the instruction is intentionally clean for a control case.)"
      },
      "deadline_pressure": "string (one of: minutes, hours, today, this_week)",
      "supporting_context": "string (1-2 sentences of context the candidate might need: 'This patient was discussed at the morning ward round', 'The sender is off-shift in 20 minutes', 'A pharmacy review is already booked for 16:00', or empty string if none)"`
  }
  if (blockId === 'family-visitor-interaction') {
    return base + `,
      "opener": "string (the counterpart's first message in the conversation, 2-4 sentences in their voice. Opens the dialogue with a specific request, complaint, or pushback. References the patient or resident by anonymised initials or bed/room. Lands like a real opening line a family member or visitor would use.)",
      "counterpart_persona": {
        "name": "string (a plausible UK first name + surname, e.g. 'Patricia Williams', 'Mark Jenkins', 'Sue Patel', 'Dean Walker')",
        "relationship_to_patient": "string (their actual relationship to the patient or resident: 'Daughter of Bed 7', 'Son of Resident A', 'Long-term partner', 'Friend and Lasting Power of Attorney', 'Mother of the child in Bay 2')",
        "primary_concern": "string (1 sentence on the top concern they bring into the conversation, in their voice)",
        "secondary_concerns": [
          "string (1 to 3 secondary worries that surface as the conversation continues)"
        ],
        "how_they_push_back": "string (1 sentence describing the move they make when reassured: 'Repeats the same question with new framing', 'Names a specific incident as evidence', 'Threatens to escalate to a manager or to CQC', 'Goes quiet and then returns with a sharper version of the question')",
        "what_makes_them_feel_heard": "string (1 sentence on what genuinely lands with this person: 'A specific commitment with a named person and time', 'Acknowledgement of the past failure before any reassurance', 'A clear next step they can describe back to their family', 'Eye contact and using their relative's name')"
      },
      "conversation_setting": "string (one of: 'at the nurses station', 'in the manager office', 'by the patient bedside', 'at reception', 'in the family room', 'on the phone')"`
  }
  if (blockId === 'care-plan-review') {
    return base + `,
      "document_type": "string (the care plan label, e.g. 'Hospital admission care plan', 'Residential care plan', 'Child protection plan', 'Adult social care support plan', 'Domiciliary care plan', 'Mental health care and treatment plan')",
      "document_text": "string (400 to 800 words of believable role-specific care plan prose. Anonymised patient or resident details, current diagnosis using placeholder language only, care priorities, ongoing risks, specific care instructions, family wishes, review history. NEVER name a real drug or dose. Use paragraph breaks. Reference the patient or resident by anonymised initials or bed/room. Reads like a real document this role would actually receive.)",
      "document_metadata": {
        "author": "string (named individual with role, e.g. 'S. Jenkins, RN', 'M. Patel, Care Coordinator', 'Dr Hutchinson, GP', 'L. Owens, Senior Social Worker')",
        "date": "string (the date this version of the plan was issued)",
        "last_reviewed": "string (when the plan was last reviewed, can be older than ideal)",
        "next_review_due": "string (when the next review is due — may already be overdue, that may itself be a planted issue)",
        "audience": "string (who the plan is for: 'Ward team and on-call', 'Care home staff and visiting GP', 'Multi-agency safeguarding team', 'Domiciliary care team')"
      },
      "planted_issues": [
        {
          "type": "string (one of: risk_not_documented, instruction_missing, family_wish_not_reflected, review_overdue, governance_gap, contraindication_not_flagged)",
          "hint": "string (one sentence describing the indicator the candidate should spot. NEVER reveals the specific clinical answer or a drug name; describes the signal only. Examples: 'Fall risk mentioned in body of plan but not in the formal risks section', 'Family wish about end-of-life preferences referenced once but no specific instruction', 'Last reviewed date is more than 12 weeks old when the plan should be reviewed every 8 weeks'. Used for scoring, not shown to the candidate.)"
        }
      ]`
  }
  if (blockId === 'safeguarding-incident') {
    return base + `,
      "scenario_summary": "string (1 to 2 sentence brief context summarising the concern — neutral, professional tone, no sensational language)",
      "full_scenario_text": "string (3 to 6 sentences of anonymised detail of what was reported or observed. References the person at risk by anonymised identifier ('Resident D', 'the child in Bay 2', 'Service user A'). Uses clinical and care language. NEVER includes graphic detail beyond what a professional would document. NEVER names a real person, place, or specific identifying detail.)",
      "who_reported": "string (one sentence naming the role and timing of who raised the concern: 'the night shift HCA reported during morning handover', 'a relative wrote to reception on Friday afternoon', 'a colleague disclosed in a one-to-one supervision yesterday')",
      "when_observed": "string (timeframe of the original observation)",
      "who_at_risk": "string (relationship and anonymised identifier of the person whose welfare may be at risk)",
      "current_location_context": "string (where they are now and any immediate context about supervision or contact)",
      "threshold_factors": [
        "string (3 to 5 specific factors the candidate should weigh when deciding whether the safeguarding threshold is met. Used for scoring only, not shown to the candidate during the scenario. Examples: 'Pattern of repeated unexplained injuries over a short window', 'Disclosure made directly by the person at risk', 'Capacity assessment not on file', 'Reporter has named a specific staff member or visitor', 'Risk of immediate harm if no action taken today'.)"
      ]`
  }
  if (blockId === 'clinical-crisis-simulation') {
    return base + `,
      "trigger_type": "string (one of: phone_call, urgent_message, buzzer_alert, walk_in)",
      "initial_alert": "string (the opening message that creates the crisis, in the caller or sender's voice, 2 to 4 sentences. Lands like a real phone call, urgent message, buzzer alert, or someone walking in. References the patient or resident by anonymised initials or bed/room.)",
      "caller_or_sender": {
        "name": "string (named individual, role-appropriate, not generic)",
        "role": "string (their role, e.g. 'HCA on the night shift', 'CQC inspector', 'Deputy manager', 'Family member of Resident D')",
        "relationship": "string (one of: external, senior, peer, junior, internal)"
      },
      "stage_1": {
        "new_information": "string (what just happened or what the caller has just told the candidate, 2 to 4 sentences with specifics)",
        "prompt": "string (the question the candidate must respond to in the moment, e.g. 'What do you say in the next 60 seconds?', 'Who do you call first and what do you tell them?')"
      },
      "stage_2": {
        "new_information": "string (what has escalated or shifted since stage 1, 2 to 4 sentences naming what changed and who is now involved)",
        "prompt": "string (the next question)"
      },
      "stage_3": {
        "new_information": "string (the third escalation: a senior figure walking in, a regulator, a journalist, a second incident, or a deadline closing, 2 to 4 sentences)",
        "prompt": "string (the final pressure question)"
      }`
  }
  if (blockId === 'patient-family-conversation') {
    return base + `,
      "opener": "string (the counterpart's first message in the conversation, 2 to 4 sentences in their voice. References the situation directly — a diagnosis, a discharge plan, a complaint, an end-of-life conversation. Lands like a real opening line and gives the candidate a clear emotional cue to respond to.)",
      "counterpart_type": "string (one of: patient, family_member)",
      "counterpart_persona": {
        "name": "string (plausible UK first name + surname, e.g. 'Robert Cole', 'Anjali Mehta', 'Jane Davies')",
        "relationship_to_situation": "string (concrete: 'Patient on Bed 4, post-op day 3', 'Mother of Resident A', 'Son and Lasting Power of Attorney for Resident D', 'Court-named parent in the Brown family case')",
        "emotional_state": "string (1 sentence on their current emotional state: 'anxious and unable to take in detail', 'angry and threatening legal action', 'grieving and overwhelmed', 'in denial and asking the same questions')",
        "primary_concern": "string (1 sentence on the top concern they bring into this conversation, in their voice)",
        "what_they_need_to_understand": "string (1 sentence on the clinical or care communication goal of this conversation: 'that the recovery plan has changed', 'that escalation to ICU is no longer in keeping with the agreed care plan', 'why the discharge is being delayed', 'that the safeguarding decision is final and what review options remain')",
        "how_they_react_to_truthful_information": "string (1 sentence on the pattern of their reaction: 'becomes quiet and withdrawn for a beat then returns with sharper questions', 'pushes back with detailed factual questions', 'cycles between acceptance and denial', 'shifts from anger to bargaining mid-conversation')"
      },
      "conversation_purpose": "string (one of: explain_prognosis, deliver_bad_news, discuss_treatment_options, set_expectations, respond_to_complaint, address_emotional_reaction, end_of_life_conversation, safeguarding_decision_conversation)",
      "conversation_setting": "string (one of: 'in the family room', 'by the patient bedside', 'in the manager office', 'in the consulting room', 'on the phone', 'in the social work office')"`
  }
  return base
}

// Per-block typed-field normalisers for the healthcare shell. Strict
// enough that the live UI can trust the shapes; permissive enough that
// an old cached scenario or a model response that drops a field does
// not crash the orchestrator. Mirrors the office shell normaliser
// pattern (normaliseInboxEmails, normaliseDecisions, etc.).
function normaliseHealthcarePatients(arr) {
  if (!Array.isArray(arr)) return null
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const ACUITY = ['stable', 'monitoring', 'deteriorating']
  return arr.slice(0, 10).map((p, i) => ({
    patient_id: typeof p?.patient_id === 'string' && p.patient_id ? p.patient_id : `patient-${i + 1}`,
    bed_or_room: safeStr(p?.bed_or_room) || `Bed ${i + 1}`,
    patient_initials: safeStr(p?.patient_initials),
    age_range: safeStr(p?.age_range),
    primary_condition_placeholder: safeStr(p?.primary_condition_placeholder),
    acuity: ACUITY.includes(p?.acuity) ? p.acuity : 'monitoring',
    observations: safeStr(p?.observations),
    family_notes: safeStr(p?.family_notes) || null,
    immediate_concerns: safeStr(p?.immediate_concerns) || null,
  })).filter(p => p.bed_or_room && (p.observations || p.primary_condition_placeholder))
}

function normaliseHealthcareAlerts(arr) {
  if (!Array.isArray(arr)) return null
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const URGENCY = ['clinical_urgent', 'comfort', 'welfare', 'administrative']
  const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
  return arr.slice(0, 8).map((a, i) => ({
    alert_id: typeof a?.alert_id === 'string' && a.alert_id ? a.alert_id : `alert-${i + 1}`,
    bed_or_room: safeStr(a?.bed_or_room) || `Bed ${i + 1}`,
    time_received: HHMM.test(a?.time_received) ? a.time_received : '14:00',
    reason: safeStr(a?.reason) || 'Call light pressed',
    urgency_type: URGENCY.includes(a?.urgency_type) ? a.urgency_type : 'comfort',
    context_detail: safeStr(a?.context_detail),
  })).filter(a => a.context_detail || a.reason)
}

function normaliseHealthcareDecisions(arr) {
  if (!Array.isArray(arr)) return null
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const URGENCY = ['immediate', 'within_shift', 'next_24_hours']
  return arr.slice(0, 8).map((d, i) => ({
    decision_id: typeof d?.decision_id === 'string' && d.decision_id ? d.decision_id : `decision-${i + 1}`,
    title: safeStr(d?.title) || `Clinical decision ${i + 1}`,
    clinical_context: safeStr(d?.clinical_context),
    constraint: safeStr(d?.constraint),
    who_affected: safeStr(d?.who_affected),
    urgency_indicator: URGENCY.includes(d?.urgency_indicator) ? d.urgency_indicator : 'within_shift',
    options: Array.isArray(d?.options) ? d.options.slice(0, 5).map((o, j) => ({
      option_id: typeof o?.option_id === 'string' && o.option_id ? o.option_id : `option-${j + 1}`,
      label: safeStr(o?.label) || `Option ${j + 1}`,
      description: safeStr(o?.description),
    })).filter(o => o.label) : [],
  })).filter(d => d.options.length >= 2)
}

function normaliseHealthcareInstruction(entry) {
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const TYPES = ['phone_call', 'written_note', 'electronic_order']
  const PRESSURE = ['minutes', 'hours', 'today', 'this_week']
  const CONCERN = ['ambiguous_dose_or_timing', 'missing_clinical_detail', 'scope_concern', 'safety_signal', 'no_concern']
  const instruction_type = TYPES.includes(entry?.instruction_type) ? entry.instruction_type : 'phone_call'
  const senderRaw = entry?.sender || {}
  const sender = {
    name: safeStr(senderRaw?.name),
    role: safeStr(senderRaw?.role),
  }
  const instruction_summary = safeStr(entry?.instruction_summary)
  const full_instruction_text = safeStr(entry?.full_instruction_text)
  if (!full_instruction_text || full_instruction_text.length < 40) return null
  const concernRaw = entry?.ambiguity_or_concern_planted || {}
  const concern = {
    type: CONCERN.includes(concernRaw?.type) ? concernRaw.type : 'no_concern',
    hint: safeStr(concernRaw?.hint),
  }
  return {
    instruction_type,
    sender,
    instruction_summary,
    full_instruction_text,
    ambiguity_or_concern_planted: concern,
    deadline_pressure: PRESSURE.includes(entry?.deadline_pressure) ? entry.deadline_pressure : 'today',
    supporting_context: safeStr(entry?.supporting_context),
  }
}

function normaliseHealthcareFamilyInteraction(entry) {
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const safeArr = (v) => Array.isArray(v) ? v.map(safeStr).filter(Boolean).slice(0, 4) : []
  const opener = safeStr(entry?.opener)
  const personaRaw = entry?.counterpart_persona || {}
  const persona = {
    name: safeStr(personaRaw?.name) || 'Family member',
    relationship_to_patient: safeStr(personaRaw?.relationship_to_patient),
    primary_concern: safeStr(personaRaw?.primary_concern),
    secondary_concerns: safeArr(personaRaw?.secondary_concerns),
    how_they_push_back: safeStr(personaRaw?.how_they_push_back),
    what_makes_them_feel_heard: safeStr(personaRaw?.what_makes_them_feel_heard),
  }
  const conversation_setting = safeStr(entry?.conversation_setting)
  if (!opener && !persona.primary_concern) return null
  return {
    opener,
    counterpart_persona: persona,
    conversation_setting,
  }
}

function normaliseHealthcareCarePlan(entry) {
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const PLAN_ISSUE_TYPES = ['risk_not_documented', 'instruction_missing', 'family_wish_not_reflected', 'review_overdue', 'governance_gap', 'contraindication_not_flagged']
  const document_type = safeStr(entry?.document_type)
  const document_text = safeStr(entry?.document_text)
  if (!document_text || document_text.length < 200) return null
  const meta = entry?.document_metadata && typeof entry.document_metadata === 'object'
    ? entry.document_metadata : {}
  const planted_issues = Array.isArray(entry?.planted_issues)
    ? entry.planted_issues.slice(0, 4).map(p => ({
        type: PLAN_ISSUE_TYPES.includes(p?.type) ? p.type : 'governance_gap',
        hint: safeStr(p?.hint),
      })).filter(p => p.hint)
    : []
  return {
    document_type: document_type || 'Care plan',
    document_text,
    document_metadata: {
      author: safeStr(meta.author),
      date: safeStr(meta.date),
      last_reviewed: safeStr(meta.last_reviewed),
      next_review_due: safeStr(meta.next_review_due),
      audience: safeStr(meta.audience),
    },
    planted_issues,
  }
}

function normaliseHealthcareSafeguarding(entry) {
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const safeArr = (v) => Array.isArray(v) ? v.map(safeStr).filter(Boolean).slice(0, 6) : []
  const scenario_summary = safeStr(entry?.scenario_summary)
  const full_scenario_text = safeStr(entry?.full_scenario_text)
  if (!full_scenario_text || full_scenario_text.length < 80) return null
  return {
    scenario_summary,
    full_scenario_text,
    who_reported: safeStr(entry?.who_reported),
    when_observed: safeStr(entry?.when_observed),
    who_at_risk: safeStr(entry?.who_at_risk),
    current_location_context: safeStr(entry?.current_location_context),
    threshold_factors: safeArr(entry?.threshold_factors),
  }
}

function normaliseHealthcareCrisis(entry) {
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const TRIGGERS = ['phone_call', 'urgent_message', 'buzzer_alert', 'walk_in']
  const REL = ['external', 'senior', 'peer', 'junior', 'internal']
  const trigger_type = TRIGGERS.includes(entry?.trigger_type) ? entry.trigger_type : 'phone_call'
  const initial_alert = safeStr(entry?.initial_alert)
  const cs = entry?.caller_or_sender || {}
  const caller_or_sender = {
    name: safeStr(cs?.name),
    role: safeStr(cs?.role),
    relationship: REL.includes(cs?.relationship) ? cs.relationship : 'internal',
  }
  const normaliseStage = (s) => {
    if (!s || typeof s !== 'object') return null
    const new_information = safeStr(s.new_information)
    const prompt = safeStr(s.prompt)
    if (!new_information && !prompt) return null
    return { new_information, prompt }
  }
  const stage_1 = normaliseStage(entry?.stage_1)
  const stage_2 = normaliseStage(entry?.stage_2)
  const stage_3 = normaliseStage(entry?.stage_3)
  if (!initial_alert && !stage_1 && !stage_2 && !stage_3) return null
  return {
    trigger_type,
    initial_alert,
    caller_or_sender,
    stage_1,
    stage_2,
    stage_3,
  }
}

function normaliseHealthcarePatientFamilyConversation(entry) {
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const TYPES = ['patient', 'family_member']
  const PURPOSES = [
    'explain_prognosis', 'deliver_bad_news', 'discuss_treatment_options', 'set_expectations',
    'respond_to_complaint', 'address_emotional_reaction', 'end_of_life_conversation',
    'safeguarding_decision_conversation',
  ]
  const opener = safeStr(entry?.opener)
  const counterpart_type = TYPES.includes(entry?.counterpart_type) ? entry.counterpart_type : 'family_member'
  const personaRaw = entry?.counterpart_persona || {}
  const persona = {
    name: safeStr(personaRaw?.name) || (counterpart_type === 'patient' ? 'Patient' : 'Family member'),
    relationship_to_situation: safeStr(personaRaw?.relationship_to_situation),
    emotional_state: safeStr(personaRaw?.emotional_state),
    primary_concern: safeStr(personaRaw?.primary_concern),
    what_they_need_to_understand: safeStr(personaRaw?.what_they_need_to_understand),
    how_they_react_to_truthful_information: safeStr(personaRaw?.how_they_react_to_truthful_information),
  }
  const conversation_purpose = PURPOSES.includes(entry?.conversation_purpose)
    ? entry.conversation_purpose
    : 'address_emotional_reaction'
  const conversation_setting = safeStr(entry?.conversation_setting)
  if (!opener && !persona.primary_concern) return null
  return {
    opener,
    counterpart_type,
    counterpart_persona: persona,
    conversation_purpose,
    conversation_setting,
  }
}

function normaliseHealthcareMedicationChart(entry) {
  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const ISSUE_TYPES = ['missed_dose', 'contraindication_concern', 'timing_issue', 'documentation_gap']
  const chart_title = safeStr(entry?.chart_title)
  const units = safeStr(entry?.units) || 'placeholder doses only'
  const columns = Array.isArray(entry?.columns)
    ? entry.columns.map(safeStr).filter(Boolean).slice(0, 8)
    : []
  if (columns.length < 4) return null
  const rawRows = Array.isArray(entry?.rows) ? entry.rows : []
  const rows = rawRows.slice(0, 12).map((r) => {
    if (!Array.isArray(r)) return null
    return r.slice(0, columns.length).map((cell) => {
      if (cell === null || cell === undefined) return null
      if (typeof cell === 'number') return String(cell)
      const s = safeStr(cell)
      return s || null
    })
  }).filter(r => r && r.length === columns.length)
  if (rows.length < 3) return null
  const planted_issues = Array.isArray(entry?.planted_issues)
    ? entry.planted_issues.slice(0, 4).map(p => ({
        row_index: Number.isInteger(p?.row_index) ? p.row_index : -1,
        issue_type: ISSUE_TYPES.includes(p?.issue_type) ? p.issue_type : 'documentation_gap',
        hint: safeStr(p?.hint),
      })).filter(p => p.row_index >= 0 && p.row_index < rows.length && p.hint)
    : []
  return {
    chart_title: chart_title || 'Medication round',
    units,
    columns,
    rows,
    planted_issues,
  }
}

function buildHealthcareBlockBriefList(selected) {
  return selected.map(s => {
    const b = HEALTHCARE_CATALOGUE[s.block_id]
    if (!b) return `  ${s.order}. ${s.block_id} (${Math.round(s.suggested_duration_seconds / 60)} min)`
    const mins = Math.round(s.suggested_duration_seconds / 60)
    return `  ${s.order}. ${b.name} (id "${b.id}", ${mins} min, category: ${b.category})`
  }).join('\n')
}

function buildHealthcareScenarioPrompt({ role_profile, roleTitle, jobDescription, selected, matchInfo }) {
  const blockList = buildHealthcareBlockBriefList(selected)
  const blockCount = selected.length
  const isTemporary = role_profile.employment_type === 'temporary'
  const sectorContext = role_profile.sector_context || 'unspecified clinical or care setting'
  const seniority = role_profile.seniority_band || 'unspecified seniority'
  const employment = role_profile.employment_type || 'permanent'
  const displayTitle = roleTitle || role_profile.function

  return `You are generating a Workspace simulation for the role: ${displayTitle} at ${seniority} level in ${sectorContext}, ${employment}.

Your job is NOT to generate generic "healthcare" tasks. Your job is to REPLICATE THIS ROLE in this specific clinical or care setting.

Step 1: Identify what someone in this exact role actually does for a living. What is the WORK? Not "healthcare tasks" but the substantive work this role performs day-to-day. For a Registered Nurse on a medical ward: shift handover, patient observations, medication rounds, escalation to doctors, family conversations. For a Care Home Manager: care plan reviews, safeguarding, family liaison, staff supervision, CQC readiness. For a Salaried GP: clinical consultations, prescribing, care plan reviews, referrals, family conversations.

Step 2: Pick a believable shift / day scenario that involves this role doing real role-specific work. Not "doing rounds" but "covering a 12-hour late shift on a 24-bed medical ward with two complex discharges due tomorrow and a deteriorating patient in bed 4". Not "managing the home" but "the day before a CQC inspection visit, with three staff calling in sick, one resident on end-of-life care, and a written complaint received from a relative on Friday".

Step 3: Map that work into the ${blockCount} selected blocks. Each block hosts a piece of the role-specific work. The blocks are the tools the candidate uses; the work is the role being performed.

Step 4: Generate the content for each block such that:
- The CONTENT inside each block reflects actual role-specific work
- A real practitioner of this role would recognise the work
- A complete novice would feel out of their depth
- The work flows from block to block as one coherent shift / day
- The candidate's outputs in earlier blocks become inputs to later blocks

Compliance test: the simulation must test JUDGEMENT and DECISION-MAKING, not clinical accuracy. Do NOT include named drugs, specific doses, or any content that would constitute medical instruction. Use placeholder language ("the planned medication round", "the prescribed analgesia", "the new prescription", "the planned anti-infective"). The simulation is a behavioural assessment, not a clinical exam.

Examples of role replication done well:

Registered Nurse (medical ward, mid-level, permanent):
- Spine: "Sunday late shift on a 24-bed medical ward. The day team has just handed over six patients you are responsible for. Bed 4 has been deteriorating across the day. Bed 7's family are anxious about a planned discharge tomorrow. Bed 11 missed last night's evening medication round. Doctor's round is at 19:00."
- Patient handover block: six named patients with bed numbers, acuity, current observations, family concerns, planned care for the shift.
- Buzzer / alert queue block: four concurrent buzzer calls in the first hour. Bed 4 reporting nausea. Bed 7's relative wanting an update at the nurses' station. Bed 11 in pain. Bed 9 needing the toilet.
- Medication round block: a chart for six patients with planted issues that test judgement (a missed dose to be addressed, a contraindication concern flagged in the notes that needs escalating).
- Clinical decision queue block: four decisions (escalate Bed 4 to the on-call SHO or continue observing, reschedule Bed 11's missed dose with the prescriber's input or wait until morning, refer Bed 7's family to the discharge nurse, sign off Bed 9's restraint review or defer to ward manager).

This is Registered Nurse work. Not generic healthcare work.

Care Home Manager (40-bed residential home, manager level, permanent):
- Spine: "Monday morning. CQC inspectors are visiting on Friday. Resident A had an unwitnessed fall overnight. Family arriving at 11. Three staff have called in sick this morning. A relative raised a written concern on Friday that you have not yet responded to."
- Care plan review block: Resident A's fall risk care plan, last reviewed eight weeks ago.
- Safeguarding incident block: the relative's written concern, what to document, who to escalate to, immediate action.
- Family visitor interaction block: the live conversation with Resident A's family arriving at 11.
- Clinical decision queue block: three operational and care decisions (cover for the three sickness shortfalls, decide whether Resident A needs a GP review today, decide whether to call the relative who raised the concern before she arrives or after).
- Clinical crisis simulation block: another resident on end-of-life care showing an acute change in condition during the family visit.

This is Care Home Manager work. Not generic management work.

Children's Social Worker (local authority, senior, permanent):
- Spine: "Tuesday morning. A court hearing about the Brown family is tomorrow at 10:00 and the bundle still needs your final case summary. Three open cases on your list need home visits this week. Your team manager wants a caseload review by 17:00. The police duty desk has just left a voicemail about a possible safeguarding concern on one of your cases."
- Care plan review block: the Brown family case file before tomorrow's hearing.
- Safeguarding incident block: the police voicemail and the immediate decision (who to inform, what to do today, what to document).
- Family visitor interaction block: a distressed parent calling unexpectedly during the morning.
- Clinical decision queue block: four caseload decisions (which case to prioritise this week, when to escalate one to the team manager, whether to apply for a review of an existing supervision order, when to transfer one case to a colleague).

This is Social Worker work. Not generic case-management work.

When you generate a scenario, you must be able to defend each block's content as "this is what a ${displayTitle} would actually do in this setting, not generic healthcare work".

────────────────────────────────────────────────────
Role context for this generation:

Role title: ${displayTitle}
Function: ${role_profile.function}
Seniority: ${seniority}
IC or manager: ${role_profile.ic_or_manager}
Interaction style: ${role_profile.interaction_internal_external}
Sector context: ${sectorContext}
Company size: ${role_profile.company_size || 'unspecified'}
Employment type: ${employment}
Primary work types: ${(role_profile.primary_work_types || []).join(', ')}
Canonical role pattern: ${matchInfo?.canonical_id || 'unknown'} (matched via ${matchInfo?.match_type || 'unknown'})
${jobDescription ? `Job description excerpt:\n${String(jobDescription).slice(0, 800)}\n` : ''}
Selected blocks in order (these are fixed, do not change them):
${blockList}

Output requirements:
- Return JSON only. UK English. No emoji. No em dashes.
- The spine and trigger must be specific to this role and setting. Use bed numbers, named residents, named patients with first-name placeholders only (e.g. "Resident A", "Bed 7", "Mrs Khan"), specific shift times, named family members or visitors.
- The trigger event appears in the FIRST block's content.
- Each block's content references what the candidate has just done in the previous block (use connects_from). Each block's content sets up what the candidate will do next (use connects_to).
- The scenario_arc maps to the five narrative stages and describes what the candidate experiences across the blocks.
- Every key_items entry must be a specific, named item: a bed number with acuity, a named resident with a concern, a chart row with a planted issue, a decision title, a visitor's stated concern. No generic phrasing.
- Do NOT include drug names, doses, or specific clinical regimes. Use placeholder language ("the planned medication round", "the prescribed analgesia", "the new prescription").

Per-block content rules for the typed fields:
- For patient-handover blocks: produce ${seniority === 'junior' ? '4 to 5' : seniority === 'mid' ? '6 to 7' : '7 to 8'} patients. Each patient has a bed_or_room, anonymised patient_initials (e.g. 'Mr A.B.', 'Mrs K.D.'), an age_range, a primary_condition_placeholder using broad placeholder language only ('post-operative recovery', 'cardiac monitoring', 'end-of-life care', 'mental health observation', 'mobility decline', 'awaiting specialist review'), an acuity that is one of stable / monitoring / deteriorating, a 1-2 sentence observations note from the previous shift, a family_notes line if relevant (or null), and an immediate_concerns line if relevant (or null). At least one patient should be 'deteriorating' on a Registered Nurse or Senior Nurse handover, and at least one should have a family concern. NEVER name a specific drug, dose, or disease.
- For buzzer-alert-queue blocks: produce ${seniority === 'junior' ? '4' : '5 to 6'} alerts arriving in the same 5 to 10 minute window. Mix urgency_type values across clinical_urgent, comfort, welfare, administrative. A Registered Nurse list should include at least one clinical_urgent alert. An HCA list should lean toward comfort and welfare with one alert that needs to be escalated. Use realistic time_received values in HH:MM and short reason labels ('Call light pressed', 'Monitor alarm', 'Patient calling out', 'Family at reception'). The context_detail is one to two sentences naming what is actually happening so the candidate can judge urgency.
- For medication-round blocks: produce 6 to 8 rows in the chart. The columns array must be exactly ['Bed', 'Patient', 'Medication category', 'Prescribed time', 'Actual time given', 'Observation notes']. The Medication category values must be placeholder labels only ('analgesia', 'anticoagulant', 'diabetic medication', 'anti-infective', 'inhaler', 'laxative', 'cardiac medication', 'sedative', 'antiemetic'). NEVER use real drug names, dose strengths, or trade names. Plant 1 to 2 deliberate issues. The planted_issues array names the row_index, the issue_type (one of missed_dose / contraindication_concern / timing_issue / documentation_gap), and a hint that describes the indicator the candidate should spot. The hint never reveals the specific clinical answer; it only describes the signal. Set units to the literal string 'placeholder doses only'.
- For clinical-decision-queue blocks: produce ${seniority === 'junior' ? '3' : seniority === 'mid' ? '4' : '4 to 5'} decisions. Each decision has a role-specific title, 2 to 4 options with label + description, a constraint sentence, a who_affected sentence, and an urgency_indicator (immediate / within_shift / next_24_hours). At least one decision should be immediate when the role is Registered Nurse, Ward Manager, Senior Nurse, Care Home Manager, or Matron. Decision content varies by role: junior care decisions sit around escalation thresholds (escalate to senior or manage in-house, what to document, when to call duty nurse). Registered Nurse decisions sit around escalation to doctor / change in care plan / refer to specialist / request review. GP decisions sit around investigate further or refer / prescribe or review / admit or discharge / urgent or routine pathway. Senior Nurse and Ward Manager decisions sit around staffing during incident / when to escalate to consultant / family communication call / governance documentation. Care Home Manager decisions sit around hospital admission or manage in-house / family communication / CQC notification thresholds / staff allocation / restraint or de-escalation. Director-level decisions sit around governance escalations / board notifications / CQC engagement / organisational response. Use placeholder language for any medication reference; never name a drug or dose.
- For doctor-instruction-handling blocks: produce a single inbound instruction. Pick instruction_type that fits (a Registrar's verbal order is phone_call; a Consultant's note is written_note; a Pharmacist's prescribing query is electronic_order). The sender object names a plausible doctor or senior with their role and grade. instruction_summary is one sentence. full_instruction_text is 3 to 6 sentences in the sender's voice and references the patient by bed number or anonymised initials. NEVER includes a specific drug name, dose, or trade name. Uses placeholder language ('the prescribed analgesia', 'the planned anti-infective', 'continue current medication regime'). The instruction may be intentionally ambiguous, missing a detail, or carry a planted safety concern. Populate ambiguity_or_concern_planted: pick the type from ambiguous_dose_or_timing / missing_clinical_detail / scope_concern / safety_signal, and write a hint describing the indicator the candidate should spot. The hint is for scoring only and is not surfaced to the candidate. Set type to 'no_concern' and hint to '' for a clean control instruction.
- For family-visitor-interaction blocks: produce a counterpart_persona for a family member or visitor named with a plausible UK first name and surname. The relationship_to_patient is concrete ("Daughter of Bed 7", "Son of Resident A", "Long-term partner of Mr T.E."). primary_concern, secondary_concerns, how_they_push_back, and what_makes_them_feel_heard are all one to two sentences each in their voice or in the third-person describing their pattern. The opener is the counterpart's actual first message in the conversation: 2 to 4 sentences, references the patient by anonymised initials or bed number, lands like a real opening line. The conversation_setting names where the conversation is happening. Counterpart pattern varies by role: HCA / Care Worker counterpart is an anxious family member asking about wellbeing or a complaint about meal quality. Registered Nurse counterpart is a family pressing for a progress update or requesting a meeting with the consultant. GP counterpart is a family seeking a diagnosis confirmation or pressing for a prescription change. Care Home Manager counterpart is a relative threatening a formal complaint to CQC or considering moving their relative elsewhere. Ward Manager counterpart is a family complaint after an incident or a journalist enquiry from a relative. Social Worker counterpart is a distressed parent or hostile family member. The persona should make the conversation hard but resolvable.
- For care-plan-review blocks: produce a document_text of 400 to 800 words of believable role-specific care plan prose. Anonymised patient or resident details, current diagnosis using placeholder language only, care priorities, ongoing risks, specific care instructions, family wishes, and review history. NEVER includes a real drug name or dose. Reference the patient or resident by anonymised initials or bed/room. document_metadata.author names a plausible individual with role. last_reviewed and next_review_due may be deliberately misaligned (review overdue is itself a planted issue if you choose). planted_issues lists 1 to 2 deliberate gaps for the candidate to spot. Each entry has a type (one of risk_not_documented, instruction_missing, family_wish_not_reflected, review_overdue, governance_gap, contraindication_not_flagged) and a hint that names the indicator only, never the clinical answer. Care plan flavour varies by role: HCA / Care Worker sees a residential care plan with comfort, dignity, mobility risk, family wishes. Registered Nurse sees a hospital admission care plan with clinical observations, discharge planning, safeguarding flags. Senior Nurse / Ward Manager sees a care plan with governance flags and complex multidisciplinary input. Care Home Manager sees a regulatory-compliant care plan with CQC-relevant entries. Social Worker sees a child protection plan or adult social work case plan with risk assessment, court orders, family contact arrangements.
- For safeguarding-incident blocks: scenarios are anonymised and fictional. NEVER reference a real case, person, place, or identifying detail. Use clinical and care language without sensational tone. scenario_summary is one to two sentences. full_scenario_text is three to six sentences in professional documentation voice describing what was reported or observed, referencing the person at risk by anonymised identifier. who_reported names the role and timing. when_observed gives a timeframe. who_at_risk is the anonymised identifier and relationship. current_location_context names where the person is now. threshold_factors lists 3 to 5 specific weighing factors for scoring use only (not surfaced to the candidate). The block tests the candidate's ability to recognise a safeguarding threshold, name immediate informants, identify immediate action, document, and decide whether external authorities (police, CQC, local authority, Ofsted, Care Inspectorate) need notifying. Scenario flavour varies by role: HCA / Care Worker sees a resident with a new bruise of unclear origin, an overheard visitor conversation, or a behaviour change after a specific person visits. Registered Nurse sees a patient disclosure of abuse, a controlling family pattern, or a patient injury inconsistent with the explanation. Care Home Manager sees a staff behaviour concern, a financial irregularity affecting a resident, or a restraint pattern. Social Worker sees a child showing signs of neglect, an adult capacity concern, or a vulnerable adult with mental capacity question. Ward Manager sees a pattern of incidents suggesting systemic issue, a staff disclosure about a colleague, or a family complaint suggesting safeguarding.
- For clinical-crisis-simulation blocks: pick a crisis this exact role would actually be on the receiving end of. HCA / Care Worker: resident fall during shift, choking incident at mealtime, resident found distressed and disoriented. Registered Nurse: deteriorating patient (sepsis pattern, post-op complication), medication error discovered (use placeholder language only), mental health emergency on ward. Senior Nurse / Ward Manager: ward incident with multiple patients affected, staff shortage during emergency, complaint going to CQC during shift. Care Home Manager: resident fall with serious injury, CQC inspector arrives unannounced, family threatening media exposure, fire alarm during night. GP: patient collapse in surgery, prescription error discovered after dispensing (placeholder language only), vulnerable patient missing from appointment. Director of Nursing / Medical Director: serious incident requiring board notification, regulatory breach discovered, media enquiry about patient safety. trigger_type is one of phone_call / urgent_message / buzzer_alert / walk_in. initial_alert opens in the caller or sender's voice. Each of stage_1, stage_2, stage_3 has a new_information sentence (2 to 4 sentences) and a prompt the candidate must respond to. Stages must escalate: stage_2 introduces a new constraint or a more senior person stepping in, stage_3 closes the pressure with a regulator, board member, journalist, or a deadline.
- For patient-family-conversation blocks: produce a counterpart_persona for either the patient or a family member, named with a plausible UK first name and surname. counterpart_type is 'patient' or 'family_member'. relationship_to_situation is concrete ('Patient on Bed 4, post-op day 3', 'Mother of Resident A', 'Court-named parent in the Brown family case'). emotional_state is one sentence describing their state right now ('anxious and unable to take in detail', 'angry and threatening legal action', 'grieving and overwhelmed'). what_they_need_to_understand names the clinical or care communication goal — this is what the candidate is trying to land. how_they_react_to_truthful_information names the pattern of their reaction. The opener is their first message: 2 to 4 sentences, references the situation directly, gives the candidate a clear emotional cue. conversation_purpose is one of explain_prognosis / deliver_bad_news / discuss_treatment_options / set_expectations / respond_to_complaint / address_emotional_reaction / end_of_life_conversation / safeguarding_decision_conversation. Conversation flavour varies by role: Registered Nurse is a family asking why their relative is not recovering, a patient asking if they are going to die, or a family pushing for transfer. GP is explaining a diagnosis to a patient who has not accepted it, an end-of-life choice conversation, or a frustrated patient about waiting times. Senior Nurse / Ward Manager is a family reaction after a clinical incident, a family considering legal action, or a family requesting a consultant change. Care Home Manager is a family of a resident in final stages, a capacity-concern conversation, or a family wanting to remove a resident from care. Social Worker is a parent reacting to a safeguarding decision, an adult facing court proceedings, or a family member unwilling to engage with a care plan. Director of Nursing / Medical Director is a family meeting after a serious incident or a formal complaint resolution. The persona must be hard but resolvable; tone is grave and professional throughout.
${isTemporary ? '- Because employment type is temporary, keep the scenario tight (3 blocks total). Focus on the foundational work modes; do not introduce a crisis as the closing block.' : ''}

Output schema:
{
  "title": "string (4-8 words, role-specific and setting-specific, e.g. 'Sunday late shift, medical ward')",
  "spine": "string (1-2 sentences describing the shift / day for this person)",
  "trigger": "string (the early-shift event that kicks the scenario off)",
  "scenario_arc": {
    "stage_1_setup": "string (what the candidate sees first, e.g. handover, board state)",
    "stage_2_context": "string (what they learn from the early review / observation blocks)",
    "stage_3_output": "string (what they produce mid-scenario, e.g. updated care plan, family update)",
    "stage_4_pressure": "string (what changes or escalates partway through)",
    "stage_5_resolution": "string (the final escalation, crisis, or hand-off)"
  },
  "block_content": {
${selected.map(s => `    "${s.block_id}": {
${healthcareBlockSchemaFields(s.block_id)}
    }`).join(',\n')}
  }
}

The "key_items" arrays should each contain 3 to 5 strings. Specific and named. Examples by block type:
- patient-handover: "Bed 4: 78 yo, post-op day 3, NEWS2 5, family asking about discharge", "Bed 7: 54 yo, awaiting psychiatric review, refused breakfast"
- buzzer-alert-queue: "Bed 11 buzzer at 14:02, reporting pain", "Bed 9 buzzer at 14:04, needs toileting", "Bed 4's relative at the nurses' station asking for an update"
- medication-round: "Bed 11 missed evening dose flagged in handover, scheduled for 18:00 review", "Bed 4 chart shows possible interaction concern flagged by pharmacy yesterday"
- clinical-decision-queue: "Escalate Bed 4 to on-call medical SHO or continue obs", "Sign off Bed 9 restraint review or defer to ward manager"
- doctor-instruction-handling: "Registrar's verbal instruction at 16:40 about Bed 4's care plan", "Consultant's note in Bed 7's file requesting follow-up by end of shift"
- family-visitor-interaction: "Mrs Khan, daughter of Bed 7, arriving at 17:30, anxious about discharge plan"
- care-plan-review: "Resident A care plan, fall risk last reviewed 8 weeks ago", "Resident B end-of-life plan needs DNACPR review"
- safeguarding-incident: "Written concern from Resident C's son, dated Friday, about staff handling overnight"
- clinical-crisis-simulation: "Resident D acute change in condition during the family visit", "Bed 4 acute deterioration mid-shift"
- patient-family-conversation: "Conversation with the family of Bed 7 about a change in discharge plan", "Conversation with Mrs Patel about her late husband's care"`
}

export async function generateHealthcareScenario(client, role_profile, { roleTitle, jobDescription, blockOverride } = {}) {
  if (!client || !role_profile) return null

  let selected
  let matchInfo
  if (Array.isArray(blockOverride) && blockOverride.length > 0) {
    const valid = blockOverride.filter(id => HEALTHCARE_CATALOGUE[id])
    if (valid.length === 0) return null
    const durations = healthcareScaledDurations(valid, targetTotalSeconds(valid.length))
    selected = valid.map((id, i) => ({
      block_id: id,
      suggested_duration_seconds: durations[i],
      order: i + 1,
      canonical_id: null,
      match_type: 'override',
      level: null,
    }))
    matchInfo = {
      canonical_id: null,
      canonical_label: null,
      match_type: 'override',
      level: null,
    }
  } else {
    selected = selectHealthcareBlocks(role_profile, roleTitle)
    if (selected.length === 0) return null
    const head = selected[0]
    const canonical = HEALTHCARE_CANONICAL_ROLE_MAPPING.find(e => e.id === head.canonical_id)
    matchInfo = {
      canonical_id: head.canonical_id,
      canonical_label: canonical?.label || null,
      match_type: head.match_type,
      level: head.level,
    }
  }

  const prompt = buildHealthcareScenarioPrompt({ role_profile, roleTitle, jobDescription, selected, matchInfo })

  let stream
  try {
    stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    console.error('[scenario-generator/healthcare] stream init failed', err)
    return null
  }

  let final
  try {
    final = await stream.finalMessage()
  } catch (err) {
    console.error('[scenario-generator/healthcare] stream completion failed', err)
    return null
  }

  const text = final?.content?.[0]?.text || ''
  const raw = parseJsonResponse(text)
  if (!raw || typeof raw !== 'object') {
    console.warn('[scenario-generator/healthcare] no valid scenario JSON, raw:', text.slice(0, 500))
    return null
  }

  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const safeArr = (v) => Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 8) : []
  const block_content = {}
  for (const s of selected) {
    const entry = raw.block_content?.[s.block_id] || {}
    const blockShape = {
      summary: safeStr(entry.summary),
      setup: safeStr(entry.setup),
      expected_output: safeStr(entry.expected_output),
      connects_from: safeStr(entry.connects_from) || null,
      connects_to: safeStr(entry.connects_to) || null,
      key_items: safeArr(entry.key_items),
    }
    if (s.block_id === 'patient-handover') {
      const patients = normaliseHealthcarePatients(entry.patients)
      if (patients && patients.length) blockShape.patients = patients
    } else if (s.block_id === 'buzzer-alert-queue') {
      const alerts = normaliseHealthcareAlerts(entry.alerts)
      if (alerts && alerts.length) blockShape.alerts = alerts
    } else if (s.block_id === 'medication-round') {
      const chart = normaliseHealthcareMedicationChart(entry)
      if (chart) {
        blockShape.chart_title = chart.chart_title
        blockShape.units = chart.units
        blockShape.columns = chart.columns
        blockShape.rows = chart.rows
        blockShape.planted_issues = chart.planted_issues
      }
    } else if (s.block_id === 'clinical-decision-queue') {
      const decisions = normaliseHealthcareDecisions(entry.decisions)
      if (decisions && decisions.length) blockShape.decisions = decisions
    } else if (s.block_id === 'doctor-instruction-handling') {
      const instr = normaliseHealthcareInstruction(entry)
      if (instr) {
        blockShape.instruction_type = instr.instruction_type
        blockShape.sender = instr.sender
        blockShape.instruction_summary = instr.instruction_summary
        blockShape.full_instruction_text = instr.full_instruction_text
        blockShape.ambiguity_or_concern_planted = instr.ambiguity_or_concern_planted
        blockShape.deadline_pressure = instr.deadline_pressure
        blockShape.supporting_context = instr.supporting_context
      }
    } else if (s.block_id === 'family-visitor-interaction') {
      const family = normaliseHealthcareFamilyInteraction(entry)
      if (family) {
        blockShape.opener = family.opener
        blockShape.counterpart_persona = family.counterpart_persona
        blockShape.conversation_setting = family.conversation_setting
      }
    } else if (s.block_id === 'care-plan-review') {
      const plan = normaliseHealthcareCarePlan(entry)
      if (plan) {
        blockShape.document_type = plan.document_type
        blockShape.document_text = plan.document_text
        blockShape.document_metadata = plan.document_metadata
        blockShape.planted_issues = plan.planted_issues
      }
    } else if (s.block_id === 'safeguarding-incident') {
      const safeguarding = normaliseHealthcareSafeguarding(entry)
      if (safeguarding) {
        blockShape.scenario_summary = safeguarding.scenario_summary
        blockShape.full_scenario_text = safeguarding.full_scenario_text
        blockShape.who_reported = safeguarding.who_reported
        blockShape.when_observed = safeguarding.when_observed
        blockShape.who_at_risk = safeguarding.who_at_risk
        blockShape.current_location_context = safeguarding.current_location_context
        blockShape.threshold_factors = safeguarding.threshold_factors
      }
    } else if (s.block_id === 'clinical-crisis-simulation') {
      const crisis = normaliseHealthcareCrisis(entry)
      if (crisis) {
        blockShape.trigger_type = crisis.trigger_type
        blockShape.initial_alert = crisis.initial_alert
        blockShape.caller_or_sender = crisis.caller_or_sender
        if (crisis.stage_1) blockShape.stage_1 = crisis.stage_1
        if (crisis.stage_2) blockShape.stage_2 = crisis.stage_2
        if (crisis.stage_3) blockShape.stage_3 = crisis.stage_3
      }
    } else if (s.block_id === 'patient-family-conversation') {
      const conv = normaliseHealthcarePatientFamilyConversation(entry)
      if (conv) {
        blockShape.opener = conv.opener
        blockShape.counterpart_type = conv.counterpart_type
        blockShape.counterpart_persona = conv.counterpart_persona
        blockShape.conversation_purpose = conv.conversation_purpose
        blockShape.conversation_setting = conv.conversation_setting
      }
    }
    block_content[s.block_id] = blockShape
  }

  const ai = {
    title: safeStr(raw.title) || 'Shift scenario',
    spine: safeStr(raw.spine),
    trigger: safeStr(raw.trigger),
    scenario_arc: {
      stage_1_setup: safeStr(raw.scenario_arc?.stage_1_setup),
      stage_2_context: safeStr(raw.scenario_arc?.stage_2_context),
      stage_3_output: safeStr(raw.scenario_arc?.stage_3_output),
      stage_4_pressure: safeStr(raw.scenario_arc?.stage_4_pressure),
      stage_5_resolution: safeStr(raw.scenario_arc?.stage_5_resolution),
    },
    block_content,
  }

  const selected_blocks = selected.map(s => ({
    block_id: s.block_id,
    order: s.order,
    duration_seconds: s.suggested_duration_seconds,
    content_ref: s.block_id,
  }))

  return {
    scenario_id: makeScenarioId(roleTitle),
    shell_family: 'healthcare',
    title: ai.title,
    spine: ai.spine,
    trigger: ai.trigger,
    selected_blocks,
    block_content: ai.block_content,
    scenario_arc: ai.scenario_arc,
    match_info: matchInfo,
    generated_at: new Date().toISOString(),
  }
}

// ═════════════════════════════════════════════════════════════════════════
// Phase 2 Education shell
// ═════════════════════════════════════════════════════════════════════════
//
// The Education shell mirrors the Office and Healthcare shapes: a
// canonical role mapping, the same three-pass lookup (role_title ->
// function+seniority -> level fallback), a duration scaler, and a
// scenario generator that calls Claude Haiku once per assessment and
// returns the same workspace_scenario JSONB shape.
//
// Phase 2 Education ships all 9 blocks as stubs that share the office
// BlockPlaceholder. Per-block typed schemas land with each real block
// component in subsequent prompts; until then the AI returns the base
// block shape (summary / setup / expected_output / connects_from /
// connects_to / key_items) and the stub renders that.
//
// Education assessments only reach this generator when the call site
// has shell_family === 'education' and (separately) the modular gate
// has education_workspace_enabled === true on the assessment row.

export const EDUCATION_CANONICAL_ROLE_MAPPING = [
  // ── Level 1: Direct delivery (4 blocks) ───────────────────────────────
  {
    id: 'teaching-assistant',
    label: 'Teaching Assistant (TA)',
    role_titles: ['teaching assistant', 'classroom assistant', 'learning support assistant', 'lsa'],
    function: 'education_support',
    seniority_bands: ['junior'],
    level: 1,
    blocks: ['class-roster', 'behaviour-incident', 'parent-communication', 'safeguarding-referral'],
  },
  {
    id: 'sen-teaching-assistant',
    label: 'SEN Teaching Assistant',
    role_titles: ['sen teaching assistant', 'sen ta', 'special needs teaching assistant', 'one-to-one ta', '1:1 ta'],
    function: 'education_support',
    seniority_bands: ['junior'],
    level: 1,
    blocks: ['class-roster', 'behaviour-incident', 'safeguarding-referral', 'conversation-simulation'],
  },
  {
    id: 'cover-supervisor',
    label: 'Cover Supervisor',
    role_titles: ['cover supervisor', 'cover teacher', 'supply cover'],
    function: 'education_support',
    seniority_bands: ['junior'],
    level: 1,
    blocks: ['lesson-plan', 'class-roster', 'behaviour-incident', 'head-teacher-message'],
  },
  {
    id: 'nursery-practitioner',
    label: 'Nursery Practitioner / Early Years Practitioner',
    role_titles: ['nursery practitioner', 'early years practitioner', 'nursery nurse', 'eyfs practitioner'],
    function: 'education_support',
    seniority_bands: ['junior'],
    level: 1,
    blocks: ['class-roster', 'parent-communication', 'safeguarding-referral', 'behaviour-incident'],
  },
  {
    id: 'private-tutor',
    label: 'Private Tutor / Specialist Tutor',
    role_titles: ['private tutor', 'tutor', 'maths tutor', 'english tutor', 'specialist tutor', 'home tutor'],
    function: 'education_teaching',
    seniority_bands: ['junior'],
    level: 1,
    blocks: ['lesson-plan', 'parent-communication', 'class-roster', 'conversation-simulation'],
  },

  // ── Level 2: Experienced delivery + judgement (4 blocks) ──────────────
  {
    id: 'class-teacher-primary',
    label: 'Class Teacher (Primary)',
    role_titles: ['class teacher', 'primary teacher', 'reception teacher', 'ks1 teacher', 'ks2 teacher'],
    function: 'education_teaching',
    seniority_bands: ['mid'],
    level: 2,
    blocks: ['class-roster', 'lesson-plan', 'parent-communication', 'behaviour-incident'],
  },
  {
    id: 'subject-teacher-secondary',
    label: 'Subject Teacher (Secondary)',
    role_titles: ['subject teacher', 'secondary teacher', 'maths teacher', 'english teacher', 'science teacher', 'history teacher', 'geography teacher', 'mfl teacher', 'pe teacher', 'art teacher', 'music teacher', 'drama teacher', 'computing teacher'],
    function: 'education_teaching',
    seniority_bands: ['mid'],
    level: 2,
    blocks: ['class-roster', 'lesson-plan', 'behaviour-incident', 'parent-communication'],
  },
  {
    id: 'nqt-ect',
    label: 'NQT / ECT (Early Career Teacher)',
    role_titles: ['nqt', 'ect', 'newly qualified teacher', 'early career teacher', 'trainee teacher'],
    function: 'education_teaching',
    seniority_bands: ['junior', 'mid'],
    level: 2,
    blocks: ['lesson-plan', 'behaviour-incident', 'parent-communication', 'head-teacher-message'],
  },
  {
    id: 'hlta',
    label: 'Higher Level Teaching Assistant (HLTA)',
    role_titles: ['hlta', 'higher level teaching assistant', 'senior teaching assistant', 'senior ta'],
    function: 'education_support',
    seniority_bands: ['mid'],
    level: 2,
    blocks: ['class-roster', 'lesson-plan', 'behaviour-incident', 'conversation-simulation'],
  },
  {
    id: 'form-tutor',
    label: 'Form Tutor',
    role_titles: ['form tutor', 'tutor group lead', 'tutor (secondary)'],
    function: 'education_teaching',
    seniority_bands: ['mid'],
    level: 2,
    blocks: ['parent-communication', 'behaviour-incident', 'safeguarding-referral', 'conversation-simulation'],
  },
  {
    id: 'eal-specialist',
    label: 'EAL Specialist Teacher',
    role_titles: ['eal specialist', 'eal teacher', 'english as additional language teacher'],
    function: 'education_teaching',
    seniority_bands: ['mid'],
    level: 2,
    blocks: ['class-roster', 'lesson-plan', 'parent-communication', 'conversation-simulation'],
  },
  {
    id: 'fe-lecturer',
    label: 'FE Lecturer',
    role_titles: ['fe lecturer', 'further education lecturer', 'college lecturer', 'lecturer (fe)'],
    function: 'education_teaching',
    seniority_bands: ['mid'],
    level: 2,
    blocks: ['lesson-plan', 'class-roster', 'behaviour-incident', 'conversation-simulation'],
  },

  // ── Level 3: Subject and pastoral management (5 blocks) ────────────────
  {
    id: 'senco',
    label: 'SENCO (Special Educational Needs Coordinator)',
    role_titles: ['senco', 'special educational needs coordinator', 'sen coordinator'],
    function: 'education_support',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['class-roster', 'parent-communication', 'safeguarding-referral', 'conversation-simulation', 'head-teacher-message'],
  },
  {
    id: 'head-of-department-education',
    label: 'Head of Department / Subject Leader (school)',
    role_titles: ['head of department', 'head of subject', 'subject leader', 'curriculum leader', 'subject coordinator'],
    function: 'education_teaching',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['lesson-plan', 'cohort-coordination', 'head-teacher-message', 'conversation-simulation', 'crisis-simulation'],
  },
  {
    id: 'head-of-faculty',
    label: 'Head of Faculty',
    role_titles: ['head of faculty', 'faculty lead', 'faculty director'],
    function: 'education_teaching',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['lesson-plan', 'cohort-coordination', 'head-teacher-message', 'conversation-simulation', 'crisis-simulation'],
  },
  {
    id: 'curriculum-lead',
    label: 'Curriculum Lead / Lead Practitioner',
    role_titles: ['curriculum lead', 'lead practitioner', 'teaching and learning lead', 't&l lead'],
    function: 'education_teaching',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['lesson-plan', 'cohort-coordination', 'head-teacher-message', 'conversation-simulation', 'crisis-simulation'],
  },
  {
    id: 'pastoral-lead',
    label: 'Pastoral Lead / Head of Year',
    role_titles: ['pastoral lead', 'head of year', 'year lead', 'year leader', 'head of key stage', 'phase leader'],
    function: 'education_support',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['parent-communication', 'behaviour-incident', 'safeguarding-referral', 'conversation-simulation', 'crisis-simulation'],
  },
  {
    id: 'inclusion-lead',
    label: 'Inclusion Lead / Behaviour Support Lead',
    role_titles: ['inclusion lead', 'inclusion manager', 'behaviour support lead', 'behaviour lead', 'attendance lead'],
    function: 'education_support',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['behaviour-incident', 'conversation-simulation', 'parent-communication', 'head-teacher-message', 'crisis-simulation'],
  },
  {
    id: 'designated-safeguarding-lead',
    label: 'Designated Safeguarding Lead (DSL)',
    role_titles: ['designated safeguarding lead', 'dsl', 'deputy dsl', 'safeguarding lead'],
    function: 'education_support',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['safeguarding-referral', 'parent-communication', 'head-teacher-message', 'conversation-simulation', 'crisis-simulation'],
  },
  {
    id: 'course-leader',
    label: 'Course Leader (FE / sixth form)',
    role_titles: ['course leader', 'course director', 'programme leader (fe)', 'study programme manager'],
    function: 'education_teaching',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['lesson-plan', 'cohort-coordination', 'head-teacher-message', 'conversation-simulation', 'crisis-simulation'],
  },
  {
    id: 'nursery-manager',
    label: 'Nursery Manager / Early Years Lead',
    role_titles: ['nursery manager', 'early years lead', 'eyfs lead', 'early years coordinator', 'pre-school manager'],
    function: 'education_support',
    seniority_bands: ['manager', 'senior_manager'],
    level: 3,
    blocks: ['class-roster', 'parent-communication', 'safeguarding-referral', 'head-teacher-message', 'crisis-simulation'],
  },

  // ── Level 4: Senior leadership (4 blocks) ──────────────────────────────
  {
    id: 'deputy-headteacher',
    label: 'Deputy Headteacher',
    role_titles: ['deputy headteacher', 'deputy head teacher', 'deputy head', 'vice principal'],
    function: 'education_teaching',
    seniority_bands: ['director'],
    level: 4,
    blocks: ['head-teacher-message', 'cohort-coordination', 'conversation-simulation', 'crisis-simulation'],
  },
  {
    id: 'assistant-headteacher',
    label: 'Assistant Headteacher',
    role_titles: ['assistant headteacher', 'assistant head teacher', 'assistant head', 'assistant principal'],
    function: 'education_teaching',
    seniority_bands: ['manager', 'senior_manager', 'director'],
    level: 4,
    blocks: ['cohort-coordination', 'head-teacher-message', 'conversation-simulation', 'crisis-simulation'],
  },
  {
    id: 'headteacher',
    label: 'Headteacher',
    role_titles: ['headteacher', 'head teacher', 'principal (school)', 'school head'],
    function: 'education_teaching',
    seniority_bands: ['director', 'c_suite'],
    level: 4,
    blocks: ['cohort-coordination', 'conversation-simulation', 'head-teacher-message', 'crisis-simulation'],
  },
  {
    id: 'executive-headteacher',
    label: 'Executive Headteacher / CEO of MAT',
    role_titles: ['executive headteacher', 'executive head', 'ceo of mat', 'mat ceo', 'multi-academy trust ceo', 'trust ceo'],
    function: 'education_teaching',
    seniority_bands: ['director', 'c_suite'],
    level: 4,
    blocks: ['cohort-coordination', 'conversation-simulation', 'head-teacher-message', 'crisis-simulation'],
  },
  {
    id: 'college-principal',
    label: 'College Principal / Programme Manager',
    role_titles: ['college principal', 'principal (college)', 'programme manager', 'fe principal', 'sixth form principal'],
    function: 'education_teaching',
    seniority_bands: ['director', 'c_suite'],
    level: 4,
    blocks: ['cohort-coordination', 'conversation-simulation', 'head-teacher-message', 'crisis-simulation'],
  },
]

const EDUCATION_LEVEL_DEFAULTS = {
  1: 'teaching-assistant',
  2: 'class-teacher-primary',
  3: 'pastoral-lead',
  4: 'headteacher',
}

export function findEducationCanonicalEntry(roleTitle, role_profile) {
  const title = (roleTitle || '').toLowerCase().trim()
  const seniority = role_profile?.seniority_band || null
  const fn = role_profile?.function || null

  const seniorityFits = (entry) =>
    !entry.seniority_bands?.length ||
    !seniority ||
    entry.seniority_bands.includes(seniority)

  if (title) {
    for (const entry of EDUCATION_CANONICAL_ROLE_MAPPING) {
      const titleHit = entry.role_titles.some(p => title.includes(p))
      if (titleHit && seniorityFits(entry)) {
        return { entry, match_type: 'role_title' }
      }
    }
  }

  if (fn) {
    for (const entry of EDUCATION_CANONICAL_ROLE_MAPPING) {
      if (!entry.function) continue
      if (entry.function !== fn) continue
      if (!seniorityFits(entry)) continue
      return { entry, match_type: 'function_seniority' }
    }
  }

  const level = levelFromSeniority(seniority)
  const defaultId = EDUCATION_LEVEL_DEFAULTS[level] || EDUCATION_LEVEL_DEFAULTS[2]
  const entry = EDUCATION_CANONICAL_ROLE_MAPPING.find(e => e.id === defaultId)
  return { entry, match_type: 'level_fallback' }
}

function educationScaledDurations(chosenIds, totalTargetSeconds) {
  const totalDefault = chosenIds.reduce(
    (s, id) => s + (EDUCATION_CATALOGUE[id]?.default_duration_seconds || 240),
    0
  )
  if (totalDefault === 0) return chosenIds.map(() => 180)
  const ratio = totalTargetSeconds / totalDefault
  return chosenIds.map(id => {
    const base = EDUCATION_CATALOGUE[id]?.default_duration_seconds || 240
    const scaled = base * ratio
    return Math.max(60, Math.round(scaled / 30) * 30)
  })
}

export function selectEducationBlocks(role_profile, roleTitle) {
  if (!role_profile) return []
  const { entry, match_type } = findEducationCanonicalEntry(roleTitle, role_profile)
  if (!entry) return []

  let blocks = entry.blocks.slice()
  if (role_profile.employment_type === 'temporary') {
    blocks = blocks.slice(0, 3)
  }

  const durations = educationScaledDurations(blocks, targetTotalSeconds(blocks.length))
  return blocks.map((id, i) => ({
    block_id: id,
    suggested_duration_seconds: durations[i],
    order: i + 1,
    canonical_id: entry.id,
    match_type,
    level: entry.level,
  }))
}

// Per-block content schema fields for the education shell. Phase 2 stub
// stage uses a single base shape across all 9 blocks. Each block ships
// with the contextual setup, expected output, and 3 to 5 named key
// items the stub renders. Typed arrays (analogous to office shell
// inbox.emails / decisions or healthcare patient-handover.patients[])
// arrive with each real component build in subsequent prompts.
function educationBlockSchemaFields(_blockId) {
  return `      "summary": "string (1 sentence describing this block's content for this candidate)",
      "setup": "string (what the candidate sees / receives in this block)",
      "expected_output": "string (what the candidate is expected to produce)",
      "connects_from": "string or null (reference to previous block output)",
      "connects_to": "string or null (what this hands off to the next block)",
      "key_items": [
        "string (3 to 5 specific named items: a pupil with anonymised initials and a SEN flag, a lesson objective and a differentiation note, a parent email subject and the safeguarding-adjacent concern, an incident with named pupils and the policy step that applies, a safeguarding disclosure and the threshold question, a headteacher directive with a deadline, a cohort demand against a fixed time window, a conversation opener with a parent or pupil, a crisis stage prompt)"
      ]`
}

function buildEducationBlockBriefList(selected) {
  return selected.map(s => {
    const b = EDUCATION_CATALOGUE[s.block_id]
    if (!b) return `  ${s.order}. ${s.block_id} (${Math.round(s.suggested_duration_seconds / 60)} min)`
    const mins = Math.round(s.suggested_duration_seconds / 60)
    return `  ${s.order}. ${b.name} (id "${b.id}", ${mins} min, category: ${b.category})`
  }).join('\n')
}

function buildEducationScenarioPrompt({ role_profile, roleTitle, jobDescription, selected, matchInfo }) {
  const blockList = buildEducationBlockBriefList(selected)
  const blockCount = selected.length
  const isTemporary = role_profile.employment_type === 'temporary'
  const sectorContext = role_profile.sector_context || 'unspecified school or education setting'
  const seniority = role_profile.seniority_band || 'unspecified seniority'
  const employment = role_profile.employment_type || 'permanent'
  const displayTitle = roleTitle || role_profile.function

  return `You are generating a Workspace simulation for the role: ${displayTitle} at ${seniority} level in ${sectorContext}, ${employment}.

Your job is NOT to generate generic "school" tasks. Your job is to REPLICATE THIS ROLE in this specific education setting.

Step 1: Identify what someone in this exact role actually does for a living. What is the WORK? Not "school tasks" but the substantive work this role performs day-to-day. For a Class Teacher in a primary school: planning lessons, teaching, marking, parent communication, behaviour management, safeguarding awareness. For a SENCO: EHCP coordination, referrals to outside agencies, parent meetings, support plan reviews, briefing class teachers. For a Headteacher: setting strategy, managing the senior team, parent and governor communication, safeguarding accountability, regulatory readiness.

Step 2: Pick a believable day or week scenario that involves this role doing real role-specific work. Not "running a lesson" but "Tuesday morning, Year 4 reading lesson in 20 minutes, two SEN pupils need scaffolded materials, new pupil starting today with no transition file, parent emailed about a behaviour incident yesterday". Not "leading the school" but "Friday morning, Ofsted call expected today, two staff calling in sick, a pupil safeguarding concern flagged overnight, mixed Year 6 SATs results published, Chair of Governors wants a 30-minute call by 10am".

Step 3: Map that work into the ${blockCount} selected blocks. Each block hosts a piece of the role-specific work. The blocks are the tools the candidate uses; the work is the role being performed.

Step 4: Generate the content for each block such that:
- The CONTENT inside each block reflects actual role-specific work
- A real practitioner of this role would recognise the work
- A complete novice would feel out of their depth
- The work flows from block to block as one coherent day or week
- The candidate's outputs in earlier blocks become inputs to later blocks

Compliance test: the simulation tests JUDGEMENT and DECISION-MAKING, not curriculum knowledge or specific pedagogy. Do NOT claim authoritative interpretations of the National Curriculum, GCSE specifications, or specific exam board content. Do NOT name a real school, a real local authority, or a real MAT. Pupil details are anonymised: use first-name-only references ("Pupil A", "Mia in 4B", "Bed 7" style does not apply here, use "Year 4, table 3, two pupils with EHCPs"). The simulation is a behavioural and judgement assessment.

Examples of role replication done well:

Class Teacher (primary, mid-level, permanent):
- Spine: "Tuesday morning. Reading lesson with Year 4 starting in 20 minutes. Two SEN pupils (one EHCP, one school-support plan) need scaffolded materials. A new pupil is starting today and the transition file has not yet arrived from the previous school. A Year 4 parent emailed yesterday about a behaviour incident their child was involved in."
- Class roster block: 28 pupils with mix of SEN flags (one EHCP, one school support, two EAL, three pupil premium), prior attainment data, attendance flags (one with declining attendance), behaviour notes from the previous half-term.
- Lesson plan block: a 60-minute reading lesson with a learning objective, AfL checkpoints, differentiation for SEN/EAL/HAP/LAP, behaviour management considerations.
- Parent communication block: 4 emails including the parent from yesterday's incident, a query about the upcoming trip, a pastoral concern about a friendship issue, a routine question about home learning.
- Behaviour incident block: yesterday's incident details to log, plus a current concern with one pupil refusing to come into class.

This is Class Teacher work. Not generic teaching work.

SENCO (primary, manager-level, permanent):
- Spine: "Wednesday. EHCP review meeting at 11am for one Year 5 pupil. New referral from a Year 3 teacher arrived in your inbox overnight. Educational Psychologist visiting at 1pm. Parent of a Year 6 pupil phoned reception demanding to speak to you about provision changes."
- Class roster block: SEN register across the school showing tier of need, EHCP status, current provision, review due dates.
- Parent communication block: the parent of the Year 6 pupil, an advocacy organisation, the EP confirming the visit, a Year 1 parent asking about an early-help referral.
- Safeguarding referral block: the Year 3 colleague's disclosure that may meet a Section 47 threshold.
- Conversation simulation block: the Year 6 parent, anxious and angry about provision changes.
- Headteacher message block: the headteacher wants an update on EHCP funding negotiations before the EP arrives.

This is SENCO work. Not generic management work.

Headteacher (primary, c_suite, permanent):
- Spine: "Friday morning. Ofsted call expected today. Two staff calling in sick. A pupil safeguarding concern flagged overnight. Year 6 SATs results published yesterday, mixed picture. Chair of Governors wants a 30-minute call by 10am."
- Cohort coordination block: four named demands across the senior team, parents, governors, and exam pressures with named deadlines.
- Conversation simulation block: the Chair of Governors call, weighing what to surface and what to hold.
- Headteacher message block: the MAT CEO has emailed asking for a written update on the safeguarding concern by end of day.
- Crisis simulation block: the Ofsted lead inspector arrives, plus the safeguarding concern emerges in a parent's social media post.

This is Headteacher work. Not generic senior leadership work.

When you generate a scenario, you must be able to defend each block's content as "this is what a ${displayTitle} would actually do in this setting, not generic school work".

────────────────────────────────────────────────────
Role context for this generation:

Role title: ${displayTitle}
Function: ${role_profile.function}
Seniority: ${seniority}
IC or manager: ${role_profile.ic_or_manager}
Interaction style: ${role_profile.interaction_internal_external}
Sector context: ${sectorContext}
Company size: ${role_profile.company_size || 'unspecified'}
Employment type: ${employment}
Primary work types: ${(role_profile.primary_work_types || []).join(', ')}
Canonical role pattern: ${matchInfo?.canonical_id || 'unknown'} (matched via ${matchInfo?.match_type || 'unknown'})
${jobDescription ? `Job description excerpt:\n${String(jobDescription).slice(0, 800)}\n` : ''}
Selected blocks in order (these are fixed, do not change them):
${blockList}

Output requirements:
- Return JSON only. UK English. No emoji. No em dashes.
- The spine and trigger must be specific to this role and setting. Use year groups, named time slots, anonymised pupils ("Pupil A in 4B", "Year 6 group"), specific events (parents evening, transition day, EHCP review), and named-but-fictional staff roles ("the Year 3 teacher", "the deputy head", "the chair of governors").
- The trigger event appears in the FIRST block's content.
- Each block's content references what the candidate has just done in the previous block (use connects_from). Each block's content sets up what the candidate will do next (use connects_to).
- The scenario_arc maps to the five narrative stages and describes what the candidate experiences across the blocks.
- Every key_items entry must be a specific, named item: a pupil with a flag, a lesson objective, an email subject, an incident detail, a safeguarding signal, a directive with a deadline. No generic phrasing.
- Do NOT name a real school, a real local authority, a real MAT, or a real exam board's specific content. Do NOT make authoritative pedagogical claims. Do NOT include real pupil names or identifying details.
${isTemporary ? '- Because employment type is temporary (supply, agency, or fixed-term), keep the scenario tight (3 blocks total). Focus on the foundational work modes; do not introduce a crisis as the closing block.' : ''}

Output schema:
{
  "title": "string (4-8 words, role-specific and setting-specific, e.g. 'Tuesday Year 4 reading lesson')",
  "spine": "string (1-2 sentences describing the day or week for this person)",
  "trigger": "string (the early-day event that kicks the scenario off)",
  "scenario_arc": {
    "stage_1_setup": "string (what the candidate sees first, e.g. roster, inbox, board state)",
    "stage_2_context": "string (what they learn from the early review or planning blocks)",
    "stage_3_output": "string (what they produce mid-scenario, e.g. updated lesson plan, parent reply, incident log)",
    "stage_4_pressure": "string (what changes or escalates partway through)",
    "stage_5_resolution": "string (the final escalation, conversation, or crisis)"
  },
  "block_content": {
${selected.map(s => `    "${s.block_id}": {
${educationBlockSchemaFields(s.block_id)}
    }`).join(',\n')}
  }
}

The "key_items" arrays should each contain 3 to 5 strings. Specific and named. Examples by block type:
- class-roster: "Pupil A, Year 4, EHCP, communication and interaction needs, attendance 89%", "Pupil B, EAL Stage 2, prior attainment below age-related, friendship concern flagged in week 2"
- lesson-plan: "Learning objective: identify the author's use of figurative language in chapter 3", "Differentiation: scaffolded sentence stems for SEN, extension question for HAP", "AfL checkpoint: cold-call sample of 4 pupils mid-lesson"
- parent-communication: "Email from Pupil A's parent, subject: 'About yesterday'", "Email from Pupil C's parent asking about the school trip on Friday"
- behaviour-incident: "Pupil D refused to enter the classroom at 09:05 and used inappropriate language", "Yesterday's playground incident between Pupil E and Pupil F to be logged on the school's incident system"
- safeguarding-referral: "Year 3 colleague disclosed in supervision that a pupil mentioned being hit at home", "Pupil G's mother arrived at reception in distress at 14:30"
- head-teacher-message: "Headteacher's note at 08:50 asking for a written update on the trip risk assessment by 11:00", "Email from the deputy head about Friday's parents evening rota"
- cohort-coordination: "Year 11 mock exams next Tuesday, two invigilators short", "Parents evening Thursday, two staff on courses, need cover"
- conversation-simulation: "Conversation with the parent of Pupil A who is anxious about the EHCP review outcome", "Restorative conversation with Pupil D after yesterday's incident"
- crisis-simulation: "A pupil in Year 9 sent a concerning message via the school's internal platform", "Fight broke out in the yard at break, two staff on duty already with another incident"`
}

export async function generateEducationScenario(client, role_profile, { roleTitle, jobDescription, blockOverride } = {}) {
  if (!client || !role_profile) return null

  let selected
  let matchInfo
  if (Array.isArray(blockOverride) && blockOverride.length > 0) {
    const valid = blockOverride.filter(id => EDUCATION_CATALOGUE[id])
    if (valid.length === 0) return null
    const durations = educationScaledDurations(valid, targetTotalSeconds(valid.length))
    selected = valid.map((id, i) => ({
      block_id: id,
      suggested_duration_seconds: durations[i],
      order: i + 1,
      canonical_id: null,
      match_type: 'override',
      level: null,
    }))
    matchInfo = {
      canonical_id: null,
      canonical_label: null,
      match_type: 'override',
      level: null,
    }
  } else {
    selected = selectEducationBlocks(role_profile, roleTitle)
    if (selected.length === 0) return null
    const head = selected[0]
    const canonical = EDUCATION_CANONICAL_ROLE_MAPPING.find(e => e.id === head.canonical_id)
    matchInfo = {
      canonical_id: head.canonical_id,
      canonical_label: canonical?.label || null,
      match_type: head.match_type,
      level: head.level,
    }
  }

  const prompt = buildEducationScenarioPrompt({ role_profile, roleTitle, jobDescription, selected, matchInfo })

  let stream
  try {
    stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    console.error('[scenario-generator/education] stream init failed', err)
    return null
  }

  let final
  try {
    final = await stream.finalMessage()
  } catch (err) {
    console.error('[scenario-generator/education] stream completion failed', err)
    return null
  }

  const text = final?.content?.[0]?.text || ''
  const raw = parseJsonResponse(text)
  if (!raw || typeof raw !== 'object') {
    console.warn('[scenario-generator/education] no valid scenario JSON, raw:', text.slice(0, 500))
    return null
  }

  const safeStr = (v) => typeof v === 'string' ? v.trim() : ''
  const safeArr = (v) => Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, 8) : []
  const block_content = {}
  for (const s of selected) {
    const entry = raw.block_content?.[s.block_id] || {}
    block_content[s.block_id] = {
      summary: safeStr(entry.summary),
      setup: safeStr(entry.setup),
      expected_output: safeStr(entry.expected_output),
      connects_from: safeStr(entry.connects_from) || null,
      connects_to: safeStr(entry.connects_to) || null,
      key_items: safeArr(entry.key_items),
    }
  }

  const ai = {
    title: safeStr(raw.title) || 'School day scenario',
    spine: safeStr(raw.spine),
    trigger: safeStr(raw.trigger),
    scenario_arc: {
      stage_1_setup: safeStr(raw.scenario_arc?.stage_1_setup),
      stage_2_context: safeStr(raw.scenario_arc?.stage_2_context),
      stage_3_output: safeStr(raw.scenario_arc?.stage_3_output),
      stage_4_pressure: safeStr(raw.scenario_arc?.stage_4_pressure),
      stage_5_resolution: safeStr(raw.scenario_arc?.stage_5_resolution),
    },
    block_content,
  }

  const selected_blocks = selected.map(s => ({
    block_id: s.block_id,
    order: s.order,
    duration_seconds: s.suggested_duration_seconds,
    content_ref: s.block_id,
  }))

  return {
    scenario_id: makeScenarioId(roleTitle),
    shell_family: 'education',
    title: ai.title,
    spine: ai.spine,
    trigger: ai.trigger,
    selected_blocks,
    block_content: ai.block_content,
    scenario_arc: ai.scenario_arc,
    match_info: matchInfo,
    generated_at: new Date().toISOString(),
  }
}
