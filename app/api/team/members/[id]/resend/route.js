import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { getTeamContext, isOwnerOrManager } from '@/lib/team'
import { EMAIL_FROM } from '@/lib/email-sender'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://prodicta.co.uk'
function getResend() { return new Resend(process.env.RESEND_API_KEY) }

export async function POST(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createServiceClient()
    const ctx = await getTeamContext(admin, user.id)
    if (!isOwnerOrManager(ctx.role)) {
      return NextResponse.json({ error: 'Only owners and managers can resend invites.' }, { status: 403 })
    }

    const { data: member } = await admin
      .from('team_members')
      .select('id, account_id, email, role, status')
      .eq('id', params.id)
      .maybeSingle()
    if (!member || member.account_id !== ctx.accountId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (member.status !== 'invited') {
      return NextResponse.json({ error: 'Only pending invitations can be resent.' }, { status: 400 })
    }

    const { data: ownerRow } = await admin
      .from('users')
      .select('company_name, email')
      .eq('id', ctx.accountId)
      .maybeSingle()
    const companyName = ownerRow?.company_name || ownerRow?.email || 'your team'
    const roleLabel = member.role === 'manager' ? 'Manager' : 'Consultant'
    const inviteUrl = `${SITE_URL}/invite/${member.id}`

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured.' }, { status: 500 })
    }

    await getResend().emails.send({
      from: EMAIL_FROM,
      to: member.email,
      subject: `Reminder, you have been invited to join ${companyName} on PRODICTA`,
      html: `
        <div style="font-family:'Outfit',system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
          <div style="background:#0f2137;padding:18px 26px;border-radius:12px 12px 0 0">
            <span style="color:#00BFA5;font-size:20px;font-weight:800">PRODICTA</span>
          </div>
          <div style="background:#ffffff;border:1px solid #e4e9f0;border-top:none;padding:26px 26px 28px;border-radius:0 0 12px 12px">
            <h2 style="color:#0f172a;margin:0 0 10px;font-size:20px;font-weight:800">Your invitation is waiting</h2>
            <p style="color:#0f172a;margin:0 0 16px;font-size:14.5px;line-height:1.65">
              A reminder that you have been invited to join ${companyName}'s PRODICTA account as a <strong>${roleLabel}</strong>. Click below to accept.
            </p>
            <a href="${inviteUrl}" style="display:inline-block;margin-top:6px;padding:12px 22px;background:#00BFA5;color:#0f2137;font-weight:800;text-decoration:none;border-radius:8px;font-size:14px">
              Accept invitation
            </a>
          </div>
        </div>
      `,
    })

    await admin
      .from('team_members')
      .update({ invited_at: new Date().toISOString() })
      .eq('id', member.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[team/resend] unhandled error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
