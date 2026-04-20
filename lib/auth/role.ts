/**
 * User role helpers — Phase 8.1 scaffold.
 *
 * Reads the authenticated user's role from the `profiles.role` column
 * (added in supabase/migrations/002_add_admin_role.sql). The role defaults
 * to 'user'; admin is set out-of-band by scripts/init-admin.ts.
 *
 * Currently unused by application code — scaffolded ahead of Phase 8.2+
 * admin-route guards so that adding the first consumer doesn't require
 * plumbing changes. See BUILD.md Phase 8 for the scheduled consumers.
 *
 * Not imported anywhere in 8.1 on purpose: the Phase 8 roadmap (admin
 * console UI, admin-bypass RLS policies, user-management actions) will
 * be the first callers. Re-read this file when that work begins.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export type UserRole = 'user' | 'admin'

/**
 * Reads the authenticated user's role from profiles.
 * Returns null if no session or no profile row (shouldn't happen under
 * normal auth — the handle_new_user() trigger creates the profile on sign-up).
 */
export async function getCurrentUserRole(
  supabase: SupabaseClient
): Promise<UserRole | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !data) return null
  return (data.role as UserRole) ?? null
}

export async function isAdmin(supabase: SupabaseClient): Promise<boolean> {
  return (await getCurrentUserRole(supabase)) === 'admin'
}
