import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { RosterGrid } from '@/components/marketing/RosterGrid'

/**
 * Root landing page — marketing surface.
 *
 * Per DESIGN.md's editorial persuasion arc:
 *   hero (the state the visitor is in) →
 *   pivot (you don't need more tactics, you need judgment) →
 *   example (what judgment sounds like) →
 *   roster (who's in the room) →
 *   CTA (ready to continue?)
 *
 * Auth-aware: the primary CTA reads "Sign in to the room" for anonymous
 * visitors, "Continue to your room →" for signed-in users. Signed-in
 * users can still read the landing — it's a marketing surface that's
 * intentionally accessible while authenticated (useful for sharing the
 * URL, reviewing copy, and generally not forcing a redirect the user
 * didn't ask for).
 *
 * Copy voice: editorial, not feature marketing. Advisor register, not
 * tool register. No mention of "AI," "generative," or "assistant" in
 * user-facing text. The room is the subject; the specialists are the
 * voice. Grounded, unhurried, specific. Every visual choice serves
 * DESIGN.md's "warm professionalism" — serif display for headings,
 * warm off-white surfaces, restrained accent color use.
 */

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isSignedIn = Boolean(user)

  const primaryHref = isSignedIn ? '/chat' : '/auth'
  const primaryLabel = isSignedIn ? 'Continue to your room →' : 'Sign in to the room'
  const closingHeading = isSignedIn
    ? 'Pick up where you left off.'
    : 'Bring something to the room.'

  return (
    <main className="min-h-screen bg-base text-text">
      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="px-6 pt-24 pb-20 sm:pt-32 sm:pb-28">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-[2.5rem] leading-[1.15] tracking-tight text-text sm:text-[3.25rem] sm:leading-[1.1]">
            It&rsquo;s Sunday night. You still don&rsquo;t know what to do Monday.
          </h1>
          <p className="mt-8 text-lg leading-relaxed text-text-muted sm:text-xl">
            You&rsquo;ve read the blog posts. You&rsquo;ve tried the tools. One person
            said be consistent on social. Another said paid ads are the only thing
            that works. Another said just focus on SEO. And here you are.
          </p>
          <div className="mt-10">
            <PrimaryLink href={primaryHref}>{primaryLabel}</PrimaryLink>
          </div>
        </div>
      </section>

      <Divider />

      {/* ── Pivot: judgment, not more tactics ───────────────── */}
      <section className="px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-[1.85rem] leading-tight text-text sm:text-[2.25rem]">
            What you need isn&rsquo;t more tactics. It&rsquo;s judgment about which
            ones to ignore.
          </h2>
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-text-muted">
            <p>
              Most advice optimizes for the person giving it. Agencies optimize for
              retainer hours. Tools optimize for engagement. Content optimizes for
              reach. Nobody optimizes for the specific call you have to make Monday
              with the specific budget, team, and customer you actually have.
            </p>
            <p>
              The room we&rsquo;ve built is different. Ten specialists who&rsquo;ve
              seen your shape of business before. They commit to what matters this
              week — and they name what to stop doing. When one of them has nothing
              useful to add, they step back.
            </p>
          </div>
        </div>
      </section>

      <Divider />

      {/* ── Example: what judgment sounds like ──────────────── */}
      <section className="bg-surface px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-[1.85rem] leading-tight text-text sm:text-[2.25rem]">
            What that sounds like.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-text-muted">
            A solo fitness studio owner in Queens, spending about eight hundred a
            month across four platforms. The panel didn&rsquo;t tell her to post
            more or &ldquo;optimize her social presence.&rdquo; It said:
          </p>
          <figure className="mt-8 border-l-2 border-primary pl-6">
            <blockquote className="font-display text-[1.35rem] leading-relaxed italic text-text sm:text-[1.55rem]">
              Your channels aren&rsquo;t talking to the same person. Consolidate to
              Google Local Services. Tight radius, two search phrases. Stop competing
              with Planet Fitness on Instagram — you can&rsquo;t outspend them there,
              and you&rsquo;re burning three hundred a month trying.
            </blockquote>
            <figcaption className="mt-5 text-sm uppercase tracking-wider text-text-faint">
              The room, to a Queens fitness-studio owner
            </figcaption>
          </figure>
          <p className="mt-8 text-lg leading-relaxed text-text-muted">
            Specific. Opinionated. Forwardable to a friend who&rsquo;d say:{' '}
            <em className="not-italic text-text">they heard you.</em>
          </p>
        </div>
      </section>

      <Divider />

      {/* ── Roster: who's in the room ───────────────────────── */}
      <section className="px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-[1.85rem] leading-tight text-text sm:text-[2.25rem]">
              Who&rsquo;s in the room.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-text-muted">
              Ten specialists, each with a distinct perspective on the kind of
              decision you&rsquo;re trying to make.
            </p>
          </div>
          <div className="mt-14">
            <RosterGrid />
          </div>
        </div>
      </section>

      <Divider />

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[2rem] leading-tight text-text sm:text-[2.5rem]">
            {closingHeading}
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-text-muted">
            {isSignedIn
              ? 'Your prior threads are waiting. Add a new question, or keep deliberating on something the panel left open.'
              : 'You don’t have to arrive with a finished idea. A rough question is enough. The panel will listen before they push back.'}
          </p>
          <div className="mt-10">
            <PrimaryLink href={primaryHref}>{primaryLabel}</PrimaryLink>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border-soft px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 text-sm text-text-faint sm:flex-row">
          <span className="font-display tracking-tight">GetIdea.ai</span>
          <span>A deliberation engine for small business owners.</span>
        </div>
      </footer>
    </main>
  )
}

/* ── Shared presentational bits ─────────────────────────── */

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-md bg-primary px-6 py-3 font-body text-base font-medium text-white transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base"
    >
      {children}
    </Link>
  )
}

function Divider() {
  return (
    <div aria-hidden="true" className="mx-auto h-px w-full max-w-4xl bg-border-soft" />
  )
}
