import type { RosterAgent, AgentStatuses } from '@/lib/types/stream'
import { AgentCard } from './AgentCard'

interface AgentRosterProps {
  agents: RosterAgent[]
  agentStatuses: AgentStatuses
}

export function AgentRoster({ agents, agentStatuses }: AgentRosterProps) {
  return (
    <aside
      className="flex flex-col h-full overflow-hidden"
      style={{ borderLeft: '1px solid var(--color-border)' }}
      aria-label="Advisory panel"
    >
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border-soft)' }}
      >
        <h2
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-text-faint)', fontFamily: 'var(--font-body)' }}
        >
          The Room
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="flex flex-col gap-0.5 px-1">
          {agents.map((agent) => (
            <AgentCard
              key={agent.name}
              agent={agent}
              status={agentStatuses[agent.name] ?? 'idle'}
            />
          ))}
        </div>
      </div>
    </aside>
  )
}
