import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChatInterface } from '@/components/chat/ChatInterface'
import type { RosterAgent, SidebarThread } from '@/lib/types/stream'
import { getAgentColor } from '@/lib/types/stream'
import { loadInsightCountsByThread } from '@/lib/insights/loader'
import { PLACEHOLDER_AGENTS } from '@/lib/placeholder'

/**
 * One-liner descriptions per agent role.
 * These are UI copy, not prompts — they don't live in the DB.
 */
const AGENT_ONE_LINERS: Record<string, string> = {
  marketer: 'Channels, positioning, and growth',
  finance: 'Unit economics and financial viability',
  creative: 'Brand identity and creative direction',
  copywriter: 'Voice, messaging, and narrative',
  designer: 'Tangible experience and product feel',
  accountant: 'Cash flow, taxes, and compliance',
  operations: 'Execution, systems, and logistics',
  legal: 'Risk awareness and legal blind spots',
  cx: 'Customer journey and retention',
  realist: 'What you need to hear, not what you want',
}

interface SearchParams {
  thread?: string
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()

  // ── Auth guard ──
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const resolvedParams = await searchParams

  // ── Load agents + threads in parallel ──
  const [agentResult, threadResult] = await Promise.all([
    supabase
      .from('agent_configs')
      .select('name, display_name, status')
      .eq('status', 'active')
      .neq('name', 'orchestrator')
      .order('created_at', { ascending: true }),
    supabase
      .from('threads')
      .select('id, title, updated_at, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(50),
  ])

  // ── Build roster ──
  const agents: RosterAgent[] =
    agentResult.data && agentResult.data.length > 0
      ? agentResult.data.map((row) => ({
          name: row.name,
          displayName: row.display_name,
          oneLiner: AGENT_ONE_LINERS[row.name] ?? 'Specialist advisor',
          color: getAgentColor(row.name),
        }))
      : PLACEHOLDER_AGENTS.map((a) => ({
          name: a.name,
          displayName: a.displayName,
          oneLiner: a.oneLiner,
          color: a.color,
        }))

  // ── Build thread list with insight counts ──
  const threadRows = threadResult.data ?? []
  const threadIds = threadRows.map((t) => t.id)
  const insightCounts = await loadInsightCountsByThread(threadIds)

  const threads: SidebarThread[] = threadRows.map((t) => ({
    id: t.id,
    title: t.title,
    updatedAt: new Date(t.updated_at),
    insightCount: insightCounts[t.id] ?? 0,
  }))

  return (
    <ChatInterface
      threadId={resolvedParams.thread ?? null}
      agents={agents}
      threads={threads}
    />
  )
}
