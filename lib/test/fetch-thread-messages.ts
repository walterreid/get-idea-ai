/**
 * Load thread + messages for test artifacts (service role).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type ThreadMessageRow = {
  id: string
  role: string
  agent_name: string | null
  content: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export async function fetchThreadMessages(
  supabase: SupabaseClient,
  threadId: string
): Promise<{ title: string | null; messages: ThreadMessageRow[] } | null> {
  const { data: thread, error: tErr } = await supabase
    .from('threads')
    .select('id, title')
    .eq('id', threadId)
    .maybeSingle()

  if (tErr || !thread) return null

  const { data: rows, error } = await supabase
    .from('messages')
    .select('id, role, agent_name, content, metadata, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  return {
    title: thread.title as string | null,
    messages: (rows ?? []) as ThreadMessageRow[],
  }
}

export function createServiceSupabase(url: string, serviceKey: string) {
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}
