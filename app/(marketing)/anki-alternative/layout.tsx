import { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata({
  title: 'Best Anki Alternative 2024 - AI-Powered Flashcards | Masterly AI',
  description: 'Looking for an Anki alternative? Masterly AI offers AI-generated flashcards, summaries, and quizzes with modern design on iOS & Web. Try 3 uploads free. Compare features.',
  path: '/anki-alternative',
  keywords: [
    'Anki alternative',
    'better than Anki',
    'Anki vs Masterly',
    'AI Anki',
    'modern flashcard app',
    'Anki replacement',
    'spaced repetition app',
  ],
});

export default function AnkiAlternativeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

