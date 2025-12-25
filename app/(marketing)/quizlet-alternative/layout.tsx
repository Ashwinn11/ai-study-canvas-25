import { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata({
  title: 'Best Quizlet Alternative 2024 - AI Study App | Masterly AI',
  description: 'Looking for a Quizlet alternative? Masterly AI offers AI flashcards, summaries, quizzes, real spaced repetition, and no ads. Try 3 uploads free on iOS & Web.',
  path: '/quizlet-alternative',
  keywords: [
    'Quizlet alternative',
    'better than Quizlet',
    'Quizlet vs Masterly',
    'study app without ads',
    'Quizlet replacement',
  ],
});

export default function QuizletAlternativeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

