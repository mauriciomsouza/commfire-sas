import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client authenticated with the service role key.
 * This bypasses RLS and is intended only for trusted server-side API routes
 * (e.g., gateway event ingestion endpoints).
 *
 * Never expose this client or the service role key to the browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
