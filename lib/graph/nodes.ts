/**
 * LangGraph nodes for the GetIdea.ai deliberation engine.
 *
 * Key constraint from CLAUDE.md + agent-architecture rule:
 * No node contains `if (agent === "finance")` or any hardcoded agent name.
 * All behavior is driven by agent_configs records fetched at runtime.
 */
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatOpenAI } from '@langchain/openai'
import {
  fetchActiveAgents,
  fetchAgentByName,
  fetchOrchestratorConfig,
  buildAgentContext,
} from '@/lib/agents/graph-loader'
import { RoutingDecisionSchema } from '@/lib/agents/schema'
import type { DeliberationState } from './state'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a human-readable conversation transcript for the orchestrator.
 * Includes who said what and the current deliberation metadata.
 */
function buildOrchestratorContext(state: DeliberationState): string {
  const lines: string[] = []

  // Prepend prior insights from previous sessions so the orchestrator builds forward.
  // If this is the first session, this block is empty and the orchestrator starts fresh.
  if (state.prior_insights_context) {
    lines.push(state.prior_insights_context)
    lines.push('\n---\n')
  }

  lines.push('## Conversation so far\n')

  for (const msg of state.messages) {
    if (msg._getType() === 'human') {
      lines.push(`[User]: ${msg.content}`)
    } else if (msg._getType() === 'ai') {
      const agentName = (msg.additional_kwargs?.display_name as string) ?? 'Agent'
      const objective = (msg.additional_kwargs?.routing_objective as string) ?? ''
      const label = objective ? `${agentName} → ${objective}` : agentName
      lines.push(`[${label}]: ${msg.content}`)
      if (msg.additional_kwargs?.routing_reason) {
        lines.push(
          `  ↳ Orchestrator note: ${msg.additional_kwargs.routing_reason}`
        )
      }
    }
  }

  lines.push('\n## Current state')
  lines.push(`- Turn count: ${state.turn_count}`)
  lines.push(`- Deliberation phase: ${state.deliberation_phase}`)
  lines.push(`- User sophistication (assessed so far): ${state.user_sophistication}`)
  lines.push(
    `- Previously suppressed: [${state.suppressed_agents.join(', ')}]`
  )
  lines.push(
    '\nBased on the full conversation, what is your routing decision? Respond only with JSON.'
  )

  return lines.join('\n')
}

/**
 * Build the conversation history for an individual agent.
 * Each agent sees who said what, including previous agent turns.
 * The full context enables agents to build on, challenge, or synthesize prior contributions.
 */
function buildAgentConversation(state: DeliberationState): string {
  const lines: string[] = []

  for (const msg of state.messages) {
    if (msg._getType() === 'human') {
      lines.push(`[User]: ${msg.content}`)
    } else if (msg._getType() === 'ai') {
      const displayName = (msg.additional_kwargs?.display_name as string) ?? 'Advisor'
      lines.push(`[${displayName}]: ${msg.content}`)
    }
  }

  return lines.join('\n\n')
}

/**
 * Build an LLM client from an agent's model_provider and model_name.
 * Single function — no branching on agent name, only on provider type.
 */
function buildLLMClient(
  modelProvider: 'openai' | 'anthropic',
  modelName: string
) {
  if (modelProvider === 'anthropic') {
    return new ChatAnthropic({
      model: modelName,
      temperature: 0.7,
    })
  }
  return new ChatOpenAI({
    model: modelName,
    temperature: 0.7,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// supervisorNode
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads the conversation state, fetches active agents + orchestrator config,
 * injects agent descriptions into the orchestrator's prompt, calls the fast
 * routing model, parses the JSON decision, and updates state.
 *
 * Uses Claude 3.5 Haiku (or the model configured in orchestrator's agent_config)
 * for speed and cost efficiency — routing decisions don't need deep reasoning.
 */
export async function supervisorNode(
  state: DeliberationState
): Promise<Partial<DeliberationState>> {
  const [orchestratorConfig, activeAgents] = await Promise.all([
    fetchOrchestratorConfig(),
    fetchActiveAgents(),
  ])

  // Inject the live agent roster into the orchestrator's system prompt
  const agentContext = buildAgentContext(activeAgents)
  const systemPrompt = orchestratorConfig.system_prompt.replace(
    '{AGENTS_CONTEXT}',
    agentContext
  )

  const conversationContext = buildOrchestratorContext(state)

  const llm = buildLLMClient(
    orchestratorConfig.model_provider,
    orchestratorConfig.model_name
  )

  let rawResponse: string
  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(conversationContext),
    ])
    rawResponse = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)
  } catch (err) {
    console.error('[supervisorNode] LLM call failed:', err)
    return { next_speaker: 'user', routing_reason: 'Routing model unavailable — yielding to user.' }
  }

  // Strip markdown code fences — LLMs sometimes wrap JSON in ```json ... ```
  // The regex handles both ``` and ```json, with or without trailing newlines.
  const cleaned = rawResponse
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    console.error('[supervisorNode] JSON.parse failed. Raw response was:', rawResponse)
    return {
      next_speaker: 'user',
      routing_reason: 'Could not parse routing decision — yielding to user.',
    }
  }

  let decision
  try {
    decision = RoutingDecisionSchema.parse(parsed)
  } catch (err) {
    console.error('[supervisorNode] Schema validation failed. Parsed JSON was:', parsed, '\nZod error:', err)
    return {
      next_speaker: 'user',
      routing_reason: 'Could not parse routing decision — yielding to user.',
    }
  }

  // Validate that next_speaker, if an agent name, actually exists
  const isKnownAgent = activeAgents.some((a) => a.name === decision.next_speaker)
  const nextSpeaker =
    decision.next_speaker === 'user' || isKnownAgent ? decision.next_speaker : 'user'

  if (!isKnownAgent && decision.next_speaker !== 'user') {
    console.warn(
      `[supervisorNode] Unknown agent "${decision.next_speaker}" returned by orchestrator. Yielding to user.`
    )
  }

  return {
    next_speaker: nextSpeaker,
    deliberation_phase: decision.deliberation_phase,
    suppressed_agents: decision.suppress,
    user_sophistication: decision.user_sophistication,
    routing_reason: decision.reason,
    routing_objective: decision.objective,
    current_speaker: nextSpeaker,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// workerNode
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single function that handles any agent.
 * Reads state.next_speaker, pulls that agent's config from the DB,
 * constructs the conversation with the agent's system prompt,
 * calls the agent's configured LLM, and appends the response.
 *
 * Never branches on agent name — behavior is entirely config-driven.
 */
export async function workerNode(
  state: DeliberationState
): Promise<Partial<DeliberationState>> {
  if (!state.next_speaker || state.next_speaker === 'user') {
    console.warn('[workerNode] Called with next_speaker = user or null. Skipping.')
    return {}
  }

  const agentConfig = await fetchAgentByName(state.next_speaker)
  if (!agentConfig) {
    console.error(`[workerNode] Agent config not found for: ${state.next_speaker}`)
    return { next_speaker: 'user', routing_reason: `Agent "${state.next_speaker}" not found.` }
  }

  const conversationHistory = buildAgentConversation(state)

  // Build agent's view of the conversation:
  // System: agent's own identity + calibration instructions
  // Human: the full conversation so far, with the agent's objective
  const userPrompt = [
    conversationHistory,
    '',
    `---`,
    `Your objective for this turn: ${state.routing_objective || 'contribute your perspective'}`,
    `Orchestrator's reason you were called: ${state.routing_reason || 'your expertise is needed'}`,
    '',
    `Respond as ${agentConfig.display_name}. Be direct and substantive. Do not summarize what others said — add your specific perspective.`,
  ].join('\n')

  const llm = buildLLMClient(agentConfig.model_provider, agentConfig.model_name)

  let responseContent: string
  try {
    const response = await llm.invoke([
      new SystemMessage(agentConfig.system_prompt),
      new HumanMessage(userPrompt),
    ])
    responseContent = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)
  } catch (err) {
    console.error(`[workerNode] LLM call failed for agent ${agentConfig.name}:`, err)
    return {
      next_speaker: 'user',
      routing_reason: `${agentConfig.display_name} encountered an issue. Yielding to user.`,
    }
  }

  // Attach metadata to the message so the client and future nodes know who spoke
  // and why they were chosen. This is product surface, not a log.
  const agentMessage = new AIMessage({
    content: responseContent,
    name: agentConfig.name,
    additional_kwargs: {
      agent_name: agentConfig.name,
      display_name: agentConfig.display_name,
      agent_color: `var(--agent-${agentConfig.name})`,
      routing_reason: state.routing_reason,
      routing_objective: state.routing_objective,
      deliberation_phase: state.deliberation_phase,
    },
  })

  return {
    messages: [agentMessage],
    current_speaker: agentConfig.name,
    turn_count: state.turn_count + 1,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// interruptHandlerNode
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Activated when state.human_interrupted === true.
 * The interrupt is already packaged as a HumanMessage in state.messages
 * (added by the API route before invoking the graph with interrupt: true).
 * This node resets the interrupt flag and routes back to the supervisor
 * for a fresh evaluation with the new user message as context.
 */
export async function interruptHandlerNode(
  state: DeliberationState
): Promise<Partial<DeliberationState>> {
  return {
    human_interrupted: false,
    // Reset turn count — the user has re-engaged
    turn_count: 0,
    current_speaker: null,
    next_speaker: null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// recommendationNode
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Activated when the supervisor determines the conversation has reached
 * the recommendation phase, or when the user explicitly requests a summary.
 *
 * Produces a structured assessment:
 *   Strengths · Risks · Unanswered Questions · Suggested Next Steps
 *
 * This is the "deliverable" of the deliberation — the product's output artifact.
 * Uses a capable model (the realist's model or the orchestrator's model)
 * since quality matters more than speed here.
 */
export async function recommendationNode(
  state: DeliberationState
): Promise<Partial<DeliberationState>> {
  const conversationHistory = buildAgentConversation(state)

  const systemPrompt = `You are producing the final structured recommendation from a multi-advisor deliberation for a small business owner.

Your job is to synthesize the full conversation into a clear, structured assessment. Be honest, nuanced, and actionable.

**Format your response exactly like this:**

## Strengths
[2-4 specific strengths identified in the deliberation. Concrete, not generic.]

## Risks
[2-4 specific risks or challenges surfaced. Name the actual concern, not abstract warnings.]

## Unanswered Questions
[1-3 important questions that remain open — things the owner still needs to figure out before committing.]

## Suggested Next Steps
[3-5 specific, actionable next steps in priority order. Not "do more research." Actual steps.]

---
Write for the owner, not for an audience. Use plain language unless the conversation established the owner is fluent in business vocabulary. Be direct. This is their deliverable.`

  const userPrompt = `Here is the full conversation:\n\n${conversationHistory}\n\nProduce the structured recommendation.`

  // Use the orchestrator's model for synthesis — it has context over the full conversation
  const orchestratorConfig = await fetchOrchestratorConfig()
  // Recommendation quality matters — use a more capable model
  const llm = new ChatAnthropic({
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.4, // Lower temperature for more consistent structured output
  })

  let recommendationContent: string
  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ])
    recommendationContent = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)
  } catch (err) {
    console.error('[recommendationNode] LLM call failed:', err)
    recommendationContent =
      'Unable to generate recommendation at this time. Please review the conversation above for the panel\'s perspectives.'
  }

  const recommendationMessage = new AIMessage({
    content: recommendationContent,
    name: 'orchestrator',
    additional_kwargs: {
      agent_name: 'orchestrator',
      display_name: 'Panel Recommendation',
      message_type: 'recommendation',
      deliberation_phase: 'recommendation',
    },
  })

  return {
    messages: [recommendationMessage],
    deliberation_phase: 'recommendation',
    next_speaker: 'user',
  }
}
