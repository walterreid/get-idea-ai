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

// Note: process.env.NODE_ENV is writable via simple assignment on Node 20+.
// Object.defineProperty fails because process.env is a Proxy-like object
// that only accepts direct property assignment, not descriptors.

test('dev-login route returns 404 when NODE_ENV is not development', async () => {
  const original = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  try {
    const { GET } = await import('../app/dev/login/route')
    const response = await GET()
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
    process.env.NODE_ENV = original
  }
})

test('dev-login route returns 404 when NODE_ENV is test', async () => {
  const original = process.env.NODE_ENV
  process.env.NODE_ENV = 'test'
  try {
    // Cache-bust so the module re-reads process.env. node:test evaluates
    // dynamic imports fresh per string, but NODE_ENV is read at call time
    // inside GET(), so even without cache-busting the guard would fire.
    const { GET } = await import('../app/dev/login/route?check=' + Date.now())
    const response = await GET()
    assert.strictEqual(
      response.status,
      404,
      `expected 404 in test mode, got ${response.status}`
    )
  } finally {
    process.env.NODE_ENV = original
  }
})
