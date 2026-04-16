import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

function getResend() { return new Resend(process.env.RESEND_API_KEY) }

const VALID_STATUSES = ['present', 'late', 'left_early', 'absent', 'unauthorised_absence']

function calculateReliabilityScore(records) {
  let score = 100
  for (const r of records) {
    if (r.status === 'late' || r.status === 'left_early') score -= 5
    else if (r.status === 'absent') score -= 10
    else if (r.status === 'unauthorised_absence') score -= 20
  }
  return Math.max(score, 0)
}

/* ─── GET: fetch attendance records for a candidate ─── */
export async function GET(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const candidateId = searchParams.get('candidate_id')
    if (!candidateId) {
      return NextResponse.json({ error: 'candidate_id is required' }, { status: 400 })
    }

    const admin = createServiceClient()

    const { data: records, error } = await admin
      .from('attendance_records')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('record_date', { ascending: false })

    if (error) {
      console.error('Attendance fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 })
    }

    return NextResponse.json({ records })
  } catch (err) {
    console.error('Attendance GET error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/* ─── POST: create attendance record and update reliability ─── */
export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await request.json()
    const {
      candidate_id,
      assessment_id,
      worker_name,
      role_title,
      client_company,
      record_date,
      status,
      notes,
    } = body

    if (!candidate_id || !record_date || !status) {
      return NextResponse.json({ error: 'candidate_id, record_date, and status are required' }, { status: 400 })
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }

    const admin = createServiceClient()

    // Insert attendance record
    const { data: record, error: insertError } = await admin
      .from('attendance_records')
      .insert({
        user_id: user.id,
        candidate_id,
        assessment_id: assessment_id || null,
        worker_name: worker_name || null,
        role_title: role_title || null,
        client_company: client_company || null,
        record_date,
        status,
        notes: notes || null,
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('Attendance insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create attendance record' }, { status: 500 })
    }

    // Fetch all attendance records for this candidate to calculate reliability
    const { data: allRecords } = await admin
      .from('attendance_records')
      .select('status')
      .eq('candidate_id', candidate_id)

    const reliabilityScore = calculateReliabilityScore(allRecords || [])
    const attendanceRisk = reliabilityScore >= 80 ? 'low' : reliabilityScore >= 60 ? 'monitor' : 'high'

    // Build update payload for assignment_reviews
    const reviewUpdate = {
      reliability_score: reliabilityScore,
      attendance_risk: attendanceRisk,
    }

    if (reliabilityScore < 60) {
      reviewUpdate.placement_health = 'red'
    } else if (reliabilityScore < 80) {
      // Set to amber only if not already red
      const { data: currentReview } = await admin
        .from('assignment_reviews')
        .select('placement_health')
        .eq('candidate_id', candidate_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (currentReview?.placement_health !== 'red') {
        reviewUpdate.placement_health = 'amber'
      }
    }

    await admin
      .from('assignment_reviews')
      .update(reviewUpdate)
      .eq('candidate_id', candidate_id)
      .eq('user_id', user.id)

    // Send email alert if reliability drops below 80
    if (reliabilityScore < 80 && user.email) {
      try {
        const presentCount = (allRecords || []).filter(r => r.status === 'present').length
        const lateCount = (allRecords || []).filter(r => r.status === 'late').length
        const leftEarlyCount = (allRecords || []).filter(r => r.status === 'left_early').length
        const absentCount = (allRecords || []).filter(r => r.status === 'absent').length
        const unauthorisedCount = (allRecords || []).filter(r => r.status === 'unauthorised_absence').length

        const trackerUrl = assessment_id
          ? `https://prodicta.co.uk/assessment/${assessment_id}/candidate/${candidate_id}/assignment-review`
          : `https://prodicta.co.uk/candidates/${candidate_id}`

        await getResend().emails.send({
          from: 'PRODICTA Alerts <alerts@prodicta.co.uk>',
          to: user.email,
          subject: `Attendance Alert \u2014 ${worker_name || 'Worker'} at ${client_company || 'Client'}`,
          html: `
            <div style="font-family:'Outfit',system-ui,sans-serif;max-width:560px;margin:0 auto">
              <div style="background:#0f2137;padding:20px 28px;border-radius:12px 12px 0 0">
                <span style="color:#00BFA5;font-size:20px;font-weight:800">PRODICTA</span>
                <span style="color:rgba(255,255,255,0.5);font-size:14px;margin-left:8px">Attendance Alert</span>
              </div>
              <div style="background:#fffbeb;border:1px solid #fde68a;border-top:none;padding:24px 28px;border-radius:0 0 12px 12px">
                <h2 style="color:#92400E;margin:0 0 12px;font-size:18px">Attendance concern for ${worker_name || 'Worker'}</h2>
                <p style="color:#0f172a;margin:0 0 8px;font-size:14px;line-height:1.6"><strong>Role:</strong> ${role_title || 'N/A'}</p>
                <p style="color:#0f172a;margin:0 0 8px;font-size:14px;line-height:1.6"><strong>Client:</strong> ${client_company || 'N/A'}</p>
                <p style="color:#0f172a;margin:0 0 16px;font-size:14px;line-height:1.6"><strong>Reliability Score:</strong> ${reliabilityScore}/100 (${attendanceRisk} risk)</p>
                <div style="background:#fff;border:1px solid #e4e9f0;border-radius:8px;padding:16px;margin-bottom:16px">
                  <p style="font-weight:700;color:#0f172a;margin:0 0 8px;font-size:14px">Attendance Summary</p>
                  <table style="width:100%;font-size:13px;color:#4a5568;border-collapse:collapse">
                    <tr><td style="padding:4px 0">Present</td><td style="padding:4px 0;text-align:right;font-weight:600">${presentCount}</td></tr>
                    <tr><td style="padding:4px 0">Late</td><td style="padding:4px 0;text-align:right;font-weight:600">${lateCount}</td></tr>
                    <tr><td style="padding:4px 0">Left Early</td><td style="padding:4px 0;text-align:right;font-weight:600">${leftEarlyCount}</td></tr>
                    <tr><td style="padding:4px 0">Absent</td><td style="padding:4px 0;text-align:right;font-weight:600">${absentCount}</td></tr>
                    <tr><td style="padding:4px 0">Unauthorised Absence</td><td style="padding:4px 0;text-align:right;font-weight:600">${unauthorisedCount}</td></tr>
                  </table>
                </div>
                <a href="${trackerUrl}" style="display:inline-block;background:#0f2137;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">View Assignment Tracker</a>
              </div>
            </div>`,
        })
      } catch (emailErr) {
        console.error('Attendance alert email error:', emailErr)
      }
    }

    return NextResponse.json({
      record,
      reliability_score: reliabilityScore,
      attendance_risk: attendanceRisk,
    })
  } catch (err) {
    console.error('Attendance POST error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
