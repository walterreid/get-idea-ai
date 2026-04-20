/**
 * Recognition — Beat 1 of 5. "You arrive."
 *
 * Three-column rhetorical split adapted from Zansei's pattern:
 *   col-poem (left, whisper)   — the scattered advice you've heard
 *   col-question (centered)    — the reframing question
 *   col-poem-end (right)       — the continuation of the poem
 *
 * The CONTRAST between narrow-left, wider-center, narrow-right is
 * the argument — a scanner reads the shape before the words. Noise
 * funneling into one clear thing funneling out again.
 *
 * Typography per DESIGN.md:
 *   - Poem lines: Newsreader italic 300, faint color
 *   - Question: Newsreader 400 (regular, not bold — authority from
 *     size + space, not weight), with terracotta italic on the
 *     emphasis phrase
 *
 * The day-of-week injection is hydration-safe: SSR renders "Sunday"
 * (the stanza's emotional anchor — the Sunday-night laptop framing).
 * Post-hydration, useEffect can swap to the actual day on client.
 * For the first render we keep "Sunday" — the copy is written
 * around that specific day's weight. The swap pattern is available
 * if we want it later.
 */

export function Recognition() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center py-28 sm:py-32">
      <div className="col-poem mb-10">
        <p
          className="font-display italic text-[clamp(15px,1.7vw,17px)] font-light leading-[2.1] tracking-[0.01em] text-text-faint"
        >
          You&rsquo;ve read the blog posts. You&rsquo;ve tried the tools.
          <br />
          You&rsquo;ve boosted a post and watched the money disappear.
          <br />
          Someone told you to &ldquo;be consistent on social media&rdquo;
        </p>
      </div>

      <div className="col-question">
        <h1 className="font-display text-[clamp(32px,5vw,52px)] font-normal leading-[1.25] tracking-[-0.01em] text-text">
          What if the problem isn&rsquo;t
          <br />
          that you lack a strategy?
          <br />
          What if you have{' '}
          <em
            className="italic"
            style={{ color: 'var(--terracotta)', fontStyle: 'italic' }}
          >
            too many?
          </em>
        </h1>
      </div>

      <div className="col-poem-end mt-10">
        <p
          className="font-display italic text-[clamp(15px,1.7vw,17px)] font-light leading-[2.1] tracking-[0.01em] text-text-faint"
        >
          &hellip;and someone else said paid ads are the only thing that works
          <br />
          and someone else said to just focus on SEO
          <br />
          and now it&rsquo;s Sunday and you still don&rsquo;t know
          <br />
          what to do next.
        </p>
      </div>
    </section>
  )
}
