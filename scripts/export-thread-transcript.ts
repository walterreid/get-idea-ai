/**
 * Export messages for a thread as Markdown or JSON (review / grading artifact).
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (same as seed). Local:
 *   npx tsx --env-file .env.local scripts/export-thread-transcript.ts <thread_uuid> [--format md|json] [--out path]
 *
 * If --out is omitted, writes to stdout.
 */

import { writeFileSync } from 'node:fs'
import {
  createServiceSupabase,
  fetchThreadMessages,
} from '@/lib/test/fetch-thread-messages'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function usage(): never {
  console.error(
    `Usage: npx tsx --env-file .env.local scripts/export-thread-transcript.ts <thread_id> [--format md|json] [--out path]`
  )
  process.exit(1)
}

const args = process.argv.slice(2)
if (args.length === 0) usage()

let threadId = ''
let format: 'md' | 'json' = 'md'
let outPath: string | null = null

for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--format' && args[i + 1]) {
    const f = args[++i]
    if (f !== 'md' && f !== 'json') usage()
    format = f
  } else if (a === '--out' && args[i + 1]) {
    outPath = args[++i]
  } else if (!threadId && !a.startsWith('--')) {
    threadId = a
  }
}

if (!threadId) usage()

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.'
  )
  process.exit(1)
}

const supabase = createServiceSupabase(SUPABASE_URL, SERVICE_ROLE_KEY)

type Row = {
  id: string
  role: string
  agent_name: string | null
  content: string
  metadata: Record<string, unknown> | null
  created_at: string
}

function labelForRole(r: Row): string {
  if (r.role === 'user') return 'User'
  if (r.role === 'agent') {
    const meta = r.metadata ?? {}
    const dn = (meta.display_name as string) || r.agent_name || 'Advisor'
    return dn
  }
  if (r.role === 'orchestrator') {
    const mt = (r.metadata as Record<string, unknown>)?.message_type
    if (mt === 'yield_to_user') return 'Orchestrator (yield)'
    return 'Orchestrator'
  }
  if (r.role === 'system') {
    const meta = r.metadata ?? {}
    if (meta.type === 'research') {
      const rt = meta.research_type as string
      const ok = meta.success ? 'ok' : 'fail'
      return `Research (${rt}, ${ok})`
    }
    return 'System'
  }
  return r.role
}

function toMarkdown(rows: Row[], threadTitle: string | null): string {
  const lines: string[] = []
  lines.push(`# Thread transcript`)
  lines.push('')
  lines.push(`**Thread:** ${threadId}`)
  if (threadTitle) lines.push(`**Title:** ${threadTitle}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const r of rows) {
    const label = labelForRole(r)
    lines.push(`## ${label}`)
    lines.push('')
    if (r.content?.trim()) {
      lines.push(r.content.trim())
    } else {
      lines.push('*(empty body — routing metadata may be on the following agent message)*')
    }
    lines.push('')
  }

  return lines.join('\n')
}

async function main() {
  const data = await fetchThreadMessages(supabase, threadId)
  if (!data) {
    console.error(`No thread found for id: ${threadId}`)
    process.exit(1)
  }

  const list = data.messages as Row[]
  const title = data.title

  let body: string
  if (format === 'json') {
    body = JSON.stringify(
      {
        thread_id: threadId,
        title,
        exported_at: new Date().toISOString(),
        messages: list.map((r) => ({
          id: r.id,
          role: r.role,
          agent_name: r.agent_name,
          content: r.content,
          metadata: r.metadata,
          created_at: r.created_at,
        })),
      },
      null,
      2
    )
  } else {
    body = toMarkdown(list, title)
  }

  if (outPath) {
    writeFileSync(outPath, body, 'utf-8')
    console.error(`Wrote ${outPath} (${list.length} messages)`)
  } else {
    process.stdout.write(body)
    if (!body.endsWith('\n')) process.stdout.write('\n')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
