import { GatewayRuntime } from './gateway'

const cfg = {
  eui: process.env.GATEWAY_EUI ?? '0102030405060708',
  listenPort: Number(process.env.GATEWAY_LISTEN_PORT ?? 5700),
  backendUrl: process.env.BACKEND_URL ?? 'http://localhost:3000',
  backendToken: process.env.BACKEND_TOKEN ?? '',
  heartbeatIntervalMs: Number(process.env.HEARTBEAT_INTERVAL_MS ?? 60_000),
  staleThresholdMs: Number(process.env.STALE_THRESHOLD_MS ?? 120_000),
  firmwareVersion: process.env.FIRMWARE_VERSION ?? '1.0.0',
}

const runtime = new GatewayRuntime(cfg)

async function main() {
  console.log(`[gateway] starting – EUI ${cfg.eui}`)
  await runtime.start()

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

async function shutdown() {
  console.log('[gateway] shutting down…')
  await runtime.stop()
  process.exit(0)
}

main().catch((err) => {
  console.error('[gateway] fatal:', err)
  process.exit(1)
})

export { GatewayRuntime }
