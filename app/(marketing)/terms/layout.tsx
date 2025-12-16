import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - Masterly AI',
  description: 'Read Masterly AI\'s Terms of Service and understand your rights and responsibilities when using our platform',
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
