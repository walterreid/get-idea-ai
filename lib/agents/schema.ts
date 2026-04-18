import { z } from 'zod'

export const ModelProviderSchema = z.enum(['openai', 'anthropic'])

export const RiskToleranceSchema = z.enum(['low', 'medium', 'high'])

export const AgentStatusSchema = z.enum(['active', 'inactive', 'system'])

/**
 * Full agent config — matches the agent_configs table exactly.
 * Used server-side only (contains system_prompt).
 */
export const AgentConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  display_name: z.string().min(1),
  description_for_orchestrator: z.string().min(1),
  system_prompt: z.string().min(1),
  model_provider: ModelProviderSchema,
  model_name: z.string().min(1),
  voice_style: z.string().min(1),
  risk_tolerance: RiskToleranceSchema,
  expertise_domains: z.array(z.string()),
  status: AgentStatusSchema,
  sort_order: z.number().int(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type AgentConfig = z.infer<typeof AgentConfigSchema>
export type ModelProvider = z.infer<typeof ModelProviderSchema>
export type AgentStatus = z.infer<typeof AgentStatusSchema>
export type RiskTolerance = z.infer<typeof RiskToleranceSchema>

/**
 * Safe subset for client-side use — system_prompt is never exposed to the browser.
 */
export const PublicAgentConfigSchema = AgentConfigSchema.omit({
  system_prompt: true,
})

export type PublicAgentConfig = z.infer<typeof PublicAgentConfigSchema>

/**
 * The structured routing decision the Orchestrator emits as JSON.
 */
export const RoutingDecisionSchema = z.object({
  next_speaker: z.string(),
  reason: z.string(),
  // Free-form directive to the worker — the orchestrator should not be constrained
  // to a fixed vocabulary here. "diagnose", "probe", "validate", etc. are all valid.
  objective: z.string(),
  deliberation_phase: z.enum([
    'exploration',
    'critique',
    'synthesis',
    'recommendation',
  ]),
  suppress: z.array(z.string()),
  user_sophistication: z.enum(['unknown', 'novice', 'intermediate', 'advanced']),
  /**
   * Optional research the orchestrator wants to run BEFORE the next agent speaks.
   * When present, the graph routes to researchNode first, then to the worker.
   * Null or omitted means no research needed this turn.
   *
   * `async` (R4): when true, skip the inline researchNode and dispatch the
   * tool call via lib/research/scheduler.ts after the chat response closes.
   * The specialist answers THIS turn without the fetched context; the result
   * is available to the NEXT round's supervisor via accumulated_research.
   * Defaults to false when omitted (fully backward compatible).
   */
  research_needed: z
    .object({
      type: z.enum(['fetch_url', 'web_search']),
      target: z.string().min(1),
      reason: z.string(),
      async: z.boolean().optional(),
    })
    .nullable()
    .optional(),
})

export type RoutingDecision = z.infer<typeof RoutingDecisionSchema>

/**
 * Provenance row for one research action (URL read or query).
 */
export const ResearchProvenanceEntrySchema = z.object({
  kind: z.enum(['fetch_url', 'web_search']),
  ref: z.string(),
  fetched_at: z.string(),
  success: z.boolean(),
  title: z.string().optional(),
})

export type ResearchProvenanceEntry = z.infer<typeof ResearchProvenanceEntrySchema>

/**
 * Merge-friendly durable snapshot of research gathered in the thread (strategy doc
 * "accumulated" object, slimmed to fields we implement today).
 */
export const AccumulatedResearchSchema = z.object({
  entities: z.array(z.string()).optional(),
  primary_url: z.string().nullable().optional(),
  observations: z.array(z.string()).optional(),
  provenance: z.array(ResearchProvenanceEntrySchema).optional(),
  queries_used: z.array(z.string()).optional(),
  flags: z
    .object({
      primary_url_fetched: z.boolean().optional(),
      needs_confirmation: z.array(z.string()).optional(),
    })
    .optional(),
  tool_rounds: z
    .object({
      batches_run: z.number().int().nonnegative().optional(),
    })
    .optional(),
})

export type AccumulatedResearch = z.infer<typeof AccumulatedResearchSchema>

export function emptyAccumulatedResearch(): AccumulatedResearch {
  return {
    entities: [],
    primary_url: null,
    observations: [],
    provenance: [],
    queries_used: [],
    flags: { primary_url_fetched: false, needs_confirmation: [] },
    tool_rounds: { batches_run: 0 },
  }
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items.filter((s) => s.trim().length > 0))]
}

/**
 * Merge a new research step into the thread's accumulated research object.
 * Later steps append observations / provenance; `primary_url` stays unless explicitly replaced.
 */
export function mergeAccumulatedResearch(
  prev: AccumulatedResearch | null | undefined,
  patch: Partial<AccumulatedResearch>
): AccumulatedResearch {
  const base = prev ? AccumulatedResearchSchema.parse(prev) : emptyAccumulatedResearch()
  const addBatches = patch.tool_rounds?.batches_run ?? 0

  return AccumulatedResearchSchema.parse({
    entities: uniqueStrings([...(base.entities ?? []), ...(patch.entities ?? [])]),
    primary_url:
      patch.primary_url !== undefined ? patch.primary_url : (base.primary_url ?? null),
    observations: [...(base.observations ?? []), ...(patch.observations ?? [])].slice(-40),
    provenance: [...(base.provenance ?? []), ...(patch.provenance ?? [])].slice(-30),
    queries_used: uniqueStrings([...(base.queries_used ?? []), ...(patch.queries_used ?? [])]),
    flags: {
      primary_url_fetched:
        patch.flags?.primary_url_fetched ?? base.flags?.primary_url_fetched ?? false,
      needs_confirmation: uniqueStrings([
        ...(base.flags?.needs_confirmation ?? []),
        ...(patch.flags?.needs_confirmation ?? []),
      ]),
    },
    tool_rounds: {
      batches_run: (base.tool_rounds?.batches_run ?? 0) + addBatches,
    },
  })
}

/** Short, orchestrator-readable summary (not full tool dumps). */
export function formatAccumulatedResearchBrief(acc: AccumulatedResearch): string {
  const lines: string[] = []
  if (acc.primary_url) {
    lines.push(`- Primary URL reviewed: ${acc.primary_url}`)
  }
  if (acc.flags?.primary_url_fetched) {
    lines.push('- A page read has completed at least once this thread.')
  }
  if (acc.queries_used?.length) {
    lines.push(`- Queries run: ${acc.queries_used.join('; ')}`)
  }
  const obs = acc.observations ?? []
  if (obs.length) {
    lines.push('- Latest findings (truncated):')
    for (const o of obs.slice(-6)) {
      lines.push(`  • ${o.slice(0, 350)}${o.length > 350 ? '…' : ''}`)
    }
  }
  const prov = acc.provenance ?? []
  if (prov.length) {
    const last = prov.slice(-4)
    lines.push('- Recent tool actions:')
    for (const p of last) {
      const label = p.kind === 'fetch_url' ? 'fetch' : 'search'
      lines.push(`  • [${label}] ${p.ref} — ${p.success ? 'ok' : 'failed'}`)
    }
  }
  if (lines.length === 0) return '(none yet)'
  return lines.join('\n')
}

/**
 * A single research result stored in the deliberation state.
 * Appended by researchNode — available to all subsequent agents in the round.
 */
export interface ResearchEntry {
  type: 'fetch_url' | 'web_search'
  target: string
  /** Pre-formatted string injected as context into the agent's conversation history. */
  formatted: string
  success: boolean
  fetched_at: string
}
