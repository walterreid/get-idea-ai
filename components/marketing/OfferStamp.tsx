import Link from 'next/link'

/**
 * OfferStamp — Beat 2 (part 1). "What you need."
 *
 * The first of two dark bands on the landing. Dark band comes FIRST
 * in the argument (sharp register shift after the whisper-register
 * recognition beat). Bookends the argument with the closing
 * Invitation beat.
 *
 * Section anatomy (Zansei pattern):
 *   - DM Sans overline (tracked, uppercase, terracotta)
 *   - Newsreader 400 headline (regular weight, "Not a template."
 *     in terracotta italic on the last line)
 *   - DM Sans body copy in muted cream
 *   - Terracotta CTA + fine print
 *
 * The CTA href is auth-aware:
 *   - signed-in → /chat (direct to the room)
 *   - anon → #join (anchor-scroll to the inline form at the bottom)
 *
 * Copy is deliberately GetIdea.ai, not Zansei: ten specialists,
 * not "thirty years of experience." The Table is the subject, not
 * a founder's résumé.
 */

interface OfferStampProps {
  isSignedIn: boolean
}

export function OfferStamp({ isSignedIn }: OfferStampProps) {
  const ctaHref = isSignedIn ? '/chat' : '#join'
  const ctaLabel = isSignedIn ? 'Continue to your room →' : 'Pull up a chair'

  return (
    <section
      className="px-10 py-20 sm:py-24"
      style={{ background: 'var(--stamp-bg)' }}
    >
      <div className="mx-auto max-w-[680px]">
        <p
          className="font-body uppercase text-[11px] font-medium mb-5"
          style={{
            letterSpacing: '2px',
            color: 'var(--terracotta)',
          }}
        >
          The Table · Free · No retainer
        </p>
        <h2
          className="font-display text-[clamp(28px,4vw,44px)] font-normal leading-[1.2] tracking-[-0.01em] mb-6"
          style={{ color: 'var(--stamp-ink)' }}
        >
          A room of advisors for your business.
          <br />
          <span
            className="italic"
            style={{ color: 'var(--terracotta)', fontStyle: 'italic' }}
          >
            Not a chatbot.
          </span>
        </h2>
        <p
          className="font-body text-[15px] leading-[1.7] mb-10 max-w-[520px]"
          style={{ color: 'rgba(248, 246, 241, 0.48)' }}
        >
          Ten specialists who&rsquo;ve seen your shape of business before. They
          commit to{' '}
          <strong style={{ color: 'rgba(248, 246, 241, 0.8)', fontWeight: 500 }}>
            what matters this week
          </strong>{' '}
          — and name what to stop doing. A table where your chair&rsquo;s
          already pulled out.
        </p>

        <div className="flex flex-wrap items-center gap-6">
          <Link
            href={ctaHref}
            className="inline-flex items-center font-body text-[15px] font-medium rounded-[5px] px-10 py-4 transition-all duration-200"
            style={{
              backgroundColor: 'var(--terracotta)',
              color: 'var(--stamp-ink)',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={undefined}
          >
            {ctaLabel}
          </Link>
          <p
            className="font-body text-[12px] leading-[1.5]"
            style={{ color: 'rgba(248, 246, 241, 0.35)' }}
          >
            Free. No account. Magic-link sign-in.
          </p>
        </div>
      </div>
    </section>
  )
}
