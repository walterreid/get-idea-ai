/**
 * Dev login — Phase 8.1.
 *
 * Local-only auth shortcut for the admin account. Signs in using
 * email + password (Supabase allows password auth alongside magic link).
 *
 * DOUBLE-GUARDED:
 *   1. NODE_ENV must equal 'development' — production builds return 404
 *      immediately, before any env vars are read or Supabase is contacted.
 *   2. ADMIN_EMAIL and DEV_USER_PASSWORD must both be set in .env.local —
 *      missing either returns 500 with a clear recovery hint.
 *
 * Not a security bypass: every sign-in goes through Supabase's real
 * signInWithPassword flow. If the route somehow leaked to a non-dev
 * environment AND the env vars were set AND someone knew the credentials,
 * they'd still just be signing in normally. The guard is belt-and-suspenders;
 * the underlying auth is the same the app uses everywhere else.
 *
 * Usage: GET http://localhost:3000/dev/login → 302 redirect to /chat
 *
 * See scripts/init-admin.ts for the one-time setup that creates the admin
 * user's password. See BUILD.md Phase 8 for the scheduled consumers of
 * the role system scaffolded alongside this route.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Guard 1: dev only. Production builds return 404 as if the route
  // didn't exist — don't leak its presence.
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Guard 2: required env. Fail-loud with a recovery hint — not a silent
  // redirect or a generic 500.
  const email = process.env.ADMIN_EMAIL
  const password = process.env.DEV_USER_PASSWORD
  if (!email || !password) {
    return NextResponse.json(
      {
        error:
          'Dev login requires ADMIN_EMAIL and DEV_USER_PASSWORD in .env.local. Run: npm run admin:init',
      },
      { status: 500 }
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return NextResponse.json(
      { error: `Dev sign-in failed: ${error.message}` },
      { status: 401 }
    )
  }

  // Session cookies are set by the SSR client's setAll callback during
  // signInWithPassword. Redirect to /chat on the SAME origin as the incoming
  // request — this keeps cookies valid across the redirect (they're scoped
  // per-origin). Matters when the dev server runs on a non-standard port
  // (ephemeral preview servers, alternate ports when 3000 is in use, tunnel
  // URLs like ngrok, etc.).
  return NextResponse.redirect(new URL('/chat', req.url))
}
