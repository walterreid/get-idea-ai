/**
 * Cheap automated checks on a deliberation transcript (tripwire grader).
 * Tripwire checks (see docs/testing.md) — not LLM-as-judge.
 */

/** Smoke-signal phrases from CLAUDE.md §4 Anti-generic guardrail */
export const BANNED_GENERIC_PHRASES = [
  'clarify your positioning',
  'build a thought-leadership engine',
  'optimize your social presence',
  'develop a strong brand identity',
  'create a content strategy',
] as const

/** Patterns that suggest "tool voice" vs advisor voice */
export const TOOL_VOICE_PHRASES = [
  'as an ai',
  'i cannot browse',
  'here is a generated',
  'your deliverable is ready',
] as const

export interface MessageRow {
  role: string
  agent_name?: string | null
  content: string
  metadata?: Record<string, unknown> | null
}

export interface PersonaGradingHints {
  persona_id: string
  /** Used for specificity check — any of these appearing in advisor text counts */
  business_name_hints?: string[]
  /** Optional: challenge keywords that should appear if thread is deep enough */
  challenge_keywords?: string[]
}

export interface GradesResult {
  checks_total: number
  checks_passed: number
  overall_pass: boolean
  anti_generic: { pass: boolean; banned_phrases_found: string[] }
  voice: { pass: boolean; violations: string[] }
  structure: {
    pass: boolean
    sections_found: string[]
    sections_missing: string[]
  }
  word_count: {
    pass: boolean
    ideal: boolean
    count: number
    /** Soft band for advisor-only text */
    min_ideal: number
    max_ideal: number
  }
  /** True if persona hints provided and at least one hint appears in agent+yield text */
  mentions_business_context: boolean
  mentions_business_context_required: boolean
  /** If thread had research system rows, expect some concrete follow-through signal */
  research_followthrough: {
    applicable: boolean
    pass: boolean
    detail: string
  }
  /**
   * Instruments — numeric observations, NOT pass/fail.
   *
   * Grader-as-instrument, not grader-as-judge. These numbers surface patterns
   * worth watching across runs (the cross-run ledger aggregates them). A number
   * being high or low is information; whether it's "bad" depends on context.
   *
   * See docs/testing.md and the Zansei 2050-word-cap discussion in BUILD.md §6.2.
   */
  instruments: {
    routing: {
      /** Orchestrator emitted an agent name supervisorNode could not resolve. */
      unknown_agent_yields: number
      /** Orchestrator output could not be parsed as valid routing JSON. */
      could_not_parse_yields: number
      /**
       * Orchestrator yielded to user with any "error" phrase in routing_reason
       * (e.g., "Routing model unavailable"). Catches graceful-failure paths.
       */
      error_yields: number
    }
    research: {
      /** URL fetches attempted this session. */
      fetch_calls: number
      /** Web searches attempted this session. */
      search_calls: number
      /** Successful fetches (metadata.success === true). */
      successful_fetches: number
      /** Successful searches. */
      successful_searches: number
      /** Failed attempts (timeout, bad key, 4xx/5xx). */
      failed_calls: number
    }
    advisor_turns: {
      /** Number of agent messages in the session. */
      count: number
      /** Per-turn word counts, in order. */
      word_counts: number[]
      avg_words: number
      max_words: number
      /**
       * Turns above a rough per-turn ceiling (150 words). Distinct from the
       * whole-session word_count check. A high number suggests specialists
       * drifting long — relevant to Phase 7.4 length compression.
       */
      over_150_words: number
      /** Turns below a rough per-turn floor (8 words). Suggests thin advisor turns. */
      under_8_words: number
    }
  }
}

function normalize(s: string): string {
  return s.toLowerCase()
}

function collectAdvisorText(messages: MessageRow[]): string {
  const parts: string[] = []
  for (const m of messages) {
    if (m.role === 'agent' && m.content) parts.push(m.content)
    if (m.role === 'orchestrator' && m.content?.trim()) parts.push(m.content)
  }
  return parts.join('\n\n')
}

function hasResearchRows(messages: MessageRow[]): boolean {
  return messages.some(
    (m) =>
      m.role === 'system' &&
      (m.metadata as Record<string, unknown> | undefined)?.type === 'research'
  )
}

/** Heuristic: after research, advisors should cite something concrete or hedge */
function researchFollowthroughOk(advisorText: string): boolean {
  const t = normalize(advisorText)
  const signals = [
    'http',
    'site',
    'page',
    'search',
    'found',
    'online',
    'if that',
    "isn't you",
    'correct me',
    'provisional',
  ]
  return signals.some((s) => t.includes(s))
}

function recommendationSections(content: string): { found: string[]; missing: string[] } {
  /** Matches [recommendationNode](lib/graph/nodes.ts) template */
  const expected = [
    'Strengths',
    'Risks',
    'Unanswered Questions',
    'Suggested Next Steps',
  ] as const
  const found: string[] = []
  const missing: string[] = []
  for (const label of expected) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`^##\\s*${escaped}`, 'im')
    if (re.test(content)) found.push(label)
    else missing.push(label)
  }
  return { found, missing }
}

/**
 * Grade a message list (same shape as export-thread JSON `messages` array).
 */
export function gradeDeliberation(
  messages: MessageRow[],
  persona?: PersonaGradingHints | null
): GradesResult {
  const advisorText = collectAdvisorText(messages)
  const totalWords = advisorText.split(/\s+/).filter(Boolean).length

  const bannedFound: string[] = []
  const lower = normalize(advisorText)
  for (const phrase of BANNED_GENERIC_PHRASES) {
    if (lower.includes(normalize(phrase))) bannedFound.push(phrase)
  }
  const antiPass = bannedFound.length === 0

  const voiceViolations: string[] = []
  for (const phrase of TOOL_VOICE_PHRASES) {
    if (lower.includes(phrase)) voiceViolations.push(phrase)
  }
  const voicePass = voiceViolations.length === 0

  const recMsg = messages.find(
    (m) =>
      m.role === 'agent' &&
      (m.metadata as Record<string, unknown> | undefined)?.message_type === 'recommendation'
  )
  let structPass = true
  let sectionsFound: string[] = []
  let sectionsMissing: string[] = []
  if (recMsg?.content) {
    const s = recommendationSections(recMsg.content)
    sectionsFound = s.found
    sectionsMissing = s.missing
    structPass = s.missing.length === 0
  }

  const minIdeal = 120
  const maxIdeal = 4500
  const wcPass = totalWords >= 40 && totalWords <= 8000
  const wcIdeal = totalWords >= minIdeal && totalWords <= maxIdeal

  let mentionsBiz = false
  let mentionsRequired = false
  if (persona?.business_name_hints?.length) {
    mentionsRequired = true
    const hints = persona.business_name_hints.map((h) => normalize(h.trim())).filter(Boolean)
    mentionsBiz = hints.some((h) => h.length > 2 && lower.includes(h))
  }

  const researchApplicable = hasResearchRows(messages)
  let researchPass = true
  let researchDetail = 'no research rows in transcript'
  if (researchApplicable) {
    researchPass = researchFollowthroughOk(advisorText)
    researchDetail = researchPass
      ? 'advisor text shows concrete follow-through or hedge'
      : 'research ran but advisor text lacks obvious cite/hedge signal'
  }

  const structureCheckOk = !recMsg || structPass

  // ── Instruments (observations, not pass/fail) ─────────────────────────────
  const instruments = computeInstruments(messages)

  const checks = [
    antiPass,
    voicePass,
    structureCheckOk,
    wcPass,
    !mentionsRequired || mentionsBiz,
    !researchApplicable || researchPass,
  ]
  const passed = checks.filter(Boolean).length
  const total = checks.length

  return {
    checks_total: total,
    checks_passed: passed,
    overall_pass: passed === total,
    anti_generic: { pass: antiPass, banned_phrases_found: bannedFound },
    voice: { pass: voicePass, violations: voiceViolations },
    structure: {
      pass: structureCheckOk,
      sections_found: sectionsFound,
      sections_missing: sectionsMissing,
    },
    word_count: {
      pass: wcPass,
      ideal: wcIdeal,
      count: totalWords,
      min_ideal: minIdeal,
      max_ideal: maxIdeal,
    },
    mentions_business_context: mentionsBiz,
    mentions_business_context_required: mentionsRequired,
    research_followthrough: {
      applicable: researchApplicable,
      pass: researchPass,
      detail: researchDetail,
    },
    instruments,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Instruments — observations, not pass/fail
// ─────────────────────────────────────────────────────────────────────────────

/** Phrases that indicate the supervisor hit a graceful-failure path. */
const ROUTING_ERROR_PHRASES: Record<string, keyof GradesResult['instruments']['routing']> = {
  'unknown agent': 'unknown_agent_yields',
  'could not parse': 'could_not_parse_yields',
  'routing model unavailable': 'error_yields',
  'encountered an issue': 'error_yields',
}

function computeInstruments(messages: MessageRow[]): GradesResult['instruments'] {
  const routing = {
    unknown_agent_yields: 0,
    could_not_parse_yields: 0,
    error_yields: 0,
  }

  // Scan orchestrator messages and agent metadata for routing_reason fields
  // that match known error paths.
  for (const m of messages) {
    const meta = m.metadata as Record<string, unknown> | undefined
    if (!meta) continue
    const reason = typeof meta.routing_reason === 'string' ? meta.routing_reason.toLowerCase() : ''
    if (!reason) continue
    for (const [phrase, key] of Object.entries(ROUTING_ERROR_PHRASES)) {
      if (reason.includes(phrase)) {
        routing[key] += 1
      }
    }
  }
  // Also scan orchestrator-role messages (yield-to-user rows) whose content itself is the reason
  for (const m of messages) {
    if (m.role !== 'orchestrator') continue
    const content = (m.content ?? '').toLowerCase()
    for (const [phrase, key] of Object.entries(ROUTING_ERROR_PHRASES)) {
      if (content.includes(phrase)) {
        routing[key] += 1
      }
    }
  }

  const research = {
    fetch_calls: 0,
    search_calls: 0,
    successful_fetches: 0,
    successful_searches: 0,
    failed_calls: 0,
  }
  for (const m of messages) {
    const meta = m.metadata as Record<string, unknown> | undefined
    if (m.role !== 'system' || meta?.type !== 'research') continue
    const kind = meta.research_type as string | undefined
    const success = meta.success === true
    if (kind === 'fetch_url') {
      research.fetch_calls += 1
      if (success) research.successful_fetches += 1
      else research.failed_calls += 1
    } else if (kind === 'web_search') {
      research.search_calls += 1
      if (success) research.successful_searches += 1
      else research.failed_calls += 1
    }
  }

  const agentTurns = messages.filter((m) => m.role === 'agent' && m.content)
  const wordCounts = agentTurns.map(
    (m) => m.content.split(/\s+/).filter(Boolean).length
  )
  const advisor_turns = {
    count: agentTurns.length,
    word_counts: wordCounts,
    avg_words: wordCounts.length
      ? Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length)
      : 0,
    max_words: wordCounts.length ? Math.max(...wordCounts) : 0,
    over_150_words: wordCounts.filter((w) => w > 150).length,
    under_8_words: wordCounts.filter((w) => w < 8).length,
  }

  return { routing, research, advisor_turns }
}

/**
 * Build grading hints from a persona JSON object (flexible field names).
 */
export function personaToHints(raw: Record<string, unknown>): PersonaGradingHints {
  const persona_id = String(raw.persona_id ?? 'unknown')
  const hints: string[] = []

  const explicit = raw.grading_hints
  if (Array.isArray(explicit)) {
    for (const x of explicit) {
      if (typeof x === 'string' && x.trim()) hints.push(x.trim())
    }
  }

  if (typeof raw.business_name === 'string') {
    hints.push(raw.business_name)
    const parts = raw.business_name.split(/\s+/).filter(Boolean)
    if (parts[0]) hints.push(parts[0])
  }
  const profile = raw.profile as Record<string, unknown> | undefined
  if (profile) {
    if (typeof profile.business_name === 'string') hints.push(profile.business_name)
    if (typeof profile.name === 'string') hints.push(profile.name)
  }
  if (typeof raw.website === 'string') {
    try {
      hints.push(new URL(raw.website).hostname.replace(/^www\./, ''))
    } catch {
      hints.push(raw.website)
    }
  }

  const ch = raw.challenge
  const challenge_keywords =
    typeof ch === 'string'
      ? ch
          .split(/\s+/)
          .filter((w) => w.length > 5)
          .slice(0, 8)
      : undefined

  return {
    persona_id,
    business_name_hints: [...new Set(hints.map((h) => h.trim()).filter(Boolean))],
    challenge_keywords,
  }
}
