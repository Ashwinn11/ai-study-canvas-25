import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Onboarding - Masterly AI',
  description: 'Complete your Masterly AI setup and start your AI-powered learning journey',
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
