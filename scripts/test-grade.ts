/**
 * Unit tests for lib/test/grade-deliberation.ts
 * Run: npx tsx scripts/test-grade.ts
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  gradeDeliberation,
  personaToHints,
  BANNED_GENERIC_PHRASES,
} from '@/lib/test/grade-deliberation'
import type { MessageRow } from '@/lib/test/grade-deliberation'

test('passes on minimal healthy advisor reply without persona', () => {
  const messages: MessageRow[] = [
    { role: 'user', content: 'I run a bakery in Austin.' },
    {
      role: 'agent',
      content:
        'For a bakery in Austin, foot traffic and local search matter more than national ads. What is your weekly foot traffic?',
      agent_name: 'marketer',
      metadata: { display_name: 'Marketer' },
    },
  ]
  const g = gradeDeliberation(messages, null)
  assert.ok(g.anti_generic.pass)
  assert.ok(g.voice.pass)
})

test('fails anti_generic when banned phrase present', () => {
  const messages: MessageRow[] = [
    { role: 'user', content: 'Help' },
    {
      role: 'agent',
      content: `You should ${BANNED_GENERIC_PHRASES[0]} before anything else.`,
      agent_name: 'marketer',
      metadata: {},
    },
  ]
  const g = gradeDeliberation(messages, null)
  assert.equal(g.anti_generic.pass, false)
  assert.ok(g.anti_generic.banned_phrases_found.length > 0)
})

test('personaToHints picks up grading_hints and business_name', () => {
  const h = personaToHints({
    persona_id: 't',
    business_name: 'GG Solutions LLC',
    grading_hints: ['Greenwich'],
  })
  assert.ok(h.business_name_hints?.some((x) => x.includes('GG')))
  assert.ok(h.business_name_hints?.includes('Greenwich'))
})

console.log('\nRunning grade-deliberation tests...\n')
