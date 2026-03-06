/**
 * Commfire LoRa Mesh Protocol – Frame definitions and codec
 *
 * Wire format (binary, big-endian):
 *  [1B] Frame type
 *  [8B] Source EUI-64
 *  [8B] Destination EUI-64 (0xFF…FF = broadcast)
 *  [1B] Hop count
 *  [2B] Sequence number
 *  [2B] Payload length
 *  [NB] Payload (type-specific)
 *  [2B] CRC-16/CCITT
 */

// ─── Frame types ─────────────────────────────────────────────────────────────

export const FrameType = {
  JOIN: 0x01,
  JOIN_ACK: 0x02,
  LEAVE: 0x03,
  HEARTBEAT: 0x10,
  ALARM: 0x20,
  ALARM_CLEAR: 0x21,
  FAULT: 0x30,
  FAULT_CLEAR: 0x31,
  TAMPER: 0x40,
  TAMPER_CLEAR: 0x41,
  LOW_BATTERY: 0x50,
  MESH_UPDATE: 0x60,
  ACK: 0xF0,
} as const

export type FrameTypeValue = (typeof FrameType)[keyof typeof FrameType]

// ─── Broadcast address ────────────────────────────────────────────────────────

export const BROADCAST_EUI = 'FFFFFFFFFFFFFFFF'
export const GATEWAY_EUI_SENTINEL = '0000000000000000'

// ─── Parsed frame ─────────────────────────────────────────────────────────────

export interface MeshFrame {
  type: FrameTypeValue
  srcEui: string
  dstEui: string
  hopCount: number
  seq: number
  payload: Buffer
}

// ─── Typed payloads ───────────────────────────────────────────────────────────

export interface HeartbeatPayload {
  batteryMv: number     // milli-volts
  rssi: number          // dBm (int8, signed)
  snr: number           // dB (int8, signed)
  status: number        // bitmask: bit0=alarm, bit1=fault, bit2=tamper
  parentEui: string     // 8 bytes EUI of parent node; GATEWAY_EUI_SENTINEL if direct
  hopCount: number
}

export interface AlarmPayload {
  sensorValue: number   // raw ADC or normalised 0-255
  alarmType: number     // 0=smoke,1=heat,2=co,3=multi
}

export interface FaultPayload {
  faultCode: number
}

export interface TamperPayload {
  tampered: boolean
}

export interface LowBatteryPayload {
  batteryMv: number
}

export interface MeshUpdatePayload {
  neighbours: Array<{
    eui: string
    rssi: number
    snr: number
  }>
}

export interface JoinPayload {
  firmwareVersion: string  // 4 bytes: major.minor.patch.build
  deviceType: number       // 0=smoke,1=heat,2=co,3=multi
}

// ─── CRC-16/CCITT ─────────────────────────────────────────────────────────────

export function crc16(buf: Buffer): number {
  let crc = 0xffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]! << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc <<= 1
      }
      crc &= 0xffff
    }
  }
  return crc
}

// ─── Codec ────────────────────────────────────────────────────────────────────

const HEADER_SIZE = 1 + 8 + 8 + 1 + 2 + 2 // type+src+dst+hop+seq+len = 22 bytes
const CRC_SIZE = 2

function euiToBytes(eui: string): Buffer {
  const hex = eui.replace(/[^0-9A-Fa-f]/g, '')
  if (hex.length !== 16) throw new Error(`Invalid EUI length: ${eui}`)
  return Buffer.from(hex, 'hex')
}

function bytesToEui(buf: Buffer, offset: number): string {
  return buf.slice(offset, offset + 8).toString('hex').toUpperCase()
}

/**
 * Encode a mesh frame into a binary buffer.
 */
export function encodeFrame(frame: MeshFrame): Buffer {
  const payloadLen = frame.payload.length
  const totalLen = HEADER_SIZE + payloadLen + CRC_SIZE
  const buf = Buffer.alloc(totalLen)
  let off = 0

  buf.writeUInt8(frame.type, off); off += 1
  euiToBytes(frame.srcEui).copy(buf, off); off += 8
  euiToBytes(frame.dstEui).copy(buf, off); off += 8
  buf.writeUInt8(frame.hopCount, off); off += 1
  buf.writeUInt16BE(frame.seq, off); off += 2
  buf.writeUInt16BE(payloadLen, off); off += 2
  frame.payload.copy(buf, off); off += payloadLen

  const crc = crc16(buf.slice(0, off))
  buf.writeUInt16BE(crc, off)

  return buf
}

/**
 * Decode a binary buffer into a MeshFrame.
 * Throws if the CRC is invalid or the buffer is too short.
 */
export function decodeFrame(buf: Buffer): MeshFrame {
  if (buf.length < HEADER_SIZE + CRC_SIZE) {
    throw new Error(`Frame too short: ${buf.length} bytes`)
  }

  let off = 0
  const type = buf.readUInt8(off) as FrameTypeValue; off += 1
  const srcEui = bytesToEui(buf, off); off += 8
  const dstEui = bytesToEui(buf, off); off += 8
  const hopCount = buf.readUInt8(off); off += 1
  const seq = buf.readUInt16BE(off); off += 2
  const payloadLen = buf.readUInt16BE(off); off += 2

  if (buf.length < HEADER_SIZE + payloadLen + CRC_SIZE) {
    throw new Error(`Frame payload truncated`)
  }

  const payload = buf.slice(off, off + payloadLen); off += payloadLen
  const crcReceived = buf.readUInt16BE(off)
  const crcComputed = crc16(buf.slice(0, off))

  if (crcReceived !== crcComputed) {
    throw new Error(`CRC mismatch: received 0x${crcReceived.toString(16)}, computed 0x${crcComputed.toString(16)}`)
  }

  return { type, srcEui, dstEui, hopCount, seq, payload }
}

// ─── Payload encoders / decoders ─────────────────────────────────────────────

export function encodeHeartbeat(p: HeartbeatPayload): Buffer {
  const buf = Buffer.alloc(8 + 2 + 1 + 1 + 1 + 1) // parentEui(8) + batteryMv(2) + rssi(1) + snr(1) + status(1) + hopCount(1) = 14
  let off = 0
  euiToBytes(p.parentEui).copy(buf, off); off += 8
  buf.writeUInt16BE(p.batteryMv, off); off += 2
  buf.writeInt8(p.rssi, off); off += 1
  buf.writeInt8(p.snr, off); off += 1
  buf.writeUInt8(p.status, off); off += 1
  buf.writeUInt8(p.hopCount, off)
  return buf
}

export function decodeHeartbeat(payload: Buffer): HeartbeatPayload {
  let off = 0
  const parentEui = bytesToEui(payload, off); off += 8
  const batteryMv = payload.readUInt16BE(off); off += 2
  const rssi = payload.readInt8(off); off += 1
  const snr = payload.readInt8(off); off += 1
  const status = payload.readUInt8(off); off += 1
  const hopCount = payload.readUInt8(off)
  return { parentEui, batteryMv, rssi, snr, status, hopCount }
}

export function encodeAlarm(p: AlarmPayload): Buffer {
  const buf = Buffer.alloc(2)
  buf.writeUInt8(p.alarmType, 0)
  buf.writeUInt8(p.sensorValue, 1)
  return buf
}

export function decodeAlarm(payload: Buffer): AlarmPayload {
  return {
    alarmType: payload.readUInt8(0),
    sensorValue: payload.readUInt8(1),
  }
}

export function encodeFault(p: FaultPayload): Buffer {
  const buf = Buffer.alloc(1)
  buf.writeUInt8(p.faultCode, 0)
  return buf
}

export function decodeFault(payload: Buffer): FaultPayload {
  return { faultCode: payload.readUInt8(0) }
}

export function encodeLowBattery(p: LowBatteryPayload): Buffer {
  const buf = Buffer.alloc(2)
  buf.writeUInt16BE(p.batteryMv, 0)
  return buf
}

export function decodeLowBattery(payload: Buffer): LowBatteryPayload {
  return { batteryMv: payload.readUInt16BE(0) }
}

export function encodeJoin(p: JoinPayload): Buffer {
  const [major = 0, minor = 0, patch = 0, build = 0] = p.firmwareVersion.split('.').map(Number)
  const buf = Buffer.alloc(5)
  buf.writeUInt8(major, 0)
  buf.writeUInt8(minor, 1)
  buf.writeUInt8(patch, 2)
  buf.writeUInt8(build, 3)
  buf.writeUInt8(p.deviceType, 4)
  return buf
}

export function decodeJoin(payload: Buffer): JoinPayload {
  const firmwareVersion = `${payload.readUInt8(0)}.${payload.readUInt8(1)}.${payload.readUInt8(2)}.${payload.readUInt8(3)}`
  const deviceType = payload.readUInt8(4)
  return { firmwareVersion, deviceType }
}

export function encodeMeshUpdate(p: MeshUpdatePayload): Buffer {
  const count = p.neighbours.length
  const buf = Buffer.alloc(1 + count * 10)
  buf.writeUInt8(count, 0)
  let off = 1
  for (const n of p.neighbours) {
    euiToBytes(n.eui).copy(buf, off); off += 8
    buf.writeInt8(n.rssi, off); off += 1
    buf.writeInt8(n.snr, off); off += 1
  }
  return buf
}

export function decodeMeshUpdate(payload: Buffer): MeshUpdatePayload {
  const count = payload.readUInt8(0)
  let off = 1
  const neighbours = []
  for (let i = 0; i < count; i++) {
    const eui = bytesToEui(payload, off); off += 8
    const rssi = payload.readInt8(off); off += 1
    const snr = payload.readInt8(off); off += 1
    neighbours.push({ eui, rssi, snr })
  }
  return { neighbours }
}
