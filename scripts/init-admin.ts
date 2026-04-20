/**
 * Init admin — Phase 8.1.
 *
 * Idempotent script that:
 *   1. Finds the user matching ADMIN_EMAIL (default: walterreid@gmail.com)
 *   2. Sets profiles.role = 'admin' for that user
 *   3. If DEV_USER_PASSWORD is set: writes that password onto the Supabase
 *      user (lets /dev/login work). If missing: generates a strong random
 *      password, prints it ONCE for the operator to paste into .env.local.
 *
 * Safe to re-run. Magic-link auth continues to work for the user regardless —
 * Supabase allows both magic-link and password auth on the same account.
 *
 * Usage: `npm run admin:init`
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (service role for auth.admin API)
 *
 * Optional env:
 *   ADMIN_EMAIL              — default: walterreid@gmail.com
 *   DEV_USER_PASSWORD        — if set, written to Supabase user;
 *                              if empty, a strong password is generated + printed
 */

import { randomBytes } from 'node:crypto'
import { createAdminClient } from '../lib/supabase/admin'

const DEFAULT_ADMIN_EMAIL = 'walterreid@gmail.com'

function generatePassword(): string {
  // 24 bytes → 32 base64url chars. Safe shell string, no special quoting.
  return randomBytes(24).toString('base64url')
}

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL
  const envPassword = process.env.DEV_USER_PASSWORD

  const supabaseAdmin = createAdminClient()

  // ── Find the user by email ──
  // auth.admin.listUsers paginates; most projects fit in page 1 but be safe.
  let userId: string | null = null
  let pageNum = 1
  while (userId === null) {
    const {
      data: { users },
      error,
    } = await supabaseAdmin.auth.admin.listUsers({
      page: pageNum,
      perPage: 100,
    })
    if (error) {
      console.error('✗ Failed to list users:', error.message)
      process.exit(1)
    }
    const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (match) {
      userId = match.id
      break
    }
    if (users.length < 100) {
      // Reached the end without finding the user
      console.error(
        `✗ User not found: ${email}\n` +
          `  The user must exist in Supabase before this script runs.\n` +
          `  Sign in via magic link once (visit /auth, submit email, click the link in inbox),\n` +
          `  then re-run: npm run admin:init`
      )
      process.exit(1)
    }
    pageNum++
  }

  console.log(`✓ Found user ${email} (${userId})`)

  // ── Set profiles.role = 'admin' ──
  // Idempotent: no-op if already 'admin'.
  const { error: roleError } = await supabaseAdmin
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId)
  if (roleError) {
    console.error(`✗ Failed to set role: ${roleError.message}`)
    if (roleError.message.includes('column') && roleError.message.includes('role')) {
      console.error(
        `  The 'role' column may not exist yet. Apply migration 002 first:\n` +
          `  supabase db push  (or apply supabase/migrations/002_add_admin_role.sql in SQL editor)`
      )
    }
    process.exit(1)
  }
  console.log(`✓ Role set to 'admin'`)

  // ── Set or generate dev password ──
  const passwordToSet = envPassword && envPassword.length > 0 ? envPassword : generatePassword()
  const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: passwordToSet,
  })
  if (passwordError) {
    console.error(`✗ Failed to set password: ${passwordError.message}`)
    process.exit(1)
  }

  if (envPassword && envPassword.length > 0) {
    console.log(`✓ Dev password updated from DEV_USER_PASSWORD`)
  } else {
    console.log(`✓ Dev password generated (DEV_USER_PASSWORD was empty)`)
    console.log('')
    console.log('─────────────────────────────────────────────────────────────')
    console.log('  ADD THIS TO .env.local (then never share it):')
    console.log('')
    console.log(`  DEV_USER_PASSWORD=${passwordToSet}`)
    console.log('')
    console.log('─────────────────────────────────────────────────────────────')
    console.log('')
    console.log('  Without DEV_USER_PASSWORD set, /dev/login will not work.')
    console.log('  Magic-link sign-in works regardless.')
  }

  console.log('')
  console.log('Done.')
}

main().catch((err) => {
  console.error('✗ Unexpected error:', err)
  process.exit(1)
})
