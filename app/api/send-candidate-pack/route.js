import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

const sc   = s => s >= 85 ? '#10b981' : s >= 70 ? '#00BFA5' : s >= 50 ? '#f59e0b' : '#ef4444'
const slbl = s => s >= 85 ? 'Excellent' : s >= 75 ? 'Strong' : s >= 65 ? 'Good' : s >= 50 ? 'Developing' : 'Concern'
const dL   = s => s >= 80 ? 'Strong hire' : s >= 70 ? 'Hire with plan' : s >= 55 ? 'Proceed with caution' : 'Not recommended'
const dC   = s => s >= 80 ? '#10b981' : s >= 70 ? '#00BFA5' : s >= 55 ? '#f59e0b' : '#ef4444'

function sevColor(sev) {
  if (sev === 'High')   return '#ef4444'
  if (sev === 'Medium') return '#f59e0b'
  return '#94a3b8'
}

export async function POST(request) {
  try {
    const { candidateId, clientEmail, message } = await request.json()
    if (!candidateId || !clientEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const adminClient = createServiceClient()

    // Fetch all required data in parallel
    const [
      { data: candidate },
      { data: results },
      { data: profile },
      { data: docList },
    ] = await Promise.all([
      adminClient.from('candidates').select('*, assessments(role_title)').eq('id', candidateId).eq('user_id', user.id).single(),
      adminClient.from('results').select('*').eq('candidate_id', candidateId).maybeSingle(),
      adminClient.from('users').select('company_name, account_type').eq('id', user.id).maybeSingle(),
      adminClient.from('candidate_documents').select('*').eq('candidate_id', candidateId).eq('user_id', user.id),
    ])

    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    const companyName = profile?.company_name || 'Your recruiter'
    const roleTitle   = candidate.assessments?.role_title || 'the role'
    const score       = results?.overall_score ?? null
    const completedAt = candidate.completed_at
      ? new Date(candidate.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : null

    // Build strengths / watchouts / questions HTML snippets
    const strengths = Array.isArray(results?.strengths)
      ? results.strengths.slice(0, 3)
      : []
    const watchouts = Array.isArray(results?.watchouts)
      ? results.watchouts.slice(0, 3)
      : []
    const questions = Array.isArray(results?.interview_questions)
      ? results.interview_questions.slice(0, 4)
      : []

    function strengthRow(s) {
      const title   = typeof s === 'object' ? (s.title || '') : s
      const summary = typeof s === 'object' ? (s.summary || s.text || '') : ''
      return `<tr><td style="padding:8px 12px 8px 0;vertical-align:top;font-size:13px;color:#0f172a;font-weight:700;white-space:nowrap;">${title}</td><td style="padding:8px 0;font-size:13px;color:#5e6b7f;line-height:1.55;">${summary}</td></tr>`
    }

    function watchoutRow(w) {
      const sev   = typeof w === 'object' ? (w.severity || 'Medium') : 'Medium'
      const title = typeof w === 'object' ? (w.title || w.text || '') : w
      const text  = typeof w === 'object' ? (w.text || '') : ''
      return `<tr><td style="padding:8px 12px 8px 0;vertical-align:top;"><span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;background:${sev === 'High' ? '#fee2e2' : sev === 'Medium' ? '#fef3c7' : '#f1f5f9'};color:${sevColor(sev)};">${sev}</span></td><td style="padding:8px 0;font-size:13px;color:#5e6b7f;line-height:1.55;"><strong style="color:#0f172a;">${title}</strong>${text && title !== text ? ` — ${text}` : ''}</td></tr>`
    }

    function questionRow(q, i) {
      const text = typeof q === 'object' ? (q.question || q.text || '') : q
      return `<tr><td style="padding:6px 12px 6px 0;vertical-align:top;font-size:13px;font-weight:700;color:${dC(score ?? 0)};white-space:nowrap;">Q${i + 1}</td><td style="padding:6px 0;font-size:13px;color:#5e6b7f;line-height:1.55;">${text}</td></tr>`
    }

    // Download documents as attachments
    const attachments = []
    for (const doc of (docList || [])) {
      try {
        const { data: blob } = await adminClient.storage.from('candidate-documents').download(doc.file_path)
        if (blob) {
          const arrayBuffer = await blob.arrayBuffer()
          const base64 = Buffer.from(arrayBuffer).toString('base64')
          const label = doc.doc_type === 'cv' ? 'CV' : 'Cover Letter'
          attachments.push({ filename: `${label} - ${candidate.name}.pdf`, content: base64 })
        }
      } catch (e) {
        console.error(`Failed to download ${doc.doc_type}:`, e)
      }
    }

    const cvDoc    = (docList || []).find(d => d.doc_type === 'cv')
    const clDoc    = (docList || []).find(d => d.doc_type === 'cover_letter')

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f7f9fb;font-family:'Outfit',system-ui,sans-serif;">
  <div style="max-width:620px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#0f2137;padding:24px 36px;">
      <div style="color:#00BFA5;font-size:20px;font-weight:800;letter-spacing:-0.3px;">Prodicta</div>
      <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:2px;">Work Simulation Assessment</div>
    </div>

    <!-- Recruiter intro -->
    <div style="background:#f8fafc;padding:18px 36px;border-bottom:1px solid #e4e9f0;">
      <p style="margin:0;font-size:14px;color:#5e6b7f;line-height:1.6;">
        <strong style="color:#0f172a;">${companyName}</strong> has prepared this candidate brief for your review.
        ${message ? `<br><br><em style="color:#0f2137;">"${message}"</em>` : ''}
      </p>
    </div>

    <div style="padding:32px 36px;">

      <!-- Candidate name + role -->
      <div style="margin-bottom:24px;">
        <h1 style="margin:0 0 4px;font-size:26px;font-weight:800;color:#0f2137;letter-spacing:-0.5px;">${candidate.name}</h1>
        <div style="font-size:14px;color:#5e6b7f;font-weight:600;">${roleTitle}</div>
        ${completedAt ? `<div style="font-size:12.5px;color:#94a1b3;margin-top:3px;">Assessment completed ${completedAt}</div>` : ''}
      </div>

      ${score !== null ? `
      <!-- Score bar -->
      <div style="background:#f8fafc;border:1px solid #e4e9f0;border-left:4px solid ${sc(score)};border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;gap:20px;">
        <div style="text-align:center;min-width:64px;">
          <div style="font-size:36px;font-weight:800;color:${sc(score)};line-height:1;font-family:monospace;">${score}</div>
          <div style="font-size:11px;font-weight:700;color:${sc(score)};text-transform:uppercase;letter-spacing:0.04em;">${slbl(score)}</div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#94a1b3;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Hiring Recommendation</div>
          <div style="font-size:16px;font-weight:800;color:${dC(score)};">${dL(score)}</div>
          ${results?.pressure_fit_score != null ? `<div style="font-size:12.5px;color:#5e6b7f;margin-top:4px;">Pressure-Fit: <strong style="color:${sc(results.pressure_fit_score)};">${results.pressure_fit_score}/100</strong></div>` : ''}
        </div>
      </div>
      ` : ''}

      ${strengths.length ? `
      <!-- Strengths -->
      <div style="margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;color:#94a1b3;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #00BFA5;padding-bottom:8px;margin-bottom:12px;">Strengths</div>
        <table style="width:100%;border-collapse:collapse;">
          ${strengths.map(strengthRow).join('')}
        </table>
      </div>
      ` : ''}

      ${watchouts.length ? `
      <!-- Watch-outs -->
      <div style="margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;color:#94a1b3;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #0f2137;padding-bottom:8px;margin-bottom:12px;">Watch-outs</div>
        <table style="width:100%;border-collapse:collapse;">
          ${watchouts.map(watchoutRow).join('')}
        </table>
      </div>
      ` : ''}

      ${questions.length ? `
      <!-- Interview Questions -->
      <div style="margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;color:#94a1b3;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #0f2137;padding-bottom:8px;margin-bottom:12px;">Suggested Interview Questions</div>
        <table style="width:100%;border-collapse:collapse;">
          ${questions.map((q, i) => questionRow(q, i)).join('')}
        </table>
      </div>
      ` : ''}

      ${attachments.length ? `
      <!-- Attached documents -->
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px 18px;margin-bottom:8px;">
        <div style="font-size:12px;font-weight:700;color:#166534;margin-bottom:8px;">Attached Documents</div>
        ${cvDoc ? `<div style="font-size:13px;color:#15803d;margin-bottom:4px;">&#128206; CV / Résumé — ${cvDoc.file_name}</div>` : ''}
        ${clDoc ? `<div style="font-size:13px;color:#15803d;">&#128206; Cover Letter — ${clDoc.file_name}</div>` : ''}
      </div>
      ` : ''}

    </div>

    <!-- Footer -->
    <div style="background:#f7f9fb;padding:16px 36px;border-top:1px solid #e4e9f0;">
      <p style="font-size:12px;color:#94a1b3;margin:0;text-align:center;">
        Candidate brief prepared by <strong style="color:#0f2137;">${companyName}</strong> using
        <strong style="color:#00BFA5;">Prodicta</strong> work simulation assessments.
      </p>
    </div>
  </div>
</body>
</html>`

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: `${companyName} via Prodicta <reports@prodicta.co.uk>`,
      to: [clientEmail],
      subject: `Candidate Brief: ${candidate.name} — ${roleTitle}`,
      html,
      ...(attachments.length ? { attachments } : {}),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Send candidate pack error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
