/**
 * Structured SSE event types emitted by the chat API route and consumed by useDeliberation.
 *
 * Design intent: these are not log events. They are product surface.
 * The `reason` field in routing events is shown to the user as context
 * for why each advisor was called.
 */

export type StreamEvent =
  | { type: 'thread_id'; id: string }
  | {
      type: 'routing'
      agent: string
      displayName: string
      reason: string
      phase: string
      objective: string
      suppress: string[]
    }
  | { type: 'agent_start'; agent: string; displayName: string }
  | { type: 'token'; agent: string; content: string }
  | { type: 'agent_end'; agent: string }
  | { type: 'yield_to_user'; reason: string; phase: string }
  | {
      type: 'research_start'
      researchType: 'fetch_url' | 'web_search'
      target: string
    }
  | {
      type: 'research_complete'
      researchType: 'fetch_url' | 'web_search'
      target: string
      /** Short summary for the feed annotation — not the full content */
      summary: string
    }
  | {
      type: 'research_failed'
      researchType: 'fetch_url' | 'web_search'
      target: string
      error: string
    }
  | {
      /**
       * R4: orchestrator marked a research request as async. The tool call is
       * dispatched after the response closes via lib/research/scheduler.ts.
       * Purely observational — no bouncing-dots UI. Harness uses it to prove
       * the timing shift in the ledger.
       */
      type: 'research_scheduled'
      researchType: 'fetch_url' | 'web_search'
      target: string
      reason: string
    }
  | { type: 'error'; message: string }
  | { type: 'done' }

/**
 * A message as rendered on the client.
 * Extends the DB message shape with streaming-specific fields.
 */
export type ClientMessageRole = 'user' | 'agent' | 'orchestrator' | 'system' | 'research'

export interface ClientMessage {
  id: string
  role: ClientMessageRole
  /** Identifies which agent spoke — maps to CSS variable `--agent-<name>` */
  agentName?: string
  /** Human-readable agent display name from DB config */
  displayName?: string
  content: string
  /** True while tokens are still arriving — affects rendering subtly */
  streaming?: boolean
  /** The orchestrator's reason for selecting this agent. Product surface. */
  routingReason?: string
  routingObjective?: string
  deliberationPhase?: string
  /** Research metadata — present when role === 'research' */
  researchType?: 'fetch_url' | 'web_search'
  researchTarget?: string
  researchSuccess?: boolean
  createdAt: Date
}

/**
 * Client-side roster agent — shape used for rendering AgentCard.
 * Colors are CSS custom properties, not hardcoded hex.
 */
export interface RosterAgent {
  name: string
  displayName: string
  oneLiner: string
  color: string
}

export type AgentStatus = 'idle' | 'thinking' | 'speaking' | 'silent'
export type AgentStatuses = Record<string, AgentStatus>

/**
 * Maps agent names to their CSS variable color.
 * These are design tokens — not agent identity logic.
 */
export const AGENT_COLOR_MAP: Record<string, string> = {
  marketer: 'var(--agent-marketer)',
  finance: 'var(--agent-finance)',
  creative: 'var(--agent-creative)',
  copywriter: 'var(--agent-copywriter)',
  designer: 'var(--agent-designer)',
  accountant: 'var(--agent-accountant)',
  operations: 'var(--agent-operations)',
  legal: 'var(--agent-legal)',
  cx: 'var(--agent-cx)',
  realist: 'var(--agent-realist)',
  ideation: 'var(--agent-ideation)',
  panel_recommendation: 'var(--color-primary)',
}

export function getAgentColor(name: string): string {
  return AGENT_COLOR_MAP[name] ?? 'var(--color-text-muted)'
}

/**
 * A thread as displayed in the left sidebar.
 * Populated from real DB rows in production; placeholder data during development.
 */
export interface SidebarThread {
  id: string
  title: string
  updatedAt: Date
  /** Number of extracted insights — shown as a badge when > 0 */
  insightCount: number
}
