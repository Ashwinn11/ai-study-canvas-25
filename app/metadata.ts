import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://masterlyapp.in'),
  title: {
    default: 'Masterly AI - Free AI Flashcard & Quiz Maker for Students | Study Smarter',
    template: '%s | Masterly AI'
  },
  description: 'Free AI study app trusted by 10,000+ students. Instantly create flashcards, quizzes & summaries from PDFs, notes & lectures. Features spaced repetition, active recall & AI study coach. Better than Anki & Quizlet.',
  keywords: [
    // Primary brand keywords
    'Masterly AI',
    'Masterly app',
    'Masterly study app',
    'masterlyapp',
    // Core AI features - High intent
    'AI flashcard maker',
    'AI flashcard generator',
    'AI flashcards free',
    'AI quiz generator',
    'AI quiz maker',
    'AI study app',
    'AI study coach',
    'AI learning app',
    // Conversion-focused keywords
    'free flashcard app',
    'free AI flashcards',
    'free quiz maker',
    'free study app',
    'best study app',
    'best flashcard app',
    // Use case keywords
    'exam preparation app',
    'study app for students',
    'college study app',
    'medical school study app',
    'PDF to flashcards',
    'PDF to quiz',
    'notes to flashcards',
    'notes to quiz',
    'lecture to flashcards',
    // Learning techniques
    'spaced repetition app',
    'spaced repetition software',
    'active recall app',
    'Feynman technique app',
    'study with spaced repetition',
    // Competitor alternatives - High intent
    'Anki alternative',
    'Quizlet alternative',
    'Brainscape alternative',
    'Remnote alternative',
    'AI Anki',
    'better than Anki',
    'better than Quizlet',
    // Long-tail keywords
    'how to make flashcards from PDF',
    'convert PDF to flashcards',
    'auto generate flashcards',
    'automatic flashcard maker',
    'AI powered flashcards',
    'smart flashcards',
    'intelligent flashcards',
    // Academic subjects
    'medical flashcards',
    'law school flashcards',
    'MCAT study app',
    'USMLE study app',
    'bar exam study app',
  ].join(', '),
  authors: [{ name: 'Masterly AI Team', url: 'https://masterlyapp.in' }],
  applicationName: 'Masterly AI',
  creator: 'Masterly AI',
  publisher: 'Masterly AI',
  category: 'Education',
  classification: 'Educational Technology',
  openGraph: {
    title: 'Masterly AI - Free AI Flashcard & Quiz Maker | Study Smarter, Not Harder',
    description: '🎓 Join 10,000+ students acing exams with AI-powered flashcards & quizzes. Upload PDFs, notes or lectures → Get instant flashcards with spaced repetition. Free forever. Better than Anki & Quizlet.',
    type: 'website',
    siteName: 'Masterly AI',
    url: 'https://masterlyapp.in',
    locale: 'en_US',
    images: [
      {
        url: '/icon.png',
        width: 1200,
        height: 630,
        alt: 'Masterly AI - AI-Powered Study App for Flashcards, Quizzes & Exam Prep',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Masterly AI - Free AI Flashcard & Quiz Maker for Students',
    description: '🎓 Create flashcards & quizzes instantly from PDFs, notes & lectures. AI-powered spaced repetition. Free for students. Better than Anki & Quizlet.',
    images: ['/icon.png'],
    creator: '@masterlyai',
    site: '@masterlyai',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
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
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  }
}