/**
 * lib/research/scheduler.ts
 *
 * R4 — Async research dispatch. See BUILD.md Phase 5 evolution → R4.
 *
 * The orchestrator can mark a research request as `async: true` in its routing
 * decision (lib/agents/schema.ts RoutingDecisionSchema). When it does:
 *
 *   1. compile.ts routeFromSupervisor skips the inline researchNode and goes
 *      straight to the worker. The specialist answers this turn WITHOUT the
 *      fetched context.
 *   2. app/api/chat/route.ts observes the async request on the supervisor's
 *      on_chain_end event, emits a `research_scheduled` SSE, and after the
 *      stream closes calls `scheduleAsyncResearch` here.
 *   3. This module runs the tool via Next.js `after()` — the response is
 *      already closed, so the user does not wait. The result is persisted as
 *      a `role: 'system'` message with the same metadata shape researchNode
 *      produces, and so the NEXT POST's `dbRowsToLangChain` +
 *      `latestAccumulatedResearchFromRows` path picks it up with no code
 *      change to the reload side.
 *
 * Two exports:
 *
 *   executeResearchTool(req)
 *     — framework-agnostic. Runs fetchUrl/webSearch, builds the merge patch
 *       + ResearchEntry. Used by both the API scheduler and the persona
 *       harness's --research-mode async path (which manages state in-memory,
 *       no DB).
 *
 *   scheduleAsyncResearch(threadId, req)
 *     — API-only. Wraps `executeResearchTool` in Next.js `after()` with DB
 *       persistence + per-thread caps + thread-existence check.
 *
 * Durability: this runs in the request's post-response lifecycle. Dies on
 * process restart (same behavior as Zansei's daemon threads). Tier-2 durable
 * queue (pg-boss / Upstash QStash) is an R4 upgrade path, not this cycle.
 */
import * as nextServer from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  fetchUrl,
  webSearch,
  formatResearchForContext,
  type ResearchResult,
} from '@/lib/tools/web-research'
import {
  AccumulatedResearchSchema,
  mergeAccumulatedResearch,
  type AccumulatedResearch,
  type ResearchEntry,
} from '@/lib/agents/schema'

export interface ResearchRequest {
  type: 'fetch_url' | 'web_search'
  target: string
  reason: string
  async?: boolean
}

// Per-thread caps — mirror researchNode (lib/graph/nodes.ts) so the async path
// never exceeds what the sync path would have allowed.
const MAX_FETCHES = 3
const MAX_SEARCHES = 2
const MAX_TOTAL = 10

type AfterFn = (cb: () => Promise<void> | void) => void
const afterImpl: AfterFn | null =
  (nextServer as unknown as { after?: AfterFn; unstable_after?: AfterFn }).after ??
  (nextServer as unknown as { after?: AfterFn; unstable_after?: AfterFn }).unstable_after ??
  null

/**
 * In-flight guard (ports Zansei's `_flight_lock` / `in_flight` concept from
 * research_orchestrator.py). While an async job for a given threadId is
 * running, a second `scheduleAsyncResearch` call for the same thread is
 * **dropped**, not queued. The orchestrator sees the prior result on the next
 * turn; the dropped request was enrichment that wasn't gating, by construction.
 *
 * Durability: module-level memory. Survives across requests within one Node
 * process; resets on cold starts / serverless instance rotation. Acceptable at
 * current single-instance volume; a DB-backed flag becomes the right answer
 * once R3 multi-batch work arrives or the deployment goes multi-instance.
 *
 * Intentionally NOT a queue. Zansei drops duplicate requests for the same
 * reason — the second request's result would land after the first's anyway,
 * and serializing would mean the owner's next turn waits on two fetches.
 */
const inFlightByThread = new Set<string>()

/**
 * Run the tool call and map the result to the merge patch + ResearchEntry
 * shape researchNode produces. No DB access; no side effects beyond the
 * outbound HTTP call. Safe to use from any context (API route, harness, test).
 */
export async function executeResearchTool(req: ResearchRequest): Promise<{
  entry: ResearchEntry
  accPatch: Partial<AccumulatedResearch>
}> {
  let result: ResearchResult
  try {
    result =
      req.type === 'fetch_url'
        ? await fetchUrl(req.target)
        : await webSearch(req.target)
  } catch (err) {
    console.error('[scheduler] Tool threw unexpectedly:', err)
    const errAt = new Date().toISOString()
    result =
      req.type === 'fetch_url'
        ? {
            type: 'fetch_url',
            url: req.target,
            success: false,
            error: 'unexpected error',
            fetched_at: errAt,
          }
        : {
            type: 'web_search',
            query: req.target,
            success: false,
            error: 'unexpected error',
            fetched_at: errAt,
          }
  }

  const entry: ResearchEntry = {
    type: req.type,
    target: req.target,
    formatted: formatResearchForContext(result),
    success: result.success,
    fetched_at: result.fetched_at,
  }

  const accPatch: Partial<AccumulatedResearch> = {
    tool_rounds: { batches_run: 1 },
  }

  if (result.type === 'fetch_url') {
    accPatch.provenance = [
      {
        kind: 'fetch_url' as const,
        ref: result.url,
        fetched_at: result.fetched_at,
        success: result.success,
        title: result.title,
      },
    ]
    if (result.success) {
      accPatch.primary_url = result.url
      accPatch.flags = { primary_url_fetched: true, needs_confirmation: [] }
      const excerpt = (result.content ?? '').slice(0, 500).trim()
      if (excerpt) accPatch.observations = [excerpt]
    }
  } else {
    accPatch.provenance = [
      {
        kind: 'web_search' as const,
        ref: result.query,
        fetched_at: result.fetched_at,
        success: result.success,
      },
    ]
    accPatch.queries_used = [result.query]
    if (result.success && result.results?.length) {
      accPatch.observations = result.results
        .map((r) => `${r.title}: ${r.snippet}`)
        .slice(0, 6)
    }
  }

  return { entry, accPatch }
}

/**
 * Short, readable summary persisted as the system message's `content` field
 * (the feed shows this inline; the full formatted tool output goes into
 * metadata.formatted in the harness, or is just discarded here — the LLM
 * reads `accumulated_research` on reload, which is all it needs).
 */
function briefSummary(req: ResearchRequest): string {
  if (req.type === 'fetch_url') {
    try {
      const u = new URL(
        req.target.startsWith('http') ? req.target : `https://${req.target}`
      )
      return `Reviewed ${u.hostname}`
    } catch {
      return `Reviewed ${req.target}`
    }
  }
  return `Searched for "${req.target}"`
}

/**
 * Core async path: verify thread, enforce caps + dedup, run the tool, persist.
 * Returns nothing — callers treat failure as non-fatal (the user is already
 * gone; log and drop).
 */
async function executeAsyncResearchForThread(
  threadId: string,
  req: ResearchRequest
): Promise<void> {
  const admin = createAdminClient()

  // Thread-existence check: if the user deleted the thread before research
  // landed, drop silently rather than write an orphan system message.
  const { data: thread } = await admin
    .from('threads')
    .select('id')
    .eq('id', threadId)
    .maybeSingle()
  if (!thread) {
    console.log(`[scheduler] Thread ${threadId} missing; dropping async research.`)
    return
  }

  // Pull prior research rows for caps, dedup, and merge base (latest snapshot).
  const { data: priorRows } = await admin
    .from('messages')
    .select('metadata')
    .eq('thread_id', threadId)
    .eq('role', 'system')
    .order('created_at', { ascending: true })

  const priorMeta = (priorRows ?? [])
    .map((r) => (r.metadata as Record<string, unknown> | null) ?? null)
    .filter((m): m is Record<string, unknown> => !!m && m.type === 'research')

  const total = priorMeta.length
  const fetches = priorMeta.filter((m) => m.research_type === 'fetch_url').length
  const searches = priorMeta.filter((m) => m.research_type === 'web_search').length

  if (total >= MAX_TOTAL) {
    console.warn(`[scheduler] Thread ${threadId} at total cap (${MAX_TOTAL}); dropping.`)
    return
  }
  if (req.type === 'fetch_url' && fetches >= MAX_FETCHES) {
    console.warn(`[scheduler] Thread ${threadId} at fetch cap; dropping.`)
    return
  }
  if (req.type === 'web_search' && searches >= MAX_SEARCHES) {
    console.warn(`[scheduler] Thread ${threadId} at search cap; dropping.`)
    return
  }
  if (priorMeta.some((m) => m.target === req.target)) {
    console.log(
      `[scheduler] ${req.target} already researched for thread ${threadId}; dropping.`
    )
    return
  }

  // Merge base = most recent accumulated_research we can parse.
  let base: AccumulatedResearch | null = null
  for (const m of priorMeta) {
    const parsed = AccumulatedResearchSchema.safeParse(m.accumulated_research)
    if (parsed.success) base = parsed.data
  }

  console.log(`[scheduler] Running async ${req.type}: ${req.target} (thread ${threadId})`)
  const t0 = Date.now()
  const { entry, accPatch } = await executeResearchTool(req)
  const merged = mergeAccumulatedResearch(base, accPatch)
  const elapsed = Date.now() - t0

  const content = entry.success ? briefSummary(req) : `Research did not complete: ${req.target}`

  const { error } = await admin.from('messages').insert({
    thread_id: threadId,
    role: 'system',
    agent_name: null,
    content,
    metadata: {
      type: 'research',
      research_type: entry.type,
      target: entry.target,
      success: entry.success,
      fetched_at: entry.fetched_at,
      accumulated_research: merged,
      async: true, // provenance — lets reload/debug see this landed via the async path
    },
  })

  if (error) {
    console.error(
      `[scheduler] Failed to persist async research for thread ${threadId}:`,
      error
    )
    return
  }

  console.log(
    `[scheduler] Persisted async research for thread ${threadId} (${elapsed}ms, success=${entry.success})`
  )
}

/**
 * Persist a tiny "research skipped — in flight" breadcrumb so the grader can
 * count it (instruments.research.skipped_in_flight) and the ledger picks up
 * the pattern across runs. Low signal today; essential when R3 multi-batch
 * dispatches arrive.
 *
 * Fire-and-forget: we do NOT block scheduling on the insert. The skip itself
 * is already decided by the in-flight check; the row is purely observational.
 */
function recordInFlightSkip(threadId: string, req: ResearchRequest): void {
  const admin = createAdminClient()
  admin
    .from('messages')
    .insert({
      thread_id: threadId,
      role: 'system',
      agent_name: null,
      content: '',
      metadata: {
        type: 'research',
        research_type: req.type,
        target: req.target,
        success: false,
        fetched_at: new Date().toISOString(),
        skip_reason: 'in_flight',
        async: true,
      },
    })
    .then(({ error }) => {
      if (error) {
        console.error(
          '[scheduler] Failed to persist in-flight skip row:',
          error
        )
      }
    })
  console.warn(
    `[scheduler] research_skip_in_flight: another research job active for thread ${threadId} — dropping ${req.type} ${req.target}`
  )
}

/**
 * Fire-and-forget async research dispatch. Must be called from an API route
 * handler (Next.js `after()` hooks the response lifecycle).
 *
 * Enforces the in-flight guard: only one active async job per thread. A second
 * call while one is running is dropped (recorded as a breadcrumb, then ignored).
 *
 * If `after()` is unavailable in this Next.js version, falls back to a plain
 * `void` promise — Node keeps the process alive long enough in serverful
 * deploys; on Vercel, the function's keep-alive covers the typical 1–15s
 * research budget. The fallback is logged so it's visible in production logs.
 */
export function scheduleAsyncResearch(
  threadId: string,
  req: ResearchRequest
): void {
  // In-flight guard. Synchronous check + add so a concurrent caller (same Node
  // process, different request) cannot race past it.
  if (inFlightByThread.has(threadId)) {
    recordInFlightSkip(threadId, req)
    return
  }
  inFlightByThread.add(threadId)

  const run = async () => {
    try {
      await executeAsyncResearchForThread(threadId, req)
    } catch (err) {
      console.error('[scheduler] Unhandled error:', err)
    } finally {
      inFlightByThread.delete(threadId)
    }
  }

  if (afterImpl) {
    afterImpl(run)
  } else {
    console.warn(
      '[scheduler] Next.js after()/unstable_after unavailable — using void promise fallback'
    )
    void run()
  }
}
