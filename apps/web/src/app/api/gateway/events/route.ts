import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * POST /api/gateway/events
 * Receives device events from gateway runtimes.
 * Validates bearer token, then upserts the event into Supabase.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || token !== process.env.GATEWAY_SHARED_SECRET) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Invalid JSON' } }, { status: 400 })
  }

  // In production, upsert event into Supabase here.
  // For now we acknowledge receipt.
  console.log('[api/gateway/events] received event:', JSON.stringify(body).slice(0, 200))

  return NextResponse.json({ data: { ok: true }, error: null }, { status: 200 })
}
