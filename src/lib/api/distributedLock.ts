/**
 * Distributed lock service using Supabase for cross-device/cross-session coordination
 * Prevents race conditions in content generation across multiple runtimes
 */

import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

import { logger } from "@/utils/logger";
export type LockType = 'flashcard' | 'quiz' | 'both';
export type LockStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface GenerationLock {
  id: string;
  seed_id: string;
  user_id: string;
  lock_type: LockType;
  status: LockStatus;
  locked_at: string;
  locked_by: string;
  started_at?: string;
  completed_at?: string;
  expires_at: string;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Generate a unique runtime identifier for this app instance
let RUNTIME_ID: string | null = null;
function getRuntimeId(): string {
  if (!RUNTIME_ID) {
    RUNTIME_ID = crypto.randomUUID();
  }
  return RUNTIME_ID;
}

export class DistributedLockService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Attempt to acquire a distributed lock for content generation
   * Returns lock if acquired, null if another process holds the lock
   */
  async acquireLock(
    seedId: string,
    userId: string,
    lockType: LockType,
    timeoutMs: number = 600000 // 10 minutes default
  ): Promise<GenerationLock | null> {
    try {

      // First, cleanup any expired locks
      await this.cleanupExpiredLocks();

      // Check if lock already exists and is active
      const existing = await this.getLock(seedId, userId, lockType);
      if (existing && ['queued', 'running'].includes(existing.status)) {

        // If it's our own lock, return it (reentrant)
        if (existing.locked_by === getRuntimeId()) {
          return existing;
        }

        return null; // Lock held by another process
      }

      // Try to insert new lock
      const expiresAt = new Date(Date.now() + timeoutMs).toISOString();
      const { data, error } = await this.supabase
        .from('generation_locks')
        .insert({
          seed_id: seedId,
          user_id: userId,
          lock_type: lockType,
          status: 'queued' as LockStatus,
          locked_by: getRuntimeId(),
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) {
        // Check for unique constraint violation (another process just acquired it)
        if (error.code === '23505') {
          return null;
        }
        logger.error('[DistributedLock] Error acquiring lock:', error);
        return null;
      }

      return data;
    } catch (err) {
      logger.error('[DistributedLock] Unexpected error acquiring lock:', err);
      return null;
    }
  }

  /**
   * Get current lock status for a seed
   */
  async getLock(
    seedId: string,
    userId: string,
    lockType: LockType
  ): Promise<GenerationLock | null> {
    try {
      const { data, error } = await this.supabase
        .from('generation_locks')
        .select('*')
        .eq('seed_id', seedId)
        .eq('user_id', userId)
        .eq('lock_type', lockType)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        logger.error('[DistributedLock] Error fetching lock:', error);
        return null;
      }

      return data || null;
    } catch (err) {
      logger.error('[DistributedLock] Unexpected error fetching lock:', err);
      return null;
    }
  }

  /**
   * Update lock status (queued → running → completed/failed)
   */
  async updateLockStatus(
    lockId: string,
    status: LockStatus,
    errorMessage?: string
  ): Promise<boolean> {
    try {
      const updates: any = { status };

      if (status === 'running' && !errorMessage) {
        updates.started_at = new Date().toISOString();
      }

      if (status === 'completed' || status === 'failed') {
        updates.completed_at = new Date().toISOString();
      }

      if (errorMessage) {
        updates.error_message = errorMessage;
      }

      const { error } = await this.supabase
        .from('generation_locks')
        .update(updates)
        .eq('id', lockId)
        .eq('locked_by', getRuntimeId()); // Only update our own locks

      if (error) {
        logger.error('[DistributedLock] Error updating lock status:', error);
        return false;
      }

      return true;
    } catch (err) {
      logger.error('[DistributedLock] Unexpected error updating lock:', err);
      return false;
    }
  }

  /**
   * Release a lock (mark as completed)
   */
  async releaseLock(lockId: string, success: boolean = true, errorMessage?: string): Promise<boolean> {
    return await this.updateLockStatus(
      lockId,
      success ? 'completed' : 'failed',
      errorMessage
    );
  }

  /**
   * Check if any active lock exists for a seed (any type)
   */
  async hasActiveLock(seedId: string, userId: string): Promise<{
    hasLock: boolean;
    lockType?: LockType;
    status?: LockStatus;
    lockedBy?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('generation_locks')
        .select('*')
        .eq('seed_id', seedId)
        .eq('user_id', userId)
        .in('status', ['queued', 'running'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        logger.error('[DistributedLock] Error checking active locks:', error);
        return { hasLock: false };
      }

      if (data && data.length > 0) {
        const lock = data[0];
        return {
          hasLock: true,
          lockType: lock.lock_type,
          status: lock.status,
          lockedBy: lock.locked_by,
        };
      }

      return { hasLock: false };
    } catch (err) {
      logger.error('[DistributedLock] Unexpected error checking locks:', err);
      return { hasLock: false };
    }
  }

  /**
   * Cleanup expired locks
   */
  async cleanupExpiredLocks(): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('cleanup_expired_generation_locks');

      if (error) {
        logger.warn('[DistributedLock] Error cleaning up expired locks:', error);
      }
    } catch (err) {
      logger.warn('[DistributedLock] Unexpected error during cleanup:', err);
    }
  }

  /**
   * Force delete a lock (use with caution - mainly for cleanup/testing)
   */
  async forceDeleteLock(seedId: string, userId: string, lockType: LockType): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('generation_locks')
        .delete()
        .eq('seed_id', seedId)
        .eq('user_id', userId)
        .eq('lock_type', lockType);

      if (error) {
        logger.error('[DistributedLock] Error force deleting lock:', error);
        return false;
      }

      return true;
    } catch (err) {
      logger.error('[DistributedLock] Unexpected error force deleting lock:', err);
      return false;
    }
  }
}
