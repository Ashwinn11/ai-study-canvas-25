import { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata({
  title: 'AI Flashcard Maker - Create Flashcards Automatically | Masterly AI',
  description: 'Upload PDFs, images, audio, video, or YouTube links and get AI-generated flashcards, summaries, and quizzes. Organize into exams with spaced repetition. 3 free uploads. iOS & Web.',
  path: '/ai-flashcard-maker',
  keywords: [
    'AI flashcard maker',
    'automatic flashcard generator',
    'AI flashcards',
    'smart flashcard creator',
    'auto generate flashcards',
    'AI study app',
  ],
});

export default function AIFlashcardMakerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

