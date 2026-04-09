import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const adminClient = createServiceClient()

    const { data: profile } = await adminClient
      .from('users')
      .select('account_type')
      .eq('id', user.id)
      .single()

    if (profile?.account_type !== 'agency') {
      return NextResponse.json({ error: 'Agency accounts only' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('logo')
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const ext = file.name?.split('.').pop()?.toLowerCase() || 'png'
    if (!['png', 'jpg', 'jpeg'].includes(ext)) {
      return NextResponse.json({ error: 'Only PNG and JPEG files are accepted' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 2MB' }, { status: 400 })
    }

    const filePath = `${user.id}/logo.${ext}`

    const { error: uploadErr } = await adminClient.storage
      .from('logos')
      .upload(filePath, buffer, {
        contentType: file.type || `image/${ext}`,
        upsert: true,
      })

    if (uploadErr) {
      console.error('Logo upload error:', uploadErr)
      return NextResponse.json({ error: uploadErr.message }, { status: 500 })
    }

    const { data: urlData } = adminClient.storage.from('logos').getPublicUrl(filePath)
    const publicUrl = urlData?.publicUrl || ''

    // Store URL in users table
    // NOTE: requires ALTER TABLE users ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
    const { error: updateErr } = await adminClient
      .from('users')
      .update({ company_logo_url: publicUrl })
      .eq('id', user.id)

    if (updateErr) {
      console.error('Logo URL save error:', updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('Upload logo error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
