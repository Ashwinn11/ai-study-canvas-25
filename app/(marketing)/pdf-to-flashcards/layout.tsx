import { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata({
  title: 'PDF to Flashcards - Convert PDFs Instantly | Masterly AI',
  description: 'Convert PDFs to flashcards, summaries, and quizzes automatically with AI. Upload textbooks or lecture slides and get comprehensive study materials. 3 free uploads. iOS & Web.',
  path: '/pdf-to-flashcards',
  keywords: [
    'PDF to flashcards',
    'convert PDF to flashcards',
    'PDF flashcard generator',
    'PDF to study cards',
    'textbook to flashcards',
    'PDF study tool',
  ],
});

export default function PDFToFlashcardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

