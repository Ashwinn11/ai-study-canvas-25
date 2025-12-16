import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Study Materials - Masterly AI',
  description: 'Browse and manage all your study materials including PDFs, images, audio, and more',
};

export default function SeedsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
