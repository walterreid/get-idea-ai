'use client'

import Link from 'next/link'
import { ArrowLeftIcon } from 'lucide-react'
import type { IdeaWithInsights } from '@/app/ideas/page'

interface IdeasDashboardProps {
  ideas: IdeaWithInsights[]
}

const INSIGHT_LABELS: Record<string, { label: string; color: string }> = {
  strength: { label: 'Strength', color: 'var(--agent-realist)' },
  risk: { label: 'Risk', color: 'var(--agent-finance)' },
  question: { label: 'Open question', color: 'var(--agent-marketer)' },
  recommendation: { label: 'Recommendation', color: 'var(--color-primary)' },
  pattern: { label: 'Pattern', color: 'var(--agent-creative)' },
}

function IdeaCard({ idea }: { idea: IdeaWithInsights }) {
  const strengths = idea.insights.filter((i) => i.insight_type === 'strength')
  const risks = idea.insights.filter((i) => i.insight_type === 'risk')
  const questions = idea.insights.filter((i) => i.insight_type === 'question')
  const recommendations = idea.insights.filter(
    (i) => i.insight_type === 'recommendation'
  )

  const hasInsights = idea.insights.length > 0

  const relativeTime = (date: Date) => {
    const diff = Date.now() - date.getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col transition-shadow duration-200 hover:shadow-md"
      style={{
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      {/* Card header */}
      <div
        className="px-5 py-4"
        style={{ borderBottom: hasInsights ? '1px solid var(--color-border-soft)' : undefined }}
      >
        <Link
          href={`/chat?thread=${idea.id}`}
          className="group"
        >
          <h2
            className="text-base font-semibold leading-snug group-hover:underline underline-offset-2"
            style={{
              color: 'var(--color-text)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {idea.title}
          </h2>
        </Link>

        <div className="flex items-center gap-3 mt-1.5">
          <span
            className="text-xs"
            style={{ color: 'var(--color-text-faint)', fontFamily: 'var(--font-body)' }}
          >
            Last discussed {relativeTime(idea.updatedAt)}
          </span>

          {hasInsights && (
            <>
              <span style={{ color: 'var(--color-border)' }}>·</span>
              <span
                className="text-xs"
                style={{ color: 'var(--color-text-faint)', fontFamily: 'var(--font-body)' }}
              >
                {idea.insights.length} insight{idea.insights.length !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Insight summary */}
      {hasInsights && (
        <div className="px-5 py-4 flex flex-col gap-4">
          {strengths.length > 0 && (
            <InsightGroup
              label="Strengths"
              items={strengths}
              color="var(--agent-realist)"
            />
          )}
          {risks.length > 0 && (
            <InsightGroup
              label="Risks"
              items={risks}
              color="var(--agent-finance)"
            />
          )}
          {questions.length > 0 && (
            <InsightGroup
              label="Open questions"
              items={questions}
              color="var(--agent-marketer)"
            />
          )}
          {recommendations.length > 0 && (
            <InsightGroup
              label="Recommendations"
              items={recommendations}
              color="var(--color-primary)"
            />
          )}
        </div>
      )}

      {!hasInsights && (
        <div className="px-5 py-4">
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-faint)', fontFamily: 'var(--font-body)' }}
          >
            Insights will appear here after the panel deliberates.
          </p>
        </div>
      )}

      {/* Card footer */}
      <div
        className="px-5 py-3 mt-auto"
        style={{ borderTop: '1px solid var(--color-border-soft)' }}
      >
        <Link
          href={`/chat?thread=${idea.id}`}
          className="text-xs font-medium transition-opacity opacity-70 hover:opacity-100"
          style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-body)' }}
        >
          Continue deliberation →
        </Link>
      </div>
    </div>
  )
}

function InsightGroup({
  label,
  items,
  color,
}: {
  label: string
  items: IdeaWithInsights['insights']
  color: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color, fontFamily: 'var(--font-body)' }}
      >
        {label}
      </p>
      <ul className="flex flex-col gap-1">
        {items.map((insight) => (
          <li key={insight.id} className="flex items-start gap-2">
            <span
              className="flex-shrink-0 text-[9px] mt-[4px]"
              style={{ color }}
              aria-hidden
            >
              ◆
            </span>
            <p
              className="text-[13px] leading-relaxed"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
            >
              {insight.content}
              <span
                className="ml-1.5 text-[11px]"
                style={{ color: 'var(--color-text-faint)' }}
              >
                [{insight.source_agent}]
              </span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Idea Dashboard — the product's long-form memory surface.
 *
 * Per CLAUDE.md: "The thread is not the product. The idea record —
 * stress-tested, challenged, refined across sessions — is the product."
 *
 * This view shows each idea alongside what the panel actually extracted from
 * the deliberation: not summaries, but specific attributable findings.
 */
export function IdeasDashboard({ ideas }: IdeasDashboardProps) {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-base)' }}
    >
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/chat"
            className="flex items-center gap-1.5 text-sm transition-opacity opacity-60 hover:opacity-100"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
          >
            <ArrowLeftIcon size={14} />
            Back to the room
          </Link>
        </div>

        <div className="mb-8">
          <h1
            className="text-3xl font-semibold"
            style={{
              color: 'var(--color-text)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Your ideas
          </h1>
          <p
            className="mt-2 text-sm leading-relaxed max-w-lg"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
          >
            Every idea you've brought to the room, with what the panel found.
            The record sharpens as you return and deliberate further.
          </p>
        </div>

        {ideas.length === 0 ? (
          <div
            className="rounded-xl px-8 py-16 text-center"
            style={{
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <p
              className="text-base font-semibold"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}
            >
              No ideas yet
            </p>
            <p
              className="mt-2 text-sm"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
            >
              Bring your first idea to the room.
            </p>
            <Link
              href="/chat"
              className="inline-block mt-4 px-5 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{
                backgroundColor: 'var(--color-primary)',
                fontFamily: 'var(--font-body)',
              }}
            >
              Start a conversation
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {ideas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
