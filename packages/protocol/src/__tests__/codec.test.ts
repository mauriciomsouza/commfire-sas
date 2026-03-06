import { describe, it, expect } from 'vitest'
import {
  FrameType,
  encodeFrame,
  decodeFrame,
  encodeHeartbeat,
  decodeHeartbeat,
  encodeAlarm,
  decodeAlarm,
  encodeMeshUpdate,
  decodeMeshUpdate,
  crc16,
  BROADCAST_EUI,
  GATEWAY_EUI_SENTINEL,
} from '../index'

const SRC_EUI = 'AABBCCDD11223344'
const DST_EUI = BROADCAST_EUI

describe('crc16', () => {
  it('produces consistent results', () => {
    const buf = Buffer.from('hello world')
    expect(crc16(buf)).toBe(crc16(buf))
  })
  it('differs for different inputs', () => {
    expect(crc16(Buffer.from('hello'))).not.toBe(crc16(Buffer.from('world')))
  })
})

describe('Frame encode / decode roundtrip', () => {
  it('roundtrips a heartbeat frame', () => {
    const payload = encodeHeartbeat({
      batteryMv: 3600,
      rssi: -75,
      snr: 8,
      status: 0,
      parentEui: GATEWAY_EUI_SENTINEL,
      hopCount: 1,
    })

    const original: import('../index').MeshFrame = {
      type: FrameType.HEARTBEAT,
      srcEui: SRC_EUI,
      dstEui: DST_EUI,
      hopCount: 1,
      seq: 42,
      payload,
    }

    const encoded = encodeFrame(original)
    const decoded = decodeFrame(encoded)

    expect(decoded.type).toBe(FrameType.HEARTBEAT)
    expect(decoded.srcEui).toBe(SRC_EUI)
    expect(decoded.dstEui).toBe(DST_EUI)
    expect(decoded.hopCount).toBe(1)
    expect(decoded.seq).toBe(42)
    expect(decoded.payload).toEqual(payload)
  })

  it('throws on CRC mismatch', () => {
    const payload = encodeAlarm({ alarmType: 0, sensorValue: 200 })
    const encoded = encodeFrame({
      type: FrameType.ALARM,
      srcEui: SRC_EUI,
      dstEui: DST_EUI,
      hopCount: 0,
      seq: 1,
      payload,
    })
    // corrupt the last byte (CRC)
    encoded[encoded.length - 1] ^= 0xff
    expect(() => decodeFrame(encoded)).toThrow(/CRC mismatch/)
  })

  it('throws on buffer too short', () => {
    expect(() => decodeFrame(Buffer.alloc(5))).toThrow(/too short/)
  })
})

describe('Heartbeat payload', () => {
  it('roundtrips', () => {
    const orig = {
      batteryMv: 3700,
      rssi: -80,
      snr: 5,
      status: 0b001, // alarm
      parentEui: 'AABBCCDD00001111',
      hopCount: 2,
    }
    const decoded = decodeHeartbeat(encodeHeartbeat(orig))
    expect(decoded).toEqual(orig)
  })
})

describe('Alarm payload', () => {
  it('roundtrips', () => {
    const orig = { alarmType: 2, sensorValue: 180 }
    expect(decodeAlarm(encodeAlarm(orig))).toEqual(orig)
  })
})

describe('MeshUpdate payload', () => {
  it('roundtrips with multiple neighbours', () => {
    const orig = {
      neighbours: [
        { eui: 'AABBCCDD00001111', rssi: -60, snr: 10 },
        { eui: 'AABBCCDD00002222', rssi: -70, snr: 7 },
      ],
    }
    expect(decodeMeshUpdate(encodeMeshUpdate(orig))).toEqual(orig)
  })

  it('roundtrips with zero neighbours', () => {
    const orig = { neighbours: [] }
    expect(decodeMeshUpdate(encodeMeshUpdate(orig))).toEqual(orig)
  })
})
