'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, Sparkles, Flame, Star, CheckCircle, Trophy, Award, Diamond, Rocket, Medal, Ribbon, Pencil, FileText } from 'lucide-react';
import type { BadgeState } from '@/lib/api/badges';
import { getBadgeTiers } from '@/lib/api/badges';

interface BadgesGridProps {
  badges: BadgeState[];
}

const getBadgeIcon = (iconName: string, className: string = "w-6 h-6") => {
  const iconProps = { className };
  switch (iconName) {
    case 'sparkles':
      return <Sparkles {...iconProps} />;
    case 'flame':
      return <Flame {...iconProps} />;
    case 'star':
      return <Star {...iconProps} />;
    case 'check-circle':
      return <CheckCircle {...iconProps} />;
    case 'trophy':
      return <Trophy {...iconProps} />;
    case 'award':
      return <Award {...iconProps} />;
    case 'diamond':
      return <Diamond {...iconProps} />;
    case 'rocket':
      return <Rocket {...iconProps} />;
    case 'medal':
      return <Medal {...iconProps} />;
    case 'ribbon':
      return <Ribbon {...iconProps} />;
    case 'pencil':
      return <Pencil {...iconProps} />;
    case 'create':
      return <FileText {...iconProps} />;
    default:
      return <Star {...iconProps} />;
  }
};

export function BadgesGrid({ badges }: BadgesGridProps) {
  const [selectedBadge, setSelectedBadge] = useState<BadgeState | null>(null);

  if (badges.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No achievements yet. Start learning!</p>
      </div>
    );
  }

  return (
    <>
      {/* Badge Grid */}
      <div className="grid grid-cols-2 gap-3">
        {badges.map((badge) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            onPress={() => setSelectedBadge(badge)}
          />
        ))}
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <BadgeDetailModal
          badge={selectedBadge}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </>
  );
}

interface BadgeCardProps {
  badge: BadgeState;
  onPress: () => void;
}

function BadgeCard({ badge, onPress }: BadgeCardProps) {
  const isUnlocked = badge.unlocked;
  const isMaxed = badge.level === badge.maxLevel;

  return (
    <button
      onClick={onPress}
      className={`rounded-xl border p-4 text-left transition-all hover:scale-[1.02] min-h-[160px] flex flex-col items-center justify-center relative overflow-hidden group ${
        isUnlocked
          ? 'border-white/20 bg-white/5'
          : 'border-white/5 bg-white/[0.02]'
      }`}
      style={
        isUnlocked
          ? {
              backgroundImage: `linear-gradient(135deg, ${badge.color}15, ${badge.color}05)`,
            }
          : undefined
      }
    >
      {/* Icon Circle */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all"
        style={{
          backgroundColor: isUnlocked ? badge.color : 'rgb(75, 85, 99)',
        }}
      >
        <div className="text-white">
          {getBadgeIcon(badge.iconName, "w-6 h-6")}
        </div>

        {/* Tier Badge */}
        {isUnlocked && (
          <div
            className="absolute bottom-0 right-0 transform translate-x-1 translate-y-1 w-5 h-5 rounded-full border-2 border-gray-900 flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: badge.color }}
          >
            {badge.level}
          </div>
        )}
      </div>

      {/* Badge Name */}
      <div className="text-white font-semibold text-sm text-center mb-1">
        {badge.name}
      </div>

      {/* Status */}
      <div className="text-xs text-gray-400 text-center">
        {isUnlocked ? (isMaxed ? 'Completed!' : 'In Progress') : 'Locked'}
      </div>

      {/* Progress Bar */}
      {isUnlocked && !isMaxed && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
          <div
            className="h-full transition-all"
            style={{
              width: `${(badge.level / badge.maxLevel) * 100}%`,
              backgroundColor: badge.color,
            }}
          />
        </div>
      )}

      {isMaxed && (
        <div
          className="absolute bottom-0 left-0 w-full h-1"
          style={{ backgroundColor: badge.color }}
        />
      )}
    </button>
  );
}

interface BadgeDetailModalProps {
  badge: BadgeState;
  onClose: () => void;
}

function BadgeDetailModal({ badge, onClose }: BadgeDetailModalProps) {
  const isUnlocked = badge.unlocked;
  const tiers = useMemo(() => getBadgeTiers(badge.id), [badge.id]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/10 p-6 max-w-md w-full space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">{badge.name}</h2>

          {/* Large Icon */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-lg"
            style={{ backgroundColor: isUnlocked ? badge.color : 'rgb(75, 85, 99)' }}
          >
            {getBadgeIcon(badge.iconName, "w-10 h-10")}
          </div>

          {/* Status Badge */}
          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wide"
            style={{
              backgroundColor: isUnlocked ? `${badge.color}20` : 'rgb(55, 65, 81)',
              color: isUnlocked ? badge.color : 'rgb(156, 163, 175)',
            }}
          >
            {isUnlocked ? `Level ${badge.level} / ${badge.maxLevel}` : 'Locked'}
          </div>
        </div>

        {/* Tiers Timeline */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-300">Progress</h3>

          {tiers.map((tier, idx) => {
            const isCompleted = badge.level >= idx + 1;
            const isNext = !isCompleted && badge.level === idx;

            return (
              <div key={idx} className="flex items-start gap-4">
                {/* Timeline Circle */}
                <div className="flex flex-col items-center pt-1">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                      isCompleted
                        ? 'border-green-500 bg-green-500/10'
                        : isNext
                          ? `border-[${badge.color}] bg-white/5`
                          : 'border-gray-600 bg-transparent'
                    }`}
                    style={
                      isNext
                        ? { borderColor: badge.color, backgroundColor: `${badge.color}10` }
                        : undefined
                    }
                  >
                    {isCompleted && <CheckCircle className="w-4 h-4 text-green-400" />}
                    {isNext && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: badge.color }}
                      />
                    )}
                  </div>

                  {/* Timeline Line */}
                  {idx < tiers.length - 1 && (
                    <div
                      className={`w-0.5 h-8 mt-1 ${
                        isCompleted
                          ? 'bg-green-500/30'
                          : 'bg-gray-700'
                      }`}
                    />
                  )}
                </div>

                {/* Tier Content */}
                <div className="flex-1 pt-1">
                  <p
                    className={`text-sm font-medium ${
                      isCompleted || isNext
                        ? 'text-white'
                        : 'text-gray-500'
                    }`}
                  >
                    {tier.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isCompleted ? 'Completed' : isNext ? 'Next goal' : 'Locked'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-2 px-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}
