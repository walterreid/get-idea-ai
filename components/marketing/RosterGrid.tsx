/**
 * RosterGrid — marketing landing page.
 *
 * Restrained display of the 10 specialists with a footnote for Ideation
 * (the host voice, not a peer specialist — per CLAUDE.md Phase 7.7).
 *
 * Each card: agent-color dot + display name + advisor-voice one-liner.
 * The one-liners here are INTENTIONALLY different from the ones in
 * [app/chat/page.tsx](../../app/chat/page.tsx):
 *   - /chat one-liners are functional ("Channels, positioning, and growth")
 *     because the chat UI is a working interface and the user needs to
 *     know what each advisor does.
 *   - Landing one-liners are advisor-voice ("How will people actually find
 *     you?") because the landing is editorial — it's how the advisors
 *     would describe themselves if you met them in the room.
 *
 * DESIGN.md Agent Card Anatomy lifts straight in: color dot, name, short
 * one-liner. No photos. No icons that signal "AI." The monogram is the
 * avatar; here, the name itself is enough.
 */

type Specialist = {
  key: string
  displayName: string
  colorVar: string // CSS var from globals.css
  oneLiner: string
}

const SPECIALISTS: Specialist[] = [
  {
    key: 'marketer',
    displayName: 'Marketer',
    colorVar: 'var(--agent-marketer)',
    oneLiner: 'How will people actually find you?',
  },
  {
    key: 'finance',
    displayName: 'Finance',
    colorVar: 'var(--agent-finance)',
    oneLiner: 'Does the math hold up when month one is slower than the spreadsheet?',
  },
  {
    key: 'creative',
    displayName: 'Creative',
    colorVar: 'var(--agent-creative)',
    oneLiner: "What's this actually about — before the question of how it makes money?",
  },
  {
    key: 'copywriter',
    displayName: 'Copywriter',
    colorVar: 'var(--agent-copywriter)',
    oneLiner: 'The words on the page. The line that goes on the sign.',
  },
  {
    key: 'designer',
    displayName: 'Designer',
    colorVar: 'var(--agent-designer)',
    oneLiner: 'The first argument your business makes is visual, before anyone reads a word.',
  },
  {
    key: 'accountant',
    displayName: 'Accountant',
    colorVar: 'var(--agent-accountant)',
    oneLiner: 'Where the money goes, how it\u2019s recorded, what the IRS cares about.',
  },
  {
    key: 'operations',
    displayName: 'Operations',
    colorVar: 'var(--agent-operations)',
    oneLiner: 'But who actually does this? When does it happen? What breaks when it does?',
  },
  {
    key: 'legal',
    displayName: 'Legal Awareness',
    colorVar: 'var(--agent-legal)',
    oneLiner: 'What you don\u2019t know you don\u2019t know \u2014 before it becomes expensive.',
  },
  {
    key: 'cx',
    displayName: 'Customer Experience',
    colorVar: 'var(--agent-cx)',
    oneLiner: 'What does the customer feel, and does the experience match what you promised?',
  },
  {
    key: 'realist',
    displayName: 'Business Realist',
    colorVar: 'var(--agent-realist)',
    oneLiner: 'The specific flaw everyone else is too polite to name.',
  },
]

export function RosterGrid() {
  return (
    <div className="mx-auto max-w-5xl">
      <ul className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
        {SPECIALISTS.map((s) => (
          <li
            key={s.key}
            className="flex items-start gap-4 border-l-2 pl-4 py-1"
            style={{ borderColor: s.colorVar }}
          >
            <span
              aria-hidden="true"
              className="mt-[0.45rem] block h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: s.colorVar }}
            />
            <div className="min-w-0">
              <div className="font-display text-lg text-text">
                {s.displayName}
              </div>
              <div className="mt-0.5 text-[0.95rem] leading-snug text-text-muted">
                {s.oneLiner}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p
        className="mt-10 border-t border-border-soft pt-6 text-center text-sm italic text-text-muted"
        style={{
          // Subtle Ideation-color tint on the separator via the underline color
          borderTopColor: 'var(--color-border-soft)',
        }}
      >
        And one host —{' '}
        <span
          className="font-medium not-italic"
          style={{ color: 'var(--agent-ideation)' }}
        >
          Ideation
        </span>{' '}
        — for the first minute, when you don’t quite know what you came in with.
      </p>
    </div>
  )
}
