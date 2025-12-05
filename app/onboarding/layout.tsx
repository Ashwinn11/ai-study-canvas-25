import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Onboarding - Masterly',
  description: 'Complete your Masterly setup and start your AI-powered learning journey',
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
