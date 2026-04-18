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
import {
  RoutingDecisionSchema,
  mergeAccumulatedResearch,
  formatAccumulatedResearchBrief,
} from '@/lib/agents/schema'
import type { AccumulatedResearch, ResearchEntry } from '@/lib/agents/schema'
import { fetchUrl, webSearch, formatResearchForContext } from '@/lib/tools/web-research'
import type { ResearchResult } from '@/lib/tools/web-research'
import { buildKnowledgeContext } from '@/lib/knowledge/loader'
import { buildCaseContext } from '@/lib/agents/case-loader'
import { getMaxTokensFor } from '@/lib/agents/token-budgets'
import type { DeliberationState } from './state'

/** Injected when any web research is present; complements agent_configs (R5 epistemics). */
const WORKER_RESEARCH_EPISTEMICS = `## How to treat web research
Research is provisional evidence, not ground truth. **If the user says something that contradicts a page or search result, trust the user** and say so plainly. If a name or URL might be ambiguous, ask one clarifying question before treating search hits as being about them. Brief acknowledgements help: e.g. "Here's what we found online—if that isn't your business, tell us."

**Follow-through is required.** If research context is present in this turn, you must reference something specific from it OR explicitly hedge that what was found may not be current. Silence about research that ran is a signal to the owner that you didn't do your homework.
`

/**
 * Maps a tool result into a merge patch for `accumulated_research`.
 */
function buildResearchAccumulatedPatch(
  req: { type: 'fetch_url' | 'web_search'; target: string },
  result: ResearchResult
): Partial<AccumulatedResearch> {
  const patch: Partial<AccumulatedResearch> = {
    tool_rounds: { batches_run: 1 },
  }

  if (result.type === 'fetch_url') {
    patch.provenance = [
      {
        kind: 'fetch_url' as const,
        ref: result.url,
        fetched_at: result.fetched_at,
        success: result.success,
        title: result.title,
      },
    ]
    if (result.success) {
      patch.primary_url = result.url
      patch.flags = { primary_url_fetched: true, needs_confirmation: [] }
      const excerpt = (result.content ?? '').slice(0, 500).trim()
      if (excerpt) patch.observations = [excerpt]
    }
  } else {
    patch.provenance = [
      {
        kind: 'web_search' as const,
        ref: result.query,
        fetched_at: result.fetched_at,
        success: result.success,
      },
    ]
    patch.queries_used = [result.query]
    if (result.success && result.results?.length) {
      patch.observations = result.results
        .map((r) => `${r.title}: ${r.snippet}`)
        .slice(0, 6)
    }
  }

  return patch
}

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

  // Summarize what has already been researched so the orchestrator avoids duplicates
  if (state.research_context.length > 0) {
    lines.push('\n## Research already completed this session')
    for (const r of state.research_context) {
      const status = r.success ? 'fetched' : 'failed'
      lines.push(`- [${r.type}] ${r.target} (${status})`)
    }
    lines.push('Do NOT request research on targets already listed above.')
  }

  if (state.accumulated_research) {
    lines.push('\n## Accumulated research memory (this thread)')
    lines.push(formatAccumulatedResearchBrief(state.accumulated_research))
  }

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
 *
 * `maxTokens` comes from lib/agents/token-budgets.ts and is optional — callers
 * that don't pass it (e.g., the supervisor) keep the provider default.
 */
function buildLLMClient(
  modelProvider: 'openai' | 'anthropic',
  modelName: string,
  maxTokens?: number
) {
  if (modelProvider === 'anthropic') {
    return new ChatAnthropic({
      model: modelName,
      temperature: 0.7,
      ...(maxTokens !== undefined ? { maxTokens } : {}),
    })
  }
  return new ChatOpenAI({
    model: modelName,
    temperature: 0.7,
    ...(maxTokens !== undefined ? { maxTokens } : {}),
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
  // Test affordance: the persona harness sets force_recommendation=true in R5
  // closure rounds. Production /chat never sets this flag. When present, bypass
  // the routing LLM entirely and emit the state patch that routes straight into
  // recommendationNode via the existing conditional edge in compile.ts.
  // Clear the flag on the way out so subsequent supervisor entries within this
  // run (shouldn't happen — recommendationNode → END — but defense in depth)
  // don't loop the short-circuit.
  if (state.force_recommendation === true) {
    return {
      deliberation_phase: 'recommendation',
      next_speaker: 'user',
      suppressed_agents: [],
      routing_reason: 'Harness forced recommendation phase for this round.',
      routing_objective: '',
      research_needed: null,
      force_recommendation: false,
    }
  }

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
    // Passes research request to compile.ts edge logic → researchNode if non-null
    research_needed: decision.research_needed ?? null,
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

  // Inject any research results gathered this round so the agent can reference them.
  // Each research entry is already formatted as a compact LLM-readable block.
  const researchBlock = state.research_context.length > 0
    ? [
        '---',
        '## Context gathered by the panel before this turn',
        WORKER_RESEARCH_EPISTEMICS,
        ...state.research_context.map((r) => r.formatted),
        '---',
        '',
      ].join('\n')
    : ''

  // Retrieve per-specialist cases relevant to the inferred business type.
  // This is the Phase 7.3 "specialist speaks from history" mechanism —
  // cases are voice-level reference material the specialist reaches into.
  // User-message corpus is used for inference (not agent messages, to avoid
  // echo-matching on advisor vocabulary).
  const userCorpus = state.messages
    .filter((m) => m._getType() === 'human')
    .map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
    .join('\n\n')
  const caseBlock = buildCaseContext(agentConfig.name, userCorpus, 3)

  // Build agent's view of the conversation:
  // System: agent's own identity + calibration instructions
  // Human: research context (if any) + cases (if any) + conversation + objective
  const userPrompt = [
    researchBlock,
    caseBlock,
    conversationHistory,
    '',
    `---`,
    `Your objective for this turn: ${state.routing_objective || 'contribute your perspective'}`,
    `Orchestrator's reason you were called: ${state.routing_reason || 'your expertise is needed'}`,
    '',
    `Respond as ${agentConfig.display_name}. Be direct and substantive. Do not summarize what others said — add your specific perspective.`,
  ].join('\n')

  // Per-specialist token budget (Phase 7.4 length compression). Missing agents
  // fall through to the module's DEFAULT_MAX_TOKENS; no hardcoded branching here.
  const maxTokens = getMaxTokensFor(agentConfig.name)
  const llm = buildLLMClient(agentConfig.model_provider, agentConfig.model_name, maxTokens)

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
// researchNode
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs when the supervisor sets research_needed in the routing decision.
 * Executes the requested tool (fetchUrl or webSearch), appends the formatted
 * result to state.research_context, then clears research_needed so the graph
 * proceeds to the worker.
 *
 * Research failure is non-fatal — if the tool errors, we log and continue.
 * The subsequent agent will simply lack that specific context but will still respond.
 *
 * Research does NOT increment turn_count — it is a sub-step, not a full turn.
 */
export async function researchNode(
  state: DeliberationState
): Promise<Partial<DeliberationState>> {
  const req = state.research_needed
  if (!req) {
    console.warn('[researchNode] Called without research_needed. Skipping.')
    return { research_needed: null }
  }

  // ── Rate limits ──────────────────────────────────────────────────────────
  // These are per-thread limits checked against the accumulated research_context.
  const MAX_FETCHES = 3
  const MAX_SEARCHES = 2
  const MAX_TOTAL = 10

  const totalCount = state.research_context.length
  const fetchCount = state.research_context.filter((r) => r.type === 'fetch_url').length
  const searchCount = state.research_context.filter((r) => r.type === 'web_search').length

  if (totalCount >= MAX_TOTAL) {
    console.warn(`[researchNode] Total research limit (${MAX_TOTAL}) reached. Skipping.`)
    return { research_needed: null }
  }
  if (req.type === 'fetch_url' && fetchCount >= MAX_FETCHES) {
    console.warn(`[researchNode] URL fetch limit (${MAX_FETCHES}) reached. Skipping.`)
    return { research_needed: null }
  }
  if (req.type === 'web_search' && searchCount >= MAX_SEARCHES) {
    console.warn(`[researchNode] Web search limit (${MAX_SEARCHES}) reached. Skipping.`)
    return { research_needed: null }
  }
  if (totalCount >= Math.floor(MAX_TOTAL * 0.8)) {
    console.warn(`[researchNode] Approaching research limit (${totalCount}/${MAX_TOTAL} actions used).`)
  }

  // Guard against duplicate fetches in the same thread
  const alreadyFetched = state.research_context.some((r) => r.target === req.target)
  if (alreadyFetched) {
    console.log(`[researchNode] ${req.target} already researched this session. Skipping.`)
    return { research_needed: null }
  }

  console.log(`[researchNode] Running ${req.type}: ${req.target}`)

  let result: ResearchResult
  try {
    result = req.type === 'fetch_url'
      ? await fetchUrl(req.target)
      : await webSearch(req.target)
  } catch (err) {
    console.error('[researchNode] Tool call threw unexpectedly:', err)
    const errAt = new Date().toISOString()
    result =
      req.type === 'fetch_url'
        ? {
            type: 'fetch_url',
            url: req.target,
            success: false,
            error: 'unexpected error',
            fetched_at: errAt,
          }
        : {
            type: 'web_search',
            query: req.target,
            success: false,
            error: 'unexpected error',
            fetched_at: errAt,
          }
  }

  const entry: ResearchEntry = {
    type: req.type,
    target: req.target,
    formatted: formatResearchForContext(result),
    success: result.success,
    fetched_at: result.fetched_at,
  }

  const accPatch = buildResearchAccumulatedPatch(req, result)
  const merged = mergeAccumulatedResearch(state.accumulated_research ?? null, accPatch)

  if (result.success) {
    console.log(`[researchNode] Success: ${req.target} (${entry.formatted.length} chars)`)
  } else {
    console.warn(`[researchNode] Failed: ${req.target} — ${'error' in result ? result.error : 'unknown error'}`)
  }

  return {
    research_needed: null,
    research_context: [entry],
    accumulated_research: merged,
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

  // Build a short text corpus for business-type inference — the user's own
  // words from the human messages, where business identity actually lives.
  // Agent messages are excluded to avoid echo-matching on advisor vocabulary.
  const userCorpus = state.messages
    .filter((m) => m._getType() === 'human')
    .map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
    .join('\n\n')

  const knowledgeContext = buildKnowledgeContext(userCorpus)

  const systemPrompt = `You are producing the final structured recommendation from a multi-advisor deliberation for a small business owner.

Your job is to synthesize the full conversation into a clear, structured assessment. Be honest, nuanced, and actionable.

## Before you write — the assumption check

Treat nuance as a feature, not noise. Before writing the recommendation, answer these privately (do not include them in the output):

1. What is the most comfortable conclusion the evidence supports — the one that requires the least commitment from the owner?
2. What conclusion does the evidence actually support if you follow it all the way to its logical end?
3. If those two conclusions differ, name the assumption that makes the comfortable version feel safe.

The recommendation must address conclusion #2, not #1.

## Divergence rule

If your expert knowledge (from the playbook and channel guides below) leads you to a recommendation the conversation did not surface — something the owner did not ask for or did not hint at — name that bridge explicitly. The owner should never be surprised by a recommendation they did not see coming. Tell them what the conversation pointed toward, then tell them what you see beyond it and why.

If the owner explicitly named a channel or approach they believe in, respect that signal — even if the playbook says it is usually wrong for this vertical. The owner knows their business; you know the industry. When those conflict, acknowledge both and explain your reasoning.

## Budget signal hierarchy

Every Next Step that involves spending money must respect this hierarchy (strongest to weakest):

1. **STATED:** the owner explicitly said they can or will spend $X — use directly.
2. **CURRENT:** the owner is currently spending $X on marketing — treat as a floor, not a ceiling.
3. **HISTORICAL:** the owner spent $X on past efforts they described negatively — this is **pain evidence, not willingness to spend again.** Never treat regretted past spend as current budget.
4. **INFERRED:** no explicit signal — default conservative; name the inference.

Never recommend spend that ignores the stated budget. Never treat a hypothetical (like an advisor asking "if you had $1,000 where would you put it") as a budget commitment.

## Evidence rule

Every recommendation must reference EITHER something the owner said OR something found in research / prior advisor turns. Playbook and channel knowledge enrich those recommendations — they do not originate them. If a recommendation cannot be tied to evidence from this specific deliberation, cut it.

## Format

${knowledgeContext ? 'Use the playbook and channel guides below as background expertise. Do not cite them; use them.' : 'No vertical playbook matched this business type — rely on the conversation and research alone.'}

Respond with exactly this structure:

## Strengths
[2-4 specific strengths identified in the deliberation. Concrete, not generic.]

## Risks
[2-4 specific risks or challenges surfaced. Name the actual concern, not abstract warnings. When the owner mentioned something they tried that failed, explain WHY it failed using evidence — do not just agree it was bad.]

## Unanswered Questions
[1-3 important questions that remain open — things the owner still needs to figure out before committing.]

## Suggested Next Steps
[3-5 specific, actionable next steps in priority order. Each step must be specific enough to act on this week — not "think about positioning" but "set your Google Business Profile service area to 3 miles and add three photos of completed work by Friday." Tie each step to evidence from the conversation or research.]

---
Write for the owner, not for an audience. Use plain language unless the conversation established the owner is fluent in business vocabulary. Be direct. Take positions — do not hedge with "you might consider." This is the recommendation from the panel, not a menu of options.

Do not say "generate," "output," "results," or "deliverable." Recommendations come from advisors, not artifacts.`

  const userPrompt = `Here is the full conversation:\n\n${conversationHistory}\n\n${knowledgeContext}\n\nProduce the structured recommendation.`

  // Recommendation quality matters — use a capable model with generous max_tokens
  // for the structured synthesis (Diagnosis + Channels + Stop + Calendar + Next Steps).
  // Model name updated 2026-04-18: claude-3-5-sonnet-20241022 was deprecated.
  const llm = new ChatAnthropic({
    model: 'claude-sonnet-4-5',
    temperature: 0.4, // Lower temperature for more consistent structured output
    maxTokens: 2048,
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
