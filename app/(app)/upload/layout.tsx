import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Upload Study Material - Masterly',
  description: 'Upload PDFs, images, audio, video, or paste text to transform into AI-powered flashcards and quizzes',
};

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
