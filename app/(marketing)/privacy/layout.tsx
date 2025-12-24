import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = generatePageMetadata({
  title: 'Privacy Policy | Masterly AI',
  description: 'Learn how Masterly AI protects your privacy and manages your data. We are committed to transparency and security for all students using our AI flashcard and quiz platform.',
  path: '/privacy',
  keywords: ['privacy policy', 'data protection', 'student privacy', 'GDPR', 'COPPA'],
});

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}

