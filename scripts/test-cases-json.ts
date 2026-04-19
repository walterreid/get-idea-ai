/**
 * Development-time guard: every case file under lib/agents/cases/*.json is
 * valid JSON with the expected schema shape.
 *
 * Closes the gap surfaced in cycle `trio-rep` (2026-04-19) where a
 * single-quote terminator shipped in legal.json and was only caught when a
 * persona run tried to load it at runtime. The case-loader correctly catches
 * parse errors at runtime (a bad file shouldn't block the graph), but that
 * means development-time validation is missing — this file fills it.
 *
 * Run via `npm run test:cases-json` or as part of `npm run test:quality`.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CASES_DIR = resolve(__dirname, '..', 'lib', 'agents', 'cases')

interface CaseEntry {
  id: string
  business_type_category: string
  challenge_pattern: string
  observation: string
  what_worked: string
  what_wasted_money: string
  one_line_lesson: string
}

interface CaseFile {
  specialist?: string
  version?: number
  cases?: CaseEntry[]
}

const REQUIRED_CASE_FIELDS = [
  'id',
  'business_type_category',
  'challenge_pattern',
  'observation',
  'what_worked',
  'what_wasted_money',
  'one_line_lesson',
] as const

let failures = 0
const files = readdirSync(CASES_DIR).filter((f) => f.endsWith('.json'))
if (files.length === 0) {
  console.error('No case files found in', CASES_DIR)
  process.exit(1)
}

for (const filename of files.sort()) {
  const path = join(CASES_DIR, filename)
  let raw: string
  try {
    raw = readFileSync(path, 'utf-8')
  } catch (err) {
    console.error(`[${filename}] read failed:`, err)
    failures++
    continue
  }

  let parsed: CaseFile
  try {
    parsed = JSON.parse(raw) as CaseFile
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[${filename}] JSON parse error: ${message}`)
    failures++
    continue
  }

  if (!parsed.specialist || typeof parsed.specialist !== 'string') {
    console.error(`[${filename}] missing or non-string "specialist" field`)
    failures++
    continue
  }
  if (!Array.isArray(parsed.cases)) {
    console.error(`[${filename}] missing or non-array "cases" field`)
    failures++
    continue
  }
  if (parsed.cases.length === 0) {
    console.error(`[${filename}] "cases" array is empty`)
    failures++
    continue
  }

  let caseFailures = 0
  const seenIds = new Set<string>()
  for (let i = 0; i < parsed.cases.length; i++) {
    const c = parsed.cases[i]
    for (const field of REQUIRED_CASE_FIELDS) {
      const value = c[field]
      if (typeof value !== 'string' || value.length === 0) {
        console.error(
          `[${filename}] case[${i}] (id="${c.id ?? '?'}"): missing or empty "${field}"`
        )
        caseFailures++
      }
    }
    if (c.id && seenIds.has(c.id)) {
      console.error(`[${filename}] duplicate case id "${c.id}"`)
      caseFailures++
    }
    if (c.id) seenIds.add(c.id)
  }
  if (caseFailures > 0) {
    failures += caseFailures
    continue
  }

  console.log(`[${filename}] PASS (${parsed.cases.length} cases, specialist="${parsed.specialist}")`)
}

if (failures > 0) {
  console.error(`\n${failures} validation failure(s) across ${files.length} file(s).`)
  process.exit(1)
}

console.log(`\nAll ${files.length} case file(s) validated.`)
