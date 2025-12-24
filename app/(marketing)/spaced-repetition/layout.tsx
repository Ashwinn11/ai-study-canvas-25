import { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata({
  title: 'Spaced Repetition App - Learn Faster with SRS | Masterly AI',
  description: 'Master spaced repetition with Masterly AI. Our scientifically-proven SRS algorithm optimizes your study schedule for maximum retention. Free spaced repetition app for students.',
  path: '/spaced-repetition',
  keywords: [
    'spaced repetition',
    'spaced repetition app',
    'SRS app',
    'spaced repetition software',
    'memory retention',
    'study technique',
    'flashcard spacing',
  ],
});

export default function SpacedRepetitionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
