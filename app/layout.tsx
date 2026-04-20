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

export const metadata: Metadata = {
  title: 'GetIdea.ai — Bring it to the table',
  description:
    'A table where small business owners sit with specialist advisors and work through their ideas. Not a chatbot. Not a template. Judgment about what to prioritize this week — and what to stop doing.',
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
