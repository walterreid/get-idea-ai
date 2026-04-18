/**
 * Role-player for the multi-round persona harness.
 *
 * Generates in-character user turns by invoking a SEPARATE Claude instance
 * that has no shared context with the system-under-test. The role-player sees
 * only: (a) the persona JSON, (b) the panel's most recent messages (as the
 * persona would "read" the chat), and (c) the current round's objective.
 *
 * Why separate:
 *   - The system-under-test (compiled graph) has its own Anthropic client,
 *     its own prompts, and its own state. We do NOT want the role-player to
 *     leak information into or out of that scope.
 *   - This is the §7.5 "Role-player as a separate Claude instance" pattern.
 *
 * For R3 and R4 the caller should bypass this module and inject the
 * persona.r3_wrong_claim / r4_contradiction strings directly — those are
 * scripted stimuli, not free-form character acting.
 */

import { ChatAnthropic } from '@langchain/anthropic'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

export type ResponseLengthBand =
  | 'terse'
  | 'adversarial'
  | 'skeptical'
  | 'scattered'
  | 'verbose'
  | 'enthusiastic'

/** Word count bands from Zansei run_test_suite.py lines ~150-162. */
const BAND_WORDS: Record<ResponseLengthBand, { min: number; max: number }> = {
  terse: { min: 10, max: 30 },
  adversarial: { min: 15, max: 40 },
  skeptical: { min: 25, max: 60 },
  scattered: { min: 40, max: 80 },
  verbose: { min: 40, max: 80 },
  enthusiastic: { min: 30, max: 60 },
}

/** Character ceiling for hard-fail "out of character" check. */
export const HARD_CEILING_WORDS = 80

export interface RolePlayerInput {
  persona: Record<string, unknown>
  /**
   * The panel's most recent turns the persona "saw" since their last message.
   * Typically the advisor turn(s) + the orchestrator's yield-to-user line.
   */
  panel_turns: Array<{ speaker: string; content: string }>
  /** Which round this is (1 = intake, 2 = depth, 5 = optional closure). */
  round_number: number
  /** Short description of what the persona should do this round. */
  round_objective: string
  /** Optional model override — default Sonnet 4.5 for nuance. */
  model_name?: string
}

export interface RolePlayerOutput {
  content: string
  word_count: number
  over_ceiling: boolean
  elapsed_ms: number
  model_used: string
}

function bandForPersona(persona: Record<string, unknown>): ResponseLengthBand {
  const raw = typeof persona.response_length_band === 'string' ? persona.response_length_band : null
  if (raw && raw in BAND_WORDS) return raw as ResponseLengthBand
  return 'verbose' // conservative default for new personas that haven't been categorized
}

function buildPersonaBrief(persona: Record<string, unknown>): string {
  // Pull only the fields useful for in-character acting — deliberately exclude
  // the scripted stimuli (r3_wrong_claim, r4_contradiction) so the role-player
  // doesn't preview them into R1/R2 dialogue.
  const allowed = [
    'profile',
    'business_name',
    'website',
    'goal',
    'challenge',
    'constraints',
    'team_size',
    'personality',
    'backstory',
    'conversational_behaviors',
    'expected_answer_style',
  ]

  const brief: Record<string, unknown> = {}
  for (const k of allowed) {
    if (persona[k] !== undefined) brief[k] = persona[k]
  }
  return JSON.stringify(brief, null, 2)
}

function buildSystemPrompt(
  persona: Record<string, unknown>,
  band: ResponseLengthBand,
  roundNumber: number,
  roundObjective: string
): string {
  const personaName =
    (persona.profile as Record<string, unknown> | undefined)?.name ??
    'the owner'
  const words = BAND_WORDS[band]

  return `You are role-playing ${personaName} in a research session. A panel of advisors is talking to ${personaName} about their business. You are NOT the panel, you are NOT the researcher — you are the owner.

Stay in character at all times. Do not break the fourth wall. Do not acknowledge that this is a test. Do not produce meta commentary. Do not use phrases like "as an AI" or "in this scenario."

## Character brief (do not quote this back)
\`\`\`json
${buildPersonaBrief(persona)}
\`\`\`

## Length band
Your reply must be ${words.min}–${words.max} words. Hard ceiling: ${HARD_CEILING_WORDS} words total. If you go over the ceiling, you are out of character.

## This round
- Round number: ${roundNumber}
- Your objective: ${roundObjective}

## Voice
Match the personality field in the character brief. If the brief says "tangential," go tangential. If it says "terse," be terse. If it says "circles back," circle back. If it says "self-deprecating," be self-deprecating. The brief is your voice — use it.

Your reply is what the owner types into a chat window after reading the panel's last message. No prefix, no label, no quotes — just what they would type.`
}

function buildPanelContext(turns: Array<{ speaker: string; content: string }>): string {
  if (turns.length === 0) return '(The chat has just opened. You type the first message.)'
  return turns
    .map((t) => `[${t.speaker}]: ${t.content}`)
    .join('\n\n')
}

export async function generateUserTurn(
  input: RolePlayerInput
): Promise<RolePlayerOutput> {
  const band = bandForPersona(input.persona)
  const systemPrompt = buildSystemPrompt(
    input.persona,
    band,
    input.round_number,
    input.round_objective
  )
  const panelContext = buildPanelContext(input.panel_turns)

  // Temperature relatively high for in-character variability but not chaos.
  const model = input.model_name ?? 'claude-sonnet-4-5'
  const llm = new ChatAnthropic({ model, temperature: 0.8 })

  const t0 = Date.now()
  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(
      `The panel's last messages:\n\n${panelContext}\n\nReply in character.`
    ),
  ])
  const elapsed_ms = Date.now() - t0

  const content =
    typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content)

  const word_count = content.split(/\s+/).filter(Boolean).length
  const over_ceiling = word_count > HARD_CEILING_WORDS

  return {
    content,
    word_count,
    over_ceiling,
    elapsed_ms,
    model_used: model,
  }
}

export function getBandForPersona(persona: Record<string, unknown>): ResponseLengthBand {
  return bandForPersona(persona)
}
