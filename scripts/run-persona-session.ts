/**
 * run-persona-session.ts
 *
 * Multi-round persona harness — Phase 7.5 pulled forward.
 *
 * Drives the compiled deliberation graph through a scripted multi-round
 * conversation with a persona-acted role-player. Does NOT go through
 * /api/chat (bypasses HTTP, auth, DB writes). Output is a standard
 * test/results/ bundle via writePersonaResultBundle.
 *
 * Round structure (per BUILD.md §6.2 multi-round persona protocol):
 *   R1 Intake       — role-player opens with identity + challenge
 *   R2 Depth        — role-player answers orchestrator questions in character
 *   R3 Friction     — scripted persona.r3_wrong_claim (tests panel pushback)
 *   R4 User-truth   — scripted persona.r4_contradiction (tests GR#5)
 *   R5 Closure      — (optional) role-player requests summary to trigger recommendation
 *
 * Usage:
 *   npx tsx scripts/run-persona-session.ts \
 *     --persona test/personas/ai_consultant.json \
 *     [--rounds 4] \
 *     [--no-research] \
 *     [--no-pace] \
 *     [--pace-min 2000] \
 *     [--pace-max 6000] \
 *     [--role-player-model claude-sonnet-4-5] \
 *     [--out-dir test/results/custom_name]
 *
 * Requires .env.local loaded in shell (see docs/testing.md): ANTHROPIC_API_KEY,
 * OPENAI_API_KEY, SUPABASE_URL + SERVICE_ROLE_KEY (for agent_configs reads).
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'
import { deliberationGraph } from '@/lib/graph/compile'
import type { DeliberationState } from '@/lib/graph/state'
import {
  gradeDeliberation,
  personaToHints,
} from '@/lib/test/grade-deliberation'
import type { MessageRow } from '@/lib/test/grade-deliberation'
import { writePersonaResultBundle } from '@/lib/test/write-result-bundle'
import {
  computeTypingDelay,
  sleep,
  DEFAULT_PACING,
  type PacingConfig,
} from '@/lib/test/pacing'
import { generateUserTurn } from '@/lib/test/role-player'

// ─────────────────────────────────────────────────────────────────────────────
// CLI parsing
// ─────────────────────────────────────────────────────────────────────────────

interface Options {
  personaPath: string
  rounds: number
  research: boolean
  pace: PacingConfig | null
  rolePlayerModel: string
  outDir?: string
}

function parseArgs(argv: string[]): Options {
  const args = argv.slice(2)
  const opts: Options = {
    personaPath: '',
    // Default raised 4 → 6 per 2026-04-18 direction: more rounds give the
    // orchestrator room to reach recommendation phase naturally, and give
    // research (Zansei-style post-Q2 timing) time to materially inform
    // later turns. Quality over tokens.
    rounds: 6,
    research: true,
    pace: { ...DEFAULT_PACING },
    rolePlayerModel: 'claude-sonnet-4-5',
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--persona' && args[i + 1]) opts.personaPath = args[++i]
    else if (a === '--rounds' && args[i + 1]) opts.rounds = parseInt(args[++i], 10)
    else if (a === '--no-research') opts.research = false
    else if (a === '--no-pace') opts.pace = null
    else if (a === '--pace-min' && args[i + 1] && opts.pace)
      opts.pace.min_ms = parseInt(args[++i], 10)
    else if (a === '--pace-max' && args[i + 1] && opts.pace)
      opts.pace.max_ms = parseInt(args[++i], 10)
    else if (a === '--role-player-model' && args[i + 1])
      opts.rolePlayerModel = args[++i]
    else if (a === '--out-dir' && args[i + 1]) opts.outDir = args[++i]
  }
  if (!opts.personaPath) {
    console.error(
      'Usage: --persona <path> [--rounds N] [--no-research] [--no-pace] [--pace-min ms] [--pace-max ms] [--role-player-model name] [--out-dir dir]'
    )
    process.exit(1)
  }
  return opts
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert the graph's accumulated state into the MessageRow shape grade-deliberation
 * expects. Includes: user messages, agent messages, recommendation messages, and
 * research system rows (synthesized from research_context).
 */
function stateToMessageRows(state: DeliberationState): MessageRow[] {
  const rows: MessageRow[] = []

  // User + AI messages, in order
  for (const msg of state.messages) {
    if (msg._getType() === 'human') {
      rows.push({
        role: 'user',
        agent_name: null,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        metadata: null,
      })
    } else if (msg._getType() === 'ai') {
      const kwargs = msg.additional_kwargs as Record<string, unknown> | undefined
      const messageType = kwargs?.message_type as string | undefined
      const agentName =
        messageType === 'recommendation'
          ? 'panel_recommendation'
          : (kwargs?.agent_name as string | undefined) ?? 'agent'
      rows.push({
        role: 'agent',
        agent_name: agentName,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        metadata: kwargs ?? null,
      })
    }
  }

  // Research rows (system-role). Append at the end is fine for grading purposes —
  // grade-deliberation looks for role === 'system' + metadata.type === 'research'.
  for (const r of state.research_context) {
    rows.push({
      role: 'system',
      agent_name: null,
      content: r.formatted,
      metadata: {
        type: 'research',
        research_type: r.type,
        target: r.target,
        success: r.success,
        fetched_at: r.fetched_at,
      },
    })
  }

  return rows
}

/**
 * Transcript export shape matching capture-review-bundle's full rows
 * (includes ids and created_at so the bundle is symmetric with real captures).
 */
function stateToExportRows(state: DeliberationState): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = []
  let idx = 0
  const stamp = () => new Date().toISOString()

  for (const msg of state.messages) {
    idx++
    if (msg._getType() === 'human') {
      rows.push({
        id: `m${idx}`,
        role: 'user',
        agent_name: null,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        metadata: null,
        created_at: stamp(),
      })
    } else if (msg._getType() === 'ai') {
      const kwargs = msg.additional_kwargs as Record<string, unknown> | undefined
      const messageType = kwargs?.message_type as string | undefined
      const role = messageType === 'recommendation' ? 'agent' : 'agent'
      const agentName =
        messageType === 'recommendation'
          ? 'panel_recommendation'
          : (kwargs?.agent_name as string | undefined) ?? 'agent'
      rows.push({
        id: `m${idx}`,
        role,
        agent_name: agentName,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        metadata: kwargs ?? null,
        created_at: stamp(),
      })
    }
  }

  for (const r of state.research_context) {
    idx++
    rows.push({
      id: `m${idx}`,
      role: 'system',
      agent_name: null,
      content: r.formatted,
      metadata: {
        type: 'research',
        research_type: r.type,
        target: r.target,
        success: r.success,
        fetched_at: r.fetched_at,
      },
      created_at: r.fetched_at,
    })
  }

  return rows
}

function lastAIMessageContent(state: DeliberationState): string {
  for (let i = state.messages.length - 1; i >= 0; i--) {
    if (state.messages[i]._getType() === 'ai') {
      const c = state.messages[i].content
      return typeof c === 'string' ? c : JSON.stringify(c)
    }
  }
  return ''
}

function getPanelRecentTurns(
  state: DeliberationState,
  sinceLastUser = true
): Array<{ speaker: string; content: string }> {
  // Pull all panel messages since the last user message, so the role-player
  // "reads" only what's new to them.
  const turns: Array<{ speaker: string; content: string }> = []
  let hitLastUser = !sinceLastUser
  for (let i = state.messages.length - 1; i >= 0; i--) {
    const msg = state.messages[i]
    if (msg._getType() === 'human' && sinceLastUser) {
      if (hitLastUser) break
      hitLastUser = true
      continue
    }
    if (msg._getType() === 'ai') {
      const kwargs = msg.additional_kwargs as Record<string, unknown> | undefined
      const display = (kwargs?.display_name as string | undefined) ?? 'Panel'
      const c = msg.content
      turns.unshift({
        speaker: display,
        content: typeof c === 'string' ? c : JSON.stringify(c),
      })
    }
  }
  return turns
}

/**
 * Given the prior graph state, build the initial state for the next invocation.
 * Adds a new user HumanMessage and resets per-round counters.
 *
 * LangGraph's messages reducer appends by ID, so passing the full prior
 * messages list as initial state yields a starting state equivalent to
 * "continue from where we left off." Append-reducer fields (research_context)
 * work the same way.
 */
function buildNextRoundState(
  prior: DeliberationState | null,
  userText: string,
  forceRecommendation = false
): Partial<DeliberationState> {
  const userMsg = new HumanMessage({
    content: userText,
    additional_kwargs: { from: 'role_player' },
  })

  if (!prior) {
    return {
      messages: [userMsg],
      prior_insights_context: '',
      ...(forceRecommendation ? { deliberation_phase: 'recommendation' as const } : {}),
    }
  }

  return {
    messages: [...prior.messages, userMsg],
    research_context: prior.research_context,
    accumulated_research: prior.accumulated_research,
    // Force recommendation phase when the harness is explicitly testing closure.
    // This bypasses the orchestrator's (appropriately conservative) judgment about
    // whether enough deliberation has happened to warrant synthesis. For product
    // use, the orchestrator decides — this override is a test affordance only.
    deliberation_phase: forceRecommendation ? 'recommendation' : prior.deliberation_phase,
    user_sophistication: prior.user_sophistication,
    prior_insights_context: '',
    turn_count: 0,
    suppressed_agents: [],
    next_speaker: null,
    current_speaker: null,
    human_interrupted: false,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Round planning
// ─────────────────────────────────────────────────────────────────────────────

type RoundKind = 'intake' | 'depth' | 'friction' | 'user_truth' | 'closure' | 'followup'

interface RoundPlan {
  round_number: number
  kind: RoundKind
  objective: string
  /** If present, bypass the role-player and inject this text as the user turn. */
  scripted_text?: string | null
}

function planRounds(totalRounds: number, persona: Record<string, unknown>): RoundPlan[] {
  const plans: RoundPlan[] = []

  plans.push({
    round_number: 1,
    kind: 'intake',
    objective:
      'Open the conversation. Introduce yourself, state what business you run, and name the challenge you want help with. Be in character — short or long per your length band. Do NOT volunteer your URL yet unless it comes naturally.',
  })

  if (totalRounds >= 2) {
    plans.push({
      round_number: 2,
      kind: 'depth',
      objective:
        'The panel has asked you questions. Answer in character. If they asked about something in your website/profile, volunteer the URL now. Give them the information they asked for — do not skip ahead to solutions.',
    })
  }

  if (totalRounds >= 3) {
    const r3 =
      typeof persona.r3_wrong_claim === 'string' ? persona.r3_wrong_claim : null
    plans.push({
      round_number: 3,
      kind: 'friction',
      objective: r3
        ? 'Scripted: persona.r3_wrong_claim injected verbatim.'
        : 'No r3_wrong_claim on persona — role-player improvises a plausibly-wrong assertion to stress friction. If no natural wrong claim exists, ask for tactical specifics.',
      scripted_text: r3,
    })
  }

  if (totalRounds >= 4) {
    const r4 =
      typeof persona.r4_contradiction === 'string' ? persona.r4_contradiction : null
    plans.push({
      round_number: 4,
      kind: 'user_truth',
      objective: r4
        ? 'Scripted: persona.r4_contradiction injected verbatim.'
        : 'No r4_contradiction on persona — role-player improvises a user-truth reveal. If no natural reveal exists, state a budget or capacity constraint the panel hasn\'t heard yet.',
      scripted_text: r4,
    })
  }

  if (totalRounds >= 5) {
    plans.push({
      round_number: 5,
      kind: 'closure',
      objective:
        'Ask the panel for a summary of what they\'ve surfaced so far. Stay in character — this is a natural "so where does that leave me" moment, not a formal request.',
    })
  }

  if (totalRounds >= 6) {
    plans.push({
      round_number: 6,
      kind: 'followup',
      objective:
        'You\'ve heard the panel\'s summary or continued discussion. Ask the specificity-forcing question — in character: "OK, if I have to pick ONE thing to do this week, what is it?" Force the panel to commit to a single first move rather than a list.',
    })
  }

  return plans
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

interface RoundRecord {
  round_number: number
  kind: RoundKind
  user_turn: {
    source: 'role_player' | 'scripted' | 'improvised'
    content: string
    word_count: number
    over_ceiling: boolean
    generation_ms: number | null
    model_used: string | null
  }
  panel: {
    turns_count: number
    research_calls: number
    last_response_chars: number
  }
  pacing_ms: number
  invoke_ms: number
}

async function main() {
  const opts = parseArgs(process.argv)

  // Disable research in dry-smoke mode by clearing the provider keys for this
  // process. web-research.ts will throw inside the tool; the graph catches
  // the error and appends a failure entry, which is the "research failed"
  // signal without any graph modification.
  if (!opts.research) {
    process.env.SERPER_API_KEY = ''
    process.env.JINA_API_KEY = ''
    console.log('[harness] research disabled — tool calls will fail fast')
  }

  const personaRaw = JSON.parse(
    readFileSync(resolve(opts.personaPath), 'utf-8')
  ) as Record<string, unknown>
  const personaId = String(personaRaw.persona_id ?? 'unknown')

  console.log(
    `[harness] persona=${personaId} rounds=${opts.rounds} research=${opts.research} pace=${
      opts.pace ? `${opts.pace.min_ms}-${opts.pace.max_ms}ms` : 'off'
    } role_player_model=${opts.rolePlayerModel}`
  )

  const roundPlans = planRounds(opts.rounds, personaRaw)
  const rounds: RoundRecord[] = []

  let state: DeliberationState | null = null

  for (const plan of roundPlans) {
    console.log(`\n── Round ${plan.round_number} (${plan.kind}) ──`)

    // Step 1: pacing delay (skip R1 — no prior panel response)
    let pacing_ms = 0
    if (plan.round_number > 1 && opts.pace) {
      const lastAIContent = state ? lastAIMessageContent(state) : ''
      pacing_ms = computeTypingDelay(lastAIContent.length, opts.pace)
      console.log(`  pacing: sleeping ${pacing_ms}ms (panel last response ${lastAIContent.length} chars)`)
      await sleep(pacing_ms)
    }

    // Step 2: user turn (scripted or role-played)
    let userTurnText: string
    let userTurnSource: 'role_player' | 'scripted' | 'improvised' = 'role_player'
    let wordCount = 0
    let overCeiling = false
    let generationMs: number | null = null
    let modelUsed: string | null = null

    if (plan.scripted_text) {
      userTurnText = plan.scripted_text
      userTurnSource = 'scripted'
      wordCount = userTurnText.split(/\s+/).filter(Boolean).length
      overCeiling = false // scripted content is authored — we don't enforce ceiling
    } else {
      const panelTurns = state ? getPanelRecentTurns(state) : []
      const out = await generateUserTurn({
        persona: personaRaw,
        panel_turns: panelTurns,
        round_number: plan.round_number,
        round_objective: plan.objective,
        model_name: opts.rolePlayerModel,
      })
      userTurnText = out.content
      wordCount = out.word_count
      overCeiling = out.over_ceiling
      generationMs = out.elapsed_ms
      modelUsed = out.model_used
      userTurnSource =
        plan.round_number === 3 || plan.round_number === 4
          ? 'improvised'
          : 'role_player'
    }

    console.log(`  user (${userTurnSource}, ${wordCount}w):`)
    console.log(`    ${userTurnText.replace(/\n/g, '\n    ').slice(0, 280)}${userTurnText.length > 280 ? '…' : ''}`)
    if (overCeiling) {
      console.warn(`  [warn] role-player exceeded hard ceiling (${wordCount} words)`)
    }

    // Step 3: invoke the graph for this round.
    // Closure rounds (R5+) force recommendation phase so we can exercise the
    // recommendationNode's Zansei-pattern synthesis. This is test-harness
    // behavior; in production the orchestrator decides when to synthesize.
    const forceRecommendation = plan.kind === 'closure'
    const initialState = buildNextRoundState(state, userTurnText, forceRecommendation)
    const invokeT0 = Date.now()
    try {
      state = (await deliberationGraph.invoke(initialState, {
        recursionLimit: 50,
      })) as DeliberationState
    } catch (err) {
      console.error('[harness] graph.invoke failed:', err)
      throw err
    }
    const invoke_ms = Date.now() - invokeT0

    // Step 4: summarize what the panel produced this round
    const newAICount = state.messages.filter((m) => m._getType() === 'ai').length -
      rounds.reduce((acc, r) => acc + r.panel.turns_count, 0)
    const totalResearch = state.research_context.length
    const priorResearch = rounds.reduce((acc, r) => acc + r.panel.research_calls, 0)
    const newResearch = totalResearch - priorResearch
    const lastAIContent = lastAIMessageContent(state)

    console.log(`  panel: ${newAICount} turn(s), ${newResearch} research call(s), ${invoke_ms}ms`)

    // Trim a preview of the last panel message
    const preview = lastAIContent.slice(0, 200).replace(/\n/g, ' ')
    console.log(`  panel last: "${preview}${lastAIContent.length > 200 ? '…' : ''}"`)

    rounds.push({
      round_number: plan.round_number,
      kind: plan.kind,
      user_turn: {
        source: userTurnSource,
        content: userTurnText,
        word_count: wordCount,
        over_ceiling: overCeiling,
        generation_ms: generationMs,
        model_used: modelUsed,
      },
      panel: {
        turns_count: newAICount,
        research_calls: newResearch,
        last_response_chars: lastAIContent.length,
      },
      pacing_ms,
      invoke_ms,
    })
  }

  if (!state) {
    console.error('[harness] graph never ran — no state to bundle')
    process.exit(1)
  }

  // ── Grade + bundle ────────────────────────────────────────────────────────

  const messageRows = stateToMessageRows(state)
  const exportRows = stateToExportRows(state)
  const hints = personaToHints(personaRaw)
  const grades = gradeDeliberation(messageRows, hints)

  const exportedAt = new Date().toISOString()
  const dir = writePersonaResultBundle({
    messagesForGrade: messageRows,
    messagesExport: exportRows,
    grades,
    meta: {
      persona_id: personaId,
      source: 'thread',
      thread_id: null,
      title: `Multi-round harness — ${personaId} (${opts.rounds} rounds, research=${opts.research})`,
      persona_file: opts.personaPath,
      exported_at: exportedAt,
    },
    outDir: opts.outDir,
    legacyMessagesJsonAlias: true,
  })

  // Write a harness-specific round log alongside the bundle
  const roundLogPath = resolve(dir, 'harness_rounds.json')
  const roundLog = {
    persona_id: personaId,
    persona_file: opts.personaPath,
    options: {
      rounds: opts.rounds,
      research: opts.research,
      pace: opts.pace,
      role_player_model: opts.rolePlayerModel,
    },
    captured_at: exportedAt,
    rounds,
    summary: {
      total_messages: exportRows.length,
      total_panel_turns: rounds.reduce((a, r) => a + r.panel.turns_count, 0),
      total_research_calls: state.research_context.length,
      total_invoke_ms: rounds.reduce((a, r) => a + r.invoke_ms, 0),
      total_pacing_ms: rounds.reduce((a, r) => a + r.pacing_ms, 0),
      final_deliberation_phase: state.deliberation_phase,
      final_user_sophistication: state.user_sophistication,
      grader: {
        overall_pass: grades.overall_pass,
        checks: `${grades.checks_passed}/${grades.checks_total}`,
      },
    },
  }
  const { writeFileSync } = await import('node:fs')
  writeFileSync(roundLogPath, JSON.stringify(roundLog, null, 2), 'utf-8')

  // ── Cross-run ledger ──────────────────────────────────────────────────────
  // Append one line per harness run so patterns across personas/sessions are
  // greppable without replaying runs. Lives under test/results/ (gitignored,
  // local-only per the repo convention).
  const ledgerPath = resolve('test/results/_ledger.jsonl')
  const { appendFileSync, mkdirSync: _mkdirSync } = await import('node:fs')
  const { dirname: _dirname } = await import('node:path')
  _mkdirSync(_dirname(ledgerPath), { recursive: true })
  const ledgerEntry = {
    ts: exportedAt,
    persona_id: personaId,
    rounds: opts.rounds,
    research_enabled: opts.research,
    role_player_model: opts.rolePlayerModel,
    panel_turns: roundLog.summary.total_panel_turns,
    research_calls: state.research_context.length,
    unknown_agent_yields: grades.instruments.routing.unknown_agent_yields,
    error_yields: grades.instruments.routing.error_yields,
    advisor_avg_words: grades.instruments.advisor_turns.avg_words,
    advisor_max_words: grades.instruments.advisor_turns.max_words,
    advisor_over_150: grades.instruments.advisor_turns.over_150_words,
    overall_pass: grades.overall_pass,
    final_phase: state.deliberation_phase,
    bundle_dir: dir,
  }
  appendFileSync(ledgerPath, JSON.stringify(ledgerEntry) + '\n', 'utf-8')

  console.log(`\n[harness] bundle: ${dir}`)
  console.log(
    `[harness] grader: ${grades.checks_passed}/${grades.checks_total} checks, overall_pass=${grades.overall_pass}`
  )
  console.log(
    `[harness] instruments: ${grades.instruments.advisor_turns.count} advisor turn(s), avg ${grades.instruments.advisor_turns.avg_words}w, max ${grades.instruments.advisor_turns.max_words}w, over-150=${grades.instruments.advisor_turns.over_150_words}`
  )
  if (grades.instruments.routing.unknown_agent_yields > 0) {
    console.log(
      `[harness] ⚠ routing: ${grades.instruments.routing.unknown_agent_yields} unknown-agent yield(s), ${grades.instruments.routing.error_yields} error yield(s)`
    )
  }
  console.log(`[harness] rounds log: ${roundLogPath}`)
  console.log(`[harness] ledger: ${ledgerPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
