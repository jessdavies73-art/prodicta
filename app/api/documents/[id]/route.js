import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

// GET /api/documents/[id] — returns a signed download URL (60 min expiry)
export async function GET(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const adminClient = createServiceClient()
    const { data: doc } = await adminClient
      .from('candidate_documents')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: signedUrl } = await adminClient.storage
      .from('Candidates prodicta')
      .createSignedUrl(doc.file_path, 3600)

    if (!signedUrl?.signedUrl) {
      return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 })
    }

    return NextResponse.redirect(signedUrl.signedUrl)
  } catch (err) {
    console.error('Document download error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/documents/[id] — deletes document from storage and DB
export async function DELETE(request, { params }) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const adminClient = createServiceClient()
    const { data: doc } = await adminClient
      .from('candidate_documents')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await adminClient.storage.from('Candidates prodicta').remove([doc.file_path])
    await adminClient.from('candidate_documents').delete().eq('id', doc.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Document delete error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
