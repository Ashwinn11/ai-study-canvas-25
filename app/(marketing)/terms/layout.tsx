import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata({
  title: 'Terms of Service | Masterly AI',
  description: 'Read Masterly AI Terms of Service. Understand your rights and responsibilities when using our AI-powered flashcard and quiz platform for studying.',
  path: '/terms',
  keywords: ['terms of service', 'terms and conditions', 'user agreement'],
});

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

