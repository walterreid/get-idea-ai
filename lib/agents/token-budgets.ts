/**
 * Per-specialist token budgets — Phase 7.4 length compression.
 *
 * Rationale (see BUILD.md Phase 7.4 and memory feedback_persona_verbosity_not_advisor.md):
 * Voice-discipline prompt rules ("two to three sentences default") are not reliably
 * honored at temperature 0.7. The 2026-04-18 batch run showed 11/12 personas exceeded
 * the 150-word per-turn ceiling even with Marketer v3's explicit brevity rule. The
 * effective lever is max_tokens at the LLM-client layer.
 *
 * Budgets below are sized per specialist character — not an arbitrary global cap.
 * Some specialists (Realist, Finance) legitimately need more room for quantitative
 * reasoning and synthesis; others (Marketer, Copywriter) land harder when brief.
 *
 * Configuration, not routing logic — this file is keyed by agent name because it's
 * static configuration that belongs alongside agent_configs. The "no hardcoded agent
 * names in application logic" rule targets conditional behavior branches in graph
 * nodes, not config lookups. See also: lib/agents/cases/*.json (same pattern).
 *
 * Future migration path: promote `max_tokens` to an agent_configs column and remove
 * this file. Keeps current phase shippable without a DB migration.
 */

/** Default used when a specialist has no entry below. Safe middle ground. */
const DEFAULT_MAX_TOKENS = 260

/** Per-specialist caps. Approximations: 1 token ≈ 0.75 words. */
const TOKEN_BUDGETS: Record<string, number> = {
  // Concise probing / observation specialists — ~150 words
  marketer: 200,
  copywriter: 200,
  designer: 200,
  cx: 200,
  creative: 220,

  // Mechanics / structure specialists — slightly more room for enumerated detail
  accountant: 280,
  operations: 280,
  legal: 280,

  // Quantitative reasoning — needs numbers + explanation
  finance: 320,

  // Synthesis role — earns more length per turn when summoned
  realist: 350,

  // Orchestrator stays uncapped here — it only emits short routing JSON, and
  // the supervisor's own Anthropic client already uses a sensible default.
  // If ever added, keep it > 600 to avoid truncating routing JSON.
}

export function getMaxTokensFor(agentName: string): number {
  return TOKEN_BUDGETS[agentName] ?? DEFAULT_MAX_TOKENS
}

/**
 * Exposed for tests and diagnostics — lets test-graph.ts confirm every seeded
 * active agent has a budget (or inherits the default, which is intentional).
 */
export function getAllKnownBudgets(): Record<string, number> {
  return { ...TOKEN_BUDGETS }
}

export { DEFAULT_MAX_TOKENS }
