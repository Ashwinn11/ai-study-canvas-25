import { getSupabaseClient } from '@/lib/supabase/client';

export interface ProfileUpdateData {
  full_name?: string | null;
  avatar_url?: string | null;
  current_grade?: string | null;
  focus_area?: 'exam' | 'classes' | 'general' | 'professional';
  daily_cards_goal?: number;
  target_grade?: string | null;
  target_exam_date?: string | null;
  xp?: number;
}

class ProfileUpdateService {
  /**
   * Update user profile information
   */
  async updateProfile(userId: string, data: ProfileUpdateData): Promise<{ error?: string }> {
    try {
      const supabase = getSupabaseClient();

      const { error } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('profiles') as any)
        .update(data)
        .eq('id', userId);

      if (error) {
        throw error;
      }

      return { error: undefined };
    } catch (error) {
      console.error('[ProfileUpdateService] Profile update failed:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to update profile',
      };
    }
  }
}

export const profileUpdateService = new ProfileUpdateService();
