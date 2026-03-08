import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuthForm } from './AuthForm'

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  // Already signed in → send to the room
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/chat')

  const params = await searchParams

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-base)' }}
    >
      <div
        className="w-full max-w-sm"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {/* Wordmark */}
        <div className="mb-8 text-center">
          <h1
            className="text-3xl font-semibold"
            style={{
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-display)',
            }}
          >
            GetIdea
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Your advisory panel is ready
          </p>
        </div>

        <AuthForm error={params.error} />

        <p
          className="mt-6 text-center text-xs leading-relaxed"
          style={{ color: 'var(--color-text-faint)' }}
        >
          We'll send you a sign-in link. No password required.
        </p>
      </div>
    </div>
  )
}
