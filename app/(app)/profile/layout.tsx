import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile - Masterly',
  description: 'View your profile, statistics, achievements, and manage your preferences',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
