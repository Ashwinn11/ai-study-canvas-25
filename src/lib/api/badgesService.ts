// iOS-only: colors from @/theme removed
import type { UserStats } from './profileStatsService';

export type BadgeId =
  | 'seeds'
  | 'streak'
  | 'mastery'
  | 'accuracy'
  | 'grades'
  | 'xp';

export interface BadgeTier {
  threshold: number; // numeric target for this tier
  label: string; // e.g., "50 cards", "7 days", "90%"
  iconName?: string; // optional tier-specific icon
  shortLabel: string; // e.g., "50", "7 days", "90%" - for compact display
  unit: string; // e.g., "materials", "days", "%"
}

export interface TieredBadgeDefinition {
  id: BadgeId;
  name: string;
  iconName: string; // base icon when locked or generic
  color: string;
  // Extract numeric value from stats for this badge
  value: (stats: UserStats) => number;
  tiers: BadgeTier[]; // ascending thresholds
}

export interface BadgeState {
  id: BadgeId;
  name: string;
  color: string;
  iconName: string; // icon for current tier or base
  unlocked: boolean; // true if at least tier 1
  level: number; // 0..tiers.length
  maxLevel: number;
  value: number; // current metric value
  currentLabel?: string; // label for achieved tier
  nextLabel?: string; // label for upcoming tier
  progress: number; // 0..1 toward next tier (1 if max)
  requirement: string; // guidance text for UI
  description: string; // success text when unlocked
  // New fields for compact display
  currentValueLabel: string; // e.g., "23 materials"
  progressRatio: string; // e.g., "23/30"
  nextThreshold: number; // e.g., 30
  remainingToNext: number; // e.g., 7
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// Badge definitions - each badge tracks a unique type of achievement
// Ordered by importance: Creation > Consistency > Mastery > Quality > Milestones
export const badgeDefinitions: TieredBadgeDefinition[] = [
  // 0. LEGENDARY LEARNER - Overall Experience & Progress (New)
  {
    id: 'xp',
    name: 'Legendary Learner',
    iconName: 'diamond-outline',
    color: '#1CB0F6', // Blue (secondary)
    value: (s) => s.current.xp,
    tiers: [
      { threshold: 100, label: 'Earned 100 XP', shortLabel: '100', unit: 'XP', iconName: 'diamond-outline' },
      { threshold: 500, label: 'Earned 500 XP', shortLabel: '500', unit: 'XP' },
      { threshold: 1000, label: 'Earned 1,000 XP', shortLabel: '1k', unit: 'XP', iconName: 'diamond' },
      { threshold: 5000, label: 'Earned 5,000 XP', shortLabel: '5k', unit: 'XP' },
      { threshold: 10000, label: 'Earned 10,000 XP', shortLabel: '10k', unit: 'XP', iconName: 'ribbon' },
    ],
  },

  // 1. CONTENT CREATOR - Creating materials is the highest-value action
  {
    id: 'seeds',
    name: 'Content Creator',
    iconName: 'sparkles-outline',
    color: '#F59E0B', // Gold/yellow (amber)
    value: (s) => s.totalSeeds,
    tiers: [
      { threshold: 5, label: 'Created 5 materials', shortLabel: '5', unit: 'materials', iconName: 'sparkles-outline' },
      { threshold: 15, label: 'Created 15 materials', shortLabel: '15', unit: 'materials' },
      { threshold: 30, label: 'Created 30 materials', shortLabel: '30', unit: 'materials', iconName: 'create' },
      { threshold: 50, label: 'Created 50 materials', shortLabel: '50', unit: 'materials', iconName: 'sparkles' },
      { threshold: 100, label: 'Created 100 materials', shortLabel: '100', unit: 'materials', iconName: 'trophy' },
    ],
  },

  // 2. COMMITMENT KEEPER - Daily consistency and habit formation
  {
    id: 'streak',
    name: 'Commitment Keeper',
    iconName: 'flame-outline',
    color: '#ff7664', // Red/orange fire (primary)
    value: (s) => s.longestStreak,
    tiers: [
      { threshold: 7, label: '7 day streak', shortLabel: '7', unit: 'day streak', iconName: 'flame-outline' },
      { threshold: 14, label: '14 day streak', shortLabel: '14', unit: 'day streak', iconName: 'flame' },
      { threshold: 30, label: '30 day streak', shortLabel: '30', unit: 'day streak' },
      { threshold: 60, label: '60 day streak', shortLabel: '60', unit: 'day streak' },
      { threshold: 100, label: '100 day streak', shortLabel: '100', unit: 'day streak', iconName: 'rocket' },
    ],
  },

  // 3. MASTERY MAVEN - Cards actually mastered (not just reviewed)
  {
    id: 'mastery',
    name: 'Mastery Maven',
    iconName: 'star-outline',
    color: '#F59E0B', // Gold (amber)
    value: (s) => s.masteredCards,
    tiers: [
      { threshold: 10, label: 'Mastered 10 cards', shortLabel: '10', unit: 'mastered cards' },
      { threshold: 30, label: 'Mastered 30 cards', shortLabel: '30', unit: 'mastered cards', iconName: 'star' },
      { threshold: 75, label: 'Mastered 75 cards', shortLabel: '75', unit: 'mastered cards' },
      { threshold: 150, label: 'Mastered 150 cards', shortLabel: '150', unit: 'mastered cards' },
      { threshold: 300, label: 'Mastered 300 cards', shortLabel: '300', unit: 'mastered cards', iconName: 'trophy' },
    ],
  },

  // 4. ACCURACY ACE - Performance quality and understanding
  {
    id: 'accuracy',
    name: 'Accuracy Ace',
    iconName: 'checkmark-circle-outline',
    color: '#10B981', // Green (emerald)
    value: (s) => s.accuracy, // Use CURRENT accuracy, not peak
    tiers: [
      { threshold: 25, label: 'Achieved 25% accuracy', shortLabel: '25%', unit: 'accuracy' },
      { threshold: 50, label: 'Achieved 50% accuracy', shortLabel: '50%', unit: 'accuracy' },
      { threshold: 75, label: 'Achieved 75% accuracy', shortLabel: '75%', unit: 'accuracy', iconName: 'checkmark-circle' },
      { threshold: 100, label: 'Achieved 100% accuracy', shortLabel: '100%', unit: 'accuracy', iconName: 'trophy' },
    ],
  },

  // 5. GRADE CHAMPION - Exam excellence (A grades earned)
  {
    id: 'grades',
    name: 'Grade Champion',
    iconName: 'trophy-outline',
    color: '#8B5CF6', // Purple (violet)
    value: (s) => s.totalAGrades || 0,
    tiers: [
      { threshold: 1, label: 'Earned 1st A grade', shortLabel: '1', unit: 'A grade', iconName: 'trophy-outline' },
      { threshold: 5, label: 'Earned 5 A grades', shortLabel: '5', unit: 'A grades', iconName: 'trophy' },
      { threshold: 10, label: 'Earned 10 A grades', shortLabel: '10', unit: 'A grades' },
      { threshold: 25, label: 'Earned 25 A grades', shortLabel: '25', unit: 'A grades' },
      { threshold: 50, label: 'Earned 50 A grades', shortLabel: '50', unit: 'A grades', iconName: 'medal' },
    ],
  },
];

/**
 * Get a single badge definition by ID
 */
export const getBadgeDefinition = (badgeId: BadgeId): TieredBadgeDefinition | undefined => {
  return badgeDefinitions.find(b => b.id === badgeId);
};

/**
 * Get all tiers for a specific badge with their details
 */
export const getBadgeTiers = (badgeId: BadgeId): BadgeTier[] => {
  const badge = getBadgeDefinition(badgeId);
  return badge?.tiers || [];
};

export const evaluateBadges = (stats: UserStats): BadgeState[] => {
  return badgeDefinitions.map((d) => {
    const value = d.value(stats);
    const levelsAchieved = d.tiers.filter((t) => value >= t.threshold).length;
    const maxLevel = d.tiers.length;
    const unlocked = levelsAchieved > 0;
    const currentTier = levelsAchieved > 0 ? d.tiers[levelsAchieved - 1] : undefined;
    const nextTier = levelsAchieved < maxLevel ? d.tiers[levelsAchieved] : undefined;

    const prevThreshold = currentTier?.threshold ?? 0;
    const nextThreshold = nextTier?.threshold ?? prevThreshold;
    const denom = Math.max(1, nextThreshold - prevThreshold);
    const progress = nextTier ? clamp01((value - prevThreshold) / denom) : 1;

    const iconName = currentTier?.iconName || nextTier?.iconName || d.iconName;
    const description = unlocked
      ? currentTier?.label ?? ''
      : 'Not yet achieved';
    const requirement = nextTier
      ? `Next: ${nextTier.label}`
      : 'Max tier achieved';

    // New compact display fields
    const unit = currentTier?.unit || nextTier?.unit || '';
    const currentValueLabel = `${value} ${unit}`;
    const progressRatio = nextTier ? `${value}/${nextThreshold}` : `${value}`;
    const remainingToNext = nextTier ? Math.max(0, nextThreshold - value) : 0;

    return {
      id: d.id,
      name: d.name,
      color: d.color,
      iconName,
      unlocked,
      level: levelsAchieved,
      maxLevel,
      value,
      currentLabel: currentTier?.label,
      nextLabel: nextTier?.label,
      progress,
      requirement,
      description,
      // New fields
      currentValueLabel,
      progressRatio,
      nextThreshold: nextTier?.threshold ?? value,
      remainingToNext,
    };
  });
};
