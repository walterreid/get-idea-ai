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
})

export type RoutingDecision = z.infer<typeof RoutingDecisionSchema>
