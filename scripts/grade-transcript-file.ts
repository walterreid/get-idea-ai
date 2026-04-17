/**
 * Grade a messages.json file (same shape as export-thread JSON or capture-review-bundle).
 *
 * Usage:
 *   npx tsx scripts/grade-transcript-file.ts path/to/messages.json [--persona test/personas/ai_consultant.json]
 *   npx tsx scripts/grade-transcript-file.ts path/to/messages.json --persona test/personas/ai_consultant.json --write
 *   [--write [--out-dir test/results/my_run]]
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  gradeDeliberation,
  personaToHints,
} from '@/lib/test/grade-deliberation'
import type { MessageRow } from '@/lib/test/grade-deliberation'
import { writePersonaResultBundle } from '@/lib/test/write-result-bundle'

const args = process.argv.slice(2)
let file = ''
let personaPath: string | null = null
let writeBundle = false
let outDir: string | undefined

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--persona' && args[i + 1]) {
    personaPath = args[++i]
  } else if (args[i] === '--write') {
    writeBundle = true
  } else if (args[i] === '--out-dir' && args[i + 1]) {
    outDir = args[++i]
  } else if (!file && !args[i].startsWith('--')) {
    file = args[i]
  }
}

if (!file) {
  console.error(
    'Usage: npx tsx scripts/grade-transcript-file.ts <messages.json> [--persona persona.json] [--write] [--out-dir dir]'
  )
  process.exit(1)
}

const raw = JSON.parse(readFileSync(resolve(file), 'utf-8')) as {
  messages?: MessageRow[]
  thread_id?: string
  title?: string | null
}

const messages = raw.messages
if (!Array.isArray(messages)) {
  console.error('Expected top-level { messages: [...] }')
  process.exit(1)
}

let hints = null
let personaRaw: Record<string, unknown> | null = null
if (personaPath) {
  personaRaw = JSON.parse(
    readFileSync(resolve(personaPath), 'utf-8')
  ) as Record<string, unknown>
  hints = personaToHints(personaRaw)
}

const grades = gradeDeliberation(messages, hints)
console.log(JSON.stringify(grades, null, 2))

if (writeBundle) {
  const personaId = hints?.persona_id ?? 'unknown'
  const dir = writePersonaResultBundle({
    messagesForGrade: messages,
    messagesExport: messages as unknown[],
    grades,
    meta: {
      persona_id: personaId,
      source: 'file',
      thread_id: raw.thread_id ?? null,
      title: raw.title ?? null,
      persona_file: personaPath,
      exported_at: new Date().toISOString(),
    },
    outDir,
  })
  console.error(`Wrote bundle: ${dir}`)
}

process.exit(grades.overall_pass ? 0 : 1)
