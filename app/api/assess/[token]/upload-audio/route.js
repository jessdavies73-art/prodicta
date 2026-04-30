import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// Upload-on-capture endpoint for candidate voice responses. Called from
// the client immediately after MediaRecorder.onstop fires so audio
// survives a browser refresh or connection drop. Writes to the same
// path the existing submit-time uploader uses
// (recordings/{assessment_id}/{candidate_id}/scenario_{idx}.webm) so
// the submit handler's existing upsert: true upload becomes a harmless
// fallback rather than a duplicate write.
//
// Auth model matches the rest of /api/assess/[token]: possession of the
// unique link is the credential. The client may not pass arbitrary
// candidate / assessment IDs; the route looks them up from the token
// before writing to storage.
//
// Best-effort: if Supabase Storage is unreachable, the route returns a
// 502 so the client can leave the audio in client memory and try again
// at submit time. The candidate is never blocked.

const MAX_BYTES = 6 * 1024 * 1024 // 6 MB; matches bucket file_size_limit
const ALLOWED_MIME = new Set([
  'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav',
])

function extFor(mime) {
  if (mime === 'audio/webm') return 'webm'
  if (mime === 'audio/ogg') return 'ogg'
  if (mime === 'audio/mpeg') return 'mp3'
  if (mime === 'audio/mp4') return 'm4a'
  if (mime === 'audio/wav') return 'wav'
  return 'webm'
}

export async function POST(request, { params }) {
  try {
    const form = await request.formData().catch(() => null)
    if (!form) {
      return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 })
    }
    const file = form.get('audio')
    const scenarioIndexRaw = form.get('scenario_index')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Missing audio file.' }, { status: 400 })
    }
    const scenarioIndex = parseInt(scenarioIndexRaw, 10)
    if (!Number.isFinite(scenarioIndex) || scenarioIndex < 0 || scenarioIndex > 50) {
      return NextResponse.json({ error: 'Invalid scenario index.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `Recording exceeds ${Math.round(MAX_BYTES / (1024 * 1024))} MB limit.` }, { status: 413 })
    }
    const mime = file.type || 'audio/webm'
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json({ error: `Unsupported audio type: ${mime}` }, { status: 415 })
    }

    const admin = createServiceClient()
    const { data: candidate, error: candErr } = await admin
      .from('candidates')
      .select('id, assessment_id, status')
      .eq('unique_link', params.token)
      .maybeSingle()
    if (candErr || !candidate) {
      return NextResponse.json({ error: 'Assessment link not found.' }, { status: 404 })
    }
    if (candidate.status === 'completed') {
      // A submitted candidate's stale tab should not write to storage.
      return NextResponse.json({ ok: true, ignored: 'completed' })
    }

    const ext = extFor(mime)
    const objectPath = `${candidate.assessment_id}/${candidate.id}/scenario_${scenarioIndex}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const { error: upErr } = await admin.storage
      .from('recordings')
      .upload(objectPath, Buffer.from(arrayBuffer), {
        contentType: mime,
        upsert: true,
      })
    if (upErr) {
      console.error('[upload-audio] storage upload failed', { token: params.token, scenarioIndex, error: upErr.message })
      return NextResponse.json({ error: 'Storage upload failed. Recording kept locally; will retry on submit.' }, { status: 502 })
    }
    const { data: urlData } = admin.storage.from('recordings').getPublicUrl(objectPath)
    const url = urlData?.publicUrl || null

    return NextResponse.json({
      ok: true,
      scenario_index: scenarioIndex,
      audio_url: url,
      object_path: objectPath,
    })
  } catch (err) {
    console.error('[upload-audio] error', { message: err?.message })
    return NextResponse.json({ error: 'Could not upload recording. Will retry on submit.' }, { status: 500 })
  }
}
