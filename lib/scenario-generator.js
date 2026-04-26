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
- Conversation-simulation blocks must name the counter-party explicitly with a position the candidate must engage: a procurement contact pushing for a discount, an opposing solicitor on a clause, a line manager refusing to performance-manage, a board member raising a governance concern.

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
      "summary": "string (1 sentence describing this block's content for this candidate)",
      "setup": "string (what the candidate sees / receives in this block)",
      "expected_output": "string (what the candidate is expected to produce)",
      "connects_from": "string or null (reference to previous block output)",
      "connects_to": "string or null (what this hands off to the next block)",
      "key_items": [
        "string (a specific named item: an email subject, a row label, a decision title, a stakeholder name)"
      ]
    }`).join(',\n')}
  }
}

The "key_items" arrays should each contain 3 to 5 strings that are specific and named (e.g. "Email from Helen Carter, Procurement Director, subject: Q3 budget freeze", not "an email about budgets").`
}

function parseJsonResponse(text) {
  if (!text || typeof text !== 'string') return null
  const cleaned = text.replace(/[—–]/g, ', ')
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

function normaliseScenario(raw, selected) {
  if (!raw || typeof raw !== 'object') return null
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
      max_tokens: 3500,
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
