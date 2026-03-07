import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VirtualGateway {
  id: string
  eui: string
  name: string
  firmware: string
}

interface VirtualDetector {
  id: string
  eui: string
  name: string
  type: string
  gateway_eui: string
  battery_voltage: number | null
  rssi: number | null
  snr: number | null
  status: string
  parent_eui: string | null
  hop_count: number | null
}

interface SimEvent {
  id: string
  device_type: 'gateway' | 'detector' | 'alarm'
  device_id: string
  device_eui: string | null
  event_type: string
  payload: Record<string, unknown>
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000'
const GATEWAY_SHARED_SECRET = process.env.GATEWAY_SHARED_SECRET ?? ''
const HEARTBEAT_INTERVAL_MS = Number(process.env.HEARTBEAT_INTERVAL_MS ?? 30_000)
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 5_000)

// EUI value sent by detectors when their parent is the gateway (direct link)
const GATEWAY_EUI_SENTINEL = '0000000000000000'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeRelation<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? (rel[0] ?? null) : rel
}

function simId(): string {
  return `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ─── SimServer ────────────────────────────────────────────────────────────────

export class SimServer {
  private readonly supabase: SupabaseClient
  private virtualGateways: VirtualGateway[] = []
  private virtualDetectors: VirtualDetector[] = []
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private uptime = 0

  constructor() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars')
    }
    if (!GATEWAY_SHARED_SECRET) {
      throw new Error('Missing GATEWAY_SHARED_SECRET env var')
    }
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  async start(): Promise<void> {
    console.log('[sim-server] starting…')

    await this.loadVirtualDevices()

    console.log(
      `[sim-server] loaded ${this.virtualGateways.length} virtual gateways, ` +
        `${this.virtualDetectors.length} virtual detectors`
    )

    // Send initial heartbeats
    await this.sendAllHeartbeats()

    // Periodic heartbeat
    this.heartbeatTimer = setInterval(async () => {
      this.uptime += HEARTBEAT_INTERVAL_MS / 1000
      // Reload devices in case new virtual devices were added
      await this.loadVirtualDevices()
      await this.sendAllHeartbeats()
    }, HEARTBEAT_INTERVAL_MS)

    // Poll for pending sim_events
    this.pollTimer = setInterval(() => {
      this.processPendingEvents().catch((err) => {
        console.error('[sim-server] poll error:', err)
      })
    }, POLL_INTERVAL_MS)

    console.log(
      `[sim-server] running – heartbeat every ${HEARTBEAT_INTERVAL_MS / 1000}s, ` +
        `polling every ${POLL_INTERVAL_MS / 1000}s`
    )
  }

  stop(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    if (this.pollTimer) clearInterval(this.pollTimer)
    console.log('[sim-server] stopped')
  }

  // ─── Device loading ────────────────────────────────────────────────────────

  private async loadVirtualDevices(): Promise<void> {
    const [gwResult, detResult] = await Promise.all([
      this.supabase
        .from('gateways')
        .select('id, eui, name, firmware')
        .eq('is_virtual', true),
      this.supabase
        .from('detectors')
        .select('id, eui, name, type, battery_voltage, rssi, snr, status, parent_eui, hop_count, gateways(eui)')
        .eq('is_virtual', true),
    ])

    if (gwResult.error) {
      console.error('[sim-server] error loading virtual gateways:', gwResult.error.message)
    } else {
      this.virtualGateways = (gwResult.data ?? []) as VirtualGateway[]
    }

    if (detResult.error) {
      console.error('[sim-server] error loading virtual detectors:', detResult.error.message)
    } else {
      this.virtualDetectors = (detResult.data ?? []).map((d: Record<string, unknown>) => {
        const gw = normalizeRelation(d.gateways as { eui: string } | { eui: string }[] | null)
        return {
          id: d.id as string,
          eui: d.eui as string,
          name: d.name as string,
          type: d.type as string,
          gateway_eui: gw?.eui ?? '',
          battery_voltage: d.battery_voltage as number | null,
          rssi: d.rssi as number | null,
          snr: d.snr as number | null,
          status: (d.status as string) ?? 'normal',
          parent_eui: d.parent_eui as string | null,
          hop_count: d.hop_count as number | null,
        }
      })
    }
  }

  // ─── Heartbeats ────────────────────────────────────────────────────────────

  private async sendAllHeartbeats(): Promise<void> {
    const tasks = [
      ...this.virtualGateways.map((gw) => this.sendGatewayHeartbeat(gw)),
      ...this.virtualDetectors.map((det) => this.sendDetectorHeartbeat(det)),
    ]
    await Promise.allSettled(tasks)
  }

  private async sendGatewayHeartbeat(gw: VirtualGateway): Promise<void> {
    await this.post('/api/gateway/heartbeat/gateway', {
      gatewayEui: gw.eui,
      timestamp: new Date().toISOString(),
      firmwareVersion: gw.firmware || 'virtual-1.0.0',
      uptime: this.uptime,
      connectedDetectors: this.virtualDetectors.filter((d) => d.gateway_eui === gw.eui).length,
      status: 'online',
    })
  }

  private async sendDetectorHeartbeat(det: VirtualDetector): Promise<void> {
    const batteryVoltage = det.battery_voltage ?? (3.5 + Math.random() * 0.3)
    const rssi = det.rssi ?? -(60 + Math.random() * 25)
    const snr = det.snr ?? (4 + Math.random() * 8)

    await this.post('/api/gateway/heartbeat/detector', {
      detectorEui: det.eui,
      gatewayEui: det.gateway_eui,
      timestamp: new Date().toISOString(),
      batteryVoltage: Math.round(batteryVoltage * 1000) / 1000,
      rssi: Math.round(rssi * 10) / 10,
      snr: Math.round(snr * 10) / 10,
      status: det.status,
      parentEui: det.parent_eui ?? GATEWAY_EUI_SENTINEL,
      hopCount: det.hop_count ?? 0,
    })
  }

  // ─── Sim event processing ──────────────────────────────────────────────────

  private async processPendingEvents(): Promise<void> {
    const { data: events, error } = await this.supabase
      .from('sim_events')
      .select('id, device_type, device_id, device_eui, event_type, payload')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20)

    if (error) {
      console.error('[sim-server] error fetching sim_events:', error.message)
      return
    }

    if (!events || events.length === 0) return

    for (const event of events as SimEvent[]) {
      await this.processSimEvent(event)
    }
  }

  private async processSimEvent(event: SimEvent): Promise<void> {
    // Mark as processing
    await this.supabase
      .from('sim_events')
      .update({ status: 'processing' })
      .eq('id', event.id)

    try {
      await this.dispatchEvent(event)

      // Mark as done
      await this.supabase
        .from('sim_events')
        .update({ status: 'done', processed_at: new Date().toISOString() })
        .eq('id', event.id)

      console.log(`[sim-server] processed sim_event ${event.id}: ${event.event_type} on ${event.device_eui ?? event.device_id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[sim-server] failed to process sim_event ${event.id}:`, message)

      await this.supabase
        .from('sim_events')
        .update({ status: 'error', error_message: message })
        .eq('id', event.id)
    }
  }

  private async dispatchEvent(event: SimEvent): Promise<void> {
    const { device_type, device_id, device_eui, event_type, payload } = event

    if (device_type === 'detector') {
      // Resolve device EUI if not stored on the sim_event
      let eui = device_eui
      let gatewayEui = ''

      if (!eui) {
        const { data } = await this.supabase
          .from('detectors')
          .select('eui, gateways(eui)')
          .eq('id', device_id)
          .maybeSingle()
        if (data) {
          eui = data.eui as string
          const gw = normalizeRelation(data.gateways as { eui: string } | { eui: string }[] | null)
          gatewayEui = gw?.eui ?? ''
        }
      } else {
        const det = this.virtualDetectors.find((d) => d.eui === eui)
        gatewayEui = det?.gateway_eui ?? ''
      }

      if (!eui) throw new Error(`Cannot resolve EUI for detector ${device_id}`)

      if (event_type === 'heartbeat') {
        const det = this.virtualDetectors.find((d) => d.eui === eui)
        await this.sendDetectorHeartbeat({
          id: device_id,
          eui,
          name: '',
          type: 'smoke',
          gateway_eui: gatewayEui,
          battery_voltage: (payload.batteryVoltage as number | null) ?? det?.battery_voltage ?? null,
          rssi: (payload.rssi as number | null) ?? det?.rssi ?? null,
          snr: (payload.snr as number | null) ?? det?.snr ?? null,
          status: (payload.status as string | null) ?? det?.status ?? 'normal',
          parent_eui: det?.parent_eui ?? null,
          hop_count: det?.hop_count ?? null,
        })
      } else {
        // All other event types go to the events endpoint
        await this.post('/api/gateway/events', {
          id: simId(),
          detectorId: eui,
          gatewayId: gatewayEui,
          type: event_type,
          payload: payload ?? {},
          receivedAt: new Date().toISOString(),
          processedAt: null,
        })
      }
    } else if (device_type === 'gateway') {
      let eui = device_eui
      if (!eui) {
        const gw = this.virtualGateways.find((g) => g.id === device_id)
        eui = gw?.eui ?? null
      }
      if (!eui) throw new Error(`Cannot resolve EUI for gateway ${device_id}`)

      const gw = this.virtualGateways.find((g) => g.eui === eui)
      await this.sendGatewayHeartbeat({
        id: device_id,
        eui,
        name: gw?.name ?? '',
        firmware: gw?.firmware ?? 'virtual-1.0.0',
      })
    }
    // alarm device type: no EUI-based events for alarms currently
  }

  // ─── HTTP helper ───────────────────────────────────────────────────────────

  private async post(path: string, body: unknown): Promise<void> {
    const url = `${BACKEND_URL}${path}`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GATEWAY_SHARED_SECRET}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      throw new Error(`POST ${path} failed: ${res.status} ${res.statusText}`)
    }
  }
}
