'use client'

import { useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ThreadSidebar } from '@/components/chat/ThreadSidebar'
import { AgentRoster } from '@/components/chat/AgentRoster'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { Composer } from '@/components/chat/Composer'
import { useDeliberation } from '@/lib/hooks/useDeliberation'
import type { RosterAgent, SidebarThread } from '@/lib/types/stream'

interface ChatInterfaceProps {
  threadId: string | null
  agents: RosterAgent[]
  threads: SidebarThread[]
}

const PHASE_LABELS: Record<string, string> = {
  exploration: 'Exploration',
  critique: 'Critique',
  synthesis: 'Synthesis',
  recommendation: 'Recommendation',
}

export function ChatInterface({ threadId, agents, threads }: ChatInterfaceProps) {
  const feedEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  // Track which thread we've already triggered a refresh for so we don't loop.
  const refreshedForThreadRef = useRef<string | null>(null)

  const {
    messages,
    agentStatuses,
    deliberationPhase,
    isGenerating,
    currentThreadId,
    send,
  } = useDeliberation({ initialThreadId: threadId, agents })

  // After a new-conversation round completes, refresh the server component so the
  // sidebar picks up the new thread from the DB.
  // We wait for isGenerating to flip false (stream done) rather than firing as soon
  // as currentThreadId is set — firing mid-stream caused router.refresh() to navigate
  // to /chat?thread=XXX, which triggered the useDeliberation useEffect, which wiped
  // all in-progress messages with setMessages([]).
  const prevIsGeneratingRef = useRef(false)
  useEffect(() => {
    const justFinished = prevIsGeneratingRef.current && !isGenerating
    prevIsGeneratingRef.current = isGenerating

    if (
      justFinished &&
      currentThreadId &&
      !threadId && // only for new conversations (no thread in URL at load time)
      refreshedForThreadRef.current !== currentThreadId
    ) {
      refreshedForThreadRef.current = currentThreadId
      router.refresh()
    }
  }, [isGenerating, currentThreadId, threadId, router])

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Title from the first user message in this session, or default
  const sessionTitle = messages.find((m) => m.role === 'user')?.content ?? null
  const displayTitle = sessionTitle
    ? sessionTitle.length > 55
      ? sessionTitle.slice(0, 55).trimEnd() + '…'
      : sessionTitle
    : 'New conversation'

  return (
    <>
      {/* Left — Thread history */}
      <div className="hidden md:flex flex-col w-60 flex-shrink-0 h-full">
        <ThreadSidebar
          threads={threads}
          activeThreadId={currentThreadId ?? undefined}
        />
      </div>

      {/* Center — Conversation */}
      <main className="flex flex-col flex-1 min-w-0 h-full">
        <header
          className="flex items-center justify-between px-6 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-soft)' }}
        >
          <div>
            <h1
              className="text-base font-semibold leading-tight"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}
            >
              {displayTitle}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {PHASE_LABELS[deliberationPhase] ?? 'Exploration'} phase
            </p>
          </div>
        </header>

        {/* Message feed */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto flex flex-col gap-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <p
                  className="text-2xl font-semibold"
                  style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}
                >
                  What are you working on?
                </p>
                <p
                  className="text-sm max-w-sm text-center leading-relaxed"
                  style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
                >
                  Describe your idea, question, or challenge. Your advisory panel will
                  examine it from every angle.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} agents={agents} />
            ))}

            <div ref={feedEndRef} />
          </div>
        </div>

        {/* Composer — always accessible, even mid-generation */}
        <div className="max-w-2xl w-full mx-auto px-2">
          <Composer onSend={send} isGenerating={isGenerating} />
        </div>
      </main>

      {/* Right — Agent roster with live statuses */}
      <div className="hidden lg:flex flex-col w-60 flex-shrink-0 h-full">
        <AgentRoster agents={agents} agentStatuses={agentStatuses} />
      </div>
    </>
  )
}
