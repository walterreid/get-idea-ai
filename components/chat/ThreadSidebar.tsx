'use client'

import { clsx } from 'clsx'
import { PlusIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { SidebarThread } from '@/lib/types/stream'

interface ThreadSidebarProps {
  threads: SidebarThread[]
  activeThreadId?: string
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ThreadSidebar({ threads, activeThreadId }: ThreadSidebarProps) {
  const router = useRouter()

  return (
    <aside
      className="flex flex-col h-full overflow-hidden"
      style={{ borderRight: '1px solid var(--color-border)' }}
      aria-label="Conversation history"
    >
      {/* Header + New Conversation button */}
      <div
        className="px-3 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border-soft)' }}
      >
        <button
          onClick={() => router.push('/chat')}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: '#fff',
            fontFamily: 'var(--font-body)',
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
              'var(--color-primary-hover)')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
              'var(--color-primary)')
          }
        >
          <PlusIcon size={14} strokeWidth={2.5} />
          New Conversation
        </button>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto py-2">
        {threads.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p
              className="text-xs leading-relaxed"
              style={{ color: 'var(--color-text-faint)', fontFamily: 'var(--font-body)' }}
            >
              Your conversations will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 px-2">
            {threads.map((thread) => {
              const isActive = thread.id === activeThreadId

              return (
                <button
                  key={thread.id}
                  onClick={() => router.push(`/chat?thread=${thread.id}`)}
                  className={clsx(
                    'w-full text-left px-3 py-2.5 rounded-lg transition-colors duration-150',
                    isActive ? 'cursor-default' : 'hover:bg-[var(--color-surface)]'
                  )}
                  style={{
                    backgroundColor: isActive ? 'var(--color-surface)' : undefined,
                    borderLeft: isActive
                      ? '2px solid var(--color-primary)'
                      : '2px solid transparent',
                  }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span
                      className="text-sm font-semibold leading-tight line-clamp-1 flex-1 min-w-0"
                      style={{
                        color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {thread.title}
                    </span>
                    <span
                      className="text-[11px] flex-shrink-0 mt-0.5"
                      style={{ color: 'var(--color-text-faint)' }}
                    >
                      {relativeTime(thread.updatedAt)}
                    </span>
                  </div>

                  {/* Insight count badge — visible only when insights exist */}
                  {thread.insightCount > 0 && (
                    <div className="mt-1 flex items-center gap-1">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: 'var(--color-primary)15',
                          color: 'var(--color-primary)',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {thread.insightCount} insight{thread.insightCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer link to Idea Dashboard */}
      <div
        className="px-3 py-2.5 flex-shrink-0"
        style={{ borderTop: '1px solid var(--color-border-soft)' }}
      >
        <button
          onClick={() => router.push('/ideas')}
          className="w-full text-left text-xs transition-opacity opacity-60 hover:opacity-100"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
        >
          View all ideas →
        </button>
      </div>
    </aside>
  )
}
