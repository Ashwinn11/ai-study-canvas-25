import type { UserStats } from './profileStats';

export type BadgeId = 'xp' | 'seeds' | 'streak' | 'mastery' | 'accuracy' | 'grades';

export interface BadgeTier {
  threshold: number;
  label: string;
  iconName?: string;
  shortLabel: string;
  unit: string;
}

export interface TieredBadgeDefinition {
  id: BadgeId;
  name: string;
  iconName: string;
  color: string;
  value: (stats: UserStats) => number;
  tiers: BadgeTier[];
}

export interface BadgeState {
  id: BadgeId;
  name: string;
  color: string;
  iconName: string;
  unlocked: boolean;
  level: number; // 0..tiers.length
  maxLevel: number;
  value: number;
  currentLabel?: string;
  nextLabel?: string;
  progress: number; // 0..1 toward next tier
  requirement: string;
  description: string;
  currentValueLabel: string;
  progressRatio: string;
  nextThreshold: number;
  remainingToNext: number;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// Badge definitions - matching iOS exactly
export const badgeDefinitions: TieredBadgeDefinition[] = [
  // 0. LEGENDARY LEARNER - XP Badge
  {
    id: 'xp',
    name: 'Legendary Learner',
    iconName: 'sparkles',
    color: 'rgb(59, 130, 246)', // Blue
    value: () => 0, // XP not tracked in web yet
    tiers: [
      { threshold: 100, label: 'Earned 100 XP', shortLabel: '100', unit: 'XP' },
      { threshold: 500, label: 'Earned 500 XP', shortLabel: '500', unit: 'XP' },
      { threshold: 1000, label: 'Earned 1,000 XP', shortLabel: '1k', unit: 'XP' },
      { threshold: 5000, label: 'Earned 5,000 XP', shortLabel: '5k', unit: 'XP' },
      { threshold: 10000, label: 'Earned 10,000 XP', shortLabel: '10k', unit: 'XP' },
    ],
  },

  // 1. CONTENT CREATOR
  {
    id: 'seeds',
    name: 'Content Creator',
    iconName: 'sparkles',
    color: 'rgb(234, 179, 8)', // Yellow/gold
    value: (s) => s.totalSeeds,
    tiers: [
      {
        threshold: 5,
        label: 'Created 5 materials',
        shortLabel: '5',
        unit: 'materials',
        iconName: 'sparkles',
      },
      { threshold: 15, label: 'Created 15 materials', shortLabel: '15', unit: 'materials' },
      {
        threshold: 30,
        label: 'Created 30 materials',
        shortLabel: '30',
        unit: 'materials',
        iconName: 'pencil',
      },
      {
        threshold: 50,
        label: 'Created 50 materials',
        shortLabel: '50',
        unit: 'materials',
        iconName: 'sparkles',
      },
      {
        threshold: 100,
        label: 'Created 100 materials',
        shortLabel: '100',
        unit: 'materials',
        iconName: 'trophy',
      },
    ],
  },

  // 2. COMMITMENT KEEPER
  {
    id: 'streak',
    name: 'Commitment Keeper',
    iconName: 'flame',
    color: 'rgb(239, 68, 68)', // Red/orange
    value: (s) => s.longestStreak,
    tiers: [
      { threshold: 7, label: '7 day streak', shortLabel: '7', unit: 'day streak', iconName: 'flame' },
      {
        threshold: 14,
        label: '14 day streak',
        shortLabel: '14',
        unit: 'day streak',
        iconName: 'flame',
      },
      { threshold: 30, label: '30 day streak', shortLabel: '30', unit: 'day streak' },
      { threshold: 60, label: '60 day streak', shortLabel: '60', unit: 'day streak' },
      {
        threshold: 100,
        label: '100 day streak',
        shortLabel: '100',
        unit: 'day streak',
        iconName: 'rocket',
      },
    ],
  },

  // 3. MASTERY MAVEN
  {
    id: 'mastery',
    name: 'Mastery Maven',
    iconName: 'star',
    color: 'rgb(234, 179, 8)', // Gold
    value: (s) => s.masteredCards,
    tiers: [
      { threshold: 10, label: 'Mastered 10 cards', shortLabel: '10', unit: 'mastered cards' },
      {
        threshold: 30,
        label: 'Mastered 30 cards',
        shortLabel: '30',
        unit: 'mastered cards',
        iconName: 'star',
      },
      { threshold: 75, label: 'Mastered 75 cards', shortLabel: '75', unit: 'mastered cards' },
      { threshold: 150, label: 'Mastered 150 cards', shortLabel: '150', unit: 'mastered cards' },
      {
        threshold: 300,
        label: 'Mastered 300 cards',
        shortLabel: '300',
        unit: 'mastered cards',
        iconName: 'trophy',
      },
    ],
  },

  // 4. ACCURACY ACE
  {
    id: 'accuracy',
    name: 'Accuracy Ace',
    iconName: 'check-circle',
    color: 'rgb(34, 197, 94)', // Green
    value: (s) => s.accuracy,
    tiers: [
      { threshold: 25, label: 'Achieved 25% accuracy', shortLabel: '25%', unit: 'accuracy' },
      { threshold: 50, label: 'Achieved 50% accuracy', shortLabel: '50%', unit: 'accuracy' },
      {
        threshold: 75,
        label: 'Achieved 75% accuracy',
        shortLabel: '75%',
        unit: 'accuracy',
        iconName: 'check-circle',
      },
      {
        threshold: 100,
        label: 'Achieved 100% accuracy',
        shortLabel: '100%',
        unit: 'accuracy',
        iconName: 'trophy',
      },
    ],
  },

  // 5. GRADE CHAMPION
  {
    id: 'grades',
    name: 'Grade Champion',
    iconName: 'trophy',
    color: 'rgb(168, 85, 247)', // Purple
    value: (s) => s.totalAGrades || 0,
    tiers: [
      {
        threshold: 1,
        label: 'Earned 1st A grade',
        shortLabel: '1',
        unit: 'A grade',
        iconName: 'trophy',
      },
      { threshold: 5, label: 'Earned 5 A grades', shortLabel: '5', unit: 'A grades', iconName: 'trophy' },
      { threshold: 10, label: 'Earned 10 A grades', shortLabel: '10', unit: 'A grades' },
      { threshold: 25, label: 'Earned 25 A grades', shortLabel: '25', unit: 'A grades' },
      {
        threshold: 50,
        label: 'Earned 50 A grades',
        shortLabel: '50',
        unit: 'A grades',
        iconName: 'award',
      },
    ],
  },
];

/**
 * Get a single badge definition by ID
 */
export const getBadgeDefinition = (badgeId: BadgeId): TieredBadgeDefinition | undefined => {
  return badgeDefinitions.find((b) => b.id === badgeId);
};

/**
 * Get all tiers for a specific badge with their details
 */
export const getBadgeTiers = (badgeId: BadgeId): BadgeTier[] => {
  const badge = getBadgeDefinition(badgeId);
  return badge?.tiers || [];
};

/**
 * Evaluate all badges based on user stats
 */
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
    const description = unlocked ? currentTier?.label ?? '' : 'Not yet achieved';
    const requirement = nextTier ? `Next: ${nextTier.label}` : 'Max tier achieved';

    // Compact display fields
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
      currentValueLabel,
      progressRatio,
      nextThreshold: nextTier?.threshold ?? value,
      remainingToNext,
    };
  });
};
