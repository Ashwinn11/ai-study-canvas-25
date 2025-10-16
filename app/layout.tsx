import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Masterly - Your AI Study Coach for Smarter Learning',
  description: 'Transform your study materials into AI-powered flashcards, quizzes, and summaries. Master any exam with spaced repetition, adaptive learning, and intelligent study analytics.',
  keywords: 'AI study coach, smart flashcards, spaced repetition, exam prep, upload study materials, adaptive quizzes, Feynman technique, study analytics',
  authors: [{ name: 'Masterly' }],
  openGraph: {
    title: 'Masterly - Your AI Study Coach',
    description: 'Transform your study materials into AI-powered flashcards, quizzes, and summaries. Master any exam with spaced repetition and adaptive learning.',
    type: 'website',
    images: ['https://lovable.dev/opengraph-image-p98pqg.png'],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@masterlyapp',
    images: ['https://lovable.dev/opengraph-image-p98pqg.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon.png" />
        <link rel="shortcut icon" href="/favicon.png" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}