import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/gateway/heartbeat/detector
 * Receives detector heartbeats and updates detector telemetry in Supabase.
 *
 * Expected body:
 *   { detectorEui, gatewayEui, timestamp, batteryVoltage, rssi, snr,
 *     status, parentEui, hopCount }
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Invalid JSON' } }, { status: 400 })
  }

  const { detectorEui, batteryVoltage, rssi, snr, status, parentEui, hopCount } = body

  if (!detectorEui || typeof detectorEui !== 'string') {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Missing detectorEui' } }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    const batteryVoltageNum = typeof batteryVoltage === 'number' ? batteryVoltage : null
  const batteryMv = batteryVoltageNum !== null ? batteryVoltageNum * 1000 : null
  const batteryLevel = batteryMv !== null ? classifyBattery(batteryMv) : undefined

  const GATEWAY_EUI_SENTINEL = '0000000000000000'

    const { error } = await supabase
      .from('detectors')
      .update({
        ...(batteryVoltageNum !== null && { battery_voltage: batteryVoltageNum }),
        ...(batteryLevel !== undefined && { battery_level: batteryLevel }),
        ...(typeof rssi === 'number' && { rssi }),
        ...(typeof snr === 'number' && { snr }),
        ...(typeof status === 'string' && { status }),
        ...(typeof parentEui === 'string' && {
          parent_eui: parentEui === GATEWAY_EUI_SENTINEL ? null : parentEui,
        }),
        ...(typeof hopCount === 'number' && { hop_count: hopCount }),
        last_seen_at: new Date().toISOString(),
      })
      .eq('eui', detectorEui)

    if (error) {
      console.error('[api/gateway/heartbeat/detector] db update error:', error.message)
      return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
    }
  } catch (err) {
    console.error('[api/gateway/heartbeat/detector] unexpected error:', err)
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Internal server error' } }, { status: 500 })
  }

  return NextResponse.json({ data: { ok: true }, error: null })
}

function classifyBattery(batteryMv: number): string {
  if (batteryMv >= 3600) return 'full'
  if (batteryMv >= 3300) return 'good'
  if (batteryMv >= 3000) return 'medium'
  if (batteryMv >= 2700) return 'low'
  return 'critical'
}
