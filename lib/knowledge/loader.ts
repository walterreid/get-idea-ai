/**
 * Knowledge loader — retrieves the vertical playbook and relevant channel
 * guides for a deliberation, to be injected at the recommendation/synthesis
 * step (NOT at every specialist turn — see BUILD.md Phase 7.3).
 *
 * Knowledge files live under `lib/knowledge/playbooks/` and `lib/knowledge/channels/`
 * and are bundled at build time. They are plain markdown — no parsing, no
 * runtime composition. The loader just reads the files that match the
 * inferred business type.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Resolve the directory of this module at runtime so the loader works
// whether invoked from Next.js, tsx, or the harness.
const __dirname = dirname(fileURLToPath(import.meta.url))

const PLAYBOOKS_DIR = resolve(__dirname, 'playbooks')
const CHANNELS_DIR = resolve(__dirname, 'channels')

// ─────────────────────────────────────────────────────────────────────────────
// Business type inference
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loose keyword-match inference from a free-text business description.
 * Mirrors Zansei's conversation_flow.json Q6 branching — the matches list
 * for each vertical is the same pattern set.
 *
 * Returns null when nothing matches; callers should default to "skip knowledge
 * injection" rather than guess.
 */
export type BusinessTypeCategory =
  | 'local_services'
  | 'professional_services'
  | 'restaurant_food'
  | 'fitness_wellness'
  | 'ecommerce_dtc'

const CATEGORY_KEYWORDS: Record<BusinessTypeCategory, string[]> = {
  local_services: [
    'plumber', 'plumbing', 'hvac', 'landscap', 'contractor', 'electrician',
    'cleaning', 'auto', 'mechanic', 'dental', 'veterinar', 'roofer', 'roofing',
    'handyman', 'pest control', 'lawn care', 'appliance repair',
  ],
  professional_services: [
    'lawyer', 'attorney', 'law firm', 'accountant', 'cpa', 'bookkeep',
    'consultant', 'consulting', 'consultancy', 'therapist', 'psychologist',
    'financial advisor', 'architect', 'tax prep', 'agency', 'strategist',
    'advisory',
  ],
  restaurant_food: [
    'restaurant', 'cafe', 'coffee', 'bakery', 'bar', 'brewery', 'food truck',
    'diner', 'bistro', 'pizzeria', 'deli', 'catering', 'ice cream',
  ],
  fitness_wellness: [
    'gym', 'fitness', 'yoga', 'pilates', 'crossfit', 'studio', 'spa',
    'wellness', 'massage', 'physical therapy', 'dance studio', 'trainer',
  ],
  ecommerce_dtc: [
    'ecommerce', 'e-commerce', 'dtc', 'direct to consumer', 'online store',
    'online shop', 'online brand', 'shopify', 'amazon store',
    'subscription box',
  ],
}

/**
 * Infer the business type category from a free-text string (usually the
 * concatenation of the user's first 2-3 messages plus any persona metadata).
 *
 * Returns the first matching category in priority order, or null if nothing
 * matches. Priority order favors more specific verticals over generic ones
 * (e.g., "fitness studio" matches fitness_wellness, not local_services,
 * even though "studio" could theoretically be either).
 */
export function inferBusinessType(text: string): BusinessTypeCategory | null {
  const lower = text.toLowerCase()

  // Priority: more specific verticals first to avoid accidental local_services
  // capture of things like "fitness studio" or "cafe".
  const priority: BusinessTypeCategory[] = [
    'professional_services',
    'fitness_wellness',
    'restaurant_food',
    'ecommerce_dtc',
    'local_services',
  ]

  for (const category of priority) {
    const kws = CATEGORY_KEYWORDS[category]
    if (kws.some((kw) => lower.includes(kw))) {
      return category
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel relevance mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Static mapping from business type category → channels most relevant for
 * that vertical. Based on which channels each playbook emphasizes and which
 * Zansei production uses per vertical.
 *
 * Order matters — earlier channels are higher-priority.
 */
const CATEGORY_CHANNELS: Record<BusinessTypeCategory, string[]> = {
  local_services: [
    'google_local_services_ads',
    'google_business_profile',
    'google_search_ads',
    'referral_programs',
  ],
  professional_services: [
    'google_search_ads',
    'google_business_profile',
    'linkedin',
    'seo_fundamentals',
  ],
  restaurant_food: [
    'google_business_profile',
    'meta_ads',
    'email_sms',
    'referral_programs',
  ],
  fitness_wellness: [
    'google_business_profile',
    'meta_ads',
    'email_sms',
    'referral_programs',
  ],
  ecommerce_dtc: [
    'meta_ads',
    'email_sms',
    'google_search_ads',
    'referral_programs',
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// File reads
// ─────────────────────────────────────────────────────────────────────────────

export interface KnowledgeBundle {
  business_type: BusinessTypeCategory
  playbook: string
  channel_guides: Array<{ name: string; content: string }>
}

function readPlaybook(category: BusinessTypeCategory): string {
  const path = resolve(PLAYBOOKS_DIR, `${category}.md`)
  return readFileSync(path, 'utf-8')
}

function readChannelGuide(channelName: string): { name: string; content: string } | null {
  const path = resolve(CHANNELS_DIR, `${channelName}.md`)
  try {
    return { name: channelName, content: readFileSync(path, 'utf-8') }
  } catch {
    return null
  }
}

/**
 * Load the full knowledge bundle for a given business type category.
 * Returns the vertical playbook + the top N channel guides for that vertical.
 *
 * @param category — inferred business type (null = no knowledge to inject)
 * @param topChannels — how many channel guides to include (default 3)
 */
export function loadKnowledgeBundle(
  category: BusinessTypeCategory | null,
  topChannels = 3
): KnowledgeBundle | null {
  if (!category) return null

  const playbook = readPlaybook(category)
  const channelNames = (CATEGORY_CHANNELS[category] ?? []).slice(0, topChannels)
  const channel_guides: Array<{ name: string; content: string }> = []
  for (const name of channelNames) {
    const guide = readChannelGuide(name)
    if (guide) channel_guides.push(guide)
  }

  return {
    business_type: category,
    playbook,
    channel_guides,
  }
}

/**
 * Format a knowledge bundle as a single markdown block for LLM context
 * injection. Headers and separators make it easy for the model to scan.
 *
 * Use this in recommendationNode's user prompt just before the
 * "produce the structured recommendation" instruction.
 */
export function formatKnowledgeForContext(bundle: KnowledgeBundle | null): string {
  if (!bundle) return ''

  const parts: string[] = []
  parts.push('---')
  parts.push('## Vertical playbook')
  parts.push(
    `The business has been inferred as **${bundle.business_type.replace(/_/g, ' ')}**. ` +
      'This playbook is background expertise — use it to deepen recommendations the ' +
      'conversation supports, not to introduce strategies the owner did not signal ' +
      'readiness for. Ground every recommendation in something the owner said OR ' +
      'something from research; use the playbook to enrich, not to originate.'
  )
  parts.push('')
  parts.push(bundle.playbook)
  parts.push('')

  if (bundle.channel_guides.length > 0) {
    parts.push('## Relevant channel guides')
    parts.push(
      'Use these to make channel recommendations actionable (specific setup detail, ' +
        'metrics, common mistakes). Only reference a channel you have already decided ' +
        'to recommend based on the conversation and research.'
    )
    parts.push('')
    for (const guide of bundle.channel_guides) {
      parts.push(`### ${guide.name.replace(/_/g, ' ')}`)
      parts.push('')
      parts.push(guide.content)
      parts.push('')
    }
  }

  parts.push('---')
  return parts.join('\n')
}

/**
 * Convenience — infer + load + format in one call. For recommendationNode.
 */
export function buildKnowledgeContext(conversationText: string): string {
  const category = inferBusinessType(conversationText)
  const bundle = loadKnowledgeBundle(category)
  return formatKnowledgeForContext(bundle)
}

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic helpers
// ─────────────────────────────────────────────────────────────────────────────

/** List all playbooks on disk. Useful for debugging and admin views. */
export function listPlaybooks(): string[] {
  return readdirSync(PLAYBOOKS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
}

/** List all channel guides on disk. */
export function listChannelGuides(): string[] {
  return readdirSync(CHANNELS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
}
