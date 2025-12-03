/**
 * Distributed Lock Implementation for Preventing Race Conditions
 * Prevents concurrent updates to SM-2 fields (interval, repetitions, easiness_factor)
 *
 * Matches iOS app: /masterly/services/distributedLock.ts
 */

import { getSupabaseClient } from '../supabase/client';

export interface LockAcquireOptions {
  lockKey: string;
  lockDurationSeconds?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface LockReleaseOptions {
  lockKey: string;
}

const DEFAULT_LOCK_DURATION = 30; // seconds
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY = 100; // milliseconds

export class DistributedLockService {
  private static instance: DistributedLockService;

  private constructor() {}

  static getInstance(): DistributedLockService {
    if (!DistributedLockService.instance) {
      DistributedLockService.instance = new DistributedLockService();
    }
    return DistributedLockService.instance;
  }

  /**
   * Acquire a distributed lock
   * Creates a temporary record in a locks table to prevent concurrent access
   */
  async acquireLock(options: LockAcquireOptions): Promise<boolean> {
    const {
      lockKey,
      lockDurationSeconds = DEFAULT_LOCK_DURATION,
      maxRetries = DEFAULT_MAX_RETRIES,
      retryDelayMs = DEFAULT_RETRY_DELAY,
    } = options;

    const supabase = getSupabaseClient();
    const expiresAt = new Date(Date.now() + lockDurationSeconds * 1000).toISOString();

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Try to insert lock record (will fail if already exists due to unique constraint)
        const { error } = await supabase
          .from('distributed_locks')
          .insert({
            lock_key: lockKey,
            acquired_at: new Date().toISOString(),
            expires_at: expiresAt,
          });

        if (!error) {
          return true; // Lock acquired successfully
        }

        // If lock already exists, check if it's expired
        const { data: existingLock } = await supabase
          .from('distributed_locks')
          .select('expires_at')
          .eq('lock_key', lockKey)
          .single();

        if (existingLock) {
          const expiryTime = new Date(existingLock.expires_at).getTime();
          if (expiryTime < Date.now()) {
            // Lock is expired, try to delete it and retry
            await supabase
              .from('distributed_locks')
              .delete()
              .eq('lock_key', lockKey);
            continue; // Retry acquisition
          }
        }

        // Lock is held by another process, wait and retry
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      } catch (error) {
        console.error('Error acquiring lock:', error);
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }
    }

    return false; // Failed to acquire lock after retries
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(options: LockReleaseOptions): Promise<boolean> {
    const { lockKey } = options;
    const supabase = getSupabaseClient();

    try {
      const { error } = await supabase
        .from('distributed_locks')
        .delete()
        .eq('lock_key', lockKey);

      if (error) {
        console.error('Error releasing lock:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error releasing lock:', error);
      return false;
    }
  }

  /**
   * Execute a function with lock protection
   * Automatically acquires and releases lock
   */
  async withLock<T>(
    lockKey: string,
    fn: () => Promise<T>,
    options?: Partial<LockAcquireOptions>
  ): Promise<T> {
    const lockAcquired = await this.acquireLock({
      lockKey,
      ...options,
    });

    if (!lockAcquired) {
      throw new Error(`Failed to acquire lock for key: ${lockKey}`);
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock({ lockKey });
    }
  }
}

export const distributedLockService = DistributedLockService.getInstance();
