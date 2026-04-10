'use client'
import HighlightReel from '@/app/assessment/[id]/candidate/[candidateId]/highlight-reel/HighlightReelView'

const DEMO_DATA = {
  name: 'Sophie Chen',
  role: 'Marketing Manager',
  roleLevel: 'MID_LEVEL',
  candidateId: 'demo-c1',
  overall_score: 92,
  risk_level: 'Very Low',
  hiring_confidence: { score: 91 },
  ai_summary: 'Sophie demonstrated strong strategic thinking, data-driven accountability, and constructive stakeholder challenge throughout her assessment. Her responses were consistently well-structured, evidence-based, and showed genuine ownership of outcomes.',
  pressure_fit_score: 88,
  execution_reliability: 90,
  spoken_delivery_score: 87,
  strengths: [
    { strength: 'Systems-level strategic thinking', evidence: 'The real problem isn\'t the rogue post, it\'s that we don\'t have a clear enough brand voice guide that the whole team can reference.' },
    { strength: 'Data-driven accountability with specific targets', evidence: 'I\'d set a 90-day target of 15% improvement in MQL-to-SQL conversion.' },
    { strength: 'Constructive stakeholder challenge with evidence', evidence: 'I\'d take the conversation back to the brief. If the direction has changed, the timeline needs to change too.' },
  ],
  watchouts: [
    { watchout: 'Tendency to over-plan before committing to action', severity: 'Low', if_ignored: 'In fast-moving environments, this could slow execution and delay early wins.' },
  ],
  interview_questions: [
    'Tell me about a time you had to deliver a campaign under significant time pressure. What did you prioritise and what did you sacrifice?',
    'Describe a situation where you disagreed with a senior stakeholder on marketing strategy. How did you handle it?',
    'Walk me through how you would approach your first 30 days in this role. What would you do first and why?',
  ],
}

export default function DemoHighlightReelPage() {
  return <HighlightReel data={DEMO_DATA} canShare={false} isDemo />
}
