import { createClient } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/marketing/SiteHeader'
import { Recognition } from '@/components/marketing/Recognition'
import { OfferStamp } from '@/components/marketing/OfferStamp'
import { Reframing } from '@/components/marketing/Reframing'
import { Proof } from '@/components/marketing/Proof'
import { RosterGrid } from '@/components/marketing/RosterGrid'
import { Invitation } from '@/components/marketing/Invitation'

/**
 * Root landing — marketing surface. Phase 9.1 rewrite.
 *
 * Editorial five-beat structure, with The Table as the organizing
 * subject throughout. Each beat is a move around the table:
 *
 *   1. You arrive.          → Recognition (col-poem + col-question + col-poem-end)
 *   2. What you need.       → OfferStamp (dark band) + Reframing (cream pivot)
 *   3. The table listens.   → Proof (advisor excerpt card)
 *   4. Who sits at the table → RosterGrid (10 specialists + Ideation host)
 *   5. Pull up a chair.     → Invitation (dark band + inline AuthForm)
 *
 * Auth-aware without redirecting: signed-in visitors still see the
 * landing, with CTAs swapping to "Continue to your room →" / "Pick
 * up where you left off." The landing is a marketing surface worth
 * visiting while signed in (sharing the URL, reviewing copy,
 * dogfooding). Forcing a redirect would take that surface away for
 * no real user benefit.
 *
 * Copy discipline per CLAUDE.md + DESIGN.md:
 *   - The Table as the canonical term (not "the room," not "the panel")
 *   - Advisor voice, never tool voice
 *   - No "AI," "assistant," "generator" anywhere user-facing
 *   - Italic has specific meaning — reserved for: poem, emphasis word
 *     in headlines, advisor quote, reframing pivot
 *   - One action color (terracotta) across all CTAs
 */

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isSignedIn = Boolean(user)

  return (
    <>
      <SiteHeader />
      <main
        className="min-h-screen"
        style={{ background: 'var(--warm-white)', color: 'var(--ink)' }}
      >
        {/* Beat 1: You arrive. */}
        <Recognition />

      {/* Beat 2: What you need. (two-part: dark offer stamp + light reframe) */}
      <OfferStamp isSignedIn={isSignedIn} />
      <Reframing />

      {/* Beat 3: The table listens. */}
      <Proof />

      {/* Beat 4: Who sits at the table. */}
      <section
        className="px-10 py-24 sm:py-28"
        style={{
          background: 'var(--cream)',
          borderTop: '1px solid var(--rule)',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <div className="mx-auto max-w-[820px]">
          <div className="mx-auto max-w-[640px] text-center mb-14">
            <p
              className="font-body uppercase text-[11px] font-medium mb-5"
              style={{ letterSpacing: '2px', color: 'var(--ink-faint)' }}
            >
              Who sits at the table
            </p>
            <h2
              className="font-display text-[clamp(28px,4vw,40px)] font-normal leading-[1.25] tracking-[-0.01em]"
              style={{ color: 'var(--ink)' }}
            >
              Ten specialists, each with a distinct perspective on the kind of
              decision you&rsquo;re trying to make.
            </h2>
          </div>
          <RosterGrid />
        </div>
      </section>

      {/* Beat 5: Pull up a chair. */}
      <Invitation isSignedIn={isSignedIn} />

      {/* Footer */}
      <footer
        className="px-10 py-10"
        style={{
          background: 'var(--warm-white)',
          borderTop: '1px solid var(--rule)',
        }}
      >
        <div className="mx-auto max-w-[820px] flex flex-col sm:flex-row items-center justify-between gap-3">
          <span
            className="font-display text-[15px] tracking-[0.02em]"
            style={{ color: 'var(--ink-muted)' }}
          >
            GetIdea
            <span style={{ color: 'var(--terracotta)' }}>.</span>
            ai
          </span>
          <span
            className="font-body text-[13px]"
            style={{ color: 'var(--ink-faint)' }}
          >
            A table for small business owners.
          </span>
        </div>
      </footer>
      </main>
    </>
  )
}
