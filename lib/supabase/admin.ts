/**
 * Supabase admin client — bypasses RLS via service role key.
 * For server-side use only: graph nodes, seed scripts, background jobs.
 * Never import this in client components or expose to the browser.
 */
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for admin client'
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
