import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/gateway/events
 * Receives device events from gateway runtimes and inserts them into Supabase device_events.
 *
 * Expected body (DeviceEvent from @commfire/domain buildDeviceEvent):
 *   { id, detectorId (EUI), gatewayId (EUI), type, payload, receivedAt, processedAt }
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Invalid JSON' } }, { status: 400 })
  }

  const { detectorId: detectorEui, gatewayId: gatewayEui, type: eventType, payload, receivedAt } = body

  if (!eventType || typeof eventType !== 'string') {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Missing event type' } }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    // Resolve EUIs to DB UUIDs (either may be null for unknown devices)
    const [detectorResult, gatewayResult] = await Promise.all([
      detectorEui
        ? supabase.from('detectors').select('id').eq('eui', detectorEui).maybeSingle()
        : Promise.resolve({ data: null }),
      gatewayEui
        ? supabase.from('gateways').select('id').eq('eui', gatewayEui).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const detectorDbId = (detectorResult.data as { id: string } | null)?.id ?? null
    const gatewayDbId = (gatewayResult.data as { id: string } | null)?.id ?? null

    const { error } = await supabase.from('device_events').insert({
      detector_id: detectorDbId,
      gateway_id: gatewayDbId,
      type: eventType,
      payload: (payload as Record<string, unknown>) ?? {},
      received_at: typeof receivedAt === 'string' ? receivedAt : new Date().toISOString(),
    })

    if (error) {
      console.error('[api/gateway/events] db insert error:', error.message)
      return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
    }
  } catch (err) {
    console.error('[api/gateway/events] unexpected error:', err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Internal server error' } }, { status: 500 })
  }

  return NextResponse.json({ data: { ok: true }, error: null }, { status: 200 })
}
