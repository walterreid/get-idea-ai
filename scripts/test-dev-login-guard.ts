/**
 * Guard test for /dev/login — Phase 8.1.
 *
 * Asserts the NODE_ENV guard on the dev-login route works: when
 * NODE_ENV !== 'development', the route must return 404 (not 500, not
 * 302, not a JSON error). This is the belt-and-suspenders safety check
 * that the dev-only route can never serve an auth flow in production.
 *
 * Wired into test:quality so CI catches any regression to the guard.
 * CI sets NODE_ENV=production (or leaves it unset); either way, the
 * guard check rejects the request before any env vars are read.
 *
 * Run via `npm run test:dev-login-guard` or as part of `npm run test:quality`.
 */

import { test } from 'node:test'
import assert from 'node:assert'

// Note: Next.js 16 declares process.env.NODE_ENV as readonly at the type
// level, so Object.assign is used here to set it at runtime without
// triggering TS errors during `next build`. Runtime behavior is standard —
// process.env is a mutable object; the type narrowing is purely a TS
// contract. Object.defineProperty would fail because process.env is a
// Proxy-like object that only accepts plain property assignment.
function setNodeEnv(value: string | undefined): void {
  Object.assign(process.env, { NODE_ENV: value })
}

test('dev-login route returns 404 when NODE_ENV is not development', async () => {
  const original = process.env.NODE_ENV
  setNodeEnv('production')
  try {
    const { GET } = await import('../app/dev/login/route')
    const response = await GET({} as never)
    assert.strictEqual(
      response.status,
      404,
      `expected 404 in production mode, got ${response.status}`
    )
    const text = await response.text()
    assert.strictEqual(
      text,
      'Not Found',
      `expected body 'Not Found', got '${text}'`
    )
  } finally {
    setNodeEnv(original)
  }
})

test('dev-login route returns 404 when NODE_ENV is test', async () => {
  const original = process.env.NODE_ENV
  setNodeEnv('test')
  try {
    // Cache-bust so the module re-reads process.env. node:test evaluates
    // dynamic imports fresh per string, but NODE_ENV is read at call time
    // inside GET(), so even without cache-busting the guard would fire.
    const { GET } = await import('../app/dev/login/route?check=' + Date.now())
    const response = await GET({} as never)
    assert.strictEqual(
      response.status,
      404,
      `expected 404 in test mode, got ${response.status}`
    )
  } finally {
    setNodeEnv(original)
  }
})
