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

/**
 * Per-specialist caps. Approximations: 1 token ≈ 0.75 words.
 *
 * 2026-04-19 revision — **v2-structural-weight adjustment.** Caps were set during
 * Phase 7.4 (2026-04-18) against pre-v2 voice patterns. The Phase 7.1/7.2/7.3
 * replication cycles (creative-rep through trio-rep) added structural weight to
 * every specialist prompt: lived-history opener + commit/budget/specific-flaw/
 * write-vs-clarify/experience-gap discipline section + §7.2 divergence + §7.2
 * evidence-bound + "use the case, don't cite it". Each addition is ~20-40 tokens
 * of structural content the model pays for in every turn. Post-cycle scan of
 * 44 bundles across 5 recent cycles showed:
 *
 *   - Legal at 280: 13/13 turns ≥85% of cap, 2 over 100% (truncation)
 *   - Operations at 280: 8/8 turns ≥85% of cap, 2 over 100%
 *   - Copywriter at 200: 7/8 turns ≥85% of cap, 1 over 100%
 *   - Creative at 350: user-reported mid-sentence truncation on concept-first
 *     commit-with-exclude turn (2026-04-19 manual /chat). Automated scan showed
 *     8/14 turns ≥85%, 1 over 100%.
 *   - CX at 200: 5 turns over 100% of cap across recent cycles.
 *
 * Caps raised to restore headroom for v2-structure turns to finish cleanly. The
 * voice-discipline prompt rules ("two to three sentences default") remain the
 * primary quality lever; caps stay as a hard guard against runaway verbosity.
 * Phase-aware caps (shorter in synthesis, longer in exploration) remain
 * deferred — no evidence yet that the flat-cap model is insufficient once the
 * caps themselves are sized against v2 output.
 */
const TOKEN_BUDGETS: Record<string, number> = {
  // Concise probing specialists — raised to accommodate v2 structural weight
  // (lived-history + commit + §7.2 rules). Marketer + Designer held at 200:
  // no field truncation evidence, and Marketer fires on a broader surface
  // than any other specialist — brevity there still earns its keep.
  marketer: 200,
  designer: 200,
  copywriter: 260, // 200 → 260 (88% near-cap rate; drafting 3 versions + framing)
  cx: 260, // 200 → 260 (5 turns over cap across cycles)

  // Brainstorm / angle-finding — Creative's concept-first commit-with-exclude
  // turns have a structural-minimum that exceeds 350 when the owner's opener
  // invites branch-by-branch argumentation (the 2026-04-19 shrine-mechanic
  // truncation was exactly this shape). Raised 350 → 450 to match the
  // upper end of observed v2 Creative output on concept-first openers.
  creative: 450, // was 350; before that 220

  // Mechanics / structure specialists — v2 added §7.2 rules + use-case
  // examples on top of pre-existing enumerated content (urgency bands for
  // Legal, calibrate-to-scale for Operations, Finance-distinction + plain-
  // language for Accountant). Legal + Operations were at 100% near-cap
  // post-cycle; raised to restore 20-25% headroom.
  accountant: 360, // 280 → 360
  operations: 360, // 280 → 360 (100% near-cap rate pre-raise)
  legal: 360, // 280 → 360 (100% near-cap rate pre-raise)

  // Quantitative reasoning — needs numbers + explanation. Held at 320;
  // post-cycle scan showed 53% near-cap and a few at/over 100%, but Finance
  // output tends to be earned-by-numbers when long; the voice-discipline rule
  // "one thing per turn" still carries the lever. Revisit if field evidence
  // shows sustained truncation.
  finance: 320,

  // Synthesis role — earns more length per turn when summoned. Held at 350;
  // Realist hit 100% a few times in recent cycles (48% near-cap overall) but
  // the "one flaw per turn" rule is doing the work. If future cycles show
  // systematic truncation on specific-flaw-plus-evidence turns, raise to 420.
  realist: 350,

  // Orientation role — one or two sentences by design. Host, not advisor.
  // Ideation speaks first when the user walks in contentless, then steps back
  // for a specialist. A tight cap enforces the "one welcome, not a battery".
  ideation: 140,

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
