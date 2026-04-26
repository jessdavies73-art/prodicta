'use client'

// Demo drill-down. Wraps the same DrillDownView component that runs on
// the live /dashboard/drill-down route, but feeds it the in-memory demo
// data so prospects see all four tabs populated. Demo experience is
// always agency-perm so the By Client tab renders.

import { DemoLayout } from '@/components/DemoShell'
import {
  DEMO_CANDIDATES,
  DEMO_ASSESSMENTS,
  DEMO_TEAM_MEMBERS,
  DEMO_CLIENTS,
  getDemoCandidatesFull,
} from '@/lib/demo-data'
import DrillDownView from '@/app/dashboard/drill-down/_DrillDownView'

export default function DemoDrillDownPage() {
  // Prefer the full enriched candidate set (with results) so per-role
  // averages and recommended counts populate correctly.
  const enriched = getDemoCandidatesFull()
  // Active candidates that don't have a completed result row are still
  // present in DEMO_CANDIDATES; merge those in too so "Active" counts
  // are not artificially zero.
  const fullById = new Map(enriched.map(c => [c.id, c]))
  const candidates = DEMO_CANDIDATES.map(c => fullById.get(c.id) || c).map(c => {
    const a = DEMO_ASSESSMENTS.find(x => x.id === c.assessments?.id)
    if (!a) return c
    return {
      ...c,
      assessments: {
        ...c.assessments,
        location: c.assessments?.location || a.location || null,
        client_name: c.assessments?.client_name || a.client_name || null,
        team_member_id: c.assessments?.team_member_id || a.team_member_id || null,
        created_at: c.assessments?.created_at || a.created_at || null,
      },
    }
  })

  return (
    <DemoLayout active="drill-down">
      <DrillDownView
        candidates={candidates}
        assessments={DEMO_ASSESSMENTS}
        teamMembers={DEMO_TEAM_MEMBERS}
        clients={DEMO_CLIENTS}
        accountType="agency"
        planType="agency"
      />
    </DemoLayout>
  )
}
