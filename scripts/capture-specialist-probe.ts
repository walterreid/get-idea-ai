/**
 * capture-specialist-probe.ts
 *
 * Phase 7 falsifiability harness.
 *
 * Invokes a single specialist directly against a persona's opener, using the same
 * prompt-construction path as lib/graph/nodes.ts:workerNode — but without going
 * through the Orchestrator. This isolates "what does THIS specialist produce
 * for THIS opener with the current DB-seeded prompt" so before/after diffs on
 * a prompt rewrite are uncontaminated by routing variance.
 *
 * Output shape matches scripts/export-thread-transcript.ts and is grade-able
 * directly via scripts/grade-transcript-file.ts.
 *
 * Usage:
 *   npx tsx --env-file .env.local scripts/capture-specialist-probe.ts \
 *     --agent marketer \
 *     --persona test/personas/ai_consultant.json \
 *     --label before_2026-04-17 \
 *     [--objective probe] \
 *     [--reason "Walter described a visibility problem..."]
 *
 * Writes to test/fixtures/messages_<persona_id>_<agent>_<label>.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { ChatAnthropic } from '@langchain/anthropic'
import { ChatOpenAI } from '@langchain/openai'
import { fetchAgentByName } from '@/lib/agents/graph-loader'

const args = process.argv.slice(2)
let agentName = ''
let personaPath = ''
let label = ''
let objective = 'probe'
let reason = ''

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--agent' && args[i + 1]) agentName = args[++i]
  else if (args[i] === '--persona' && args[i + 1]) personaPath = args[++i]
  else if (args[i] === '--label' && args[i + 1]) label = args[++i]
  else if (args[i] === '--objective' && args[i + 1]) objective = args[++i]
  else if (args[i] === '--reason' && args[i + 1]) reason = args[++i]
}

if (!agentName || !personaPath || !label) {
  console.error(
    'Usage: --agent <name> --persona <path> --label <label> [--objective <obj>] [--reason <text>]'
  )
  process.exit(1)
}

const personaRaw = JSON.parse(readFileSync(resolve(personaPath), 'utf-8')) as Record<
  string,
  unknown
>
const personaId = String(personaRaw.persona_id ?? 'unknown')

// Build Walter-style opener: q1 + q2 combined (persona behavior says he "blends
// multiple topics together" — realistic opener has identity and challenge in one turn).
const expected =
  (personaRaw.expected_answer_style as Record<string, string> | undefined) ?? {}
const q1 = expected.q1_business_identity ?? ''
const q2 = expected.q2_primary_challenge ?? ''
const opener = [q1, q2].filter(Boolean).join('\n\n')

if (!opener) {
  console.error(`Persona ${personaId} has no q1_business_identity or q2_primary_challenge.`)
  process.exit(1)
}

// Default orchestrator reason if none provided — mirrors what the live orchestrator
// would plausibly emit for this opener routing to this specialist.
if (!reason) {
  reason = `${personaId} described a distribution/visibility problem. ${agentName} should probe current tactics and named constraints before proposing channel moves.`
}

function buildLLM(provider: 'openai' | 'anthropic', model: string) {
  if (provider === 'anthropic') {
    return new ChatAnthropic({ model, temperature: 0.7 })
  }
  return new ChatOpenAI({ model, temperature: 0.7 })
}

async function main() {
  const agent = await fetchAgentByName(agentName)
  if (!agent) {
    console.error(`Agent "${agentName}" not found in agent_configs. Did you run npm run seed?`)
    process.exit(1)
  }

  // Replicate workerNode's user-prompt construction. No research block (fresh opener).
  const conversationHistory = `[User]: ${opener}`
  const userPrompt = [
    conversationHistory,
    '',
    '---',
    `Your objective for this turn: ${objective}`,
    `Orchestrator's reason you were called: ${reason}`,
    '',
    `Respond as ${agent.display_name}. Be direct and substantive. Do not summarize what others said — add your specific perspective.`,
  ].join('\n')

  const llm = buildLLM(agent.model_provider, agent.model_name)

  const t0 = Date.now()
  const response = await llm.invoke([
    new SystemMessage(agent.system_prompt),
    new HumanMessage(userPrompt),
  ])
  const elapsed_ms = Date.now() - t0

  const content =
    typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

  const exportedAt = new Date().toISOString()
  const fixture = {
    thread_id: `phase7-probe-${personaId}-${agentName}-${label}`,
    title: `Phase 7 probe: ${personaId} → ${agent.display_name} (${label})`,
    exported_at: exportedAt,
    persona_id: personaId,
    probe_meta: {
      agent: agent.name,
      display_name: agent.display_name,
      model_provider: agent.model_provider,
      model_name: agent.model_name,
      objective,
      routing_reason: reason,
      prompt_length_chars: agent.system_prompt.length,
      elapsed_ms,
      label,
    },
    messages: [
      {
        id: 'm1',
        role: 'user',
        agent_name: null,
        content: opener,
        metadata: null,
        created_at: exportedAt,
      },
      {
        id: 'm2',
        role: 'agent',
        agent_name: agent.name,
        content,
        metadata: {
          display_name: agent.display_name,
          routing_reason: reason,
          routing_objective: objective,
          deliberation_phase: 'exploration',
          phase7_probe: true,
          label,
        },
        created_at: exportedAt,
      },
    ],
  }

  const outPath = resolve(
    `test/fixtures/messages_${personaId}_${agentName}_${label}.json`
  )
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(fixture, null, 2))

  console.log(`Wrote: ${outPath}`)
  console.log(`Elapsed: ${elapsed_ms}ms`)
  console.log(`\n─── ${agent.display_name} response ───\n`)
  console.log(content)
  console.log(`\n─── end ───`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
