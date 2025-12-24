import { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata({
  title: 'AI Flashcard Maker - Create Flashcards Automatically | Masterly AI',
  description: 'Create flashcards instantly with AI. Upload your PDFs, notes, or lectures and get AI-generated flashcards with spaced repetition. Free AI flashcard maker trusted by 10,000+ students.',
  path: '/ai-flashcard-maker',
  keywords: [
    'AI flashcard maker',
    'automatic flashcard generator',
    'AI flashcards free',
    'smart flashcard creator',
    'auto generate flashcards',
    'best AI flashcard app',
  ],
});

export default function AIFlashcardMakerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
