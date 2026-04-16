import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prodicta.co.uk'

function pulseEmailHtml({ pulseId, workerName, clientCompany, startDate, pulseNumber, bodyText }) {
  const fmtDate = new Date(startDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const responseUrl = (response) => `${appUrl}/api/engagement?pulse_id=${pulseId}&response=${response}`
  const trackUrl = `${appUrl}/api/engagement?pulse_id=${pulseId}&track=1`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:'Outfit',Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<div style="background:#0F2137;border-radius:12px 12px 0 0;padding:24px 28px;text-align:center">
  <div style="display:inline-flex;align-items:center;gap:10px">
    <span style="font-size:20px;font-weight:800;letter-spacing:-0.5px">
      <span style="color:#ffffff">PRO</span><span style="color:#00BFA5">DICTA</span>
    </span>
  </div>
</div>
<div style="background:#ffffff;padding:32px 28px;border:1px solid #e4e9f0;border-top:none">
  <p style="font-size:15px;color:#1a202c;line-height:1.65;margin:0 0 20px">Hi ${workerName},</p>
  <p style="font-size:15px;color:#1a202c;line-height:1.65;margin:0 0 28px">${bodyText.replace('[Client Company]', clientCompany).replace('[Date]', fmtDate)}</p>
  <div style="text-align:center;margin-bottom:28px">
    <a href="${responseUrl('confirmed')}" style="display:inline-block;padding:12px 28px;border-radius:8px;background:#00BFA5;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;margin:0 6px 10px">Yes, all good</a>
    <a href="${responseUrl('question')}" style="display:inline-block;padding:12px 28px;border-radius:8px;background:#D97706;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;margin:0 6px 10px">I have a question</a>
    <a href="${responseUrl('concern')}" style="display:inline-block;padding:12px 28px;border-radius:8px;background:#B91C1C;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;margin:0 6px 10px">Something has come up</a>
  </div>
  <p style="font-size:12px;color:#94a1b3;line-height:1.5;margin:0">This is an automated engagement check from PRODICTA. If you have any issues, please contact your recruitment consultant directly.</p>
</div>
<div style="background:#0F2137;border-radius:0 0 12px 12px;padding:20px 28px;text-align:center">
  <p style="font-size:11px;color:rgba(255,255,255,0.5);margin:0;line-height:1.5">Powered by PRODICTA — Predictive Hiring Intelligence<br>prodicta.co.uk</p>
</div>
</div>
<img src="${trackUrl}" width="1" height="1" style="display:none" alt="" />
</body>
</html>`
}

const PULSE_BODIES = {
  1: 'Are you all set for your start at [Client Company]? Any questions about the role before you begin?',
  2: 'Just checking in — still excited about starting on [Date]? Is there anything you need from us before then?',
  3: 'Big day tomorrow! You are starting at [Client Company]. Is everything confirmed and ready to go?',
}

// POST: schedule engagement pulses for a candidate
export async function POST(request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('account_type').eq('id', user.id).single()
  if (profile?.account_type !== 'agency') return NextResponse.json({ error: 'Agency accounts only' }, { status: 403 })

  const body = await request.json()
  const { candidate_id, assessment_id, worker_name, worker_email, client_company, start_date } = body
  if (!candidate_id || !start_date || !worker_email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const startMs = new Date(start_date + 'T00:00:00').getTime()
  const now = Date.now()
  const dayMs = 86400000

  // Pulse 1: 3 days after now (offer confirmation)
  // Pulse 2: 2 days before start
  // Pulse 3: 1 day before start
  const pulse1Date = new Date(now + 3 * dayMs).toISOString().slice(0, 10)
  const pulse2Date = new Date(startMs - 2 * dayMs).toISOString().slice(0, 10)
  const pulse3Date = new Date(startMs - 1 * dayMs).toISOString().slice(0, 10)

  const pulses = [
    { pulse_number: 1, pulse_type: 'confirmation', pulse_date: pulse1Date },
    { pulse_number: 2, pulse_type: 'check_in', pulse_date: pulse2Date },
    { pulse_number: 3, pulse_type: 'final_check', pulse_date: pulse3Date },
  ]

  // Delete existing pulses for this candidate (re-scheduling)
  await supabase.from('engagement_pulses').delete().eq('candidate_id', candidate_id).eq('user_id', user.id)

  const rows = pulses.map(p => ({
    user_id: user.id,
    candidate_id,
    assessment_id,
    worker_name: worker_name || '',
    worker_email: worker_email || '',
    start_date,
    pulse_number: p.pulse_number,
    pulse_type: p.pulse_type,
    pulse_sent_at: null,
    pulse_opened: false,
    pulse_completed: false,
    response: null,
  }))

  const { data: inserted, error } = await supabase.from('engagement_pulses').insert(rows).select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ pulses: inserted })
}

// GET: fetch engagement pulses for a candidate or all active pulses
export async function GET(request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const candidateId = searchParams.get('candidate_id')

  if (candidateId) {
    const { data: pulses } = await supabase
      .from('engagement_pulses')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('user_id', user.id)
      .order('pulse_number', { ascending: true })
    return NextResponse.json({ pulses: pulses || [] })
  }

  // Return all active pulse sequences (for dashboard panel)
  const { data: pulses } = await supabase
    .from('engagement_pulses')
    .select('*')
    .eq('user_id', user.id)
    .order('start_date', { ascending: true })
    .order('pulse_number', { ascending: true })

  // Group by candidate
  const grouped = {}
  for (const p of (pulses || [])) {
    if (!grouped[p.candidate_id]) {
      grouped[p.candidate_id] = {
        candidate_id: p.candidate_id,
        assessment_id: p.assessment_id,
        worker_name: p.worker_name,
        worker_email: p.worker_email,
        start_date: p.start_date,
        pulses: [],
        ghosting_risk: 'low',
      }
    }
    grouped[p.candidate_id].pulses.push(p)
  }

  // Calculate ghosting risk per candidate
  for (const cid of Object.keys(grouped)) {
    const g = grouped[cid]
    const startDate = new Date(g.start_date + 'T00:00:00')
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const daysUntil = Math.ceil((startDate - today) / 86400000)

    // Only show active sequences (start date not more than 7 days past)
    if (daysUntil < -7) { delete grouped[cid]; continue }

    g.days_until_start = daysUntil
    g.ghosting_risk = calculateGhostingRisk(g.pulses)
  }

  return NextResponse.json({ sequences: Object.values(grouped) })
}

function calculateGhostingRisk(pulses) {
  const sentPulses = pulses.filter(p => p.pulse_sent_at)
  if (sentPulses.length === 0) return 'low'

  // Immediate CRITICAL: "something has come up" response
  if (sentPulses.some(p => p.response === 'concern')) return 'critical'

  // Immediate CRITICAL: No response to pulse 3 after 24h
  const pulse3 = sentPulses.find(p => p.pulse_number === 3)
  if (pulse3 && !pulse3.pulse_completed && pulse3.pulse_sent_at) {
    const hoursSinceSent = (Date.now() - new Date(pulse3.pulse_sent_at).getTime()) / 3600000
    if (hoursSinceSent >= 24) return 'critical'
  }

  const noResponses = sentPulses.filter(p => p.response === 'no_response' || (!p.pulse_completed && p.pulse_sent_at && (Date.now() - new Date(p.pulse_sent_at).getTime()) >= 86400000)).length
  if (noResponses >= 2) return 'high'
  if (noResponses >= 1) return 'medium'

  return 'low'
}

// Re-export for cron
export { pulseEmailHtml, PULSE_BODIES, calculateGhostingRisk }
