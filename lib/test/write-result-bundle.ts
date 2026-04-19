/**
 * Writes a standard folder under test/results/ for manual QA tracking.
 * See test/README.md ("Result bundle layout").
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { GradesResult, MessageRow } from '@/lib/test/grade-deliberation'
import { messagesToTranscriptMarkdown } from '@/lib/test/transcript-markdown'

export function localTimestampStamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

export function sanitizeDirPart(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 96) || 'unknown'
}

export function extractResearchRows(messages: MessageRow[]): MessageRow[] {
  return messages.filter(
    (m) =>
      m.role === 'system' &&
      (m.metadata as Record<string, unknown> | undefined)?.type === 'research'
  )
}

export interface PersonaResultBundleMeta {
  persona_id: string
  /** Disambiguates multiple folders in one batch (e.g. registry case id). */
  case_id?: string
  source: 'fixture' | 'file' | 'thread'
  thread_id?: string | null
  title?: string | null
  persona_file?: string | null
  exported_at: string
  /**
   * Optional cycle tag — short identifier (e.g. "finance-rep", "gr7-followup",
   * "adhoc"). Surfaces in the bundle dir name as a suffix and in
   * run_metadata.json. Lets you scan `test/results/` and tell which cycle each
   * bundle belongs to. Defaults to nothing (no suffix) when omitted.
   */
  cycle?: string
  /** Per-run conditions captured into run_metadata.json. Optional. */
  run_conditions?: {
    rounds?: number
    research_mode?: 'sync' | 'async' | 'off'
    organic?: boolean
    role_player_model?: string
  }
}

export interface WritePersonaResultBundleInput {
  messagesForGrade: MessageRow[]
  /** Full rows for JSON export (ids, created_at). Defaults to messagesForGrade. */
  messagesExport?: unknown[]
  grades: GradesResult
  meta: PersonaResultBundleMeta
  /** Absolute or cwd-relative output directory. If omitted, computed under test/results/. */
  outDir?: string
  /** Also write messages.json (same JSON as conversation_transcript.json) for older scripts. */
  legacyMessagesJsonAlias?: boolean
}

const TOKEN_USAGE_STUB = {
  recorded: false,
  detail:
    'GetIdea does not attach token or cost fields to messages yet. Use provider dashboards or a future automated runner.',
} as const

const TIMING_STUB = {
  recorded: false,
  detail:
    'Per-round wall time is not persisted with the transcript yet. Optional: log from browser devtools or API logs.',
} as const

/**
 * Default directory: test/results/{persona_id}_{YYYYMMDD_HHMMSS}[_{case_id}][_{cycle}]/
 *
 * Persona-first sort is preserved (matches Zansei's convention) so a flat
 * directory listing groups runs of the same persona alphabetically and
 * chronologically. The cycle suffix, when present, surfaces which work cycle
 * a run belongs to without requiring you to open the bundle.
 *
 *   ai_consultant_20260418_164038                    — adhoc / no cycle
 *   ai_consultant_20260418_164038_finance-rep        — Finance replication cycle
 *   ai_consultant_20260418_164038_research_followthrough — fixture case_id, no cycle
 *   ai_consultant_20260418_164038_research_followthrough_gr7-followup — both
 */
export function defaultResultBundleDir(
  meta: PersonaResultBundleMeta,
  stamp: string,
  cwd = process.cwd()
): string {
  const base = join(cwd, 'test', 'results')
  const p = sanitizeDirPart(meta.persona_id)
  const c = meta.case_id ? `_${sanitizeDirPart(meta.case_id)}` : ''
  const cy = meta.cycle ? `_${sanitizeDirPart(meta.cycle)}` : ''
  return join(base, `${p}_${stamp}${c}${cy}`)
}

export function writePersonaResultBundle(input: WritePersonaResultBundleInput): string {
  const stamp = localTimestampStamp()
  const dir = input.outDir ?? defaultResultBundleDir(input.meta, stamp)
  mkdirSync(dir, { recursive: true })

  const exportMessages = input.messagesExport ?? input.messagesForGrade
  const conversationTranscript = {
    thread_id: input.meta.thread_id ?? null,
    title: input.meta.title ?? null,
    exported_at: input.meta.exported_at,
    persona_id: input.meta.persona_id,
    messages: exportMessages,
  }

  const researchRows = extractResearchRows(input.messagesForGrade)
  const researchPayload = {
    rows: researchRows,
    count: researchRows.length,
    note:
      researchRows.length === 0
        ? 'No system rows with metadata.type === "research" in this transcript.'
        : null,
  }

  const threadLabel =
    input.meta.thread_id?.trim() ||
    (input.meta.case_id ? `fixture:${input.meta.case_id}` : 'local')

  writeFileSync(
    join(dir, 'conversation_transcript.json'),
    JSON.stringify(conversationTranscript, null, 2),
    'utf-8'
  )
  writeFileSync(join(dir, 'research_data.json'), JSON.stringify(researchPayload, null, 2), 'utf-8')
  writeFileSync(
    join(dir, 'transcript.md'),
    messagesToTranscriptMarkdown(
      input.messagesForGrade,
      input.meta.title ?? null,
      threadLabel
    ),
    'utf-8'
  )
  writeFileSync(join(dir, 'grades.json'), JSON.stringify(input.grades, null, 2), 'utf-8')
  writeFileSync(join(dir, 'token_usage.json'), JSON.stringify(TOKEN_USAGE_STUB, null, 2), 'utf-8')
  writeFileSync(join(dir, 'timing.json'), JSON.stringify(TIMING_STUB, null, 2), 'utf-8')

  const manifest = {
    bundle: 'getidea-persona-result',
    version: 2,
    captured_at: input.meta.exported_at,
    thread_id: input.meta.thread_id ?? null,
    persona_file: input.meta.persona_file ?? null,
    persona_id: input.meta.persona_id,
    case_id: input.meta.case_id ?? null,
    source: input.meta.source,
    message_count: Array.isArray(exportMessages) ? exportMessages.length : 0,
    overall_pass: input.grades.overall_pass,
    grades_summary: `${input.grades.checks_passed}/${input.grades.checks_total}`,
  }
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8')

  // Cycle + run-conditions sidecar. Cheap, but lets you `jq` across
  // test/results/*/run_metadata.json to filter by cycle, organic mode,
  // research mode, etc. without opening every bundle. Always written so
  // the file's presence is uniform across bundles; absent fields are nulls.
  const runMetadata = {
    cycle: input.meta.cycle ?? null,
    persona_id: input.meta.persona_id,
    rounds: input.meta.run_conditions?.rounds ?? null,
    research_mode: input.meta.run_conditions?.research_mode ?? null,
    organic: input.meta.run_conditions?.organic ?? null,
    role_player_model: input.meta.run_conditions?.role_player_model ?? null,
    captured_at: input.meta.exported_at,
  }
  writeFileSync(join(dir, 'run_metadata.json'), JSON.stringify(runMetadata, null, 2), 'utf-8')

  const fullResult = {
    bundle: 'getidea-persona-result',
    version: 2,
    meta: manifest,
    conversation_transcript: conversationTranscript,
    research_data: researchPayload,
    grades: input.grades,
    token_usage: TOKEN_USAGE_STUB,
    timing: TIMING_STUB,
    _notes:
      'token_usage and timing are stubs until the API persists usage and per-round timing. See BUILD.md §6.2 and docs/testing.md.',
  }
  writeFileSync(join(dir, 'full_result.json'), JSON.stringify(fullResult, null, 2), 'utf-8')

  if (input.legacyMessagesJsonAlias) {
    writeFileSync(
      join(dir, 'messages.json'),
      JSON.stringify(conversationTranscript, null, 2),
      'utf-8'
    )
  }

  return dir
}
