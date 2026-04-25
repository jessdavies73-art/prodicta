// Master list of scoring dimensions PRODICTA can use for any role.
//
// The Dynamic Dimension Detection step (in app/api/assessment/generate/route.js)
// picks 5 to 7 dimensions from this list per assessment, weights them, and
// generates High/Mid/Low anchors specific to the role. The detected set is
// persisted on assessments.detected_dimensions and assessments.dimension_rubrics
// so every score has an audit trail of which dimensions were used and why.
//
// This list is intentionally extendable. To add a dimension, append a new
// entry below. Existing assessments are not affected because dimensions are
// resolved per-assessment from the row, not from this list.

export const SCORING_DIMENSIONS = [
  { name: 'Accuracy',                       definition: 'Producing work that is correct first time. Catching errors, verifying figures, and not publishing or releasing material that has not been checked.' },
  { name: 'Safety',                         definition: 'Recognising physical, clinical, or operational risk and taking the right preventative action. Refusing to compromise safety to save time or please a stakeholder.' },
  { name: 'Communication',                  definition: 'Conveying information clearly to the right audience at the right time. Plain language, structured updates, no ambiguity on what was decided or what happens next.' },
  { name: 'Prioritisation',                 definition: 'Choosing what to do first when several things compete for time. Identifying the genuinely urgent or high-impact item and parking the rest with intent.' },
  { name: 'Ownership',                      definition: 'Treating an outcome as personally yours to deliver. Using committed language ("I will"), following through, and not deferring action that is within your scope.' },
  { name: 'Adaptability',                   definition: 'Adjusting approach when conditions change. Picking up new tools, new processes, or a new brief without losing momentum or quality.' },
  { name: 'Commercial Thinking',            definition: 'Connecting decisions to revenue, cost, margin, or customer value. Understanding how the work moves a number that the business cares about.' },
  { name: 'Stakeholder Management',         definition: 'Reading, influencing, and negotiating with people who have competing interests. Holding a relationship together while still telling them what they need to hear.' },
  { name: 'Documentation',                  definition: 'Producing a written trail that another person can read and understand later. Recording what was decided, what was checked, what was assumed, and what is still open.' },
  { name: 'Escalation',                     definition: 'Knowing when something is beyond your authority or capacity and raising it to the right person, with the right information, at the right time. Not too early, not too late.' },
  { name: 'Empathy',                        definition: 'Recognising the emotional or human reality of a situation and adapting tone and action accordingly. Particularly important in care, customer-facing, and people-management work.' },
  { name: 'Technical Judgement',            definition: 'Knowing the right technical answer, recognising when an approach is wrong, and choosing the appropriate tool, framework, or method for the problem.' },
  { name: 'Risk Awareness',                 definition: 'Spotting what could go wrong before it does. Naming downside scenarios, surfacing assumptions, and proposing mitigations rather than ignoring the risk.' },
  { name: 'Decision Making Under Pressure', definition: 'Reaching a clear, defensible decision when time is short and information is incomplete. Avoiding paralysis and avoiding rashness.' },
  { name: 'Problem Solving',                definition: 'Breaking a messy situation into parts, generating options, and converging on a workable solution. Not just naming the problem.' },
  { name: 'Attention to Detail',            definition: 'Catching the small thing that would have caused a big consequence. Cross-checking figures, dates, names, references, and edge cases.' },
  { name: 'Persistence',                    definition: 'Staying engaged with a difficult task or relationship over time. Continuing to push when the easy path is to disengage.' },
  { name: 'Creativity',                     definition: 'Generating non-obvious options or framings. Reaching for a different angle when the standard approach is not working.' },
  { name: 'Speed',                          definition: 'Producing useful output quickly. Reducing time-to-decision or time-to-delivery without sacrificing what actually matters in the role.' },
  { name: 'Compliance',                     definition: 'Following the rules that apply to the role: regulatory, legal, contractual, and policy. Recognising when a shortcut breaches a rule and refusing to take it.' },
  { name: 'Ethical Judgement',              definition: 'Recognising when something is wrong, even if it is technically allowed. Choosing the action that holds up to outside scrutiny over the action that is convenient.' },
  { name: 'Emotional Resilience',           definition: 'Holding composure when criticised, challenged, or under sustained pressure. Recovering from setbacks without losing focus on the work.' },
  { name: 'Negotiation',                     definition: 'Reaching agreements that work for multiple parties under pressure. Holding a position when it matters, conceding when it does not, and naming the trade-offs explicitly.' },
  { name: 'Coaching',                        definition: 'Developing other people\'s skills, performance, and confidence over time. Giving specific feedback, naming the behaviour change required, and following through on it across weeks rather than minutes.' },
  { name: 'Visual Judgement',                definition: 'Making sound decisions on visual quality, layout, design, and aesthetic standards. Recognising when a design works for the audience and when it does not, with reasoning beyond personal preference.' },
  { name: 'Crisis Management',               definition: 'Leading and stabilising the situation when things go seriously wrong. Sequencing immediate response, communication, and recovery while keeping a head clear enough to make the next decision.' },
  { name: 'Cross-Cultural Awareness',        definition: 'Adapting communication and approach across different cultural and demographic contexts. Reading the room beyond the dominant set of norms and adjusting tone, framing, and expectations accordingly.' },
]

export const SCORING_DIMENSION_NAMES = SCORING_DIMENSIONS.map(d => d.name)

export function getDimensionDefinition(name) {
  if (!name) return null
  const lower = String(name).trim().toLowerCase()
  const found = SCORING_DIMENSIONS.find(d => d.name.toLowerCase() === lower)
  return found ? found.definition : null
}
