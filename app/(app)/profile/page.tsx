'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { profileStatsService, type UserStats } from '@/lib/api/profileStatsService';
import { evaluateBadges, type BadgeState } from '@/lib/api/badges';
import { Flame, Book, CheckCircle, Sparkles, Trophy, Star, Target, LogOut, Loader2, Edit2, Shield, FileText, Trash2, Bell, BarChart3, HelpCircle, CreditCard, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickStats } from '@/components/profile/QuickStats';
import { BadgesGrid } from '@/components/profile/BadgesGrid';
import { useScreenRefresh } from '@/hooks/useScreenRefresh';

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'settings' | 'stats'>('stats');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [badges, setBadges] = useState<BadgeState[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
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
  }, [user]);

  const refreshStats = useCallback(async () => {
    if (!user) return;
    try {
      const { data: statsData, error } = await profileStatsService.getUserStats(user.id);
      if (statsData && !error) {
        setStats(statsData);
        const evaluatedBadges = evaluateBadges(statsData);
        setBadges(evaluatedBadges);
      }
    } catch (err) {
      console.error('Error refreshing stats:', err);
    }
  }, [user]);

  useScreenRefresh({
    screenName: user ? `profile-${user.id}` : 'profile',
    refreshFn: refreshStats,
    refreshOnMount: false,
    refreshOnFocus: true,
  });

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user, loadStats]);

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
      router.push('/login');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    const confirmed = confirm(
      'Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.'
    );

    if (!confirmed) return;

    const doubleConfirm = confirm('This is your final warning. Delete account?');
    if (!doubleConfirm) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        alert('Failed to delete account. Please try again.');
        return;
      }

      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('An error occurred while deleting your account.');
    } finally {
      setIsLoading(false);
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

  const cardsReviewedToday = stats?.today?.cardsReviewedToday ?? stats?.cardsReviewedToday ?? 0;
  const dailyCardsGoal = stats?.preferences?.dailyCardsGoal ?? stats?.dailyCardsGoal ?? 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header with Avatar and XP Badge */}
      <div className="flex flex-col items-center space-y-4 pt-6">
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
            <User className="w-12 h-12 text-primary" />
          </div>
          {/* XP Badge Overlay */}
          {stats && (
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/3 bg-white/10 backdrop-blur border border-white/20 px-3 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-white font-bold text-xs">
                {(stats.current?.xp ?? 0).toLocaleString()} XP
              </span>
            </div>
          )}
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
          <button
            onClick={() => router.push('/profile/edit')}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <Edit2 className="h-5 w-5" />
                </div>
                <span className="text-white font-medium">Edit Profile</span>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </button>

          <button
            onClick={() => alert('Subscription management coming soon')}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <CreditCard className="h-5 w-5" />
                </div>
                <span className="text-white font-medium">Subscription</span>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </button>

          <button
            onClick={() => window.open('https://help.masterly.app', '_blank')}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <span className="text-white font-medium">Help & Support</span>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </button>

          <button
            onClick={() => alert('Notification settings coming soon')}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                  <Bell className="h-5 w-5" />
                </div>
                <span className="text-white font-medium">Notifications</span>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </button>

          <button
            onClick={() => alert('Data & privacy settings coming soon')}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <span className="text-white font-medium">Data & Privacy</span>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </button>

          <button
            onClick={() => window.open('/terms', '_blank')}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-white font-medium">Terms of Service</span>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </button>

          <button
            onClick={() => window.open('/privacy', '_blank')}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-600 flex items-center justify-center">
                  <Shield className="h-5 w-5" />
                </div>
                <span className="text-white font-medium">Privacy Policy</span>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </button>

          <button
            onClick={handleDeleteAccount}
            disabled={isLoading}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-red-500/10 transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                  <Trash2 className="h-5 w-5" />
                </div>
                <span className="text-white font-medium">Delete Account</span>
              </div>
              <span className="text-gray-400">→</span>
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
              {/* Quick Stats */}
              <QuickStats
                currentStreak={
                  stats.current?.currentStreak ??
                  stats.currentCommitmentStreak ??
                  stats.currentStreak ??
                  0
                }
                cardsReviewed={
                  stats.historical?.totalCardsReviewed ??
                  stats.totalCards ??
                  0
                }
                averageGrade={stats.averageGrade}
              />

              {/* Daily Goal Progress */}
                <div className={`rounded-xl border p-4 ${
                  dailyCardsGoal > 0 && cardsReviewedToday >= dailyCardsGoal
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-white/5 border-white/10'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      <span className="text-white font-semibold">Today's Goal</span>
                    </div>
                    <span className="text-white font-bold">
                      {cardsReviewedToday}/{dailyCardsGoal}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        dailyCardsGoal > 0 && cardsReviewedToday >= dailyCardsGoal
                          ? 'bg-green-500'
                          : 'bg-primary'
                      }`}
                      style={{
                        width: dailyCardsGoal > 0
                          ? `${Math.min(100, (cardsReviewedToday / dailyCardsGoal) * 100)}%`
                          : '0%'
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-400 flex items-center gap-1">
                    {dailyCardsGoal > 0 && cardsReviewedToday >= dailyCardsGoal ? (

                    <>
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      Goal achieved! Keep your streak going
                    </>
                  ) : (
                    <>
                      {Math.max(0, dailyCardsGoal - cardsReviewedToday)} cards left to maintain streak
                      <Flame className="w-4 h-4 text-orange-500" />
                    </>
                  )}
                </p>
              </div>

              {/* Achievements Section */}
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-white">Achievements</h2>
                <BadgesGrid badges={badges} />
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">No stats available</div>
          )}
        </div>
      )}

    </div>
  );
}
