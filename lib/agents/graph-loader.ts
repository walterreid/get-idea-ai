/**
 * Graph-compatible agent loaders — no React.cache, no cookies().
 * Used by LangGraph nodes running server-side within API routes.
 *
 * Module-level cache (5 min TTL) avoids redundant DB calls across
 * multiple nodes in a single graph run without React context.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { AgentConfigSchema, type AgentConfig } from './schema'

const CACHE_TTL_MS = 5 * 60 * 1000

let activeAgentsCache: { data: AgentConfig[]; timestamp: number } | null = null
const agentByNameCache = new Map<string, { data: AgentConfig | null; timestamp: number }>()

export async function fetchActiveAgents(): Promise<AgentConfig[]> {
  const now = Date.now()
  if (activeAgentsCache && now - activeAgentsCache.timestamp < CACHE_TTL_MS) {
    return activeAgentsCache.data
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('agent_configs')
    .select('*')
    .eq('status', 'active')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`fetchActiveAgents failed: ${error.message}`)

  const agents = (data ?? []).map((row) => AgentConfigSchema.parse(row))
  activeAgentsCache = { data: agents, timestamp: now }
  return agents
}

export async function fetchAgentByName(name: string): Promise<AgentConfig | null> {
  const now = Date.now()
  const cached = agentByNameCache.get(name)
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('agent_configs')
    .select('*')
    .eq('name', name)
    .maybeSingle()

  if (error) throw new Error(`fetchAgentByName(${name}) failed: ${error.message}`)

  const agent = data ? AgentConfigSchema.parse(data) : null
  agentByNameCache.set(name, { data: agent, timestamp: now })
  return agent
}

export async function fetchOrchestratorConfig(): Promise<AgentConfig> {
  const now = Date.now()
  const cached = agentByNameCache.get('orchestrator')
  if (cached?.data && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('agent_configs')
    .select('*')
    .eq('name', 'orchestrator')
    .maybeSingle()

  if (error || !data) {
    throw new Error('Orchestrator config not found in agent_configs. Run npm run seed.')
  }

  const config = AgentConfigSchema.parse(data)
  agentByNameCache.set('orchestrator', { data: config, timestamp: now })
  return config
}

/**
 * Formats active agents into the context block injected into the orchestrator's
 * system prompt (replaces {AGENTS_CONTEXT} at runtime).
 */
export function buildAgentContext(agents: AgentConfig[]): string {
  return agents
    .map(
      (a) =>
        `### ${a.display_name}  (name: "${a.name}")\n${a.description_for_orchestrator}`
    )
    .join('\n\n')
}

/** Invalidate caches — useful in tests and after seeding. */
export function invalidateAgentCache(): void {
  activeAgentsCache = null
  agentByNameCache.clear()
}
