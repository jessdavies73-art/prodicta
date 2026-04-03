import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

// Supabase setup required:
// 1. Storage bucket named "Candidates prodicta" must exist (private, 5MB limit, PDF/DOC/DOCX)
// 2. Run the SQL in supabase-schema.sql to create the candidate_documents table

export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file')
    const candidateId = formData.get('candidateId')
    const docType = formData.get('docType')

    if (!file || !candidateId || !docType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!['cv', 'cover_letter'].includes(docType)) {
      return NextResponse.json({ error: 'Invalid doc type' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    const adminClient = createServiceClient()

    // Verify candidate belongs to this user and get assessment_id for storage path
    const { data: candidate } = await adminClient
      .from('candidates')
      .select('id, assessment_id')
      .eq('id', candidateId)
      .eq('user_id', user.id)
      .single()
    if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })

    // Delete existing document of same type if present
    const { data: existing } = await adminClient
      .from('candidate_documents')
      .select('id, file_path')
      .eq('candidate_id', candidateId)
      .eq('user_id', user.id)
      .eq('doc_type', docType)
      .maybeSingle()

    if (existing) {
      await adminClient.storage.from('Candidates prodicta').remove([existing.file_path])
      await adminClient.from('candidate_documents').delete().eq('id', existing.id)
    }

    // Upload new file — organised by assessment_id/candidate_id/
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = file.name.split('.').pop() || 'pdf'
    const filePath = `${candidate.assessment_id}/${candidateId}/${docType}_${Date.now()}.${ext}`

    const { error: uploadError } = await adminClient.storage
      .from('Candidates prodicta')
      .upload(filePath, buffer, { contentType: file.type || 'application/octet-stream', upsert: false })

    if (uploadError) throw uploadError

    // Insert DB record
    const { data: doc, error: dbError } = await adminClient
      .from('candidate_documents')
      .insert({
        candidate_id: candidateId,
        user_id: user.id,
        doc_type: docType,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
      })
      .select()
      .single()

    if (dbError) {
      await adminClient.storage.from('Candidates prodicta').remove([filePath])
      throw dbError
    }

    return NextResponse.json({ document: doc })
  } catch (err) {
    console.error('Document upload error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
