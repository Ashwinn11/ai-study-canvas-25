import type { Metadata } from 'next';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Masterly AI: Flashcards & Quiz - Your AI Study Coach',
  description: 'Transform your study materials into AI-powered flashcards, quizzes, and summaries. Master any exam with spaced repetition, adaptive learning, and intelligent study analytics.',
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      {children}
    </>
  );
}
