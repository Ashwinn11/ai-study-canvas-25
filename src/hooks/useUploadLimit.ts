import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/lib/api/supabaseWithTimeout';
import { useSubscription } from "@/hooks/useSubscription";
import { logger } from "@/utils/logger";

interface UseUploadLimitReturn {
  uploadsUsed: number;
  uploadsRemaining: number;
  freeTrialExpired: boolean;
  isLoading: boolean;
  error: string | null;
  refreshLimits: () => Promise<void>;
}

export const useUploadLimit = (): UseUploadLimitReturn => {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const [uploadsUsed, setUploadsUsed] = useState(0);
  const [uploadsRemaining, setUploadsRemaining] = useState(0);
  const [freeTrialExpired, setFreeTrialExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUploadLimits = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get user's upload count from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('uploads_count, created_at')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      const uploadsCount = profile?.uploads_count || 0;
      setUploadsUsed(uploadsCount);

      // Check if free trial has expired (30 days from account creation)
      const createdAt = new Date(profile?.created_at || user.created_at);
      const trialEndDate = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      const isTrialExpired = new Date() > trialEndDate;
      setFreeTrialExpired(isTrialExpired);

      // Calculate remaining uploads based on subscription
      let maxUploads = 5; // Free tier limit
      if (subscription?.isActive) {
        // Premium tier gets unlimited uploads
        maxUploads = Infinity;
      } else if (!isTrialExpired) {
        // Free trial gets 10 uploads
        maxUploads = 10;
      }

      const remaining = Math.max(0, maxUploads - uploadsCount);
      setUploadsRemaining(remaining);

    } catch (err) {
      logger.error('Error fetching upload limits:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch upload limits');
    } finally {
      setIsLoading(false);
    }
  }, [user, subscription]);

  useEffect(() => {
    fetchUploadLimits();
  }, [fetchUploadLimits]);

  return {
    uploadsUsed,
    uploadsRemaining,
    freeTrialExpired,
    isLoading,
    error,
    refreshLimits: fetchUploadLimits,
  };
};