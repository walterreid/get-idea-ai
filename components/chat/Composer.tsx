'use client'

import { useState, useRef, useCallback } from 'react'
import { SendHorizonalIcon, CornerDownLeftIcon } from 'lucide-react'
import { clsx } from 'clsx'

interface ComposerProps {
  isGenerating?: boolean
  onSend: (message: string) => void
  onInterrupt?: () => void
  disabled?: boolean
}

const PLACEHOLDERS = [
  'What are you working on?',
  'Describe your idea or ask a question…',
  "What's on your mind?",
]

export function Composer({
  isGenerating = false,
  onSend,
  onInterrupt,
  disabled = false,
}: ComposerProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const placeholderIdx = useRef(0)
  const placeholder = PLACEHOLDERS[placeholderIdx.current % PLACEHOLDERS.length]

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return

    if (isGenerating && onInterrupt) {
      onInterrupt()
    }

    onSend(trimmed)
    setValue('')

    // Cycle placeholder
    placeholderIdx.current++

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, disabled, isGenerating, onInterrupt, onSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    // Auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  const canSend = value.trim().length > 0 && !disabled

  return (
    <div
      className="px-4 py-3 flex-shrink-0"
      style={{ borderTop: '1px solid var(--color-border-soft)' }}
    >
      {isGenerating && (
        <div
          className="flex items-center gap-1.5 mb-2 text-[11px]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--color-primary)', opacity: 0.7 }}
          />
          <span>
            Advisors are speaking —{' '}
            <span style={{ color: 'var(--color-text)' }}>
              send a message to redirect the conversation
            </span>
          </span>
        </div>
      )}

      <div
        className="flex items-end gap-2 rounded-xl px-3 py-2 transition-all duration-150"
        style={{
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-base)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className={clsx(
            'flex-1 resize-none bg-transparent text-[15px] leading-relaxed outline-none min-h-[24px] max-h-[200px]',
            'placeholder:text-[var(--color-text-faint)]',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={{
            color: 'var(--color-text)',
            fontFamily: 'var(--font-body)',
          }}
          aria-label="Compose message"
        />

        <button
          onClick={handleSubmit}
          disabled={!canSend}
          className={clsx(
            'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150',
            canSend
              ? 'opacity-100 hover:opacity-80 active:scale-95'
              : 'opacity-25 cursor-not-allowed'
          )}
          style={{
            backgroundColor: isGenerating && canSend ? 'var(--agent-realist)' : 'var(--color-primary)',
            color: '#fff',
          }}
          aria-label={isGenerating ? 'Redirect conversation' : 'Send message'}
          title={isGenerating ? 'Send to redirect the conversation' : undefined}
        >
          {isGenerating ? (
            <CornerDownLeftIcon size={15} strokeWidth={2} />
          ) : (
            <SendHorizonalIcon size={15} strokeWidth={2} />
          )}
        </button>
      </div>

      <p
        className="mt-1.5 text-[11px] text-right"
        style={{ color: 'var(--color-text-faint)' }}
      >
        ↵ to send · shift+↵ for new line
      </p>
    </div>
  )
}
