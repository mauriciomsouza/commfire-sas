import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { VirtualDetector, VirtualMesh, createDemoMesh } from '../index'

const GW_EUI = '0102030405060708'
const DET_EUI = 'AABBCCDD00000001'

describe('VirtualDetector', () => {
  it('emits a JOIN frame', () => {
    const det = new VirtualDetector({ eui: DET_EUI, type: 'smoke', parentEui: null })
    const frames: Buffer[] = []
    det.on('frame', (f: Buffer) => frames.push(f))
    det.sendJoin()
    expect(frames).toHaveLength(1)
    expect(frames[0]!.length).toBeGreaterThan(0)
  })

  it('emits a HEARTBEAT frame', () => {
    const det = new VirtualDetector({ eui: DET_EUI, type: 'smoke', parentEui: null })
    const frames: Buffer[] = []
    det.on('frame', (f: Buffer) => frames.push(f))
    det.sendHeartbeat()
    expect(frames).toHaveLength(1)
  })

  it('emits an ALARM frame on triggerAlarm()', () => {
    const det = new VirtualDetector({ eui: DET_EUI, type: 'smoke', parentEui: null })
    const frames: Buffer[] = []
    det.on('frame', (f: Buffer) => frames.push(f))
    det.triggerAlarm()
    expect(frames).toHaveLength(1)
  })

  it('emits an ALARM_CLEAR frame on clearAlarm()', () => {
    const det = new VirtualDetector({ eui: DET_EUI, type: 'smoke', parentEui: null })
    const frames: Buffer[] = []
    det.on('frame', (f: Buffer) => frames.push(f))
    det.clearAlarm()
    expect(frames).toHaveLength(1)
  })
})

describe('VirtualMesh', () => {
  it('adds detectors and enumerates them', () => {
    const mesh = new VirtualMesh()
    mesh.addDetector({ eui: DET_EUI, type: 'smoke', parentEui: null })
    mesh.addDetector({ eui: 'AABBCCDD00000002', type: 'heat', parentEui: null })
    expect(mesh.detectorCount).toBe(2)
    expect(mesh.allEuis()).toContain(DET_EUI)
  })

  it('retrieves detector by EUI', () => {
    const mesh = new VirtualMesh()
    mesh.addDetector({ eui: DET_EUI, type: 'smoke', parentEui: null })
    expect(mesh.getDetector(DET_EUI)?.eui).toBe(DET_EUI)
    expect(mesh.getDetector('00000000')).toBeUndefined()
  })

  it('bubbles frame events from detectors', () => {
    const mesh = new VirtualMesh()
    const det = mesh.addDetector({ eui: DET_EUI, type: 'smoke', parentEui: null })
    const frames: Buffer[] = []
    mesh.on('frame', (f: Buffer) => frames.push(f))
    det.sendJoin()
    expect(frames).toHaveLength(1)
  })
})

describe('createDemoMesh', () => {
  it('creates 5 virtual detectors', () => {
    const mesh = createDemoMesh(GW_EUI)
    expect(mesh.detectorCount).toBe(5)
  })

  it('stops without error', () => {
    const mesh = createDemoMesh(GW_EUI)
    expect(() => mesh.stop()).not.toThrow()
  })
})
