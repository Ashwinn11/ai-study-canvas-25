import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Exams - Masterly AI',
  description: 'Manage your exams, track progress, and organize study materials by subject',
};

export default function ExamsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
