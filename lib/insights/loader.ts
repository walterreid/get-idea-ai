/**
 * Load and format prior insights for a thread.
 *
 * The formatted output is injected into the Orchestrator's context
 * so it knows what ground has already been covered and builds forward —
 * not backward over terrain the advisors have already mapped.
 */

import { createAdminClient } from '@/lib/supabase/admin'

interface IdeaInsight {
  id: string
  thread_id: string
  insight_type: 'strength' | 'risk' | 'question' | 'recommendation' | 'pattern'
  source_agent: string
  content: string
  created_at: string
}

interface ThreadInsightSummary {
  /** Pre-formatted string ready for injection into orchestrator context */
  formatted: string
  raw: IdeaInsight[]
  counts: {
    strengths: number
    risks: number
    questions: number
    recommendations: number
    patterns: number
    total: number
  }
}

const TYPE_LABELS: Record<IdeaInsight['insight_type'], string> = {
  strength: 'Strengths already validated',
  risk: 'Risks already flagged',
  question: 'Open questions (raised, not yet answered)',
  recommendation: 'Recommendations already made',
  pattern: 'Recurring themes across the deliberation',
}

const TYPE_ORDER: IdeaInsight['insight_type'][] = [
  'strength',
  'risk',
  'question',
  'recommendation',
  'pattern',
]

/**
 * Load all insights for a thread and return them as both raw rows
 * and a formatted string for the orchestrator's system prompt.
 */
export async function loadThreadInsights(
  threadId: string
): Promise<ThreadInsightSummary> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('idea_insights')
    .select('*')
    .eq('thread_id', threadId)
    .order('insight_type')
    .order('created_at', { ascending: true })

  if (error || !data || data.length === 0) {
    return {
      formatted: '',
      raw: [],
      counts: {
        strengths: 0,
        risks: 0,
        questions: 0,
        recommendations: 0,
        patterns: 0,
        total: 0,
      },
    }
  }

  const raw = data as IdeaInsight[]

  // Group by type
  const grouped = TYPE_ORDER.reduce<Record<string, IdeaInsight[]>>(
    (acc, type) => {
      acc[type] = raw.filter((i) => i.insight_type === type)
      return acc
    },
    {}
  )

  // Format for orchestrator context
  const lines: string[] = [
    '## Prior deliberation insights',
    '',
    'The following insights were extracted from previous sessions on this idea.',
    'Build forward from here. Do not re-examine ground already covered unless',
    'the user has provided new information that changes the picture.',
    '',
  ]

  for (const type of TYPE_ORDER) {
    const items = grouped[type]
    if (!items || items.length === 0) continue

    lines.push(`**${TYPE_LABELS[type]}:**`)
    for (const item of items) {
      lines.push(`• [${item.source_agent}] ${item.content}`)
    }
    lines.push('')
  }

  return {
    formatted: lines.join('\n'),
    raw,
    counts: {
      strengths: grouped.strength?.length ?? 0,
      risks: grouped.risk?.length ?? 0,
      questions: grouped.question?.length ?? 0,
      recommendations: grouped.recommendation?.length ?? 0,
      patterns: grouped.pattern?.length ?? 0,
      total: raw.length,
    },
  }
}

/**
 * Load insights for multiple threads at once.
 * Used by the Idea Dashboard to show insight counts per thread.
 */
export async function loadInsightCountsByThread(
  threadIds: string[]
): Promise<Record<string, number>> {
  if (threadIds.length === 0) return {}

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('idea_insights')
    .select('thread_id')
    .in('thread_id', threadIds)

  if (error || !data) return {}

  return data.reduce<Record<string, number>>((acc, row) => {
    acc[row.thread_id] = (acc[row.thread_id] ?? 0) + 1
    return acc
  }, {})
}

export type { IdeaInsight, ThreadInsightSummary }
