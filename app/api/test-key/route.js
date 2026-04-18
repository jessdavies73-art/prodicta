import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 30

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'ANTHROPIC_API_KEY is not set in environment variables' }, { status: 500 })
  }

  console.log('[test-key] API key present, length:', apiKey.length, 'prefix:', apiKey.slice(0, 16))

  try {
    const anthropic = new Anthropic({ apiKey })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Say hello.' }],
    })
    const text = message.content[0]?.text
    console.log('[test-key] Success:', text)
    return NextResponse.json({ ok: true, response: text, key_prefix: apiKey.slice(0, 16) })
  } catch (err) {
    console.error('[test-key] Anthropic API error:', err?.message)
    return NextResponse.json({ ok: false, error: err.message, key_prefix: apiKey.slice(0, 16) }, { status: 500 })
  }
}
