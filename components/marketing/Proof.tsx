/**
 * Proof — Beat 3. "The table listens."
 *
 * The advisor excerpt card. The most important visual component on
 * the landing because it shows what the product actually produces.
 *
 * Card anatomy per DESIGN.md:
 *   - Excerpt BG (#F1EDE6 — slightly darker than cream)
 *   - 3px terracotta left stripe (the only decorative color use —
 *     marks "this is from one of the advisors")
 *   - Label: DM Sans overline — FROM THE TABLE
 *   - Business context line, divider, then body paragraphs
 *   - Highlight span at 9% terracotta on the key insight
 *
 * Copy is the Iron & Flow example adapted slightly from Zansei to
 * read as coming from "the table" (plural voice of the panel), not
 * from a single founder-backed strategy plan. Business-name label
 * and structure match Zansei's proof card so we inherit the
 * editorial-document feel.
 */

export function Proof() {
  return (
    <section
      className="px-10 py-24 sm:py-28"
      style={{
        background: 'var(--warm-white)',
        borderTop: '1px solid var(--rule)',
        borderBottom: '1px solid var(--rule)',
      }}
    >
      <div className="col-proof">
        <p
          className="font-body uppercase text-[11px] font-medium mb-9"
          style={{ letterSpacing: '2px', color: 'var(--ink-faint)' }}
        >
          What this looks like in practice
        </p>

        <p
          className="font-display text-[clamp(15px,1.8vw,17px)] font-light leading-[1.85] mb-11 max-w-[560px]"
          style={{ color: 'var(--ink-muted)' }}
        >
          A solo fitness studio owner in Queens. Spending $800/month across
          four platforms. She couldn&rsquo;t tell what was working.
          Here&rsquo;s the section of her turn at the table that changed how
          she thought about her business.
        </p>

        {/* Advisor excerpt card */}
        <div
          className="relative p-11 sm:p-12"
          style={{
            background: 'var(--excerpt-bg)',
            border: '1px solid var(--excerpt-border)',
            borderLeft: '3px solid var(--terracotta)',
          }}
        >
          <p
            className="font-body uppercase text-[11px] font-semibold mb-2"
            style={{ letterSpacing: '2.5px', color: 'var(--terracotta)' }}
          >
            From the table
          </p>
          <p
            className="font-body text-[13px] mb-6 pb-4"
            style={{
              color: 'var(--ink-muted)',
              borderBottom: '1px solid var(--excerpt-border)',
            }}
          >
            Iron &amp; Flow Fitness &mdash; Queens, NY · Solo owner · $800/mo
            budget
          </p>

          <p
            className="font-display text-[15px] leading-[1.9] mb-4"
            style={{ color: 'var(--ink-soft)' }}
          >
            Your current spend is split across Instagram ads, Google Local
            Services, a Yelp premium listing, and Facebook boosts. The
            problem isn&rsquo;t the total budget — $800/month is workable for
            a single-location studio.{' '}
            <span
              className="px-1 py-[2px] rounded-sm"
              style={{
                background: 'var(--highlight)',
                color: 'var(--ink)',
              }}
            >
              The problem is that none of these channels are talking to the
              same person.
            </span>
          </p>

          <p
            className="font-display text-[15px] leading-[1.9] mb-4"
            style={{ color: 'var(--ink-soft)' }}
          >
            Your Instagram targets women 22&ndash;35 interested in wellness.
            Your Google ads target &ldquo;gym near me.&rdquo; Your Yelp
            listing competes with 47 other fitness businesses in your zip
            code. Each channel is optimized for a different customer who
            wants a different thing.
          </p>

          <p
            className="font-display text-[15px] leading-[1.9]"
            style={{ color: 'var(--ink-soft)' }}
          >
            <strong className="font-medium" style={{ color: 'var(--ink)' }}>
              Consolidate to one channel for ninety days.
            </strong>{' '}
            Move your full budget to Google Local Services, targeting the
            3-mile radius around your studio with two phrases: &ldquo;personal
            training Queens&rdquo; and &ldquo;small group fitness
            Astoria.&rdquo; Your studio&rsquo;s advantage is personal
            attention — and the people searching those phrases are the ones
            willing to pay for it. Stop competing with Planet Fitness on
            Instagram. Start showing up when someone is already looking for
            exactly what you offer.
          </p>
        </div>

        <p
          className="font-display italic text-[clamp(14px,1.6vw,16px)] leading-[1.8] mt-8 text-center max-w-[640px] mx-auto"
          style={{ color: 'var(--ink-muted)' }}
        >
          That&rsquo;s a judgment call. The kind that comes from having seen
          this shape of business before, and knowing which advice to throw
          away.
        </p>
      </div>
    </section>
  )
}
