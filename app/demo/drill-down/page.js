'use client'

// Demo drill-down. Wraps the same DrillDownView component that runs on
// the live /dashboard/drill-down route, but feeds it the in-memory demo
// data so prospects see all four tabs populated. Demo experience is
// always agency-perm so the By Client tab renders.

import { useEffect, useState, useSyncExternalStore } from 'react'
import { DemoLayout } from '@/components/DemoShell'
import { isDemoAgencyPerm } from '@/lib/account-helpers'
import {
  DEMO_CANDIDATES,
  DEMO_ASSESSMENTS,
  DEMO_TEAM_MEMBERS,
  DEMO_CLIENTS,
  getDemoCandidatesFull,
} from '@/lib/demo-data'
import DrillDownView from '@/app/dashboard/drill-down/_DrillDownView'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

export default function DemoDrillDownPage() {
  const isMobile = useIsMobile()
  // Mirror the live drill-down: read the demo banner state so an
  // agency-perm demo viewer sees the description without "compliance
  // signals" and the live behaviour is honestly previewed.
  const [hideCompliance, setHideCompliance] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const acct = localStorage.getItem('prodicta_demo_account_type')
      const empType = localStorage.getItem('prodicta_demo_employment_type')
      setHideCompliance(isDemoAgencyPerm(acct, empType))
    } catch {}
  }, [])

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
      {/* Demo drill-down had no <main> wrapper before; DemoLayout's
          column-flex stacked the view at x=0, so the leftmost 220px sat
          behind the fixed demo sidebar. Match the live drill-down's
          buffer (marginLeft 240 + paddingLeft 32) and explicit
          overflowX:'visible' so no horizontal scrollbar can paint with
          non-zero scrollLeft and clip the leftmost content. */}
      <main style={{ flex: 1, minWidth: 0, marginLeft: isMobile ? 0 : 240, marginTop: isMobile ? 96 : 46, paddingLeft: isMobile ? 16 : 32, overflowX: 'visible' }}>
        <DrillDownView
          candidates={candidates}
          assessments={DEMO_ASSESSMENTS}
          teamMembers={DEMO_TEAM_MEMBERS}
          clients={DEMO_CLIENTS}
          accountType="agency"
          planType="agency"
          hideCompliance={hideCompliance}
        />
      </main>
    </DemoLayout>
  )
}
