'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { profileStatsService, type UserStats } from '@/lib/api/profileStatsService';
import { evaluateBadges, type BadgeState } from '@/lib/api/badges';
import { Flame, Book, CheckCircle, Sparkles, Trophy, Star, Target, LogOut, Loader2, Edit2, Shield, FileText, HelpCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickStats } from '@/components/profile/QuickStats';
import { BadgesGrid } from '@/components/profile/BadgesGrid';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useScreenRefresh } from '@/hooks/useScreenRefresh';
import { getSupabaseClient } from '@/lib/supabase/client';

interface Profile {
  full_name: string;
  email: string;
  avatar_url: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'settings' | 'stats'>('stats');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [badges, setBadges] = useState<BadgeState[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', user.id)
        .single<Profile>();

      if (data && !error) {
        setProfile({
          full_name: data.full_name || user.email?.split('@')[0] || 'User',
          email: data.email || user.email || '',
          avatar_url: data.avatar_url || '',
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  }, [user]);

  const loadStats = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await loadProfile();
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
  }, [user, loadProfile]);

  const refreshStats = useCallback(async () => {
    if (!user) return;
    try {
      await loadProfile();
      const { data: statsData, error } = await profileStatsService.getUserStats(user.id);
      if (statsData && !error) {
        setStats(statsData);
        const evaluatedBadges = evaluateBadges(statsData);
        setBadges(evaluatedBadges);
      }
    } catch (err) {
      console.error('Error refreshing stats:', err);
    }
  }, [user, loadProfile]);

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
    await signOut();
    router.push('/login');
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
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary overflow-hidden">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-primary" />
            )}
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
          <h1 className="text-2xl font-bold text-white">{profile?.full_name || 'User'}</h1>
          <p className="text-gray-400 text-sm">{profile?.email}</p>
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
            onClick={() => window.open('/help', '_blank')}
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

          <div className="pt-6 flex justify-center">
            <Button
              onClick={() => setShowSignOutDialog(true)}
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

      {/* Sign Out Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showSignOutDialog}
        onClose={() => setShowSignOutDialog(false)}
        onConfirm={handleSignOut}
        title="Sign Out"
        description="Are you sure you want to sign out? You'll need to sign in again to access your account."
        confirmText="Sign Out"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
