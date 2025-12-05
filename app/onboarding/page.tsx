'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import OnboardingScreen from '@/components/onboarding/OnboardingScreen';
import { Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isOnboardingCompleted, isLoading: onboardingLoading } = useOnboarding(user?.id);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect logic - check conditions in order
  useEffect(() => {
    if (!mounted) return;

    // If not authenticated, redirect to login
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    // If onboarding is definitively completed, redirect to dashboard
    // IMPORTANT: Only redirect when isOnboardingCompleted === true (not just truthy)
    // null means "still loading" - don't redirect yet
    if (!onboardingLoading && isOnboardingCompleted === true) {
      router.push('/dashboard');
      return;
    }
  }, [mounted, authLoading, onboardingLoading, user, isOnboardingCompleted, router]);

  // Show loading state while checking auth and onboarding status
  if (!mounted || authLoading || onboardingLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Setting up your learning journey...</p>
        </div>
      </div>
    );
  }

  // User is authenticated and onboarding is not completed - show onboarding
  return <OnboardingScreen userId={user.id} />;
}
