import type { Metadata } from 'next'
import { Newsreader, DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

/**
 * Typography — Phase 9.1 (2026-04-20).
 *
 * Newsreader + DM Sans replaces Lora + Plus Jakarta Sans. Rationale in
 * DESIGN.md: Newsreader is a variable-optical-size serif designed for
 * reading (not display), with italic that carries weight — matters
 * because the landing's italic-has-meaning rule runs through the
 * recognition poem, the terracotta emphasis word, and advisor quotes.
 * DM Sans replaces Plus Jakarta Sans as the UI infrastructure voice.
 *
 * JetBrains Mono is held (unused on landing, preserved for chat).
 *
 * Weights are kept restrained — only what's used. Headlines are 400
 * (regular weight is the editorial move — authority from size + space,
 * not weight). DM Sans gets 400 + 500 for body + CTA/labels.
 * Newsreader italic is explicitly requested because the landing uses
 * it for emphasis.
 */

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  display: 'swap',
  style: ['normal', 'italic'],
  weight: ['300', '400', '500'],
})

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
})

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
})

/**
 * Social-share + SEO metadata.
 *
 * `metadataBase` anchors relative image URLs so OG/Twitter previews
 * resolve correctly regardless of where the page renders. The
 * /og-image.svg file lives in /public and ships as the preview
 * image across Open Graph + Twitter cards.
 *
 * Caveat on SVG preview images: Slack, Discord, and iMessage
 * render SVG OG images reliably. Facebook, Twitter, and LinkedIn
 * often don't — they expect raster PNG/JPG. If richer Twitter/FB
 * previews become a priority, the upgrade path is either a manual
 * PNG export (keep in /public) or dynamic generation via
 * @vercel/og. For now the SVG covers enough share surfaces to be
 * worth shipping, and it doesn't fight the editorial register.
 *
 * Three description registers, each tuned for its surface:
 *   - description (Google, default meta): educational, full sentence
 *   - openGraph.description (FB/LinkedIn/Slack unfurls): the hook
 *   - twitter.description (Twitter cards): tightest, most declarative
 */
export const metadata: Metadata = {
  metadataBase: new URL('https://getidea.ai'),
  title: 'GetIdea.ai — Bring it to the table',
  description:
    'A table where small business owners sit with specialist advisors. Not a chatbot. Not a template. Judgment about what to prioritize this week — and what to stop doing.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'GetIdea.ai',
    url: 'https://getidea.ai',
    title: 'GetIdea.ai — Bring it to the table',
    description:
      'Ten specialists who have seen your shape of business before. They commit to what matters this week — and name what to stop doing. Free. No retainer.',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'GetIdea.ai — Bring it to the table. Ten advisors at the table.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GetIdea.ai — Bring it to the table',
    description:
      'What to do this week. What to stop doing. A panel of ten specialists who commit to judgment.',
    images: ['/og-image.svg'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${dmSans.variable} ${jetbrains.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
