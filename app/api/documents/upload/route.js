import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'

// Supabase setup required:
// 1. Create a storage bucket named "candidate-documents" (private, 10MB limit)
// 2. Run this SQL in Supabase SQL editor:
//
// CREATE TABLE IF NOT EXISTS candidate_documents (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   candidate_id UUID NOT NULL,
//   user_id UUID NOT NULL,
//   doc_type TEXT NOT NULL CHECK (doc_type IN ('cv', 'cover_letter')),
//   file_name TEXT NOT NULL,
//   file_path TEXT NOT NULL,
//   file_size INTEGER,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// ALTER TABLE candidate_documents ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users can manage own documents" ON candidate_documents
//   FOR ALL USING (user_id = auth.uid());

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
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const adminClient = createServiceClient()

    // Verify candidate belongs to this user
    const { data: candidate } = await adminClient
      .from('candidates')
      .select('id')
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
      await adminClient.storage.from('candidate-documents').remove([existing.file_path])
      await adminClient.from('candidate_documents').delete().eq('id', existing.id)
    }

    // Upload new file
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = file.name.split('.').pop() || 'pdf'
    const filePath = `${user.id}/${candidateId}/${docType}_${Date.now()}.${ext}`

    const { error: uploadError } = await adminClient.storage
      .from('candidate-documents')
      .upload(filePath, buffer, { contentType: file.type || 'application/pdf', upsert: false })

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
      await adminClient.storage.from('candidate-documents').remove([filePath])
      throw dbError
    }

    return NextResponse.json({ document: doc })
  } catch (err) {
    console.error('Document upload error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
