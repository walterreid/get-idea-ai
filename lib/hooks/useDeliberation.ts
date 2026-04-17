'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type {
  ClientMessage,
  ClientMessageRole,
  RosterAgent,
  AgentStatuses,
  StreamEvent,
} from '@/lib/types/stream'
import { getAgentColor } from '@/lib/types/stream'

interface UseDeliberationOptions {
  initialThreadId: string | null
  agents: RosterAgent[]
}

interface UseDeliberationReturn {
  messages: ClientMessage[]
  agentStatuses: AgentStatuses
  activeAgent: string | null
  deliberationPhase: string
  isGenerating: boolean
  routingReason: string | null
  currentThreadId: string | null
  send: (message: string) => Promise<void>
}

function initAgentStatuses(agents: RosterAgent[]): AgentStatuses {
  return Object.fromEntries(agents.map((a) => [a.name, 'idle'] as const))
}

export function useDeliberation({
  initialThreadId,
  agents,
}: UseDeliberationOptions): UseDeliberationReturn {
  const [messages, setMessages] = useState<ClientMessage[]>([])
  const [agentStatuses, setAgentStatuses] = useState<AgentStatuses>(() =>
    initAgentStatuses(agents)
  )
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [deliberationPhase, setDeliberationPhase] = useState('exploration')
  const [isGenerating, setIsGenerating] = useState(false)
  const [routingReason, setRoutingReason] = useState<string | null>(null)
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(
    initialThreadId
  )

  // Ref to the current streaming message's ID — updated as tokens arrive
  const streamingMsgIdRef = useRef<string | null>(null)
  // Pending routing reason to attach to the next agent message
  const pendingRoutingReasonRef = useRef('')
  const pendingRoutingObjectiveRef = useRef('')
  const pendingPhaseRef = useRef('exploration')
  // AbortController for the active stream
  const abortRef = useRef<AbortController | null>(null)
  // Thread that was created in this browser session via a live stream.
  // When the URL updates to include this thread's ID (triggering the effect below),
  // we must NOT wipe the already-streamed messages — they're valid and current.
  const sessionThreadRef = useRef<string | null>(null)

  // Load messages from DB whenever the active thread changes.
  // Clears the feed first so switching threads never shows stale messages.
  useEffect(() => {
    // If initialThreadId just caught up to a thread we created this session,
    // the messages are already in state from the live stream — don't clear them.
    if (initialThreadId && initialThreadId === sessionThreadRef.current) {
      setCurrentThreadId(initialThreadId)
      return
    }

    setMessages([])
    setCurrentThreadId(initialThreadId)

    if (!initialThreadId) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase
      .from('messages')
      .select('id, role, agent_name, content, metadata, created_at')
      .eq('thread_id', initialThreadId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!data) return

        setMessages(
          data
            // Orchestrator routing-annotation rows have empty content — skip them.
            // Their info lives on the agent message via metadata.routing_reason.
            .filter((r) => !(r.role === 'orchestrator' && !r.content))
            .map((r) => {
              const meta = (r.metadata ?? {}) as Record<string, unknown>
              const isRecommendation = meta.message_type === 'recommendation'
              const isResearch = r.role === 'system' && meta.type === 'research'

              if (isResearch) {
                return {
                  id: r.id,
                  role: 'research' as ClientMessageRole,
                  researchType: meta.research_type as 'fetch_url' | 'web_search',
                  researchTarget: meta.target as string,
                  researchSuccess: meta.success as boolean,
                  content: r.content,
                  streaming: false,
                  createdAt: new Date(r.created_at),
                }
              }

              return {
                id: r.id,
                role: r.role as ClientMessageRole,
                agentName: isRecommendation
                  ? 'panel_recommendation'
                  : (r.agent_name ?? undefined),
                displayName: (meta.display_name as string) ?? undefined,
                content: r.content,
                streaming: false,
                routingReason: (meta.routing_reason as string) ?? undefined,
                routingObjective: (meta.routing_objective as string) ?? undefined,
                deliberationPhase: (meta.deliberation_phase as string) ?? undefined,
                createdAt: new Date(r.created_at),
              }
            })
        )
      })
  }, [initialThreadId])

  const handleStreamEvent = useCallback(
    (event: StreamEvent) => {
      switch (event.type) {
        case 'thread_id':
          // Mark this thread as session-owned so the useEffect doesn't wipe it
          // if the URL updates to include this thread param mid-stream.
          sessionThreadRef.current = event.id
          setCurrentThreadId(event.id)
          break

        case 'routing': {
          // Record the reasoning that will annotate the next agent message
          pendingRoutingReasonRef.current = event.reason
          pendingRoutingObjectiveRef.current = event.objective
          pendingPhaseRef.current = event.phase
          setRoutingReason(event.reason)
          setDeliberationPhase(event.phase)

          if (event.agent && event.agent !== 'user') {
            // Transition targeted agent to "thinking"
            setAgentStatuses((prev) => ({
              ...prev,
              [event.agent]: 'thinking',
            }))
            // Dim explicitly suppressed agents
            event.suppress?.forEach((name) => {
              setAgentStatuses((prev) =>
                prev[name] !== undefined ? { ...prev, [name]: 'silent' } : prev
              )
            })
            setActiveAgent(event.agent)
          } else {
            setActiveAgent(null)
          }
          break
        }

        case 'agent_start': {
          const msgId = `streaming-${event.agent}-${Date.now()}`
          streamingMsgIdRef.current = msgId

          // Transition agent from thinking → speaking
          setAgentStatuses((prev) => ({
            ...prev,
            [event.agent]: 'speaking',
          }))

          // Add an empty streaming message to the feed
          setMessages((prev) => [
            ...prev,
            {
              id: msgId,
              role: 'agent',
              agentName: event.agent,
              displayName: event.displayName,
              content: '',
              streaming: true,
              routingReason: pendingRoutingReasonRef.current,
              routingObjective: pendingRoutingObjectiveRef.current,
              deliberationPhase: pendingPhaseRef.current,
              createdAt: new Date(),
            },
          ])
          break
        }

        case 'token': {
          // Append token to the streaming message
          const id = streamingMsgIdRef.current
          if (id) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === id ? { ...m, content: m.content + event.content } : m
              )
            )
          }
          break
        }

        case 'agent_end': {
          // Mark the streaming message as complete
          const id = streamingMsgIdRef.current
          if (id) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === id ? { ...m, streaming: false } : m
              )
            )
            streamingMsgIdRef.current = null
          }

          // Transition agent back to idle
          setAgentStatuses((prev) => ({
            ...prev,
            [event.agent]: 'idle',
          }))
          break
        }

        case 'research_start': {
          // Show a subtle "gathering context" annotation in the feed
          setMessages((prev) => [
            ...prev,
            {
              id: `research-${event.researchType}-${Date.now()}`,
              role: 'research',
              researchType: event.researchType,
              researchTarget: event.target,
              researchSuccess: undefined, // pending
              content: '',
              streaming: true,
              createdAt: new Date(),
            },
          ])
          break
        }

        case 'research_complete': {
          // Update the pending research annotation to show completion
          setMessages((prev) =>
            prev.map((m) =>
              m.role === 'research' &&
              m.researchTarget === event.target &&
              m.streaming
                ? {
                    ...m,
                    streaming: false,
                    researchSuccess: true,
                    content: event.summary,
                  }
                : m
            )
          )
          break
        }

        case 'research_failed': {
          // Update the pending research annotation to show failure
          setMessages((prev) =>
            prev.map((m) =>
              m.role === 'research' &&
              m.researchTarget === event.target &&
              m.streaming
                ? {
                    ...m,
                    streaming: false,
                    researchSuccess: false,
                    content: event.error,
                  }
                : m
            )
          )
          break
        }

        case 'yield_to_user':
          setRoutingReason(event.reason)
          setDeliberationPhase(event.phase)
          setActiveAgent(null)
          // When the orchestrator decides no agent should speak, it tells us why.
          // That reason IS the response — surface it as a direct orchestrator message.
          if (event.reason?.trim()) {
            setMessages((prev) => [
              ...prev,
              {
                id: `orchestrator-yield-${Date.now()}`,
                role: 'orchestrator',
                content: event.reason,
                streaming: false,
                createdAt: new Date(),
              },
            ])
          }
          // Reset all speaking/thinking agents to idle
          setAgentStatuses((prev) =>
            Object.fromEntries(
              Object.entries(prev).map(([k, v]) => [
                k,
                v === 'speaking' || v === 'thinking' ? 'idle' : v,
              ])
            )
          )
          break

        case 'done':
          setIsGenerating(false)
          setActiveAgent(null)
          // Ensure all agents are back to idle after the round completes
          setAgentStatuses((prev) =>
            Object.fromEntries(
              Object.entries(prev).map(([k, v]) => [
                k,
                v === 'speaking' || v === 'thinking' ? 'idle' : v,
              ])
            )
          )
          break

        case 'error':
          console.error('[useDeliberation] Stream error:', event.message)
          setIsGenerating(false)
          setActiveAgent(null)
          break
      }
    },
    [] // no deps — uses only refs and setters
  )

  const send = useCallback(
    async (content: string) => {
      const isInterrupt = isGenerating

      // Cancel the previous stream
      if (abortRef.current) {
        abortRef.current.abort()
      }
      const controller = new AbortController()
      abortRef.current = controller

      setIsGenerating(true)

      // If this is an interrupt, immediately reset all agent states
      if (isInterrupt) {
        setAgentStatuses((prev) =>
          Object.fromEntries(Object.keys(prev).map((k) => [k, 'idle']))
        )
        setActiveAgent(null)
        // Mark any in-progress streaming message as complete (interrupted)
        if (streamingMsgIdRef.current) {
          const id = streamingMsgIdRef.current
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id
                ? { ...m, streaming: false, content: m.content + ' [interrupted]' }
                : m
            )
          )
          streamingMsgIdRef.current = null
        }
      }

      // Add user message to local state immediately — no waiting for the round-trip
      const userMsgId = `user-${Date.now()}`
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          role: 'user',
          content,
          createdAt: new Date(),
        },
      ])

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thread_id: currentThreadId,
            message: content,
            interrupt: isInterrupt,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }

        if (!response.body) {
          throw new Error('No response body from /api/chat')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // SSE events are separated by double newlines
          const segments = buffer.split('\n\n')
          buffer = segments.pop() ?? ''

          for (const segment of segments) {
            for (const line of segment.split('\n')) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()
              if (!data || data === '[DONE]') continue
              try {
                handleStreamEvent(JSON.parse(data) as StreamEvent)
              } catch {
                // Skip malformed JSON — don't crash the stream
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // User interrupted — this is expected and fine
          return
        }
        console.error('[useDeliberation] Fetch error:', err)
        setIsGenerating(false)
        setActiveAgent(null)
      }
    },
    [isGenerating, currentThreadId, handleStreamEvent]
  )

  return {
    messages,
    agentStatuses,
    activeAgent,
    deliberationPhase,
    isGenerating,
    routingReason,
    currentThreadId,
    send,
  }
}
