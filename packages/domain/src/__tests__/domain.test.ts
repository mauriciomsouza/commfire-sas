import { describe, it, expect } from 'vitest'
import {
  classifyBattery,
  statusFromBitmask,
  deviceTypeFromByte,
  TopologyManager,
  frameTypeToEventType,
  buildDeviceEvent,
  isStale,
  isWithinPlanLimits,
} from '../index'
import { FrameType, GATEWAY_EUI_SENTINEL } from '@commfire/protocol'

const GW_EUI = '0102030405060708'
const DET_EUI = 'AABBCCDD11223344'

const baseHb = {
  batteryMv: 3700,
  rssi: -70,
  snr: 7,
  status: 0,
  parentEui: GATEWAY_EUI_SENTINEL,
  hopCount: 1,
}

describe('classifyBattery', () => {
  it('returns full for >= 3600 mV', () => expect(classifyBattery(3600)).toBe('full'))
  it('returns good for 3300–3599 mV', () => expect(classifyBattery(3400)).toBe('good'))
  it('returns medium for 3000–3299 mV', () => expect(classifyBattery(3100)).toBe('medium'))
  it('returns low for 2700–2999 mV', () => expect(classifyBattery(2800)).toBe('low'))
  it('returns critical for < 2700 mV', () => expect(classifyBattery(2500)).toBe('critical'))
})

describe('statusFromBitmask', () => {
  it('returns normal for 0', () => expect(statusFromBitmask(0)).toBe('normal'))
  it('returns alarm for bit 0', () => expect(statusFromBitmask(0b001)).toBe('alarm'))
  it('returns fault for bit 1', () => expect(statusFromBitmask(0b010)).toBe('fault'))
  it('returns tamper for bit 2 (priority)', () => expect(statusFromBitmask(0b111)).toBe('tamper'))
})

describe('deviceTypeFromByte', () => {
  it('returns smoke for 0', () => expect(deviceTypeFromByte(0)).toBe('smoke'))
  it('returns heat for 1', () => expect(deviceTypeFromByte(1)).toBe('heat'))
  it('returns co for 2', () => expect(deviceTypeFromByte(2)).toBe('co'))
  it('returns multi for unknown', () => expect(deviceTypeFromByte(99)).toBe('multi'))
})

describe('TopologyManager', () => {
  it('upserts a node and returns it', () => {
    const tm = new TopologyManager(GW_EUI)
    const node = tm.upsertNode(DET_EUI, baseHb)
    expect(node.eui).toBe(DET_EUI)
    expect(node.batteryLevel).toBe('full')
    expect(node.status).toBe('normal')
    expect(tm.nodeCount).toBe(1)
  })

  it('marks a node offline', () => {
    const tm = new TopologyManager(GW_EUI)
    tm.upsertNode(DET_EUI, baseHb)
    tm.markOffline(DET_EUI)
    expect(tm.getTopology().nodes[0]!.status).toBe('offline')
  })

  it('removes a node', () => {
    const tm = new TopologyManager(GW_EUI)
    tm.upsertNode(DET_EUI, baseHb)
    tm.removeNode(DET_EUI)
    expect(tm.nodeCount).toBe(0)
  })

  it('creates a mesh link when parent is set', () => {
    const tm = new TopologyManager(GW_EUI)
    const PARENT_EUI = 'AABBCCDD00001111'
    tm.upsertNode(DET_EUI, { ...baseHb, parentEui: PARENT_EUI })
    const topo = tm.getTopology()
    expect(topo.links).toHaveLength(1)
    expect(topo.links[0]!.sourceEui).toBe(PARENT_EUI)
    expect(topo.links[0]!.targetEui).toBe(DET_EUI)
  })
})

describe('frameTypeToEventType', () => {
  it('maps FrameType.ALARM to alarm', () => expect(frameTypeToEventType(FrameType.ALARM)).toBe('alarm'))
  it('maps FrameType.HEARTBEAT to heartbeat', () => expect(frameTypeToEventType(FrameType.HEARTBEAT)).toBe('heartbeat'))
  it('returns null for unhandled type', () => expect(frameTypeToEventType(0xff)).toBeNull())
})

describe('buildDeviceEvent', () => {
  it('builds an event with required fields', () => {
    const ev = buildDeviceEvent({
      detectorId: DET_EUI,
      gatewayId: GW_EUI,
      eventType: 'alarm',
      payload: { alarmType: 0 },
    })
    expect(ev.type).toBe('alarm')
    expect(ev.detectorId).toBe(DET_EUI)
    expect(ev.gatewayId).toBe(GW_EUI)
    expect(ev.processedAt).toBeNull()
  })
})

describe('isStale', () => {
  it('returns true for null lastSeenAt', () => expect(isStale(null, 1000)).toBe(true))
  it('returns true when older than threshold', () => {
    const old = new Date(Date.now() - 60_000).toISOString()
    expect(isStale(old, 30_000)).toBe(true)
  })
  it('returns false when within threshold', () => {
    const recent = new Date(Date.now() - 1000).toISOString()
    expect(isStale(recent, 30_000)).toBe(false)
  })
})

describe('isWithinPlanLimits', () => {
  it('returns true when within limits', () => {
    expect(isWithinPlanLimits({ gateways: 2, detectors: 10 }, { maxGateways: 5, maxDetectors: 50 })).toBe(true)
  })
  it('returns false when gateways exceeded', () => {
    expect(isWithinPlanLimits({ gateways: 6, detectors: 10 }, { maxGateways: 5, maxDetectors: 50 })).toBe(false)
  })
  it('returns false when detectors exceeded', () => {
    expect(isWithinPlanLimits({ gateways: 2, detectors: 51 }, { maxGateways: 5, maxDetectors: 50 })).toBe(false)
  })
})
