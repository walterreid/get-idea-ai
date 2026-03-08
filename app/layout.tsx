import type { Metadata } from 'next'
import { Lora, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const lora = Lora({
  variable: '--font-lora',
  subsets: ['latin'],
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'GetIdea.ai — Deliberate on your business ideas',
  description:
    'A room where small business owners sit with specialist advisors and work through their ideas.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${lora.variable} ${jakarta.variable} ${jetbrains.variable}`}
      >
        {children}
      </body>
    </html>
  )
}
