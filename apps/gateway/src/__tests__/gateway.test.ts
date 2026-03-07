import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GatewayRuntime } from '../gateway'
import {
  encodeFrame,
  encodeHeartbeat,
  encodeAlarm,
  FrameType,
  BROADCAST_EUI,
  GATEWAY_EUI_SENTINEL,
  encodeJoin,
} from '@commfire/protocol'

const GATEWAY_EUI = '0102030405060708'
const DET_EUI = 'AABBCCDD11223344'

function makeCfg(overrides = {}) {
  return {
    eui: GATEWAY_EUI,
    backendUrl: 'http://localhost:3000',
    ...overrides,
  }
}

describe('GatewayRuntime', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK' })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('processes a JOIN frame and posts an event', async () => {
    const gw = new GatewayRuntime(makeCfg())
    const payload = encodeJoin({ firmwareVersion: '1.0.0.0', deviceType: 0 })
    const frame = encodeFrame({
      type: FrameType.JOIN,
      srcEui: DET_EUI,
      dstEui: BROADCAST_EUI,
      hopCount: 0,
      seq: 1,
      payload,
    })

    await gw.ingestFrame(frame)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/gateway/events'),
      expect.objectContaining({ method: 'POST' })
    )

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.eventType ?? body.type).toBe('join')
    expect(body.detectorId ?? body.gatewayId).toBeTruthy()
  })

  it('processes a HEARTBEAT frame and updates topology', async () => {
    const gw = new GatewayRuntime(makeCfg())
    const hbPayload = encodeHeartbeat({
      batteryMv: 3700,
      rssi: -70,
      snr: 7,
      status: 0,
      parentEui: GATEWAY_EUI_SENTINEL,
      hopCount: 1,
    })
    const frame = encodeFrame({
      type: FrameType.HEARTBEAT,
      srcEui: DET_EUI,
      dstEui: BROADCAST_EUI,
      hopCount: 1,
      seq: 2,
      payload: hbPayload,
    })

    await gw.ingestFrame(frame)

    const topo = gw.getTopology()
    expect(topo.nodes).toHaveLength(1)
    expect(topo.nodes[0]!.eui).toBe(DET_EUI)
    expect(topo.nodes[0]!.batteryVoltage).toBeCloseTo(3.7, 1)
  })

  it('processes an ALARM frame and posts an alarm event', async () => {
    const gw = new GatewayRuntime(makeCfg())
    const payload = encodeAlarm({ alarmType: 0, sensorValue: 200 })
    const frame = encodeFrame({
      type: FrameType.ALARM,
      srcEui: DET_EUI,
      dstEui: BROADCAST_EUI,
      hopCount: 0,
      seq: 3,
      payload,
    })

    await gw.ingestFrame(frame)

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.eventType ?? body.type).toBe('alarm')
  })

  it('ignores corrupt frames', async () => {
    const gw = new GatewayRuntime(makeCfg())
    await gw.ingestFrame(Buffer.from('not-a-valid-frame'))
    // no error thrown, no fetch calls for corrupt data
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
