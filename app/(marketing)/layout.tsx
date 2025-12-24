import type { Metadata } from 'next';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Masterly AI - Free AI Flashcard & Quiz Maker for Students | Study Smarter',
  description: 'Free AI study app trusted by 10,000+ students. Instantly create flashcards, quizzes & summaries from PDFs, notes & lectures. Features spaced repetition, active recall & AI study coach. Better than Anki & Quizlet.',
  openGraph: {
    title: 'Masterly AI - Free AI Flashcard & Quiz Maker | Study Smarter, Not Harder',
    description: '🎓 Join 10,000+ students acing exams with AI-powered flashcards & quizzes. Upload PDFs, notes or lectures → Get instant flashcards with spaced repetition. Free forever.',
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      {children}
    </>
  );
}
