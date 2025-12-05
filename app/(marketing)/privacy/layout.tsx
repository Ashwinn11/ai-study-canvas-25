import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Masterly',
  description: 'Learn how Masterly protects your privacy and manages your data',
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
