/**
 * Human-readable transcript from message rows (shared by capture bundle + result bundles).
 */

import type { MessageRow } from '@/lib/test/grade-deliberation'

export function labelForMessageRow(r: MessageRow): string {
  if (r.role === 'user') return 'User'
  if (r.role === 'agent') {
    const meta = r.metadata ?? {}
    return (meta.display_name as string) || r.agent_name || 'Advisor'
  }
  if (r.role === 'orchestrator') {
    const mt = (r.metadata as Record<string, unknown>)?.message_type
    if (mt === 'yield_to_user') return 'Orchestrator (yield)'
    return 'Orchestrator'
  }
  if (r.role === 'system') {
    const meta = r.metadata ?? {}
    if (meta.type === 'research') {
      return `Research (${meta.research_type}, ${meta.success ? 'ok' : 'fail'})`
    }
    return 'System'
  }
  return r.role
}

export function messagesToTranscriptMarkdown(
  rows: MessageRow[],
  title: string | null,
  threadLabel: string
): string {
  const lines: string[] = [
    `# Thread transcript`,
    '',
    `**Thread:** ${threadLabel}`,
    title ? `**Title:** ${title}` : '',
    '',
    '---',
    '',
  ].filter(Boolean) as string[]

  for (const r of rows) {
    lines.push(`## ${labelForMessageRow(r)}`, '')
    if (r.content?.trim()) lines.push(r.content.trim())
    else lines.push('*(empty)*')
    lines.push('')
  }
  return lines.join('\n')
}
