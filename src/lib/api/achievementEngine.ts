/**
 * Achievement Engine
 * Evaluates user progress and unlocks achievements
 * Handles badge tier progression and surprise achievements
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import { evaluateBadges, getBadgeTiers, type BadgeState, type BadgeId } from './badges';
import { profileStatsService } from './profileStatsService';

/**
 * Valid achievement types as defined by database CHECK constraint
 * Updated to include 'grades', 'xp', and 'surprise' after database migration
 */
export type AchievementType = 'streak' | 'cards' | 'mastery' | 'accuracy' | 'sessions' | 'seeds' | 'study_time' | 'grades' | 'xp' | 'surprise';

/**
 * Map badge IDs to database achievement types
 * Database constraint now allows: 'streak', 'cards', 'mastery', 'accuracy', 'sessions', 'seeds', 'study_time', 'grades', 'xp'
 */
function getBadgeAchievementType(badgeId: BadgeId): AchievementType {
  const mapping: Record<BadgeId, AchievementType> = {
    seeds: 'seeds',
    streak: 'streak',
    mastery: 'mastery',
    accuracy: 'accuracy',
    grades: 'grades', // Now uses correct semantic type
    xp: 'xp', // Now uses correct semantic type
  };
  return mapping[badgeId] || 'sessions'; // Default fallback
}

export interface Achievement {
  id?: string;
  user_id?: string;
  achievement_type: AchievementType; // Changed from string for type safety
  achievement_key: string;
  name: string;
  description: string;
  icon_name: string;
  color: string;
  value_at_unlock: number;
  tier_level: number;
  unlocked_at?: string;
  metadata?: Record<string, unknown>;
}

class AchievementEngine {
  /**
   * Check and unlock new achievements after session completion
   * Compares current stats against badge definitions to find new unlocks
   */
  async checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
    try {
      // 1. Get fresh stats
      const result = await profileStatsService.getUserStats(userId);
      if (!result.data) return [];

      // 2. Evaluate all badges
      const badges = evaluateBadges(result.data);

      const supabase = getSupabaseClient();

      // 3. Get already-unlocked achievements
      const { data: existingAchievements, error } = await supabase
        .from('user_achievements')
        .select('achievement_key')
        .eq('user_id', userId);

      if (error) {
        console.error(
          '[AchievementEngine] Error fetching existing achievements:',
          error
        );
        return [];
      }

      const unlockedKeys = new Set(
        existingAchievements?.map((a: Record<string, unknown>) => String(a.achievement_key)) || []
      );

      // 4. Find NEW achievements
      const newlyUnlocked: Achievement[] = [];

      for (const badge of badges) {
        if (!badge.unlocked || badge.level === 0) continue;

        // Get tier definitions from badge service (not from BadgeState)
        const tiers = getBadgeTiers(badge.id as BadgeId);

        // For each badge, check each tier the user has unlocked
        for (let tier = 1; tier <= badge.level; tier++) {
          const tierData = tiers[tier - 1];
          if (!tierData) continue;

          const key = `${badge.id}_${tierData.threshold}`;
          const isAlreadyUnlocked = unlockedKeys.has(key);

          console.debug('[AchievementEngine] Checking badge tier', {
            badge: badge.id,
            tier,
            key,
            value: badge.value,
            threshold: tierData.threshold,
            isAlreadyUnlocked,
          });

          if (!isAlreadyUnlocked) {
            // UNLOCK THIS ACHIEVEMENT!
            const achievement = await this.unlockAchievement(
              userId,
              badge,
              tierData as unknown as Record<string, unknown>,
              tier
            );
            if (achievement) {
              newlyUnlocked.push(achievement);
            }
          }
        }
      }

      console.info('[AchievementEngine] Achievement check summary', {
        totalBadgesChecked: badges.length,
        newlyUnlockedCount: newlyUnlocked.length,
        newlyUnlockedKeys: newlyUnlocked.map((a) => a.achievement_key),
        totalExistingAchievements: unlockedKeys.size,
      });

      return newlyUnlocked;
    } catch (err) {
      console.error('[AchievementEngine] Error checking achievements:', err);
      return [];
    }
  }

  /**
   * Unlock a single achievement and save to DB
   */
  private async unlockAchievement(
    userId: string,
    badge: BadgeState,
    tierData: Record<string, unknown>,
    tier: number
  ): Promise<Achievement | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tier_obj = tierData as any;
      const achievement: Achievement = {
        user_id: userId,
        achievement_type: getBadgeAchievementType(badge.id as BadgeId), // Map badge ID to DB achievement type
        achievement_key: `${badge.id}_${tier_obj.threshold}`,
        name: badge.name,
        description: tier_obj.label || badge.currentLabel || '',
        icon_name: tier_obj.iconName || badge.iconName,
        color: badge.color,
        value_at_unlock: badge.value,
        tier_level: tier,
        metadata: {
          threshold: tier_obj.threshold,
          auto_unlocked: true,
          badge_id: badge.id, // Store the actual badge ID in metadata
        } as Record<string, unknown>,
      };

      const supabase = getSupabaseClient();

      const { data, error } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('user_achievements') as any)
        .insert(achievement)
        .select()
        .single();

      if (error) {
        console.error('[AchievementEngine] Error unlocking achievement:', error);
        return null;
      }

      console.info(
        '[AchievementEngine] Unlocked achievement:',
        (data as Record<string, unknown>)?.achievement_key
      );
      return data as Achievement;
    } catch (err) {
      console.error(
        '[AchievementEngine] Exception unlocking achievement:',
        err
      );
      return null;
    }
  }

  /**
   * Random surprise achievement (15% chance after daily goal)
   * Rewards for studying at unusual times
   */
  async maybeSurpriseAchievement(userId: string): Promise<Achievement | null> {
    try {
      // 15% chance
      if (Math.random() > 0.15) return null;

      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();

      // Define surprise achievement conditions
      const surprises = [
        {
          key: 'night_owl',
          name: 'Night Owl',
          description: 'Studied after 10 PM',
          icon: 'moon',
          condition: hour >= 22,
        },
        {
          key: 'early_bird',
          name: 'Early Bird',
          description: 'Studied before 7 AM',
          icon: 'sunny',
          condition: hour < 7,
        },
        {
          key: 'weekend_warrior',
          name: 'Weekend Warrior',
          description: 'Studied on weekend',
          icon: 'calendar',
          condition: [0, 6].includes(day), // Sunday or Saturday
        },
      ];

      // Filter eligible surprises
      const eligible = surprises.filter((s) => s.condition);
      if (eligible.length === 0) return null;

      const surprise =
        eligible[Math.floor(Math.random() * eligible.length)];

      const supabase = getSupabaseClient();

      // Check not already unlocked
      const { data: existing, error: checkError } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_key', surprise.key)
        .maybeSingle();

      if (checkError) {
        console.error(
          '[AchievementEngine] Error checking existing surprise:',
          checkError
        );
        return null;
      }

      if (existing) return null; // Already unlocked

      // Unlock surprise
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('user_achievements') as any)
        .insert({
          user_id: userId,
          achievement_type: 'surprise',
          achievement_key: surprise.key,
          name: surprise.name,
          description: surprise.description,
          icon_name: surprise.icon,
          color: 'rgb(168, 85, 247)', // Purple (secondary)
          value_at_unlock: 0,
          tier_level: 1,
          metadata: {
            auto_unlocked: true,
            surprise: true,
          },
        })
        .select()
        .single();

      if (error) {
        console.error('[AchievementEngine] Error unlocking surprise:', error);
        return null;
      }

      console.info(
        '[AchievementEngine] Unlocked surprise achievement:',
        surprise.key
      );
      return data as Achievement;
    } catch (err) {
      console.error(
        '[AchievementEngine] Exception unlocking surprise:',
        err
      );
      return null;
    }
  }

  /**
   * Get all achievements for a user (for profile display)
   */
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

      if (error) {
        console.error(
          '[AchievementEngine] Error fetching user achievements:',
          error
        );
        return [];
      }

      return (data as Achievement[]) || [];
    } catch (err) {
      console.error(
        '[AchievementEngine] Exception fetching achievements:',
        err
      );
      return [];
    }
  }
}

export const achievementEngine = new AchievementEngine();
