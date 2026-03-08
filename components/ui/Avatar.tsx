interface AvatarProps {
  displayName: string
  color: string
  size?: 'sm' | 'md'
}

export function Avatar({ displayName, color, size = 'md' }: AvatarProps) {
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const sizeClass = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'

  return (
    <span
      className={`${sizeClass} rounded-md inline-flex items-center justify-center font-semibold flex-shrink-0 select-none`}
      style={{
        backgroundColor: `${color}20`,
        color,
        fontFamily: 'var(--font-body)',
        letterSpacing: '0.04em',
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}
