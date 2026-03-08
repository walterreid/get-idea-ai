import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GetIdea.ai — Deliberation room',
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--color-base)' }}
    >
      {children}
    </div>
  )
}
