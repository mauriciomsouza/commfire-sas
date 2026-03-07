import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/gateway/heartbeat/gateway
 * Receives periodic gateway heartbeats and updates the gateway status in Supabase.
 *
 * Expected body:
 *   { gatewayEui, timestamp, firmwareVersion, uptime, connectedDetectors, status }
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Invalid JSON' } }, { status: 400 })
  }

  const { gatewayEui, firmwareVersion, status } = body

  if (!gatewayEui || typeof gatewayEui !== 'string') {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Missing gatewayEui' } }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    const { error } = await supabase
      .from('gateways')
      .update({
        ...(typeof status === 'string' && { status }),
        ...(typeof firmwareVersion === 'string' && { firmware: firmwareVersion }),
        last_seen_at: new Date().toISOString(),
      })
      .eq('eui', gatewayEui)

    if (error) {
      console.error('[api/gateway/heartbeat/gateway] db update error:', error.message)
      return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
    }
  } catch (err) {
    console.error('[api/gateway/heartbeat/gateway] unexpected error:', err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Internal server error' } }, { status: 500 })
  }

  return NextResponse.json({ data: { ok: true }, error: null })
}
