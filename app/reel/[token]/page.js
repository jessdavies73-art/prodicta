'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function SharedReelPage({ params }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: result } = await supabase
        .from('results')
        .select('candidate_id, overall_score, risk_level, hiring_confidence, strengths, watchouts, pressure_fit_score, execution_reliability, spoken_delivery_score, ai_summary, interview_questions, candidate_type, candidates(name, assessments(role_title, role_level))')
        .eq('highlight_reel_token', params.token)
        .maybeSingle()

      if (!result) { setLoading(false); return }

      setData({
        name: result.candidates?.name,
        role: result.candidates?.assessments?.role_title,
        roleLevel: result.candidates?.assessments?.role_level || 'MID_LEVEL',
        candidateId: result.candidate_id,
        overall_score: result.overall_score,
        risk_level: result.risk_level,
        hiring_confidence: result.hiring_confidence,
        strengths: result.strengths,
        watchouts: result.watchouts,
        pressure_fit_score: result.pressure_fit_score,
        execution_reliability: result.execution_reliability,
        spoken_delivery_score: result.spoken_delivery_score,
        ai_summary: result.ai_summary,
        interview_questions: result.interview_questions,
        candidate_type: result.candidate_type,
      })
      setLoading(false)
    }
    load()
  }, [params.token])

  if (loading) return <div style={{ minHeight: '100vh', background: '#0f2137', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00BFA5', fontFamily: "'Outfit',sans-serif", fontSize: 16 }}>Loading...</div>
  if (!data) return <div style={{ minHeight: '100vh', background: '#0f2137', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 16 }}>Reel not found or link has expired.</div>

  // Dynamic import to avoid SSR issues
  const HighlightReel = require('@/app/assessment/[id]/candidate/[candidateId]/highlight-reel/HighlightReelView').default
  return <HighlightReel data={data} canShare={false} />
}
