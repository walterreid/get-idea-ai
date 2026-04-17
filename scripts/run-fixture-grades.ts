/**
 * Run tripwire grader on all registered message fixtures + personas (no DB, no LLM).
 * Exit 1 if any case fails overall_pass.
 *
 *   npm run test:fixtures
 *   npm run test:fixtures -- --write   # also write test/results/{persona}_{stamp}_{case}/ per case
 *
 * Registry: test/fixtures/registry.json
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  gradeDeliberation,
  personaToHints,
} from '@/lib/test/grade-deliberation'
import type { MessageRow } from '@/lib/test/grade-deliberation'
import {
  writePersonaResultBundle,
  sanitizeDirPart,
  localTimestampStamp,
} from '@/lib/test/write-result-bundle'

const ROOT = process.cwd()
const FIXTURES = join(ROOT, 'test', 'fixtures')
const PERSONAS = join(ROOT, 'test', 'personas')

interface Registry {
  cases: Array<{
    id: string
    messages: string
    persona: string
  }>
}

interface FixtureExport {
  thread_id?: string
  title?: string | null
  messages?: MessageRow[]
}

function loadRegistry(): Registry {
  const path = join(FIXTURES, 'registry.json')
  return JSON.parse(readFileSync(path, 'utf-8')) as Registry
}

function main() {
  const argv = process.argv.slice(2)
  const writeBundles = argv.includes('--write')
  const batchStamp = localTimestampStamp()

  const registry = loadRegistry()
  let failed = 0

  for (const c of registry.cases) {
    const messagesPath = join(FIXTURES, c.messages)
    const personaPath = join(PERSONAS, `${c.persona}.json`)

    const exportJson = JSON.parse(readFileSync(messagesPath, 'utf-8')) as FixtureExport
    const messages = exportJson.messages
    if (!Array.isArray(messages)) {
      console.error(`[${c.id}] Invalid messages file: ${c.messages}`)
      failed++
      continue
    }

    const personaRaw = JSON.parse(
      readFileSync(personaPath, 'utf-8')
    ) as Record<string, unknown>
    const hints = personaToHints(personaRaw)
    const grades = gradeDeliberation(messages, hints)

    const label = grades.overall_pass ? 'PASS' : 'FAIL'
    console.log(`[${c.id}] ${label} (${grades.checks_passed}/${grades.checks_total})`)

    if (writeBundles) {
      const personaId = String(personaRaw.persona_id ?? c.persona)
      const outDir = join(
        ROOT,
        'test',
        'results',
        `${sanitizeDirPart(personaId)}_${batchStamp}_${sanitizeDirPart(c.id)}`
      )
      const dir = writePersonaResultBundle({
        messagesForGrade: messages,
        messagesExport: messages as unknown[],
        grades,
        meta: {
          persona_id: personaId,
          case_id: c.id,
          source: 'fixture',
          thread_id: exportJson.thread_id ?? null,
          title: exportJson.title ?? null,
          persona_file: `test/personas/${c.persona}.json`,
          exported_at: new Date().toISOString(),
        },
        outDir,
      })
      console.error(`  → ${dir}`)
    }

    if (!grades.overall_pass) {
      failed++
      console.error(JSON.stringify(grades, null, 2))
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} fixture case(s) failed.`)
    process.exit(1)
  }

  console.error(`\nAll ${registry.cases.length} fixture case(s) passed.`)
  process.exit(0)
}

main()
