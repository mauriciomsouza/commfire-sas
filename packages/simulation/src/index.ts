import { EventEmitter } from 'events'
import type { DetectorType, EUI64 } from '@commfire/types'
import {
  FrameType,
  encodeFrame,
  encodeHeartbeat,
  encodeAlarm,
  encodeFault,
  encodeLowBattery,
  encodeJoin,
  encodeMeshUpdate,
  GATEWAY_EUI_SENTINEL,
  BROADCAST_EUI,
} from '@commfire/protocol'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SimDetectorConfig {
  eui: EUI64
  type: DetectorType
  parentEui: EUI64 | null
  /** Initial battery millivolts (default 3700) */
  batteryMv?: number
  /** Whether to simulate battery drain (default true) */
  simulateDrain?: boolean
  /** Base RSSI towards parent (default -65 dBm) */
  baseRssi?: number
}

export interface SimGatewayConfig {
  eui: EUI64
  /** Interval in ms between detector heartbeats (default 30_000) */
  heartbeatIntervalMs?: number
  /** URL of the backend API to POST events to */
  backendUrl?: string
}

// ─── Virtual Detector ─────────────────────────────────────────────────────────

/**
 * Emulates a single LoRa mesh detector.
 * Produces binary-encoded mesh frames that can be fed to a VirtualGateway.
 */
export class VirtualDetector extends EventEmitter {
  readonly eui: EUI64
  readonly type: DetectorType
  parentEui: EUI64 | null
  batteryMv: number
  private _rssi: number
  private _snr: number
  private _status: number = 0  // bitmask
  private _seq: number = 0
  private _hopCount: number
  private _neighbours: Array<{ eui: EUI64; rssi: number; snr: number }> = []

  constructor(config: SimDetectorConfig) {
    super()
    this.eui = config.eui
    this.type = config.type
    this.parentEui = config.parentEui
    this.batteryMv = config.batteryMv ?? 3700
    this._rssi = config.baseRssi ?? -65
    this._snr = 8
    this._hopCount = config.parentEui ? 1 : 0
  }

  /** Add a neighbouring detector (for mesh-update frames). */
  addNeighbour(eui: EUI64, rssi: number, snr: number): void {
    this._neighbours.push({ eui, rssi, snr })
  }

  /** Set the alarm status on this detector. */
  triggerAlarm(alarmType = 0, sensorValue = 200): void {
    this._status |= 0b001
    const payload = encodeAlarm({ alarmType, sensorValue })
    const frame = encodeFrame({
      type: FrameType.ALARM,
      srcEui: this.eui,
      dstEui: BROADCAST_EUI,
      hopCount: this._hopCount,
      seq: this._nextSeq(),
      payload,
    })
    this.emit('frame', frame)
  }

  /** Clear the alarm status. */
  clearAlarm(): void {
    this._status &= ~0b001
    this.emit('frame', this._buildSimpleFrame(FrameType.ALARM_CLEAR))
  }

  /** Trigger a fault. */
  triggerFault(faultCode = 1): void {
    this._status |= 0b010
    const payload = encodeFault({ faultCode })
    this.emit('frame', encodeFrame({
      type: FrameType.FAULT,
      srcEui: this.eui,
      dstEui: BROADCAST_EUI,
      hopCount: this._hopCount,
      seq: this._nextSeq(),
      payload,
    }))
  }

  /** Emit a heartbeat frame. */
  sendHeartbeat(): void {
    // simulate slight battery drain
    if (this.batteryMv > 2400) this.batteryMv -= Math.floor(Math.random() * 2)

    const hbPayload = encodeHeartbeat({
      batteryMv: this.batteryMv,
      rssi: this._rssi + Math.floor((Math.random() - 0.5) * 6),
      snr: this._snr + Math.floor((Math.random() - 0.5) * 2),
      status: this._status,
      parentEui: this.parentEui ?? GATEWAY_EUI_SENTINEL,
      hopCount: this._hopCount,
    })
    this.emit('frame', encodeFrame({
      type: FrameType.HEARTBEAT,
      srcEui: this.eui,
      dstEui: BROADCAST_EUI,
      hopCount: this._hopCount,
      seq: this._nextSeq(),
      payload: hbPayload,
    }))

    // occasionally send mesh update
    if (this._neighbours.length > 0 && Math.random() < 0.2) {
      this._sendMeshUpdate()
    }
  }

  /** Emit a JOIN frame (sent once on startup). */
  sendJoin(deviceTypeByte = 0): void {
    const payload = encodeJoin({ firmwareVersion: '1.0.0.0', deviceType: deviceTypeByte })
    this.emit('frame', encodeFrame({
      type: FrameType.JOIN,
      srcEui: this.eui,
      dstEui: BROADCAST_EUI,
      hopCount: this._hopCount,
      seq: this._nextSeq(),
      payload,
    }))
  }

  private _sendMeshUpdate(): void {
    const payload = encodeMeshUpdate({ neighbours: this._neighbours })
    this.emit('frame', encodeFrame({
      type: FrameType.MESH_UPDATE,
      srcEui: this.eui,
      dstEui: BROADCAST_EUI,
      hopCount: this._hopCount,
      seq: this._nextSeq(),
      payload,
    }))
  }

  private _buildSimpleFrame(type: number): Buffer {
    return encodeFrame({
      type: type as never,
      srcEui: this.eui,
      dstEui: BROADCAST_EUI,
      hopCount: this._hopCount,
      seq: this._nextSeq(),
      payload: Buffer.alloc(0),
    })
  }

  private _nextSeq(): number {
    return (this._seq = (this._seq + 1) & 0xffff)
  }
}

// ─── Virtual Mesh ─────────────────────────────────────────────────────────────

/**
 * Manages a collection of VirtualDetectors as a mesh network.
 * Wires up parent→child relationships and schedules heartbeats.
 */
export class VirtualMesh extends EventEmitter {
  private detectors: Map<EUI64, VirtualDetector> = new Map()
  private _timers: ReturnType<typeof setInterval>[] = []

  /** Add a detector to the virtual mesh. */
  addDetector(config: SimDetectorConfig): VirtualDetector {
    const det = new VirtualDetector(config)
    det.on('frame', (frame: Buffer) => this.emit('frame', frame, det.eui))
    this.detectors.set(det.eui, det)
    return det
  }

  /** Get a detector by EUI. */
  getDetector(eui: EUI64): VirtualDetector | undefined {
    return this.detectors.get(eui)
  }

  get detectorCount(): number {
    return this.detectors.size
  }

  /** Start heartbeat timers for all detectors. */
  start(intervalMs = 30_000): void {
    // send JOIN for all detectors
    for (const det of this.detectors.values()) {
      det.sendJoin()
    }

    // stagger heartbeats
    let stagger = 0
    for (const det of this.detectors.values()) {
      const t = setTimeout(() => {
        det.sendHeartbeat()
        const interval = setInterval(() => det.sendHeartbeat(), intervalMs)
        this._timers.push(interval)
      }, stagger)
      this._timers.push(t as unknown as ReturnType<typeof setInterval>)
      stagger += Math.min(intervalMs / this.detectors.size, 2000)
    }
  }

  /** Stop all timers. */
  stop(): void {
    for (const t of this._timers) clearInterval(t)
    this._timers = []
  }

  /** Get all detector EUIs. */
  allEuis(): EUI64[] {
    return Array.from(this.detectors.keys())
  }
}

// ─── Scenario builder ─────────────────────────────────────────────────────────

/**
 * Creates a pre-wired mesh scenario for development / demo use.
 *
 * Topology:
 *   Gateway
 *     └─ Det-01 (smoke, direct)
 *          ├─ Det-02 (smoke, hop 1)
 *          │    └─ Det-04 (heat, hop 2)
 *          └─ Det-03 (co, hop 1)
 *               └─ Det-05 (smoke, hop 2)
 */
export function createDemoMesh(gatewayEui: EUI64): VirtualMesh {
  const mesh = new VirtualMesh()

  const det01 = mesh.addDetector({ eui: 'AABBCCDD00000001', type: 'smoke', parentEui: null, batteryMv: 3700 })
  const det02 = mesh.addDetector({ eui: 'AABBCCDD00000002', type: 'smoke', parentEui: det01.eui, batteryMv: 3500 })
  const det03 = mesh.addDetector({ eui: 'AABBCCDD00000003', type: 'co', parentEui: det01.eui, batteryMv: 3200 })
  mesh.addDetector({ eui: 'AABBCCDD00000004', type: 'heat', parentEui: det02.eui, batteryMv: 3600 })
  mesh.addDetector({ eui: 'AABBCCDD00000005', type: 'smoke', parentEui: det03.eui, batteryMv: 2900 })

  // set up neighbour awareness
  det01.addNeighbour(det02.eui, -62, 9)
  det01.addNeighbour(det03.eui, -70, 7)
  det02.addNeighbour(det01.eui, -62, 9)

  return mesh
}
