import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { scoreCandidate } from '@/lib/score-candidate'

export const maxDuration = 180

export async function POST(request, { params }) {
  try {
    const adminClient = createServiceClient()

    const { data: candidate, error } = await adminClient
      .from('candidates')
      .select('id')
      .eq('unique_link', params.token)
      .single()

    if (error || !candidate) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const result = await scoreCandidate(candidate.id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Score route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
