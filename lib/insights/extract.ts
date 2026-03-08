/**
 * Insight extraction for GetIdea.ai's institutional memory layer.
 *
 * This is not summarization. Summarization produces output without insight.
 * Extraction finds specific, attributable, actionable facts from the deliberation:
 *   - A strength is only a strength if it was actually validated, not just mentioned.
 *   - A risk is only a risk if a specific concern was named.
 *   - A question is only open if it was raised and not answered.
 *   - Source attribution matters — who thought what shapes how the next session builds.
 *
 * The system replaces all prior insights on each extraction pass. This is intentional:
 * as the conversation deepens, the insight set evolves. Stale insights mislead.
 */

import { z } from 'zod'
import { ChatAnthropic } from '@langchain/anthropic'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { createAdminClient } from '@/lib/supabase/admin'

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const InsightSchema = z.object({
  insight_type: z.enum(['strength', 'risk', 'question', 'recommendation', 'pattern']),
  source_agent: z.string().min(1),
  /**
   * Minimum 30 characters enforces specificity.
   * "The business may face challenges" is not an insight.
   * "The 3-month break-even assumes 40 orders/week — a rate the owner has never tested" is.
   */
  content: z.string().min(30),
})

const InsightsResponseSchema = z.object({
  insights: z.array(InsightSchema).max(12),
})

type ExtractedInsight = z.infer<typeof InsightSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Extraction prompt
// ─────────────────────────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are extracting structured insights from a business advisory deliberation. Your job is to identify the specific, substantive insights that emerged from this conversation — things a business owner should know and be reminded of in their next session.

CRITICAL RULES:

1. Only extract SPECIFIC, CONCRETE insights. Generic observations are worthless.
   REJECT: "The business may face challenges with competition."
   ACCEPT: "The planned price point of $12 puts the product in direct competition with two established local alternatives already at that price — Finance flagged this requires differentiation."

2. For source_agent: use the agent's name (e.g., 'finance', 'realist', 'marketer'). If the insight came directly from the user, use 'user'. If it emerged from the panel collectively, use 'panel'.

3. For insight_type:
   - 'strength': Something specifically validated as an advantage (e.g., a healthy margin, a defensible position, an existing asset)
   - 'risk': A specific threat or challenge that was explicitly surfaced
   - 'question': A specific question raised in the conversation that was NOT answered — truly open, not just "you should think about this"
   - 'recommendation': A specific action explicitly recommended by an advisor
   - 'pattern': A recurring theme that multiple agents converged on, suggesting it's load-bearing for this idea

4. Do NOT infer, elaborate, or add anything not present in the conversation. Only extract what was actually said.

5. Prefer 4-8 high-quality insights over 10+ generic ones. Quality over quantity.

6. If a question was raised AND answered in the conversation, do NOT list it as an open question.

Respond with valid JSON only, in this exact format:
{
  "insights": [
    {
      "insight_type": "strength",
      "source_agent": "finance",
      "content": "specific, concrete insight of at least 30 characters"
    }
  ]
}`

// ─────────────────────────────────────────────────────────────────────────────
// Conversation formatter
// ─────────────────────────────────────────────────────────────────────────────

interface ConversationRow {
  role: string
  agent_name: string | null
  content: string
  metadata: Record<string, unknown> | null
}

function formatConversationForExtraction(rows: ConversationRow[]): string {
  const lines: string[] = []

  for (const row of rows) {
    if (row.role === 'user') {
      lines.push(`[User]: ${row.content}`)
    } else if (row.role === 'agent' && row.content) {
      const displayName =
        (row.metadata?.display_name as string) ?? row.agent_name ?? 'Advisor'
      lines.push(`[${displayName}]: ${row.content}`)
    }
    // Skip orchestrator metadata rows and empty content
  }

  return lines.join('\n\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// Main extraction function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract insights from the full conversation of a thread.
 *
 * Strategy: Replace all prior insights with a fresh extraction from the full conversation.
 * This ensures the insight set always reflects the complete deliberation, not just
 * what happened in a single round. As the conversation deepens, insights evolve.
 *
 * This function is designed to run silently after a deliberation round completes.
 * Failures are logged but do not affect the user experience.
 */
export async function extractAndStoreInsights(
  threadId: string,
  conversationRows: ConversationRow[]
): Promise<void> {
  // Don't extract from trivial conversations — minimum 1 agent response required
  const agentMessages = conversationRows.filter(
    (r) => r.role === 'agent' && r.content && r.content.length > 50
  )
  if (agentMessages.length === 0) {
    return
  }

  const conversationText = formatConversationForExtraction(conversationRows)
  if (!conversationText.trim()) {
    return
  }

  const userPrompt = `Here is the full deliberation conversation:\n\n${conversationText}\n\n---\nExtract the structured insights from this deliberation. Remember: only extract what was specifically said, not what could be inferred.`

  // Haiku is fast and cost-efficient for extraction — we don't need deep reasoning here,
  // we need accurate reading comprehension and JSON formatting
  const llm = new ChatAnthropic({
    model: 'claude-haiku-4-5',
    temperature: 0.1, // Low temperature for consistent extraction
  })

  let rawResponse: string
  try {
    const response = await llm.invoke([
      new SystemMessage(EXTRACTION_SYSTEM_PROMPT),
      new HumanMessage(userPrompt),
    ])
    rawResponse =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content)
  } catch (err) {
    console.error('[extractInsights] LLM call failed:', err)
    return
  }

  // Strip markdown code fences if the model wrapped the JSON
  const cleaned = rawResponse
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')

  let insights: ExtractedInsight[]
  try {
    const parsed = InsightsResponseSchema.parse(JSON.parse(cleaned))
    insights = parsed.insights
  } catch (err) {
    console.error('[extractInsights] Failed to parse insights JSON:', rawResponse)
    return
  }

  if (insights.length === 0) return

  const admin = createAdminClient()

  // Replace all prior insights for this thread with the fresh extraction.
  // This is intentional — the insight set should reflect the full conversation,
  // not accumulate stale observations from early in the deliberation.
  const { error: deleteError } = await admin
    .from('idea_insights')
    .delete()
    .eq('thread_id', threadId)

  if (deleteError) {
    console.error('[extractInsights] Failed to delete prior insights:', deleteError)
    return
  }

  const { error: insertError } = await admin.from('idea_insights').insert(
    insights.map((insight) => ({
      thread_id: threadId,
      insight_type: insight.insight_type,
      source_agent: insight.source_agent,
      content: insight.content,
    }))
  )

  if (insertError) {
    console.error('[extractInsights] Failed to insert insights:', insertError)
  }
}
