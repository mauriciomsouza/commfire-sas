import type {
  BatteryLevel,
  DetectorStatus,
  DetectorType,
  EUI64,
  MeshLink,
  MeshTopology,
  Detector,
  EventType,
  DeviceEvent,
  UUID,
} from '@commfire/types'
import { FrameType, type HeartbeatPayload, type AlarmPayload } from '@commfire/protocol'

// ─── Battery classification ───────────────────────────────────────────────────

/** Classify a raw millivolt reading into a human-readable battery level. */
export function classifyBattery(batteryMv: number): BatteryLevel {
  if (batteryMv >= 3600) return 'full'
  if (batteryMv >= 3300) return 'good'
  if (batteryMv >= 3000) return 'medium'
  if (batteryMv >= 2700) return 'low'
  return 'critical'
}

/** Map a status bitmask from a heartbeat payload to a DetectorStatus. */
export function statusFromBitmask(bitmask: number): DetectorStatus {
  if (bitmask & 0b100) return 'tamper'
  if (bitmask & 0b010) return 'fault'
  if (bitmask & 0b001) return 'alarm'
  return 'normal'
}

/** Map a device type byte from the JOIN payload to a DetectorType string. */
export function deviceTypeFromByte(byte: number): DetectorType {
  switch (byte) {
    case 0: return 'smoke'
    case 1: return 'heat'
    case 2: return 'co'
    default: return 'multi'
  }
}

// ─── Topology manager ─────────────────────────────────────────────────────────

/**
 * In-memory representation of the mesh topology for a single gateway.
 * The gateway runtime updates this as heartbeats and mesh-update frames arrive.
 */
export class TopologyManager {
  private readonly gatewayEui: EUI64
  private nodes: Map<EUI64, Detector> = new Map()
  private links: Map<string, MeshLink> = new Map()

  constructor(gatewayEui: EUI64) {
    this.gatewayEui = gatewayEui
  }

  /** Update or insert a detector node from a heartbeat payload. */
  upsertNode(eui: EUI64, hb: HeartbeatPayload, extra: Partial<Detector> = {}): Detector {
    const now = new Date().toISOString()
    const existing = this.nodes.get(eui)
    const updated: Detector = {
      id: existing?.id ?? eui,
      gatewayId: this.gatewayEui,
      floorId: existing?.floorId ?? null,
      eui,
      name: existing?.name ?? eui,
      type: existing?.type ?? 'smoke',
      status: statusFromBitmask(hb.status),
      batteryVoltage: hb.batteryMv / 1000,
      batteryLevel: classifyBattery(hb.batteryMv),
      rssi: hb.rssi,
      snr: hb.snr,
      lastSeenAt: now,
      posX: existing?.posX ?? null,
      posY: existing?.posY ?? null,
      parentEui: hb.parentEui === '0000000000000000' ? null : hb.parentEui,
      hopCount: hb.hopCount,
      meshDepth: hb.hopCount,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ...extra,
    }
    this.nodes.set(eui, updated)

    // update link to parent
    if (updated.parentEui) {
      const linkKey = `${updated.parentEui}→${eui}`
      this.links.set(linkKey, {
        sourceEui: updated.parentEui,
        targetEui: eui,
        rssi: hb.rssi,
        snr: hb.snr,
        updatedAt: now,
      })
    }

    return updated
  }

  /** Mark a detector as offline. */
  markOffline(eui: EUI64): void {
    const node = this.nodes.get(eui)
    if (node) {
      this.nodes.set(eui, { ...node, status: 'offline', updatedAt: new Date().toISOString() })
    }
  }

  /** Remove a detector that has left the mesh. */
  removeNode(eui: EUI64): void {
    this.nodes.delete(eui)
    // remove all links involving this node
    for (const key of this.links.keys()) {
      if (key.includes(eui)) this.links.delete(key)
    }
  }

  /** Get the current topology snapshot. */
  getTopology(): MeshTopology {
    return {
      gatewayEui: this.gatewayEui,
      nodes: Array.from(this.nodes.values()),
      links: Array.from(this.links.values()),
      updatedAt: new Date().toISOString(),
    }
  }

  /** Get a single node or undefined. */
  getNode(eui: EUI64): Detector | undefined {
    return this.nodes.get(eui)
  }

  get nodeCount(): number {
    return this.nodes.size
  }
}

// ─── Event factory ───────────────────────────────────────────────────────────

let _seq = 0
function nextId(): UUID {
  return `evt-${Date.now()}-${++_seq}`
}

/** Map a FrameType to an EventType string. Returns null for non-event frames. */
export function frameTypeToEventType(frameType: number): EventType | null {
  switch (frameType) {
    case FrameType.ALARM: return 'alarm'
    case FrameType.ALARM_CLEAR: return 'alarm_clear'
    case FrameType.FAULT: return 'fault'
    case FrameType.FAULT_CLEAR: return 'fault_clear'
    case FrameType.TAMPER: return 'tamper'
    case FrameType.TAMPER_CLEAR: return 'tamper_clear'
    case FrameType.LOW_BATTERY: return 'low_battery'
    case FrameType.HEARTBEAT: return 'heartbeat'
    case FrameType.JOIN: return 'join'
    case FrameType.LEAVE: return 'leave'
    default: return null
  }
}

/** Build a DeviceEvent from raw frame data. */
export function buildDeviceEvent(opts: {
  detectorId: UUID
  gatewayId: UUID
  eventType: EventType
  payload: Record<string, unknown>
}): DeviceEvent {
  const now = new Date().toISOString()
  return {
    id: nextId(),
    detectorId: opts.detectorId,
    gatewayId: opts.gatewayId,
    type: opts.eventType,
    payload: opts.payload,
    receivedAt: now,
    processedAt: null,
  }
}

// ─── Stale detector detection ─────────────────────────────────────────────────

/** Returns true if the detector has not sent a heartbeat within the given threshold. */
export function isStale(lastSeenAt: string | null, thresholdMs: number): boolean {
  if (!lastSeenAt) return true
  return Date.now() - new Date(lastSeenAt).getTime() > thresholdMs
}

// ─── Subscription / billing helpers ──────────────────────────────────────────

export interface PlanLimits {
  maxGateways: number
  maxDetectors: number
}

export function isWithinPlanLimits(
  current: { gateways: number; detectors: number },
  limits: PlanLimits
): boolean {
  return current.gateways <= limits.maxGateways && current.detectors <= limits.maxDetectors
}

// Re-export types used by consumers
export type { MeshTopology, Detector, MeshLink, DeviceEvent, EventType }
