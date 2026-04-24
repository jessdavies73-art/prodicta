import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { EMAIL_FROM } from '@/lib/email-sender'

function calculateRisk({ startConfirmed, inContact, hesitation, counterOfferRisk }) {
  let ghostingRisk = 'low'
  let counterRisk = 'low'

  if (!startConfirmed && inContact === 'no') ghostingRisk = 'high'
  else if (!startConfirmed || inContact === 'no') ghostingRisk = 'medium'
  else if (inContact === 'not_attempted') ghostingRisk = 'medium'

  if (counterOfferRisk && hesitation) counterRisk = 'high'
  else if (counterOfferRisk || hesitation) counterRisk = 'medium'

  let overall = 'low'
  if (ghostingRisk === 'high' || counterRisk === 'high') overall = 'high'
  else if (ghostingRisk === 'medium' || counterRisk === 'medium') overall = 'medium'

  return { ghostingRisk, counterOfferRisk: counterRisk, overall }
}

/* ─── GET: fetch prestart checks for upcoming starts ─── */
export async function GET(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createServiceClient()

    const { searchParams } = new URL(request.url)
    const candidateId = searchParams.get('candidate_id')

    if (candidateId) {
      const { data: checks } = await admin
        .from('prestart_checks')
        .select('*')
        .eq('candidate_id', candidateId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
      return NextResponse.json({ check: checks?.[0] || null })
    }

    // Dashboard: upcoming starts within 7 days
    const today = new Date()
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const { data: reviews } = await admin
      .from('assignment_reviews')
      .select('candidate_id, assessment_id, worker_name, role_title, client_company, assignment_start_date')
      .eq('user_id', user.id)
      .gte('assignment_start_date', today.toISOString().slice(0, 10))
      .lte('assignment_start_date', nextWeek.toISOString().slice(0, 10))

    // Get existing checks for these candidates
    const candIds = (reviews || []).map(r => r.candidate_id)
    let checksByCandidate = {}
    if (candIds.length > 0) {
      const { data: checks } = await admin
        .from('prestart_checks')
        .select('*')
        .eq('user_id', user.id)
        .in('candidate_id', candIds)
        .order('created_at', { ascending: false })
      for (const c of checks || []) {
        if (!checksByCandidate[c.candidate_id]) checksByCandidate[c.candidate_id] = c
      }
    }

    const upcoming = (reviews || []).map(r => ({
      ...r,
      prestart_check: checksByCandidate[r.candidate_id] || null,
      days_until_start: Math.ceil((new Date(r.assignment_start_date + 'T00:00:00') - today) / 86400000),
    }))

    return NextResponse.json({ upcoming })
  } catch (err) {
    console.error('Prestart check GET error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/* ─── POST: create prestart check ─── */
export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await request.json()
    const { candidate_id, assessment_id, worker_name, role_title, client_company, start_date, start_confirmed, in_contact, hesitation, counter_offer_flag, notes } = body

    if (!candidate_id || !start_date) {
      return NextResponse.json({ error: 'candidate_id and start_date are required' }, { status: 400 })
    }

    const risk = calculateRisk({
      startConfirmed: start_confirmed,
      inContact: in_contact,
      hesitation,
      counterOfferRisk: counter_offer_flag,
    })

    const admin = createServiceClient()

    const { data: check, error } = await admin
      .from('prestart_checks')
      .insert({
        user_id: user.id,
        candidate_id,
        assessment_id: assessment_id || null,
        worker_name: worker_name || null,
        role_title: role_title || null,
        client_company: client_company || null,
        start_date,
        check_date: new Date().toISOString().slice(0, 10),
        counter_offer_risk: risk.counterOfferRisk,
        engagement_level: in_contact === 'yes' ? 'engaged' : in_contact === 'not_attempted' ? 'unknown' : 'disengaged',
        ghosting_risk: risk.ghostingRisk,
        overall_risk: risk.overall,
        notes: notes || null,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Prestart check insert error:', error)
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    // Send email alert if high risk
    if (risk.overall === 'high' && process.env.RESEND_API_KEY) {
      try {
        const { data: profile } = await admin.from('users').select('email').eq('id', user.id).single()
        if (profile?.email) {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.prodicta.co.uk'
          const trackerUrl = assessment_id ? `${siteUrl}/assessment/${assessment_id}/candidate/${candidate_id}/assignment-review` : siteUrl
          const resend = new Resend(process.env.RESEND_API_KEY)
          await resend.emails.send({
            from: EMAIL_FROM,
            to: profile.email,
            subject: `Pre-Start Risk Alert \u2014 ${worker_name || 'Worker'} starting ${start_date}`,
            html: `
              <div style="font-family:'Outfit',system-ui,sans-serif;max-width:560px;margin:0 auto">
                <div style="background:#0f2137;padding:20px 28px;border-radius:12px 12px 0 0">
                  <span style="color:#00BFA5;font-size:20px;font-weight:800">PRODICTA</span>
                  <span style="color:rgba(255,255,255,0.5);font-size:14px;margin-left:8px">Pre-Start Risk Alert</span>
                </div>
                <div style="background:#fef2f2;border:1px solid #fecaca;border-top:none;padding:24px 28px;border-radius:0 0 12px 12px">
                  <h2 style="color:#B91C1C;margin:0 0 12px;font-size:18px">High pre-start risk detected</h2>
                  <p style="color:#0f172a;margin:0 0 8px;font-size:14px"><strong>Worker:</strong> ${worker_name || 'N/A'}</p>
                  <p style="color:#0f172a;margin:0 0 8px;font-size:14px"><strong>Role:</strong> ${role_title || 'N/A'}</p>
                  <p style="color:#0f172a;margin:0 0 8px;font-size:14px"><strong>Client:</strong> ${client_company || 'N/A'}</p>
                  <p style="color:#0f172a;margin:0 0 16px;font-size:14px"><strong>Start date:</strong> ${start_date}</p>
                  <div style="background:#fff;border:1px solid #e4e9f0;border-radius:8px;padding:16px;margin-bottom:16px">
                    <p style="font-weight:700;color:#0f172a;margin:0 0 8px;font-size:14px">Risk factors</p>
                    <p style="color:#4a5568;margin:0 0 4px;font-size:13px">Ghosting risk: <strong style="color:${risk.ghostingRisk === 'high' ? '#B91C1C' : '#D97706'}">${risk.ghostingRisk}</strong></p>
                    <p style="color:#4a5568;margin:0 0 4px;font-size:13px">Counter-offer risk: <strong style="color:${risk.counterOfferRisk === 'high' ? '#B91C1C' : '#D97706'}">${risk.counterOfferRisk}</strong></p>
                  </div>
                  <div style="background:#fff;border:1px solid #e4e9f0;border-radius:8px;padding:16px;margin-bottom:16px">
                    <p style="font-weight:700;color:#0f172a;margin:0 0 8px;font-size:14px">Recommended actions</p>
                    <ul style="color:#4a5568;margin:0;padding-left:18px;font-size:13px;line-height:1.8">
                      <li>Call the worker today to confirm their start date</li>
                      <li>Check for counter-offer signals</li>
                      <li>Have a backup candidate ready</li>
                    </ul>
                  </div>
                  <a href="${trackerUrl}" style="display:inline-block;background:#0f2137;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">View Assignment Tracker</a>
                </div>
              </div>`,
          })
        }
      } catch (emailErr) {
        console.error('Pre-start alert email error:', emailErr)
      }
    }

    return NextResponse.json({ check, risk })
  } catch (err) {
    console.error('Prestart check POST error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
