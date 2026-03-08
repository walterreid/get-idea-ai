'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { clsx } from 'clsx'

interface AuthFormProps {
  error?: string
}

export function AuthForm({ error }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  )
  const [errorMessage, setErrorMessage] = useState(
    error === 'auth_failed' ? 'Sign-in link expired. Please try again.' : ''
  )

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || status === 'sending') return

    setStatus('sending')
    setErrorMessage('')

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setStatus('error')
      setErrorMessage(authError.message)
      return
    }

    setStatus('sent')
  }

  if (status === 'sent') {
    return (
      <div
        className="rounded-xl px-6 py-8 text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border-soft)',
        }}
      >
        <p
          className="text-base font-semibold"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}
        >
          Check your email
        </p>
        <p
          className="mt-2 text-sm leading-relaxed"
          style={{ color: 'var(--color-text-muted)' }}
        >
          We sent a sign-in link to{' '}
          <span style={{ color: 'var(--color-text)' }}>{email}</span>.
          <br />
          Click it to enter the room.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-4 text-xs underline-offset-2 hover:underline transition-opacity"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        className="rounded-xl px-5 py-5 flex flex-col gap-4"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border-soft)',
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={clsx(
              'w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all duration-150',
              'placeholder:text-[var(--color-text-faint)]',
              'focus:ring-2'
            )}
            style={{
              backgroundColor: 'var(--color-base)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-body)',
            }}
            required
          />
        </div>

        {errorMessage && (
          <p className="text-xs" style={{ color: '#c0392b' }}>
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={!email.trim() || status === 'sending'}
          className={clsx(
            'w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'enabled:hover:opacity-90 enabled:active:scale-[0.98]'
          )}
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
        </button>
      </div>
    </form>
  )
}
