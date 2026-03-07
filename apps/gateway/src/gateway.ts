import { createServer, type Server } from 'net'
import type { Socket } from 'net'
import type { GatewayStatus } from '@commfire/types'
import {
  decodeFrame,
  FrameType,
  decodeHeartbeat,
  decodeAlarm,
  decodeFault,
  decodeLowBattery,
  decodeJoin,
  decodeMeshUpdate,
  GATEWAY_EUI_SENTINEL,
} from '@commfire/protocol'
import {
  TopologyManager,
  frameTypeToEventType,
  buildDeviceEvent,
  deviceTypeFromByte,
} from '@commfire/domain'

// ─── Config ───────────────────────────────────────────────────────────────────

export interface GatewayConfig {
  /** EUI-64 of this gateway */
  eui: string
  /** TCP port to listen for detector connections (default 5700) */
  listenPort?: number
  /** Backend API base URL */
  backendUrl: string
  /** How often (ms) to send a gateway heartbeat to the backend (default 60_000) */
  heartbeatIntervalMs?: number
  /** How many ms without a detector heartbeat before marking it offline (default 120_000) */
  staleThresholdMs?: number
  /** Firmware version string reported to the backend */
  firmwareVersion?: string
}

// ─── Gateway runtime ──────────────────────────────────────────────────────────

export class GatewayRuntime {
  private readonly cfg: Required<GatewayConfig>
  private readonly topology: TopologyManager
  private server: Server | null = null
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private _staleTimer: ReturnType<typeof setInterval> | null = null
  private _uptime = 0
  private _running = false

  constructor(cfg: GatewayConfig) {
    this.cfg = {
      listenPort: 5700,
      heartbeatIntervalMs: 60_000,
      staleThresholdMs: 120_000,
      firmwareVersion: '1.0.0',
      ...cfg,
    }
    this.topology = new TopologyManager(this.cfg.eui)
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this._running) return
    this._running = true

    // start TCP server for mesh frame ingestion
    this.server = createServer((socket) => this._handleSocket(socket))
    await new Promise<void>((resolve) => {
      this.server!.listen(this.cfg.listenPort, () => {
        console.log(`[gateway] listening on port ${this.cfg.listenPort}`)
        resolve()
      })
    })

    // send initial gateway heartbeat
    await this._sendGatewayHeartbeat()

    // periodic heartbeat
    this._heartbeatTimer = setInterval(async () => {
      this._uptime += this.cfg.heartbeatIntervalMs / 1000
      await this._sendGatewayHeartbeat()
    }, this.cfg.heartbeatIntervalMs)

    // periodic stale detector check
    this._staleTimer = setInterval(() => {
      this._pruneStaleDetectors()
    }, this.cfg.staleThresholdMs / 2)
  }

  async stop(): Promise<void> {
    this._running = false
    if (this._heartbeatTimer) clearInterval(this._heartbeatTimer)
    if (this._staleTimer) clearInterval(this._staleTimer)
    await new Promise<void>((resolve, reject) => {
      if (!this.server) return resolve()
      this.server.close((err) => (err ? reject(err) : resolve()))
    })
  }

  /** Feed a raw binary frame directly (used by simulator or tests). */
  async ingestFrame(raw: Buffer): Promise<void> {
    await this._processFrame(raw)
  }

  getTopology() {
    return this.topology.getTopology()
  }

  // ─── Socket handling ───────────────────────────────────────────────────────

  private _handleSocket(socket: Socket): void {
    const addr = `${socket.remoteAddress}:${socket.remotePort}`
    console.log(`[gateway] detector connected: ${addr}`)

    let buf = Buffer.alloc(0)

    socket.on('data', async (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk])
      // simple framing: read as many complete frames as possible
      while (buf.length >= 22) {
        // minimum frame size (header + empty payload + crc)
        try {
          const frame = decodeFrame(buf)
          const frameSize = 22 + frame.payload.length
          await this._processFrame(buf.slice(0, frameSize))
          buf = buf.slice(frameSize)
        } catch {
          // if decode fails, advance one byte and retry (sync recovery)
          buf = buf.slice(1)
        }
      }
    })

    socket.on('error', (err) => console.error(`[gateway] socket error ${addr}:`, err.message))
    socket.on('close', () => console.log(`[gateway] detector disconnected: ${addr}`))
  }

  // ─── Frame processing ──────────────────────────────────────────────────────

  private async _processFrame(raw: Buffer): Promise<void> {
    let frame
    try {
      frame = decodeFrame(raw)
    } catch (err) {
      console.warn(`[gateway] bad frame: ${(err as Error).message}`)
      return
    }

    const { type, srcEui, payload } = frame

    switch (type) {
      case FrameType.JOIN: {
        const join = decodeJoin(payload)
        const node = this.topology.upsertNode(srcEui, {
          batteryMv: 3700,
          rssi: -70,
          snr: 7,
          status: 0,
          parentEui: GATEWAY_EUI_SENTINEL,
          hopCount: frame.hopCount,
        }, { type: deviceTypeFromByte(join.deviceType) })
        await this._postEvent(buildDeviceEvent({
          detectorId: node.eui,
          gatewayId: this.cfg.eui,
          eventType: 'join',
          payload: { firmwareVersion: join.firmwareVersion, deviceType: join.deviceType },
        }))
        break
      }

      case FrameType.HEARTBEAT: {
        const hb = decodeHeartbeat(payload)
        this.topology.upsertNode(srcEui, hb)
        await this._postDetectorHeartbeat(srcEui, hb)
        break
      }

      case FrameType.ALARM: {
        const alarm = decodeAlarm(payload)
        const node = this.topology.getNode(srcEui)
        await this._postEvent(buildDeviceEvent({
          detectorId: node?.eui ?? srcEui,
          gatewayId: this.cfg.eui,
          eventType: 'alarm',
          payload: { alarmType: alarm.alarmType, sensorValue: alarm.sensorValue },
        }))
        break
      }

      case FrameType.ALARM_CLEAR: {
        const node = this.topology.getNode(srcEui)
        await this._postEvent(buildDeviceEvent({
          detectorId: node?.eui ?? srcEui,
          gatewayId: this.cfg.eui,
          eventType: 'alarm_clear',
          payload: {},
        }))
        break
      }

      case FrameType.FAULT: {
        const fault = decodeFault(payload)
        const node = this.topology.getNode(srcEui)
        await this._postEvent(buildDeviceEvent({
          detectorId: node?.eui ?? srcEui,
          gatewayId: this.cfg.eui,
          eventType: 'fault',
          payload: { faultCode: fault.faultCode },
        }))
        break
      }

      case FrameType.FAULT_CLEAR: {
        const node = this.topology.getNode(srcEui)
        await this._postEvent(buildDeviceEvent({
          detectorId: node?.eui ?? srcEui,
          gatewayId: this.cfg.eui,
          eventType: 'fault_clear',
          payload: {},
        }))
        break
      }

      case FrameType.TAMPER: {
        const node = this.topology.getNode(srcEui)
        await this._postEvent(buildDeviceEvent({
          detectorId: node?.eui ?? srcEui,
          gatewayId: this.cfg.eui,
          eventType: 'tamper',
          payload: {},
        }))
        break
      }

      case FrameType.LOW_BATTERY: {
        const lb = decodeLowBattery(payload)
        const node = this.topology.getNode(srcEui)
        await this._postEvent(buildDeviceEvent({
          detectorId: node?.eui ?? srcEui,
          gatewayId: this.cfg.eui,
          eventType: 'low_battery',
          payload: { batteryMv: lb.batteryMv },
        }))
        break
      }

      case FrameType.MESH_UPDATE: {
        const mu = decodeMeshUpdate(payload)
        // topology update is handled internally; no separate event needed
        console.debug(`[gateway] mesh update from ${srcEui}: ${mu.neighbours.length} neighbours`)
        break
      }

      case FrameType.LEAVE: {
        const node = this.topology.getNode(srcEui)
        await this._postEvent(buildDeviceEvent({
          detectorId: node?.eui ?? srcEui,
          gatewayId: this.cfg.eui,
          eventType: 'leave',
          payload: {},
        }))
        this.topology.removeNode(srcEui)
        break
      }

      default:
        console.debug(`[gateway] unhandled frame type 0x${type.toString(16)} from ${srcEui}`)
    }
  }

  // ─── Backend API calls ─────────────────────────────────────────────────────

  private async _post(path: string, body: unknown): Promise<void> {
    const url = `${this.cfg.backendUrl}${path}`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        console.error(`[gateway] POST ${path} failed: ${res.status} ${res.statusText}`)
      }
    } catch (err) {
      console.error(`[gateway] POST ${path} network error:`, (err as Error).message)
    }
  }

  private async _postEvent(event: ReturnType<typeof buildDeviceEvent>): Promise<void> {
    await this._post('/api/gateway/events', event)
  }

  private async _postDetectorHeartbeat(
    eui: string,
    hb: ReturnType<typeof decodeHeartbeat>
  ): Promise<void> {
    const node = this.topology.getNode(eui)
    await this._post('/api/gateway/heartbeat/detector', {
      detectorEui: eui,
      gatewayEui: this.cfg.eui,
      timestamp: new Date().toISOString(),
      batteryVoltage: hb.batteryMv / 1000,
      rssi: hb.rssi,
      snr: hb.snr,
      status: node?.status ?? 'normal',
      parentEui: node?.parentEui,
      hopCount: hb.hopCount,
    })
  }

  private async _sendGatewayHeartbeat(): Promise<void> {
    const topo = this.topology.getTopology()
    const status: GatewayStatus = this._running ? 'online' : 'offline'
    await this._post('/api/gateway/heartbeat/gateway', {
      gatewayEui: this.cfg.eui,
      timestamp: new Date().toISOString(),
      firmwareVersion: this.cfg.firmwareVersion,
      uptime: this._uptime,
      connectedDetectors: topo.nodes.length,
      status,
    })
  }

  // ─── Stale detector pruning ────────────────────────────────────────────────

  private _pruneStaleDetectors(): void {
    const topo = this.topology.getTopology()
    for (const node of topo.nodes) {
      if (node.status !== 'offline') {
        const ageMs = node.lastSeenAt
          ? Date.now() - new Date(node.lastSeenAt).getTime()
          : Infinity
        if (ageMs > this.cfg.staleThresholdMs) {
          console.warn(`[gateway] marking stale detector offline: ${node.eui}`)
          this.topology.markOffline(node.eui)
        }
      }
    }
  }
}
