import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request, { params }) {
  try {
    const { rating, feedback } = await request.json()
    const adminClient = createServiceClient()

    const { data: candidate } = await adminClient
      .from('candidates')
      .select('id')
      .eq('unique_link', params.token)
      .single()

    if (!candidate) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await adminClient
      .from('candidates')
      .update({
        rating: rating ?? null,
        feedback: feedback?.trim() || null,
      })
      .eq('id', candidate.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Rate error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
