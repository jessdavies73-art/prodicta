'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import HighlightReel from './HighlightReelView'

export default function HighlightReelPage({ params }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: candidate } = await supabase
        .from('candidates')
        .select('id, name, assessments(role_title, role_level, employment_type, users(account_type))')
        .eq('id', params.candidateId)
        .single()

      const { data: result } = await supabase
        .from('results')
        .select('overall_score, risk_level, hiring_confidence, strengths, watchouts, pressure_fit_score, execution_reliability, spoken_delivery_score, ai_summary, interview_questions, candidate_type, workspace_block_scores')
        .eq('candidate_id', params.candidateId)
        .maybeSingle()

      if (!candidate || !result) { setLoading(false); return }

      setData({
        name: candidate.name,
        role: candidate.assessments?.role_title,
        roleLevel: candidate.assessments?.role_level || 'MID_LEVEL',
        // Surface the assessment owner's account type (agency vs employer)
        // and employment_type so the Share modal can render the right
        // copy variant. Only used on the signed-in path; the public
        // /reel/[token] route never opens the Share modal.
        accountType: candidate.assessments?.users?.account_type || null,
        employmentType: candidate.assessments?.employment_type || null,
        assessmentId: params.id,
        candidateId: params.candidateId,
        ...result,
      })
      setLoading(false)
    }
    load()
  }, [params.candidateId])

  if (loading) return <div style={{ minHeight: '100vh', background: '#0f2137', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00BFA5', fontFamily: "'Outfit',sans-serif", fontSize: 16 }}>Loading highlight reel...</div>
  if (!data) return <div style={{ minHeight: '100vh', background: '#0f2137', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 16 }}>No results available.</div>

  return <HighlightReel data={data} canShare />
}
