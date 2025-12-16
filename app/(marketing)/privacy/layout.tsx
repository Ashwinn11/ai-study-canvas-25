import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Masterly AI',
  description: 'Learn how Masterly AI protects your privacy and manages your data',
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
