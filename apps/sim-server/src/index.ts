import { SimServer } from './sim-server'

/**
 * Commfire Simulation Server
 *
 * Reads virtual devices from Supabase, sends periodic heartbeats so they appear
 * online, and polls the sim_events table for manual event commands submitted via
 * the superadmin simulation panel.
 *
 * Required environment variables:
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GATEWAY_SHARED_SECRET
 *   BACKEND_URL              – base URL of the web app (default http://localhost:3000)
 *   HEARTBEAT_INTERVAL_MS    – how often to send heartbeats (default 30000)
 *   POLL_INTERVAL_MS         – how often to poll sim_events (default 5000)
 */
async function main() {
  const server = new SimServer()

  process.on('SIGINT', () => {
    console.log('\n[sim-server] caught SIGINT, shutting down…')
    server.stop()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('[sim-server] caught SIGTERM, shutting down…')
    server.stop()
    process.exit(0)
  })

  await server.start()
}

main().catch((err) => {
  console.error('[sim-server] fatal error:', err)
  process.exit(1)
})
