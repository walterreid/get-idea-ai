import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Root page: redirect authenticated users to /chat,
 * everyone else to /auth.
 */
export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/chat')
  } else {
    redirect('/auth')
  }
}
