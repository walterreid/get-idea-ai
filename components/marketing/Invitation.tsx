import Link from 'next/link'
import { AuthForm } from '@/app/auth/AuthForm'

/**
 * Invitation — Beat 5. "Pull up a chair."
 *
 * The closing dark band. Bookends the argument opened by OfferStamp.
 * Used exactly twice on the landing; never three times.
 *
 * id="join" is the anchor target for the hero CTA when the visitor is
 * anonymous — clicking "Pull up a chair" in OfferStamp smooth-scrolls
 * here. scroll-mt-24 prevents the navigation bar (if any) from
 * covering the section when the browser lands on it.
 *
 * Auth-aware branching:
 *   - Anon: inline AuthForm (magic-link flow, autoFocus={false} to
 *     prevent scroll-jump + mobile keyboard pop on page load since
 *     the form sits below the fold)
 *   - Signed-in: "Continue to your room →" button linking to /chat,
 *     with "pick up where you left off" supporting copy
 *
 * The AuthForm's card already uses the design tokens, but it was
 * styled against the LIGHT surface palette (cream + ink). Embedded
 * on this dark band, the form will read against the dark. That's
 * fine — AuthForm's card has its own cream background, so it sits
 * as a light rectangle on the dark field. Deliberate — the form IS
 * the "light" you're stepping into.
 */

interface InvitationProps {
  isSignedIn: boolean
}

export function Invitation({ isSignedIn }: InvitationProps) {
  const closingHeading = isSignedIn
    ? 'Pick up where you left off.'
    : 'Pull up a chair.'

  return (
    <section
      id="join"
      className="scroll-mt-24 px-10 py-28 sm:py-32"
      style={{
        background: 'var(--stamp-bg)',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div className="mx-auto max-w-[620px] text-center">
        <h2
          className="font-display text-[clamp(28px,4vw,42px)] font-normal leading-[1.3] tracking-[-0.01em] mb-7"
          style={{ color: 'var(--stamp-ink)' }}
        >
          {closingHeading}
        </h2>
        <p
          className="font-body text-[17px] font-light leading-[1.85] mb-13 max-w-[480px] mx-auto"
          style={{ color: 'rgba(248, 246, 241, 0.48)' }}
        >
          {isSignedIn
            ? 'Your prior threads are waiting. Add a new question, or keep deliberating on something the table left open.'
            : 'Your seat\u2019s still warm. The table doesn\u2019t require you to know what you\u2019re bringing in — a rough question is enough. The advisors will listen before they push back.'}
        </p>

        {isSignedIn ? (
          <>
            <Link
              href="/chat"
              className="inline-flex items-center font-body text-[15px] font-medium rounded-[5px] px-14 py-[18px] transition-all duration-200"
              style={{
                backgroundColor: 'var(--terracotta)',
                color: 'var(--stamp-ink)',
                letterSpacing: '0.01em',
              }}
            >
              Continue to your room →
            </Link>
            <p
              className="font-body text-[13px] leading-[1.7] mt-8"
              style={{ color: 'rgba(248, 246, 241, 0.28)' }}
            >
              The table remembers what you brought in last time.
            </p>
          </>
        ) : (
          <>
            <div className="max-w-md mx-auto text-left">
              <AuthForm autoFocus={false} />
            </div>
            <p
              className="font-body text-[13px] leading-[1.7] mt-8"
              style={{ color: 'rgba(248, 246, 241, 0.28)' }}
            >
              Free. No account. No retainer.
              <br />
              We&rsquo;ll email a sign-in link. No password.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
