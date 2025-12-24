import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata({
  title: 'Help & Support | Masterly AI',
  description: 'Get help with Masterly AI. Find answers to common questions about AI flashcards, quizzes, spaced repetition, subscriptions, and more. Contact our support team.',
  path: '/help',
  keywords: ['help', 'support', 'FAQ', 'how to use', 'flashcard help', 'study app help'],
});

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}

