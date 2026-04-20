/**
 * Reframing — Beat 2 (part 2). "What you need" — the pivot.
 *
 * Light cream band immediately after the OfferStamp dark band. The
 * two-step structure (dark offer → light reframe) creates the
 * editorial cadence: stamp commits you to the offer, reframe earns
 * it with argument.
 *
 * Anatomy:
 *   - Setup paragraph (prose register, Ink soft, Newsreader 300 —
 *     slightly muted, leads into the pivot)
 *   - 40px horizontal separator (not a divider — a pause)
 *   - Pivot paragraph (larger, Newsreader 400, Ink — the statement
 *     lands here). The italic block-quoted emphasis has a terracotta
 *     left border; it's the advisor voice inside the owner's frame.
 */

export function Reframing() {
  return (
    <section
      className="px-10 py-24 sm:py-28"
      style={{
        background: 'var(--cream)',
        borderTop: '1px solid var(--rule)',
        borderBottom: '1px solid var(--rule)',
      }}
    >
      <div className="col-prose">
        <p
          className="font-display text-[clamp(16px,1.9vw,18px)] font-light leading-[1.85]"
          style={{ color: 'var(--ink-soft)' }}
        >
          Every marketing tool on the internet wants to give you a plan.
          A sixteen-page document full of channels and timelines and budget
          allocations. They assume the thing you&rsquo;re missing is{' '}
          <strong className="not-italic" style={{ color: 'var(--ink)', fontWeight: 500 }}>
            information.
          </strong>
        </p>

        <span
          className="block"
          style={{
            width: '40px',
            height: '1px',
            background: 'var(--ink-faint)',
            margin: '48px 0',
          }}
          aria-hidden="true"
        />

        <p
          className="font-display text-[clamp(19px,2.6vw,24px)] font-normal leading-[1.75] tracking-[-0.01em]"
          style={{ color: 'var(--ink)' }}
        >
          But you&rsquo;re not missing information. You&rsquo;re drowning in
          it. What you actually need is a room that&rsquo;s seen your shape of
          business before and will say, with specificity you can act on:
          <strong
            className="block mt-5 italic font-normal"
            style={{
              fontSize: '0.95em',
              paddingLeft: '20px',
              borderLeft: '2px solid var(--terracotta)',
              color: 'var(--ink)',
              lineHeight: 1.7,
              fontStyle: 'italic',
              fontWeight: 400,
            }}
          >
            &ldquo;Ignore everything else. Here&rsquo;s the one thing that
            matters for your business right now.&rdquo;
          </strong>
        </p>
      </div>
    </section>
  )
}
