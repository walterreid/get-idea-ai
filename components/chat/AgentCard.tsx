'use client'

import type { RosterAgent, AgentStatus } from '@/lib/types/stream'
import { StatusDot } from '@/components/ui/StatusDot'
import { Avatar } from '@/components/ui/Avatar'
import { clsx } from 'clsx'

interface AgentCardProps {
  agent: RosterAgent
  /** Live status from useDeliberation hook */
  status: AgentStatus
}

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: 'Idle',
  thinking: 'Considering…',
  speaking: 'Speaking',
  silent: 'Sitting this one out',
}

export function AgentCard({ agent, status }: AgentCardProps) {
  const isSpeaking = status === 'speaking'
  const isThinking = status === 'thinking'
  const isSilent = status === 'silent'

  return (
    <div
      className={clsx(
        'flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition-all duration-300',
        {
          'opacity-40': isSilent,
          'opacity-70': status === 'idle',
          'opacity-100': isSpeaking || isThinking,
          'scale-[1.02]': isSpeaking,
        }
      )}
      style={{
        backgroundColor: isSpeaking ? `${agent.color}0D` : undefined,
        borderLeft: isSpeaking ? `2px solid ${agent.color}` : '2px solid transparent',
      }}
      title={isSilent ? 'Sitting this one out' : undefined}
    >
      <div className="mt-0.5 flex-shrink-0">
        <Avatar displayName={agent.displayName} color={agent.color} size="sm" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <StatusDot status={status} color={agent.color} size="sm" />
          <span
            className="text-sm font-semibold leading-tight truncate"
            style={{
              color: isSpeaking || isThinking ? agent.color : 'var(--color-text)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {agent.displayName}
          </span>
        </div>

        {!isSpeaking && (
          <p
            className="mt-0.5 text-xs leading-snug truncate"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {agent.oneLiner}
          </p>
        )}

        <p
          className="mt-0.5 text-[11px] font-medium"
          style={{ color: isSpeaking ? agent.color : 'var(--color-text-faint)' }}
        >
          {STATUS_LABEL[status]}
        </p>
      </div>
    </div>
  )
}
