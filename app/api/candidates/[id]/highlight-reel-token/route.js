import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { v4 as uuid } from 'uuid'

// -- ALTER TABLE results ADD COLUMN IF NOT EXISTS highlight_reel_token TEXT;

export async function POST(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createServiceClient()

    const { data: result } = await admin
      .from('results')
      .select('highlight_reel_token')
      .eq('candidate_id', params.id)
      .maybeSingle()

    if (!result) return NextResponse.json({ error: 'No results found' }, { status: 404 })

    let token = result.highlight_reel_token
    if (!token) {
      token = uuid()
      await admin.from('results').update({ highlight_reel_token: token }).eq('candidate_id', params.id)
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.prodicta.co.uk'
    return NextResponse.json({ token, url: `${baseUrl}/reel/${token}` })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
