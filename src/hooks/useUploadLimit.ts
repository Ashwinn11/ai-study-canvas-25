import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/lib/api/supabaseWithTimeout';
import { logger } from "@/utils/logger";

const FREE_UPLOAD_LIMIT = 3;

interface UseUploadLimitReturn {
  uploadsUsed: number;
  uploadsRemaining: number;
  canUpload: boolean;
  needsPaywall: boolean;
  loading: boolean;
  incrementCount: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const useUploadLimit = (): UseUploadLimitReturn => {
  const { user } = useAuth();
  const [uploadsUsed, setUploadsUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch count from database
  const fetchCount = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("free_uploads_used")
        .eq("id", user.id)
        .single();

      if (error) {
        logger.error("[UploadLimit] Fetch error:", error);
        setUploadsUsed(0);
      } else {
        setUploadsUsed(data?.free_uploads_used || 0);
      }
    } catch (error) {
      logger.error("[UploadLimit] Exception:", error);
      setUploadsUsed(0);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch count on mount
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Manual refetch - useful for refreshing count after external updates
  const refetch = useCallback(async () => {
    logger.info("[UploadLimit] Manual refetch triggered");
    await fetchCount();
  }, [fetchCount]);

  // Increment - fetch fresh count from DB first to avoid stale state
  const incrementCount = useCallback(async () => {
    if (!user?.id) {
      logger.warn("[UploadLimit] No user ID");
      return;
    }

    try {
      // Fetch current value from DB first (avoid stale state from React closure)
      const { data: currentData } = await supabase
        .from("profiles")
        .select("free_uploads_used")
        .eq("id", user.id)
        .single();

      const currentCount = currentData?.free_uploads_used || 0;
      const newCount = currentCount + 1;

      logger.info(`[UploadLimit] Incrementing upload count: ${currentCount} → ${newCount}`);

      const { error } = await supabase
        .from("profiles")
        .update({ free_uploads_used: newCount })
        .eq("id", user.id);

      if (error) {
        logger.error("[UploadLimit] Database update error:", error);
        throw new Error(`Failed to update upload count: ${error.message}`);
      }

      // Update local state after successful DB update
      setUploadsUsed(newCount);
      logger.info(`[UploadLimit] Upload count incremented successfully to ${newCount}`);
    } catch (error) {
      logger.error("[UploadLimit] Increment failed:", error);
      throw error;
    }
  }, [user?.id]);

  const uploadsRemaining = Math.max(0, FREE_UPLOAD_LIMIT - uploadsUsed);
  const canUpload = uploadsUsed < FREE_UPLOAD_LIMIT;
  const needsPaywall = uploadsUsed >= FREE_UPLOAD_LIMIT;

  return {
    uploadsUsed,
    uploadsRemaining,
    canUpload,
    needsPaywall,
    loading,
    incrementCount,
    refetch,
  };
};
