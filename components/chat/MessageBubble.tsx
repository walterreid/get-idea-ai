'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import type { ClientMessage, RosterAgent } from '@/lib/types/stream'
import { getAgentColor } from '@/lib/types/stream'
import { Avatar } from '@/components/ui/Avatar'
import { RecommendationBlock } from '@/components/chat/RecommendationBlock'

interface MessageBubbleProps {
  message: ClientMessage
  /** Live roster — needed to resolve agent color and displayName at render time */
  agents: RosterAgent[]
}

function getAgent(agents: RosterAgent[], name: string): RosterAgent | undefined {
  return agents.find((a) => a.name === name)
}

function OrchestratorAnnotation({
  reason,
  phase,
}: {
  reason: string
  phase?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const short = reason.length > 80 ? reason.slice(0, 80) + '…' : reason

  return (
    <div className="flex items-start gap-1.5 my-1 px-1 group">
      <div
        className="w-px self-stretch flex-shrink-0 mt-1"
        style={{ backgroundColor: 'var(--color-border)' }}
      />
      <div className="min-w-0">
        {phase && (
          <span
            className="text-[10px] uppercase tracking-widest font-medium mr-2"
            style={{ color: 'var(--color-text-faint)' }}
          >
            {phase}
          </span>
        )}
        <span
          className="text-xs italic"
          style={{ color: 'var(--color-text-faint)' }}
        >
          {expanded ? reason : short}
        </span>
        {reason.length > 80 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="ml-1 inline-flex items-center gap-0.5 text-[11px] transition-opacity opacity-0 group-hover:opacity-100"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {expanded ? (
              <>
                less <ChevronUpIcon size={10} />
              </>
            ) : (
              <>
                more <ChevronDownIcon size={10} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

function SystemMessage({ content }: { content: string }) {
  return (
    <div className="flex items-center gap-3 my-3 px-2">
      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
      <span
        className="text-xs uppercase tracking-widest px-2"
        style={{ color: 'var(--color-text-faint)', fontFamily: 'var(--font-body)' }}
      >
        {content}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
    </div>
  )
}

export function MessageBubble({ message, agents }: MessageBubbleProps) {
  if (message.role === 'system') {
    return <SystemMessage content={message.content} />
  }

  if (message.role === 'orchestrator') {
    // Orchestrator annotation — sits above an agent message (empty content, has routingReason)
    if (!message.content) {
      return (
        <OrchestratorAnnotation
          reason={message.routingReason ?? ''}
          phase={message.deliberationPhase}
        />
      )
    }
    // Orchestrator direct message — the room speaking to the user when no agent speaks
    return (
      <div className="flex justify-center animate-message-in">
        <div
          className="max-w-[80%] px-5 py-3 rounded-xl text-center"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border-soft)',
          }}
        >
          <p
            className="text-[13px] italic leading-relaxed"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
          >
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-message-in">
        <div
          className="max-w-[72%] rounded-2xl rounded-br-sm px-4 py-3"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border-soft)',
          }}
        >
          <p
            className="text-[15px] leading-relaxed whitespace-pre-wrap"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
          >
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  // Agent message — resolve identity from roster or fall back to stream-provided values
  const rosterAgent = message.agentName ? getAgent(agents, message.agentName) : null
  const displayName = rosterAgent?.displayName ?? message.displayName ?? 'Advisor'
  const color = rosterAgent?.color ?? getAgentColor(message.agentName ?? '')

  // Recommendation messages get a structured card, not a plain bubble
  if (message.agentName === 'panel_recommendation') {
    return (
      <div className="flex flex-col gap-0.5 animate-message-in">
        {message.routingReason && (
          <OrchestratorAnnotation
            reason={message.routingReason}
            phase={message.deliberationPhase}
          />
        )}
        <RecommendationBlock content={message.content} streaming={message.streaming} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 animate-message-in">
      {/* Orchestrator annotation above this message */}
      {message.routingReason && (
        <OrchestratorAnnotation
          reason={message.routingReason}
          phase={message.deliberationPhase}
        />
      )}

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <Avatar displayName={displayName} color={color} />
        </div>

        <div className="min-w-0 flex-1 max-w-[80%]">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{
                color,
                fontFamily: 'var(--font-body)',
              }}
            >
              {displayName}
            </span>
          </div>

          <div
            className="rounded-2xl rounded-tl-sm px-4 py-3"
            style={{
              backgroundColor: `${color}0D`,
              borderLeft: `3px solid ${color}40`,
              // Subtle visual distinction while still streaming
              opacity: message.streaming ? 0.92 : 1,
              transition: 'opacity 200ms ease',
            }}
          >
            {message.content ? (
              <p
                className="text-[15px] leading-relaxed whitespace-pre-wrap"
                style={{ color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
              >
                {message.content}
              </p>
            ) : (
              // Waiting for first token — show the agent name in a thinking state
              <p
                className="text-[15px] leading-relaxed animate-status-pulse"
                style={{ color: 'var(--color-text-faint)', fontFamily: 'var(--font-body)' }}
              >
                {displayName} is composing a response…
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
