import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://masterlyapp.in'),
  title: 'Masterly - Your AI Study Coach for Smarter Learning',
  description: 'Transform your study materials into AI-powered flashcards, quizzes, and summaries. Master any exam with spaced repetition, adaptive learning, and intelligent study analytics.',
  keywords: 'AI study coach, smart flashcards, spaced repetition, exam prep, upload study materials, adaptive quizzes, Feynman technique, study analytics',
  authors: [{ name: 'Masterly' }],
  openGraph: {
    title: 'Masterly - Your AI Study Coach',
    description: 'Transform your study materials into AI-powered flashcards, quizzes, and summaries. Master any exam with spaced repetition and adaptive learning.',
    type: 'website',
    url: 'https://masterlyapp.in',
    images: [
      {
        url: '/hero-study-ai.jpg',
        width: 1200,
        height: 630,
        alt: 'Masterly AI Study Coach',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Masterly - Your AI Study Coach',
    description: 'Transform your study materials into AI-powered flashcards, quizzes, and summaries.',
    images: ['/hero-study-ai.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}