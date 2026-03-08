import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { IdeasDashboard } from '@/components/ideas/IdeasDashboard'

export interface IdeaWithInsights {
  id: string
  title: string
  updatedAt: Date
  createdAt: Date
  insights: {
    id: string
    insight_type: 'strength' | 'risk' | 'question' | 'recommendation' | 'pattern'
    source_agent: string
    content: string
  }[]
}

export default async function IdeasPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const admin = createAdminClient()

  // Load all threads with their insights in a single query
  const { data: threads } = await admin
    .from('threads')
    .select(
      `
      id,
      title,
      created_at,
      updated_at,
      idea_insights (
        id,
        insight_type,
        source_agent,
        content
      )
    `
    )
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })

  const ideas: IdeaWithInsights[] = (threads ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    updatedAt: new Date(t.updated_at),
    createdAt: new Date(t.created_at),
    insights: (t.idea_insights ?? []) as IdeaWithInsights['insights'],
  }))

  return <IdeasDashboard ideas={ideas} />
}
