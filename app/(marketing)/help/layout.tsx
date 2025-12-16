import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help & Support - Masterly AI',
  description: 'Get answers to common questions about Masterly AI and learn how to use our AI-powered study platform',
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
