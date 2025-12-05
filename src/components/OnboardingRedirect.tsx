'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Loader2 } from 'lucide-react';

/**
 * OnboardingRedirect Component
 *
 * Handles navigation logic based on authentication and onboarding status:
 * - New user (authenticated + not onboarded) → /onboarding
 * - Returning user (authenticated + onboarded) → stay on current page or /dashboard
 * - Unauthenticated user → /login
 *
 * CRITICAL: Returns loading state while checking auth + onboarding status
 * to prevent UI flashing during redirects.
 */
export function OnboardingRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { isOnboardingCompleted, isLoading: onboardingLoading } = useOnboarding(user?.id);

  // Determine if we're on a public page that doesn't need auth checks
  const isPublicPage = pathname === '/' ||
                       pathname.startsWith('/privacy') ||
                       pathname.startsWith('/terms') ||
                       pathname.startsWith('/auth') ||
                       pathname === '/onboarding' ||
                       pathname === '/login';

  useEffect(() => {
    // Only do redirect logic if NOT on a public page
    if (isPublicPage) return;

    // Skip redirect logic while still loading auth or onboarding status
    if (authLoading || onboardingLoading) return;

    // New user (authenticated but onboarding definitively not completed) → redirect to onboarding
    // IMPORTANT: Only redirect when isOnboardingCompleted === false (not null/undefined)
    // null means "still loading" - don't redirect yet
    if (user && isOnboardingCompleted === false) {
      router.push('/onboarding');
      return;
    }

    // Unauthenticated user on protected pages → redirect to login
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, isOnboardingCompleted, authLoading, onboardingLoading, isPublicPage, pathname, router]);

  // On public pages, render immediately (no auth checks needed)
  if (isPublicPage) {
    return <>{children}</>;
  }

  // On protected pages, show loading state while checking auth + onboarding
  if (authLoading || onboardingLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth and onboarding checks passed, render protected content
  return <>{children}</>;
}
