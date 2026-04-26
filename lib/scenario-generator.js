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
// Phase 1 implements the Office shell only. shell_family checks happen at
// the call site (in /api/assessment/generate), so this module assumes the
// caller has already confirmed shell_family === 'office'.

import { BLOCK_CATALOGUE } from '@/lib/workspace-blocks/office/catalogue'

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
- For spreadsheet-data blocks: 15 to 25 rows, 5 to 8 columns, role-appropriate. Finance: budget vs actual variance, P&L lines. Marketing: channel performance with cost, conversions, CPL, attribution share. Operations: SLA hits, throughput, defect rate by line/supplier. Sales: pipeline by stage with deal name, ACV, age, weighted forecast. HR: headcount, attrition, performance distribution by team. Procurement: vendor scorecard with spend, OTIF, defects, contract end date. Plant 1 to 3 deliberate anomalies: a suspicious variance, a concentration in one row, a data quality issue (negative value, missing key field), or a threshold breach. Each anomaly has the row_index and col_index of the actual offending cell, the type, and a one-sentence hint that names what is wrong. Numbers must be numbers in the JSON, not strings. Use null for genuinely missing cells (they may themselves be the anomaly).`
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
