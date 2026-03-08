import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AgentConfigSchema, type AgentConfig } from './schema'

/**
 * Fetch all agents with status = 'active', ordered by sort_order.
 * Memoized per request via React.cache — one DB round-trip per request.
 * Never reads agent identity from a hardcoded file or constant.
 */
export const loadActiveAgents = cache(async (): Promise<AgentConfig[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('agent_configs')
    .select('*')
    .eq('status', 'active')
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to load agent configs: ${error.message}`)
  }

  return (data ?? []).map((row) => AgentConfigSchema.parse(row))
})

/**
 * Fetch a single agent by name.
 * Used in workerNode to pull system_prompt + model_provider at runtime.
 */
export const loadAgentByName = cache(
  async (name: string): Promise<AgentConfig | null> => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('name', name)
      .maybeSingle()

    if (error || !data) return null

    return AgentConfigSchema.parse(data)
  }
)

/**
 * Fetch the orchestrator config (status = 'system').
 * Used by supervisorNode to build the routing prompt.
 */
export const loadOrchestratorConfig = cache(
  async (): Promise<AgentConfig | null> => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('name', 'orchestrator')
      .maybeSingle()

    if (error || !data) return null

    return AgentConfigSchema.parse(data)
  }
)

/**
 * Build the agent context block injected into the orchestrator's system prompt.
 * Format: one block per agent showing name, display_name, and description_for_orchestrator.
 */
export function buildAgentContext(agents: AgentConfig[]): string {
  return agents
    .map(
      (a) =>
        `### ${a.display_name} (name: "${a.name}")\n${a.description_for_orchestrator}`
    )
    .join('\n\n')
}
