'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { profileStatsService } from '@/lib/api/profileStatsService';
import { streakService } from '@/lib/api/streakService';
import { seedsService } from '@/lib/api/seedsService';
import { spacedRepetitionService } from '@/lib/api/spacedRepetitionService';
import { useScreenRefresh } from '@/hooks/useScreenRefresh';
import { Upload, BookOpen, GraduationCap, Flame, TrendingUp, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalSeeds: number;
  dueFlashcards: number;
  streak: number;
  accuracy: number;
  xp: number;
  loading: boolean;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSeeds: 0,
    dueFlashcards: 0,
    streak: 0,
    accuracy: 0,
    xp: 0,
    loading: true,
  });

  const loadStats = useCallback(async () => {
    if (!user) return;

    try {
      const [userStats, streakData, seedCounts, reviewStats] = await Promise.all([
        profileStatsService.getUserStats(user.id),
        streakService.getCurrentStreak(user.id),
        seedsService.getSeedCounts(),
        spacedRepetitionService.getReviewStatistics(user.id),
      ]);

      setStats({
        totalSeeds: seedCounts.total || 0,
        dueFlashcards: reviewStats?.data?.dueToday || 0,
        streak: streakData || 0,
        accuracy: userStats?.data?.accuracy || 0,
        xp: userStats?.data?.current?.xp || 0,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  const refreshStats = useCallback(async () => {
    if (!user) return;
    try {
      const [userStats, streakData, seedCounts, reviewStats] = await Promise.all([
        profileStatsService.getUserStats(user.id),
        streakService.getCurrentStreak(user.id),
        seedsService.getSeedCounts(),
        spacedRepetitionService.getReviewStatistics(user.id),
      ]);

      setStats(prev => ({
        totalSeeds: seedCounts.total || 0,
        dueFlashcards: reviewStats?.data?.dueToday || 0,
        streak: streakData || 0,
        accuracy: userStats?.data?.accuracy || 0,
        xp: userStats?.data?.current?.xp || 0,
        loading: false,
      }));
    } catch (error) {
      console.error('Failed to refresh dashboard stats:', error);
    }
  }, [user]);

  useScreenRefresh({
    screenName: user ? `dashboard-${user.id}` : 'dashboard',
    refreshFn: refreshStats,
    refreshOnMount: false,
    refreshOnFocus: false,
  });

  useEffect(() => {
    if (!user) return;

    setStats(prev => ({ ...prev, loading: true }));
    loadStats();
  }, [user, loadStats]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Please sign in to view your dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user.email?.split('@')[0]}!</h1>
        <p className="mt-2 text-muted-foreground">
          Here's an overview of your learning progress
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.loading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-lg border border-border bg-card p-6 shadow-sm animate-pulse">
                <div className="h-8 bg-muted rounded mb-2 w-2/3"></div>
                <div className="h-10 bg-muted rounded mb-2"></div>
              </div>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Total Seeds"
              value={stats.totalSeeds.toString()}
              description="Study materials uploaded"
              icon={<BookOpen className="w-6 h-6" />}
            />
            <StatCard
              title="Due Review"
              value={stats.dueFlashcards.toString()}
              description="Cards ready for review"
              icon={<TrendingUp className="w-6 h-6" />}
            />
            <StatCard
              title="Learning Streak"
              value={`${stats.streak} days`}
              description="Keep it up!"
              icon={<Flame className="w-6 h-6 text-orange-500" />}
            />
            <StatCard
              title="Accuracy"
              value={`${Math.round(stats.accuracy)}%`}
              description="Overall performance"
              icon={<TrendingUp className="w-6 h-6 text-green-500" />}
            />
          </>
        )}
      </div>

      {/* XP Progress */}
      {!stats.loading && stats.xp > 0 && (
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">✨</span>
            <h3 className="text-lg font-semibold">Experience Points</h3>
          </div>
          <p className="text-3xl font-bold text-primary">{stats.xp} XP</p>
          <p className="text-sm text-muted-foreground mt-1">Keep learning to earn more rewards!</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <QuickActionCard
            title="Upload Material"
            description="Add new study content"
            href="/upload"
            icon={<Upload className="w-8 h-8" />}
            colorScheme="pink"
          />
          <QuickActionCard
            title="Practice Flashcards"
            description="Review due cards"
            href="/seeds"
            icon={<BookOpen className="w-8 h-8" />}
            colorScheme="purple"
          />
          <QuickActionCard
            title="Create Exam"
            description="Organize your materials"
            href="/exams"
            icon={<GraduationCap className="w-8 h-8" />}
            colorScheme="blue"
          />
        </div>
      </div>

      {/* Motivation Section */}
      {stats.totalSeeds === 0 && !stats.loading && (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Get Started with Your First Material</h3>
          <p className="text-muted-foreground mb-4">
            Upload a PDF, image, or paste text to start building your personalized study materials.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center justify-center px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Upload Your First Material
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          {icon && <div className="text-muted-foreground/60">{icon}</div>}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  href,
  icon,
  colorScheme = 'pink',
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  colorScheme?: 'pink' | 'purple' | 'blue';
}) {
  const colorClasses = {
    pink: 'border-pink-300 bg-pink-100 hover:bg-pink-200',
    purple: 'border-purple-300 bg-purple-100 hover:bg-purple-200',
    blue: 'border-blue-300 bg-blue-100 hover:bg-blue-200',
  };

  const iconColorClasses = {
    pink: 'text-pink-600 group-hover:text-pink-700',
    purple: 'text-purple-600 group-hover:text-purple-700',
    blue: 'text-blue-600 group-hover:text-blue-700',
  };

  return (
    <Link
      href={href}
      className={`group rounded-lg border-2 shadow-lg p-6 transition-all hover:shadow-xl ${colorClasses[colorScheme]}`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 transition-colors ${iconColorClasses[colorScheme]}`}>
          {icon}
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-gray-800 transition-colors">
            {title}
          </p>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </Link>
  );
}
