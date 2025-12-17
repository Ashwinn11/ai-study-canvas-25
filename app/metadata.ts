import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://masterlyapp.in'),
  title: 'Masterly AI: Flashcards & Quiz - AI Study App for Exam Prep',
  description: 'Masterly AI is the #1 AI-powered study app. Create flashcards, quizzes & summaries from PDFs, notes, and lectures. Beat exams with spaced repetition. Free AI study coach for students.',
  keywords: [
    // Brand keywords
    'Masterly AI',
    'Masterly app',
    'Masterly study app',
    'masterlyapp',
    // Core features
    'AI flashcard maker',
    'AI flashcards',
    'AI quiz generator',
    'AI study app',
    'AI study coach',
    // Use cases
    'exam preparation app',
    'study app for students',
    'PDF to flashcards',
    'notes to quiz',
    'lecture to flashcards',
    // Learning techniques
    'spaced repetition app',
    'Feynman technique app',
    'active recall app',
    // Competitor alternatives
    'Anki alternative',
    'Quizlet alternative',
    'Brainscape alternative',
    'AI Anki',
    // General study terms
    'best study app',
    'free flashcard app',
    'smart flashcards',
    'exam prep app',
    'study helper AI',
  ].join(', '),
  authors: [{ name: 'Masterly AI' }],
  applicationName: 'Masterly AI',
  creator: 'Masterly AI',
  publisher: 'Masterly AI',
  category: 'Education',
  openGraph: {
    title: 'Masterly AI: Flashcards & Quiz - #1 AI Study App',
    description: 'Create flashcards, quizzes & study guides from any material. AI-powered exam prep with spaced repetition. Join thousands of students acing their exams.',
    type: 'website',
    siteName: 'Masterly AI',
    url: 'https://masterlyapp.in',
    locale: 'en_US',
    images: [
      {
        url: '/icon-512x512.png',
        width: 1200,
        height: 630,
        alt: 'Masterly AI - AI Study App for Flashcards and Quizzes',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Masterly AI: Flashcards & Quiz - AI Study App',
    description: 'Create flashcards & quizzes with AI. The smartest way to prepare for exams. Free for students.',
    images: ['/icon-512x512.png'],
    creator: '@masterlyai',
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
  alternates: {
    canonical: 'https://masterlyapp.in',
  },
}