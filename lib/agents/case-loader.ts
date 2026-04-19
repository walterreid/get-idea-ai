/**
 * Case loader — retrieves per-specialist cases relevant to the current
 * thread's inferred business type, for injection at specialist workerNode
 * turns. See BUILD.md Phase 7.3 and CLAUDE.md GR#6 ("specialists speak from
 * history, not from principle"; "use the case, don't cite it").
 *
 * Cases are short, voice-level judgment material — "I've seen this shape
 * before; here is what mattered." They are distinct from the org-level
 * playbooks and channel guides in lib/knowledge/, which inject at the
 * recommendation step only.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  inferBusinessType,
  type BusinessTypeCategory,
} from '@/lib/knowledge/loader'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CASES_DIR = resolve(__dirname, 'cases')

export interface Case {
  id: string
  business_type_category: BusinessTypeCategory
  challenge_pattern: string
  observation: string
  what_worked: string
  what_wasted_money: string
  one_line_lesson: string
}

interface CaseFile {
  specialist: string
  version: number
  cases: Case[]
}

// In-process cache — cases don't change at runtime.
const caseFileCache = new Map<string, CaseFile | null>()

function readCaseFile(specialistName: string): CaseFile | null {
  if (caseFileCache.has(specialistName)) return caseFileCache.get(specialistName)!

  const path = resolve(CASES_DIR, `${specialistName}.json`)
  if (!existsSync(path)) {
    caseFileCache.set(specialistName, null)
    return null
  }

  try {
    const raw = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(raw) as CaseFile
    caseFileCache.set(specialistName, parsed)
    return parsed
  } catch (err) {
    console.error(`[case-loader] Failed to read/parse ${path}:`, err)
    caseFileCache.set(specialistName, null)
    return null
  }
}

/**
 * Retrieve up to `topN` cases for a specialist, filtered by business type.
 * Returns [] if no case file exists for the specialist OR no cases match.
 *
 * Strategy:
 *   1. When businessType is non-null: cases with matching business_type_category
 *      come first; fill with cross-category if fewer than topN match.
 *   2. When businessType is null (concept-first openers — user named a
 *      concept/idea but no business type): prefer cases tagged
 *      'concept_first'; fall through to cross-category if fewer than topN.
 *   3. Stable order (by case id) within each bucket for reproducibility.
 *
 * Cross-category fallback ensures the specialist always has SOMETHING to
 * reach for — because a case about therapy-practice specialty-searches can
 * still inform a retail specificity problem.
 */
export function loadCasesForSpecialist(
  specialistName: string,
  businessType: BusinessTypeCategory | null,
  topN = 3
): Case[] {
  const file = readCaseFile(specialistName)
  if (!file || file.cases.length === 0) return []

  const all = [...file.cases].sort((a, b) => a.id.localeCompare(b.id))

  if (!businessType) {
    const conceptFirst = all.filter((c) => c.business_type_category === 'concept_first')
    if (conceptFirst.length >= topN) return conceptFirst.slice(0, topN)
    const others = all.filter((c) => c.business_type_category !== 'concept_first')
    return [...conceptFirst, ...others].slice(0, topN)
  }

  const primary = all.filter((c) => c.business_type_category === businessType)
  if (primary.length >= topN) return primary.slice(0, topN)

  const secondary = all.filter((c) => c.business_type_category !== businessType)
  return [...primary, ...secondary].slice(0, topN)
}

/**
 * Format cases as a markdown block for LLM context.
 * Use this in workerNode's user prompt before the specialist speaks.
 *
 * IMPORTANT: the formatting is deliberately minimal — cases are reference
 * material the model reaches into, not a structured framework to follow.
 * "Use the case, don't cite it" (CLAUDE.md GR#6) is the discipline.
 */
export function formatCasesForContext(cases: Case[]): string {
  if (cases.length === 0) return ''

  const parts: string[] = []
  parts.push('---')
  parts.push('## Relevant cases from your practice')
  parts.push(
    "These are situations you have seen before. Reach into them when they inform " +
      "this specific owner's problem. **Do not cite them**, do not say \"I once " +
      "worked with a...\", do not reference them by name or detail. The owner " +
      "should feel that you know what you're talking about, not that you're " +
      "reading from a file. Use the case; keep the source invisible."
  )
  parts.push('')
  for (const c of cases) {
    parts.push(`### Case: ${c.challenge_pattern}`)
    parts.push(`**Pattern:** ${c.observation}`)
    parts.push(`**What worked:** ${c.what_worked}`)
    parts.push(`**What wasted money:** ${c.what_wasted_money}`)
    parts.push(`**Lesson:** ${c.one_line_lesson}`)
    parts.push('')
  }
  parts.push('---')
  return parts.join('\n')
}

/**
 * Convenience — infer + load + format in one call. For workerNode integration.
 *
 * `conversationText` should be the concatenation of user-role messages from
 * the current thread. Business type is inferred the same way as in
 * lib/knowledge/loader.ts to keep inference consistent across both layers.
 */
export function buildCaseContext(
  specialistName: string,
  conversationText: string,
  topN = 3
): string {
  const businessType = inferBusinessType(conversationText)
  const cases = loadCasesForSpecialist(specialistName, businessType, topN)
  return formatCasesForContext(cases)
}
