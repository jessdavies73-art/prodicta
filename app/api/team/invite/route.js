import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
import { getTeamContext, isOwnerOrManager } from '@/lib/team'
import { PLANS } from '@/lib/stripe'
import { EMAIL_FROM } from '@/lib/email-sender'

const ALLOWED_ROLES = new Set(['manager', 'consultant'])
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://prodicta.co.uk'

function getResend() { return new Resend(process.env.RESEND_API_KEY) }

export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createServiceClient()
    const ctx = await getTeamContext(admin, user.id)
    if (!isOwnerOrManager(ctx.role)) {
      return NextResponse.json({ error: 'Only owners and managers can invite team members.' }, { status: 403 })
    }

    // Plan gating. PAYG is blocked outright; subscription plans are limited to
    // PLANS[plan].userLimit + any purchased extra seats on users.user_limit_extra.
    const { data: accountRow } = await admin
      .from('users')
      .select('plan, plan_type, user_limit_extra')
      .eq('id', ctx.accountId)
      .maybeSingle()

    const planType = accountRow?.plan_type || null
    if (planType === 'payg' || accountRow?.plan === 'payg') {
      return NextResponse.json({
        error: 'Team management is not available on PAYG. Upgrade to a subscription plan to invite team members.',
        payg: true,
      }, { status: 403 })
    }

    const planKey = (accountRow?.plan || 'starter').toLowerCase()
    const planMeta = PLANS[planKey]
    const baseLimit = typeof planMeta?.userLimit === 'number' ? planMeta.userLimit : 2
    const extraSeats = accountRow?.user_limit_extra || 0
    const userLimit = baseLimit + extraSeats

    const { count: usedCount, error: countErr } = await admin
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', ctx.accountId)
      .in('status', ['active', 'invited'])
    if (countErr && countErr.code !== '42P01') {
      console.error('[team/invite] seat count failed', countErr.message)
      return NextResponse.json({ error: 'Could not verify team seat usage.' }, { status: 500 })
    }
    const used = usedCount || 0

    if (used >= userLimit) {
      const planLabel = planMeta?.label || 'current'
      return NextResponse.json({
        error: `Your ${planLabel} plan allows ${userLimit} user${userLimit === 1 ? '' : 's'}. Add an extra seat or upgrade your plan.`,
        limit: userLimit,
        used,
        plan: planKey,
        canAddSeat: true,
      }, { status: 403 })
    }

    const body = await request.json()
    const email = (body?.email || '').toString().trim().toLowerCase()
    const name  = (body?.name  || '').toString().trim().slice(0, 120)
    const role  = (body?.role  || 'consultant').toString().toLowerCase()

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 })
    }
    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: 'Invalid role. Use manager or consultant.' }, { status: 400 })
    }

    // Reject duplicate invites on the same account.
    const { data: existing } = await admin
      .from('team_members')
      .select('id, status')
      .eq('account_id', ctx.accountId)
      .eq('email', email)
      .maybeSingle()
    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({ error: 'That email is already an active team member.' }, { status: 409 })
      }
      if (existing.status === 'invited') {
        return NextResponse.json({ error: 'That email already has a pending invitation.', member_id: existing.id }, { status: 409 })
      }
    }

    const { data: inserted, error: insertErr } = await admin
      .from('team_members')
      .insert({
        account_id: ctx.accountId,
        email,
        name: name || null,
        role,
        status: 'invited',
        invited_by: user.id,
        invited_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (insertErr || !inserted) {
      console.error('[team/invite] insert failed', insertErr?.message)
      return NextResponse.json({ error: insertErr?.message || 'Insert failed' }, { status: 500 })
    }

    // Company name for the email body. Fall back to the inviter's email if
    // the users row has no company_name.
    const { data: ownerRow } = await admin
      .from('users')
      .select('company_name, email')
      .eq('id', ctx.accountId)
      .maybeSingle()
    const companyName = ownerRow?.company_name || ownerRow?.email || 'your team'

    const inviteUrl = `${SITE_URL}/invite/${inserted.id}`
    const roleLabel = role === 'manager' ? 'Manager' : 'Consultant'
    const subject = `You have been invited to join ${companyName} on PRODICTA`

    try {
      if (process.env.RESEND_API_KEY) {
        await getResend().emails.send({
          from: EMAIL_FROM,
          to: email,
          subject,
          html: `
            <div style="font-family:'Outfit',system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <div style="background:#0f2137;padding:18px 26px;border-radius:12px 12px 0 0">
                <span style="color:#00BFA5;font-size:20px;font-weight:800">PRODICTA</span>
              </div>
              <div style="background:#ffffff;border:1px solid #e4e9f0;border-top:none;padding:26px 26px 28px;border-radius:0 0 12px 12px">
                <h2 style="color:#0f172a;margin:0 0 10px;font-size:20px;font-weight:800">You have been invited to join ${companyName}</h2>
                <p style="color:#0f172a;margin:0 0 16px;font-size:14.5px;line-height:1.65">
                  You have been invited to join ${companyName}'s PRODICTA account as a <strong>${roleLabel}</strong>. Click below to accept your invitation and set up your account.
                </p>
                <a href="${inviteUrl}" style="display:inline-block;margin-top:6px;padding:12px 22px;background:#00BFA5;color:#0f2137;font-weight:800;text-decoration:none;border-radius:8px;font-size:14px">
                  Accept invitation
                </a>
                <p style="color:#5e6b7f;margin:18px 0 0;font-size:12px;line-height:1.6">
                  If the button does not work, paste this link into your browser:<br/>
                  <span style="color:#0f172a">${inviteUrl}</span>
                </p>
              </div>
              <p style="color:#94a1b3;font-size:11px;margin:12px 0 0;text-align:center">Sent via PRODICTA</p>
            </div>
          `,
        })
        console.log('[team/invite] email sent', { memberId: inserted.id, email })
      } else {
        console.warn('[team/invite] email skipped, RESEND_API_KEY not set', { memberId: inserted.id })
      }
    } catch (emailErr) {
      console.error('[team/invite] email failed', { memberId: inserted.id, error: emailErr?.message })
    }

    return NextResponse.json({ success: true, member_id: inserted.id })
  } catch (err) {
    console.error('[team/invite] unhandled error', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
