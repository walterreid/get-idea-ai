'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

interface RecommendationBlockProps {
  content: string
  streaming?: boolean
}

interface ParsedSection {
  title: string
  items: string[]
}

/**
 * Parse the structured markdown recommendation into labeled sections.
 * The recommendation node produces content with `## Heading` sections.
 */
function parseRecommendation(content: string): ParsedSection[] {
  if (!content) return []

  const sections: ParsedSection[] = []
  const parts = content.split(/^## /m).filter(Boolean)

  for (const part of parts) {
    const newlineIdx = part.indexOf('\n')
    if (newlineIdx === -1) continue

    const title = part.slice(0, newlineIdx).trim()
    const body = part.slice(newlineIdx + 1).trim()

    // Parse bullet points (lines starting with -, •, or just plain lines)
    const items = body
      .split('\n')
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter((line) => line.length > 0)

    if (title && items.length > 0) {
      sections.push({ title, items })
    }
  }

  return sections
}

const SECTION_STYLES: Record<
  string,
  { accent: string; label: string; icon: string }
> = {
  Strengths: {
    accent: 'var(--agent-realist)',
    label: "What's working",
    icon: '◆',
  },
  Risks: {
    accent: 'var(--agent-finance)',
    label: 'What to watch',
    icon: '◈',
  },
  'Unanswered Questions': {
    accent: 'var(--agent-marketer)',
    label: 'Still open',
    icon: '◇',
  },
  'Suggested Next Steps': {
    accent: 'var(--color-primary)',
    label: 'What to do next',
    icon: '→',
  },
}

function SectionBlock({ section }: { section: ParsedSection }) {
  const style = SECTION_STYLES[section.title]
  const accent = style?.accent ?? 'var(--color-primary)'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: accent, fontFamily: 'var(--font-body)' }}
        >
          {section.title}
        </span>
        {style?.label && (
          <span
            className="text-[11px]"
            style={{ color: 'var(--color-text-faint)', fontFamily: 'var(--font-body)' }}
          >
            — {style.label}
          </span>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {section.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span
              className="flex-shrink-0 mt-[3px] text-[10px]"
              style={{ color: accent }}
              aria-hidden
            >
              {style?.icon ?? '•'}
            </span>
            <p
              className="text-[14px] leading-relaxed"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
            >
              {item}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Renders the panel's final structured recommendation.
 *
 * Design intent (DESIGN.md): "A card or panel with clear sections. Not a wall of text.
 * Structured but not clinical. Uses the primary accent color subtly.
 * This is the deliverable of the deliberation — it should feel like a thoughtful summary,
 * not a generated report."
 */
export function RecommendationBlock({
  content,
  streaming = false,
}: RecommendationBlockProps) {
  const [collapsed, setCollapsed] = useState(false)

  const sections = parseRecommendation(content)

  // Fallback: if parsing fails (incomplete streaming content), render raw
  const hasStructure = sections.length > 0

  return (
    <div
      className="rounded-xl overflow-hidden animate-message-in"
      style={{
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        // Subtle primary accent on top border — marks this as a deliverable
        borderTop: '3px solid var(--color-primary)',
        opacity: streaming ? 0.95 : 1,
        transition: 'opacity 200ms ease',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--color-border-soft)' }}
      >
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-body)' }}
          >
            Panel Recommendation
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
          >
            {streaming
              ? "Synthesizing the panel's perspectives\u2026"
              : 'The deliberation produced this assessment for you.'}
          </p>
        </div>

        {!streaming && hasStructure && (
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex items-center gap-1 text-xs transition-opacity opacity-60 hover:opacity-100"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
            aria-label={collapsed ? 'Expand recommendation' : 'Collapse recommendation'}
          >
            {collapsed ? (
              <>
                Show <ChevronDownIcon size={12} />
              </>
            ) : (
              <>
                Collapse <ChevronUpIcon size={12} />
              </>
            )}
          </button>
        )}
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="px-5 py-4 flex flex-col gap-5">
          {hasStructure ? (
            sections.map((section) => (
              <SectionBlock key={section.title} section={section} />
            ))
          ) : (
            // Fallback for incomplete/unparseable content (e.g. mid-stream)
            <p
              className="text-[14px] leading-relaxed whitespace-pre-wrap"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
            >
              {content}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
