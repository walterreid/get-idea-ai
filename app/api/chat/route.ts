import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deliberationGraph } from '@/lib/graph/compile'
import { fetchAgentByName } from '@/lib/agents/graph-loader'
import { loadThreadInsights } from '@/lib/insights/loader'
import { extractAndStoreInsights } from '@/lib/insights/extract'
import type { StreamEvent } from '@/lib/types/stream'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function encodeEvent(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
}

/**
 * Extract plain text from an AIMessageChunk's content.
 * Handles both OpenAI (string) and Anthropic (content block array) formats.
 */
function extractChunkText(chunk: unknown): string {
  if (!chunk || typeof chunk !== 'object') return ''
  const c = chunk as Record<string, unknown>

  if (typeof c.content === 'string') return c.content

  if (Array.isArray(c.content)) {
    return c.content
      .map((block: unknown) => {
        if (typeof block === 'string') return block
        if (block && typeof block === 'object') {
          const b = block as Record<string, unknown>
          if (typeof b.text === 'string') return b.text
        }
        return ''
      })
      .join('')
  }

  return ''
}

/** Convert DB message rows to LangChain messages for graph input. */
function dbRowsToLangChain(
  rows: Array<{ role: string; agent_name: string | null; content: string; metadata: Record<string, unknown> | null }>
) {
  return rows
    .filter((r) => r.role === 'user' || r.role === 'agent')
    .map((r) => {
      if (r.role === 'user') {
        return new HumanMessage(r.content)
      }
      return new AIMessage({
        content: r.content,
        name: r.agent_name ?? undefined,
        additional_kwargs: {
          display_name: (r.metadata?.display_name as string) ?? r.agent_name ?? 'Advisor',
          ...(r.metadata ?? {}),
        },
      })
    })
}

/** Truncate a string to the last word boundary before maxLen chars. */
function truncateTitle(text: string, maxLen = 60): string {
  if (text.length <= maxLen) return text
  const cut = text.slice(0, maxLen)
  return (cut.lastIndexOf(' ') > 10 ? cut.slice(0, cut.lastIndexOf(' ')) : cut) + '…'
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // ── Auth ──
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // ── Parse body ──
  let body: { thread_id?: string; message: string; interrupt?: boolean }
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const { thread_id, message, interrupt = false } = body

  if (!message?.trim()) {
    return new Response('Message is required', { status: 400 })
  }

  // ── Build SSE stream ──
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: StreamEvent) => {
        try {
          controller.enqueue(encodeEvent(event))
        } catch {
          // Client disconnected — controller already closed
        }
      }

      try {
        console.log(`[/api/chat] Request: thread=${thread_id ?? 'new'} interrupt=${interrupt}`)

        // ── Thread management ──
        let threadId = thread_id

        if (!threadId) {
          // Create a new thread, title from the first message
          const { data: newThread, error: threadError } = await adminClient
            .from('threads')
            .insert({
              user_id: user.id,
              title: truncateTitle(message),
              status: 'active',
            })
            .select('id')
            .single()

          if (threadError || !newThread) {
            emit({ type: 'error', message: 'Failed to create conversation thread.' })
            controller.close()
            return
          }

          threadId = newThread.id as string
          emit({ type: 'thread_id', id: threadId as string })
        } else {
          // Verify ownership
          const { data: thread } = await adminClient
            .from('threads')
            .select('id, user_id')
            .eq('id', threadId)
            .eq('user_id', user.id)
            .maybeSingle()

          if (!thread) {
            emit({ type: 'error', message: 'Thread not found.' })
            controller.close()
            return
          }

          emit({ type: 'thread_id', id: threadId })
        }

        // ── Persist user message ──
        await adminClient.from('messages').insert({
          thread_id: threadId,
          role: 'user',
          content: message,
        })

        // ── Load full conversation history + prior insights in parallel ──
        const [allRowsResult, insightSummary] = await Promise.all([
          adminClient
            .from('messages')
            .select('role, agent_name, content, metadata')
            .eq('thread_id', threadId)
            .order('created_at', { ascending: true }),
          loadThreadInsights(threadId),
        ])

        const allRows = allRowsResult.data ?? []

        const historyMessages = dbRowsToLangChain(
          allRows.map((r) => ({
            role: r.role,
            agent_name: r.agent_name,
            content: r.content,
            metadata: (r.metadata as Record<string, unknown>) ?? null,
          }))
        )

        // ── Build initial graph state ──
        // Prior insights give the orchestrator memory across sessions.
        // On the first session, prior_insights_context is '' and the orchestrator starts fresh.
        const initialState = {
          messages: historyMessages,
          human_interrupted: interrupt,
          turn_count: 0,
          prior_insights_context: insightSummary.formatted,
        }

        // ── Run graph with streaming ──
        let currentAgent: string | null = null
        let currentDisplayName: string | null = null
        let pendingRoutingReason = ''
        let pendingRoutingObjective = ''
        let pendingPhase = 'exploration'
        let streamingBuffer = ''

        // Messages to persist after stream completes
        const agentMessagesToPersist: Array<{
          thread_id: string
          role: string
          agent_name: string | null
          content: string
          metadata: Record<string, unknown>
        }> = []

        const graphStream = deliberationGraph.streamEvents(
          initialState,
          { version: 'v2' }
        )

        for await (const event of graphStream) {
          // Respect client disconnect
          if (request.signal.aborted) break

          const nodeName = event.metadata?.langgraph_node as string | undefined

          // ── Supervisor completed → routing decision ──
          if (event.event === 'on_chain_end' && event.name === 'supervisor') {
            const output = event.data?.output as Record<string, unknown> | undefined
            if (output && typeof output.next_speaker === 'string') {
              pendingRoutingReason = (output.routing_reason as string) ?? ''
              pendingRoutingObjective = (output.routing_objective as string) ?? ''
              pendingPhase = (output.deliberation_phase as string) ?? 'exploration'

              console.log(`[/api/chat] Routing → next_speaker="${output.next_speaker}" phase="${pendingPhase}" objective="${pendingRoutingObjective}"`)

              if (output.next_speaker === 'user' || !output.next_speaker) {
                console.log(`[/api/chat] Yielding to user. Reason: ${pendingRoutingReason.slice(0, 120)}`)
                emit({
                  type: 'yield_to_user',
                  reason: pendingRoutingReason,
                  phase: pendingPhase,
                })
              } else {
                currentAgent = output.next_speaker

                // Fetch display name — use cache (5 min TTL in graph-loader)
                const agentConfig = await fetchAgentByName(currentAgent).catch(
                  () => null
                )
                currentDisplayName =
                  agentConfig?.display_name ?? currentAgent

                const suppress = Array.isArray(output.suppress)
                  ? (output.suppress as string[])
                  : []

                emit({
                  type: 'routing',
                  agent: currentAgent,
                  displayName: currentDisplayName,
                  reason: pendingRoutingReason,
                  phase: pendingPhase,
                  objective: pendingRoutingObjective,
                  suppress,
                })
              }
            }
          }

          // ── Worker node started ──
          if (event.event === 'on_chain_start' && event.name === 'worker') {
            streamingBuffer = ''
            if (currentAgent) {
              console.log(`[/api/chat] Agent start: ${currentAgent} (${currentDisplayName})`)
              emit({
                type: 'agent_start',
                agent: currentAgent,
                displayName: currentDisplayName ?? currentAgent,
              })
            }
          }

          // ── Recommendation node started ──
          if (event.event === 'on_chain_start' && event.name === 'recommendation') {
            streamingBuffer = ''
            currentAgent = 'panel_recommendation'
            currentDisplayName = 'Panel Recommendation'
            emit({
              type: 'routing',
              agent: 'panel_recommendation',
              displayName: 'Panel Recommendation',
              reason: "The deliberation has reached a natural conclusion. Synthesizing the panel's perspectives.",
              phase: 'recommendation',
              objective: 'summarize',
              suppress: [],
            })
            emit({
              type: 'agent_start',
              agent: 'panel_recommendation',
              displayName: 'Panel Recommendation',
            })
          }

          // ── LLM token from worker ──
          if (
            event.event === 'on_chat_model_stream' &&
            (nodeName === 'worker' || nodeName === 'recommendation')
          ) {
            const text = extractChunkText(event.data?.chunk)
            if (text && currentAgent) {
              streamingBuffer += text
              emit({ type: 'token', agent: currentAgent, content: text })
            }
          }

          // ── Worker node completed ──
          if (event.event === 'on_chain_end' && event.name === 'worker') {
            if (currentAgent && streamingBuffer) {
              console.log(`[/api/chat] Agent end: ${currentAgent} (${streamingBuffer.length} chars)`)
              emit({ type: 'agent_end', agent: currentAgent })

              // Collect for batch persist
              agentMessagesToPersist.push({
                thread_id: threadId,
                role: 'agent',
                agent_name: currentAgent,
                content: streamingBuffer,
                metadata: {
                  display_name: currentDisplayName,
                  routing_reason: pendingRoutingReason,
                  routing_objective: pendingRoutingObjective,
                  deliberation_phase: pendingPhase,
                },
              })

              // Also persist orchestrator routing annotation
              if (pendingRoutingReason) {
                agentMessagesToPersist.push({
                  thread_id: threadId,
                  role: 'orchestrator',
                  agent_name: null,
                  content: '',
                  metadata: {
                    next_speaker: currentAgent,
                    routing_reason: pendingRoutingReason,
                    routing_objective: pendingRoutingObjective,
                    deliberation_phase: pendingPhase,
                  },
                })
              }

              streamingBuffer = ''
            }
          }

          // ── Recommendation node completed ──
          if (event.event === 'on_chain_end' && event.name === 'recommendation') {
            if (streamingBuffer) {
              emit({ type: 'agent_end', agent: 'panel_recommendation' })
              agentMessagesToPersist.push({
                thread_id: threadId,
                role: 'agent',
                agent_name: 'orchestrator',
                content: streamingBuffer,
                metadata: {
                  display_name: 'Panel Recommendation',
                  message_type: 'recommendation',
                  deliberation_phase: 'recommendation',
                },
              })
              streamingBuffer = ''
            }
          }
        }

        // ── Batch persist all new agent/orchestrator messages ──
        if (agentMessagesToPersist.length > 0) {
          await adminClient.from('messages').insert(agentMessagesToPersist)
        }

        // ── Update thread's updated_at ──
        await adminClient
          .from('threads')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', threadId)

        console.log(`[/api/chat] Round complete. Persisting ${agentMessagesToPersist.length} message(s).`)

        // ── Signal round completion to client ──
        // The client gets control back here. Extraction runs silently below
        // before the stream closes. No additional events are emitted.
        emit({ type: 'done' })

        // ── Background insight extraction ──
        // Runs after `done` is emitted, before the stream closes.
        // The client has already received control — this is invisible to the user.
        // Errors are caught and logged; they never affect the user experience.
        //
        // Build the full conversation for extraction from DB rows + new messages.
        // New messages were just persisted above, so we can reload from DB.
        if (agentMessagesToPersist.some((m) => m.role === 'agent')) {
          const { data: finalRows } = await adminClient
            .from('messages')
            .select('role, agent_name, content, metadata')
            .eq('thread_id', threadId)
            .order('created_at', { ascending: true })

          if (finalRows && finalRows.length > 0) {
            await extractAndStoreInsights(
              threadId,
              finalRows.map((r) => ({
                role: r.role,
                agent_name: r.agent_name,
                content: r.content,
                metadata: (r.metadata as Record<string, unknown>) ?? null,
              }))
            ).catch((err) => {
              console.error('[/api/chat] Insight extraction failed (non-fatal):', err)
            })
          }
        }
      } catch (err) {
        console.error('[/api/chat] Stream error:', err)
        emit({
          type: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred.',
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  })
}
