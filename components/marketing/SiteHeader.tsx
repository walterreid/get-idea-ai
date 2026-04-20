import Link from 'next/link'

/**
 * SiteHeader — the landing's masthead.
 *
 * Minimal by design: logo only, no nav, no CTA. The landing is an
 * editorial piece and the masthead functions as a publication
 * nameplate — it names the place, not the product's features.
 * In-page CTAs ("Pull up a chair" in the offer stamp + inline
 * AuthForm in the invitation) carry the sign-in flow; adding a
 * redundant nav CTA would clutter the register.
 *
 * Fixed at the top while scrolling so the nameplate stays visible
 * on a long page. Thin bottom rule separates it from the content
 * without competing with it.
 *
 * Logo treatment follows DESIGN.md: Newsreader serif for the mark
 * (editorial voice, not system voice). Terracotta dot as
 * punctuation between "GetIdea" and "ai" — the same mark used in
 * the landing footer, codifies the logo identity. The dot is
 * styled as a real typographic period, sized to match the lowercase
 * x-height, not an oversized design-system ball.
 */

export function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-50 px-6 sm:px-10 py-5 backdrop-blur-[2px]"
      style={{
        background: 'rgba(253, 252, 249, 0.92)',
        borderBottom: '1px solid var(--rule)',
      }}
    >
      <div className="mx-auto max-w-[1200px] flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-[18px] sm:text-[20px] font-normal tracking-[0.01em] leading-none"
          style={{ color: 'var(--ink)' }}
          aria-label="GetIdea.ai — home"
        >
          GetIdea<span style={{ color: 'var(--terracotta)' }}>.</span>ai
        </Link>
        {/*
          Right side intentionally empty for Phase 9.1. The landing's in-page
          CTAs handle sign-in, so a nav-level CTA is redundant. If a future
          cycle needs a quick "Sign in" shortcut for returning readers who
          don't want to scroll, it lives here. For now the masthead is a
          nameplate, not a toolbar.
        */}
      </div>
    </header>
  )
}
