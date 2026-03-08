'use client'

import { type AgentStatus } from '@/lib/placeholder'
import { clsx } from 'clsx'

interface StatusDotProps {
  status: AgentStatus
  color: string
  size?: 'sm' | 'md'
}

export function StatusDot({ status, color, size = 'md' }: StatusDotProps) {
  const sizeClass = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'

  return (
    <span
      className={clsx('rounded-full inline-block flex-shrink-0 transition-all duration-300', sizeClass, {
        'opacity-30': status === 'silent',
        'opacity-60': status === 'idle',
        'opacity-100 animate-status-pulse': status === 'thinking',
        'opacity-100': status === 'speaking',
      })}
      style={{
        backgroundColor: color,
        boxShadow: status === 'speaking' ? `0 0 0 2px ${color}30` : undefined,
        transform: status === 'speaking' ? 'scale(1.15)' : undefined,
      }}
      aria-hidden="true"
    />
  )
}
