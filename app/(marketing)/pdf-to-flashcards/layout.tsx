import { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata({
  title: 'PDF to Flashcards - Convert PDFs Instantly | Masterly AI',
  description: 'Convert any PDF to study flashcards automatically with AI. Upload PDFs, textbooks, or lecture slides and get instant flashcards with spaced repetition. Free PDF converter for students.',
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
