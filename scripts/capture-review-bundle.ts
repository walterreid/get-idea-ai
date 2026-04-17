/**
 * Write a review bundle under test/results/ for Tier 2 QC.
 *
 * Usage:
 *   npx tsx --env-file .env.local scripts/capture-review-bundle.ts <thread_id> [--persona test/personas/ai_consultant.json] [--out-dir test/results/run_001]
 */

import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { fetchThreadMessages, createServiceSupabase } from '@/lib/test/fetch-thread-messages'
import {
  gradeDeliberation,
  personaToHints,
} from '@/lib/test/grade-deliberation'
import type { MessageRow } from '@/lib/test/grade-deliberation'
import { writePersonaResultBundle } from '@/lib/test/write-result-bundle'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function usage(): never {
  console.error(
    `Usage: npx tsx --env-file .env.local scripts/capture-review-bundle.ts <thread_id> [--persona path.json] [--out-dir dir]`
  )
  process.exit(1)
}

let threadId = ''
let personaPath: string | null = null
let outDir: string | null = null
const args = process.argv.slice(2)
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--persona' && args[i + 1]) {
    personaPath = args[++i]
  } else if (a === '--out-dir' && args[i + 1]) {
    outDir = args[++i]
  } else if (!threadId && !a.startsWith('--')) {
    threadId = a
  }
}

if (!threadId) usage()
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function main() {
  const supabase = createServiceSupabase(
    SUPABASE_URL as string,
    SERVICE_ROLE_KEY as string
  )
  const data = await fetchThreadMessages(supabase, threadId)
  if (!data) {
    console.error(`No thread: ${threadId}`)
    process.exit(1)
  }

  let personaRaw: Record<string, unknown> | null = null
  if (personaPath) {
    personaRaw = JSON.parse(
      readFileSync(resolve(personaPath), 'utf-8')
    ) as Record<string, unknown>
  }

  const messages: MessageRow[] = data.messages.map((m) => ({
    role: m.role,
    agent_name: m.agent_name,
    content: m.content,
    metadata: m.metadata,
  }))

  const hints = personaRaw ? personaToHints(personaRaw) : null
  const grades = gradeDeliberation(messages, hints)

  const personaId =
    hints?.persona_id ?? `thread_${sanitizeShort(threadId)}`

  const exportedAt = new Date().toISOString()

  const dir = writePersonaResultBundle({
    messagesForGrade: messages,
    messagesExport: data.messages as unknown[],
    grades,
    meta: {
      persona_id: personaId,
      source: 'thread',
      thread_id: threadId,
      title: data.title,
      persona_file: personaPath,
      exported_at: exportedAt,
    },
    outDir: outDir ?? undefined,
    legacyMessagesJsonAlias: true,
  })

  console.error(`Wrote bundle: ${dir}`)
  console.error(
    `  grades: ${grades.checks_passed}/${grades.checks_total} checks, overall_pass=${grades.overall_pass}`
  )
}

function sanitizeShort(id: string): string {
  return id.replace(/[^a-zA-Z0-9-]+/g, '').slice(0, 8) || 'unknown'
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
