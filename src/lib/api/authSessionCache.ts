import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import { logger } from "@/utils/logger";

/**
 * Auth Session Cache Service
 * Caches Supabase session to avoid redundant getSession() calls
 * Reduces latency by eliminating 1-2 auth checks per AI request
 */
class AuthSessionCache {
  private session: Session | null = null;
  private lastFetch: number = 0;
  private readonly TTL = 5 * 60 * 1000; // 5 minutes cache
  private fetchPromise: Promise<Session | null> | null = null;

  /**
   * Get current session (cached or fresh)
   * Returns cached session if valid, otherwise fetches new one
   */
  async getSession(): Promise<Session | null> {
    // Return cached session if still valid
    if (this.session && Date.now() - this.lastFetch < this.TTL) {
      return this.session;
    }

    // If fetch already in progress, return that promise
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Fetch new session
    this.fetchPromise = this.fetchSessionFromSupabase();

    try {
      this.session = await this.fetchPromise;
      this.lastFetch = Date.now();
      return this.session;
    } finally {
      this.fetchPromise = null;
    }
  }

  /**
   * Get access token (convenience method)
   */
  async getAccessToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.access_token ?? null;
  }

  /**
   * Force refresh session (invalidate cache)
   */
  async refreshSession(): Promise<Session | null> {
    this.lastFetch = 0; // Invalidate cache
    return this.getSession();
  }

  /**
   * Clear cached session
   */
  clearCache(): void {
    this.session = null;
    this.lastFetch = 0;
    this.fetchPromise = null;
  }

  /**
   * Internal: Fetch session from Supabase
   */
  private async fetchSessionFromSupabase(): Promise<Session | null> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        logger.warn("[AuthSessionCache] Failed to fetch session:", error);
        return null;
      }

      return session;
    } catch (error) {
      logger.error("[AuthSessionCache] Error fetching session:", error);
      return null;
    }
  }
}

// Export singleton instance
export const authSessionCache = new AuthSessionCache();
