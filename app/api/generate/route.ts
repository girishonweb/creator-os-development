import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

interface GeneratePayload {
  raw_input_id: string
  creator_id: string
  archive_checks_enabled: boolean
}

function parsePayload(value: unknown): GeneratePayload | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  if (typeof v.raw_input_id !== 'string' || !v.raw_input_id) return null
  if (typeof v.creator_id !== 'string' || !v.creator_id) return null
  if (typeof v.archive_checks_enabled !== 'boolean') return null
  return {
    raw_input_id: v.raw_input_id,
    creator_id: v.creator_id,
    archive_checks_enabled: v.archive_checks_enabled,
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const payload = parsePayload(await request.json().catch(() => null))
  if (!payload) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'The generation webhook is not configured (N8N_WEBHOOK_URL).' },
      { status: 500 },
    )
  }

  // RLS scopes these reads to the caller's workspace, so a miss means no access.
  const { data: rawInput } = await supabase
    .from('raw_inputs')
    .select('id')
    .eq('id', payload.raw_input_id)
    .eq('creator_id', payload.creator_id)
    .maybeSingle()
  if (!rawInput) {
    return NextResponse.json(
      { error: 'Raw input not found for this creator.' },
      { status: 404 },
    )
  }

  try {
    const upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(55_000),
      cache: 'no-store',
    })

    const text = await upstream.text()
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Generation webhook responded with ${upstream.status}.` },
        { status: 502 },
      )
    }

    try {
      return NextResponse.json(text ? JSON.parse(text) : { ok: true })
    } catch {
      return NextResponse.json({ ok: true, response: text })
    }
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'TimeoutError'
    return NextResponse.json(
      {
        error: timedOut
          ? 'The generation webhook timed out.'
          : 'Could not reach the generation webhook.',
      },
      { status: 502 },
    )
  }
}
