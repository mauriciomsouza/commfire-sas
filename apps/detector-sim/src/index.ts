import { createConnection } from 'net'
import { createDemoMesh, VirtualMesh } from '@commfire/simulation'
import type { EUI64 } from '@commfire/types'

// ─── Config ───────────────────────────────────────────────────────────────────

const GATEWAY_EUI: EUI64 = process.env.GATEWAY_EUI ?? '0102030405060708'
const GATEWAY_HOST = process.env.GATEWAY_HOST ?? 'localhost'
const GATEWAY_PORT = Number(process.env.GATEWAY_PORT ?? 5700)
const HEARTBEAT_INTERVAL_MS = Number(process.env.HEARTBEAT_INTERVAL_MS ?? 10_000)

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[detector-sim] connecting to gateway ${GATEWAY_HOST}:${GATEWAY_PORT}`)

  // Use demo mesh or a custom mesh from env
  const mesh: VirtualMesh = createDemoMesh(GATEWAY_EUI)

  const socket = createConnection({ host: GATEWAY_HOST, port: GATEWAY_PORT }, () => {
    console.log(`[detector-sim] connected – ${mesh.detectorCount} virtual detectors`)

    // forward all emitted frames to the gateway via TCP
    mesh.on('frame', (frame: Buffer, detEui: EUI64) => {
      if (socket.writable) {
        socket.write(frame)
        console.debug(`[detector-sim] sent frame from ${detEui} (${frame.length} bytes)`)
      }
    })

    mesh.start(HEARTBEAT_INTERVAL_MS)
  })

  socket.on('error', (err) => {
    console.error(`[detector-sim] socket error: ${err.message}`)
  })

  socket.on('close', () => {
    console.log('[detector-sim] disconnected from gateway – stopping mesh')
    mesh.stop()
  })

  // ─── Interactive CLI ───────────────────────────────────────────────────────

  process.stdin.setEncoding('utf8')
  process.stdin.resume()

  console.log('\n[detector-sim] interactive commands:')
  console.log('  alarm <eui>   – trigger alarm on detector')
  console.log('  clear <eui>   – clear alarm on detector')
  console.log('  fault <eui>   – trigger fault on detector')
  console.log('  list          – list all detectors')
  console.log('  quit          – stop simulator\n')

  process.stdin.on('data', (data: string) => {
    const line = data.trim()
    const [cmd, eui] = line.split(/\s+/) as [string, string | undefined]

    switch (cmd) {
      case 'alarm': {
        if (!eui) { console.error('Usage: alarm <eui>'); break }
        const det = mesh.getDetector(eui.toUpperCase())
        if (!det) { console.error(`Detector ${eui} not found`); break }
        det.triggerAlarm()
        console.log(`[sim] alarm triggered on ${eui}`)
        break
      }
      case 'clear': {
        if (!eui) { console.error('Usage: clear <eui>'); break }
        const det = mesh.getDetector(eui.toUpperCase())
        if (!det) { console.error(`Detector ${eui} not found`); break }
        det.clearAlarm()
        console.log(`[sim] alarm cleared on ${eui}`)
        break
      }
      case 'fault': {
        if (!eui) { console.error('Usage: fault <eui>'); break }
        const det = mesh.getDetector(eui.toUpperCase())
        if (!det) { console.error(`Detector ${eui} not found`); break }
        det.triggerFault()
        console.log(`[sim] fault triggered on ${eui}`)
        break
      }
      case 'list':
        console.log('[sim] detectors:', mesh.allEuis().join(', '))
        break
      case 'quit':
        console.log('[sim] stopping…')
        mesh.stop()
        socket.destroy()
        process.exit(0)
        break
      default:
        if (line) console.warn(`Unknown command: ${cmd}`)
    }
  })

  process.on('SIGINT', () => {
    console.log('\n[detector-sim] caught SIGINT, stopping…')
    mesh.stop()
    socket.destroy()
    process.exit(0)
  })
}

main().catch((err) => {
  console.error('[detector-sim] fatal:', err)
  process.exit(1)
})
