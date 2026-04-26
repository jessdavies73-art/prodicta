'use client'

// Drill-down dashboard route.
//
// Fetches the same shape of data the main /dashboard reads (candidates
// with their nested assessment + results, plus active assessments) and
// hands it to the shared DrillDownView component. Aggregation and tab
// rendering are inside the view; this page is just the data plumbing
// and the auth gate.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import DrillDownView from './_DrillDownView'
import { NAVY, TEAL, F } from '@/lib/constants'

export default function DrillDownPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [data, setData] = useState({ candidates: [], assessments: [], teamMembers: [], clients: [], accountType: 'employer', planType: 'subscription' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return
        if (!user) { router.replace('/login?next=/dashboard/drill-down'); return }
        setAuthChecked(true)

        // Mirror the main dashboard's permission/role detection so the
        // viewer sees the same scope of data: account_type drives tab
        // visibility, plan_type drives the upgrade prompts on PAYG.
        const { data: profile } = await supabase
          .from('users')
          .select('account_type, plan_type, plan')
          .eq('id', user.id)
          .maybeSingle()

        const accountType = profile?.account_type === 'agency' ? 'agency' : 'employer'
        const planType = (profile?.plan_type || profile?.plan || 'subscription').toLowerCase()

        // Resolve the user's team scope. Owners and managers see the full
        // team; consultants only see their own activity.
        let allowedUserIds = [user.id]
        let memberRows = []
        try {
          const { data: members } = await supabase
            .from('team_members')
            .select('id, user_id, name, email, role, status, joined_at, last_active_at')
            .eq('account_id', user.id)
            .eq('status', 'active')
          if (members && members.length) {
            memberRows = members
            allowedUserIds = members.map(m => m.user_id).filter(Boolean)
            if (!allowedUserIds.includes(user.id)) allowedUserIds.push(user.id)
          }
        } catch (_) {
          // team_members table missing or RLS blocks: stay in single-user mode.
        }

        const { data: cands } = await supabase
          .from('candidates')
          .select('*, stage, assessments!inner(role_title, id, employment_type, created_at, location, client_name, team_member_id), results(overall_score, risk_level, percentile, pressure_fit_score)')
          .in('user_id', allowedUserIds)
          .neq('status', 'archived')
          .order('invited_at', { ascending: false })

        const { data: assess } = await supabase
          .from('assessments')
          .select('*')
          .in('user_id', allowedUserIds)

        // Optional clients table. If the deployment has not run the
        // migration that introduces it (or has no rows yet) the tab will
        // render an empty state.
        let clientRows = []
        try {
          const { data: cl } = await supabase
            .from('clients')
            .select('id, name, sector, primary_contact, last_activity_at')
            .eq('account_id', user.id)
          clientRows = cl || []
        } catch (_) {
          // clients table not in schema yet: empty list, view shows
          // the empty state with the Settings, Clients link.
        }

        if (cancelled) return
        setData({
          candidates: cands || [],
          assessments: assess || [],
          teamMembers: memberRows,
          clients: clientRows,
          accountType,
          planType,
        })
      } catch (err) {
        console.error('[drill-down] load failed:', err?.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [router])

  if (!authChecked) {
    return <div style={{ minHeight: '100vh', background: '#f7f9fb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, color: NAVY }}>Checking access...</div>
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f9fb' }}>
      <Sidebar active="drill-down" />
      <main style={{ flex: 1, minWidth: 0 }}>
        {loading ? (
          <div style={{ padding: 40, fontFamily: F, color: TEAL }}>Loading drill-down...</div>
        ) : (
          <DrillDownView {...data} />
        )}
      </main>
    </div>
  )
}
