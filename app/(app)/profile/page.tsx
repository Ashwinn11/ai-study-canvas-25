'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { profileStatsService, type UserStats } from '@/lib/api/profileStats';
import { evaluateBadges, type BadgeState } from '@/lib/api/badges';
import { Flame, Book, CheckCircle, Sparkles, Trophy, Star, Target, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'settings' | 'stats'>('stats');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [badges, setBadges] = useState<BadgeState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<BadgeState | null>(null);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: statsData, error } = await profileStatsService.getUserStats(user.id);
      if (statsData && !error) {
        setStats(statsData);
        const evaluatedBadges = evaluateBadges(statsData);
        setBadges(evaluatedBadges);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
      router.push('/login');
    }
  };

  const getIconForBadge = (iconName: string) => {
    switch (iconName) {
      case 'sparkles':
        return <Sparkles className="h-6 w-6" />;
      case 'flame':
        return <Flame className="h-6 w-6" />;
      case 'star':
        return <Star className="h-6 w-6" />;
      case 'check-circle':
        return <CheckCircle className="h-6 w-6" />;
      case 'trophy':
        return <Trophy className="h-6 w-6" />;
      default:
        return <Star className="h-6 w-6" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header with Avatar */}
      <div className="flex flex-col items-center space-y-4 pt-6">
        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-4xl">👤</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">{user?.email?.split('@')[0] || 'User'}</h1>
          <p className="text-gray-400 text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 bg-white/5 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            activeTab === 'settings'
              ? 'bg-white/10 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            activeTab === 'stats' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Stats
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'settings' ? (
        <div className="space-y-3">
          <button className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <span className="text-lg">💳</span>
              </div>
              <span className="text-white font-medium">Subscription</span>
            </div>
          </button>

          <button className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <span className="text-lg">❓</span>
              </div>
              <span className="text-white font-medium">Help & Support</span>
            </div>
          </button>

          <button className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                <span className="text-lg">🔔</span>
              </div>
              <span className="text-white font-medium">Notifications</span>
            </div>
          </button>

          <div className="pt-6 flex justify-center">
            <Button
              onClick={handleSignOut}
              variant="destructive"
              className="gap-2 min-w-[200px]"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : stats ? (
            <>
              {/* Daily Goal Progress */}
              <div className={`rounded-xl border p-4 ${
                stats.cardsReviewedToday >= stats.dailyCardsGoal
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-white/5 border-white/10'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <span className="text-white font-semibold">Today's Goal</span>
                  </div>
                  <span className="text-white font-bold">
                    {stats.cardsReviewedToday}/{stats.dailyCardsGoal}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      stats.cardsReviewedToday >= stats.dailyCardsGoal
                        ? 'bg-green-500'
                        : 'bg-primary'
                    }`}
                    style={{
                      width: `${Math.min(100, (stats.cardsReviewedToday / stats.dailyCardsGoal) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-sm text-gray-400">
                  {stats.cardsReviewedToday >= stats.dailyCardsGoal
                    ? '🎉 Goal achieved! Keep your streak going'
                    : `${stats.dailyCardsGoal - stats.cardsReviewedToday} cards left to maintain streak 🔥`}
                </p>
              </div>

              {/* Quick Stats - 3x2 Grid */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: <Flame className="h-6 w-6" />, value: stats.currentStreak, label: 'Day Streak', color: 'text-red-400' },
                  { icon: <Book className="h-6 w-6" />, value: stats.totalCards, label: 'Reviewed', color: 'text-blue-400' },
                  { icon: <CheckCircle className="h-6 w-6" />, value: `${stats.accuracy}%`, label: 'Accuracy', color: 'text-green-400' },
                  { icon: <Sparkles className="h-6 w-6" />, value: stats.totalSeeds, label: 'Materials', color: 'text-yellow-400' },
                  { icon: <Trophy className="h-6 w-6" />, value: stats.totalAGrades, label: 'A+ Grades', color: 'text-purple-400' },
                  { icon: <Star className="h-6 w-6" />, value: stats.averageGrade, label: 'Avg Grade', color: 'text-primary' },
                ].map((stat, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col items-center justify-center min-h-[110px]"
                  >
                    <div className={stat.color}>{stat.icon}</div>
                    <div className="text-2xl font-bold text-white mt-2">{stat.value}</div>
                    <div className="text-xs text-gray-400 text-center mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Achievements Section */}
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-white">Achievements</h2>
                {badges.map((badge) => (
                  <button
                    key={badge.id}
                    onClick={() => setSelectedBadge(badge)}
                    className={`w-full rounded-xl border p-4 text-left transition-all hover:scale-[1.01] ${
                      badge.unlocked
                        ? 'border-white/20 bg-white/5'
                        : 'border-white/5 bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="relative w-11 h-11 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: badge.unlocked ? badge.color : 'rgb(75, 85, 99)',
                        }}
                      >
                        <div className="text-white">{getIconForBadge(badge.iconName)}</div>
                        <div
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border-2 border-gray-900"
                          style={{
                            backgroundColor: badge.unlocked ? 'rgb(34, 197, 94)' : 'rgb(75, 85, 99)',
                            color: 'white',
                          }}
                        >
                          {badge.level}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-semibold">{badge.name}</div>
                        <div className="text-sm text-gray-400">
                          {badge.unlocked ? badge.currentLabel : 'Locked'}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">No stats available</div>
          )}
        </div>
      )}

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/10 p-6 max-w-md w-full space-y-6">
            <h2 className="text-2xl font-bold text-white">{selectedBadge.name}</h2>

            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-2xl"
              style={{ backgroundColor: selectedBadge.color }}
            >
              <div className="text-white text-3xl">{getIconForBadge(selectedBadge.iconName)}</div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-300">Progress</h3>
              {badges
                .find((b) => b.id === selectedBadge.id)
                ?.maxLevel &&
                Array.from({
                  length: badges.find((b) => b.id === selectedBadge.id)!.maxLevel,
                }).map((_, index) => {
                  const tierNum = index + 1;
                  const isUnlocked = selectedBadge.level >= tierNum;
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-white/10 last:border-0"
                    >
                      <span
                        className={`text-sm ${
                          isUnlocked ? 'text-white font-semibold' : 'text-gray-500'
                        }`}
                      >
                        Tier {tierNum}
                      </span>
                      {isUnlocked ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-600" />
                      )}
                    </div>
                  );
                })}
            </div>

            <Button onClick={() => setSelectedBadge(null)} className="w-full" variant="outline">
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
