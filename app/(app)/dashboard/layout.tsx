import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - Masterly',
  description: 'Your personal study dashboard with progress tracking, exam overview, and daily goals',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
