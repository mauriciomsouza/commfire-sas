import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * POST /api/gateway/heartbeat/gateway
 * Receives periodic gateway heartbeats and updates the gateway status.
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

  console.log('[api/gateway/heartbeat/gateway] received:', JSON.stringify(body).slice(0, 200))

  // In production: upsert gateway status in Supabase.
  return NextResponse.json({ data: { ok: true }, error: null })
}
