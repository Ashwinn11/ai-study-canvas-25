'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { examsService, type ExamWithSeeds } from '@/lib/api/examsService';
import { profileStatsService } from '@/lib/api/profileStatsService';
import { spacedRepetitionService, type ReviewStats } from '@/lib/api/spacedRepetitionService';
import { useScreenRefresh } from '@/hooks/useScreenRefresh';
import {
  ArrowRight,
  BookOpen,
  Flame,
  Zap,
  Plus,
  Cloud,
  Loader2,
  CheckCircle,
  PlayCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface DashboardStats {
  currentStreak: number;
  cardsReviewedToday: number;
  dailyGoal: number;
  minutesStudiedToday: number;
  xp: number;
  loading: boolean;
  goalMet: boolean;
}

interface ExamCard extends ExamWithSeeds {
  seedCount: number;
  reviewStats?: ReviewStats;
  averageGrade?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    currentStreak: 0,
    cardsReviewedToday: 0,
    dailyGoal: 20,
    minutesStudiedToday: 0,
    xp: 0,
    loading: true,
    goalMet: false,
  });

  const [exams, setExams] = useState<ExamCard[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);

  // Greeting text based on time
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    const firstName = profile?.full_name?.split(' ')[0] || 'there';

    if (hour < 12)
      return {
        title: `Good morning, ${firstName}!`,
        subtitle: 'Ready to master something new?',
      };
    if (hour < 17)
      return {
        title: `Good afternoon, ${firstName}!`,
        subtitle: 'Keep the momentum going',
      };
    return {
      title: `Good evening, ${firstName}!`,
      subtitle: 'Finish your day strong',
    };
  }, [profile?.full_name]);

  const loadStats = useCallback(async () => {
    if (!user) return;

    try {
      const userStats = await profileStatsService.getUserStats(user.id);
      const data = (userStats as any)?.data;

      setStats({
        currentStreak: data?.current?.currentStreak || 0,
        cardsReviewedToday: data?.today?.cardsReviewedToday || 0,
        dailyGoal: data?.preferences?.dailyCardsGoal || 20,
        minutesStudiedToday: data?.today?.minutesStudiedToday || 0,
        xp: data?.current?.xp || 0,
        goalMet: (data?.today?.goalProgress || 0) >= 1,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  }, [user]);

  const loadExams = useCallback(async () => {
    if (!user) return;

    setExamsLoading(true);
    try {
      const { exams: loadedExams, error } = await examsService.getExamsWithStats(user.id);

      if (error || !loadedExams) {
        console.error('Error loading exams:', error);
        setExams([]);
        return;
      }

      // Load review stats and average grades for each exam
      const examsWithStats = await Promise.all(
        loadedExams.map(async (exam) => {
          const reviewStats = await spacedRepetitionService.getReviewStatsForExam(user.id, exam.id);
          return {
            ...exam,
            reviewStats,
            averageGrade: reviewStats?.averageGrade,
          };
        })
      );

      setExams(examsWithStats);
    } catch (error) {
      console.error('Failed to load exams:', error);
      setExams([]);
    } finally {
      setExamsLoading(false);
    }
  }, [user]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadStats(), loadExams()]);
  }, [loadStats, loadExams]);

  useScreenRefresh({
    screenName: user ? `dashboard-${user.id}` : 'dashboard',
    refreshFn: refreshAll,
    refreshOnMount: false,
    refreshOnFocus: true,
  });

  useEffect(() => {
    if (!user) return;
    loadStats();
    loadExams();
  }, [user, loadStats, loadExams]);

  const handleExamPress = (exam: ExamCard) => {
    const stats = exam.reviewStats;

    // If no materials, go to detail to upload
    if (exam.seeds.length === 0) {
      router.push(`/exams/${exam.id}`);
      return;
    }

    // If no reviews due, show detail
    if (!stats || (stats.dueToday === 0 && stats.overdue === 0)) {
      router.push(`/exams/${exam.id}`);
      return;
    }

    // Otherwise start review session
    router.push(`/exams/${exam.id}/review?mode=review`);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Please sign in to view your dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">{greetingText.title}</h1>
          <p className="mt-1 text-gray-400">{greetingText.subtitle}</p>
        </div>
        <Link href="/profile">
          <Button variant="ghost" size="icon">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <span className="text-white font-semibold">
                  {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
          </Button>
        </Link>
      </div>

      {/* Daily Progress Card */}
      {stats.loading ? (
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-xl p-8 h-48 animate-pulse" />
      ) : (
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-xl p-8 space-y-6">
          {/* Streak & Goal Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">
                {stats.goalMet ? '🔥' : '⚡'}
              </div>
              <div>
                <p className="text-sm text-gray-400">Current Streak</p>
                <p className="text-2xl font-bold text-white">{stats.currentStreak} Days</p>
              </div>
            </div>
            {stats.goalMet ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm font-semibold text-green-400">Goal Crushed!</span>
              </div>
            ) : (
              <div className="text-right">
                <p className="text-sm text-gray-400">Today's Goal</p>
                <p className="text-lg font-semibold text-white">
                  {stats.cardsReviewedToday} / {stats.dailyGoal}
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/50 transition-all duration-500"
                style={{
                  width: `${Math.min(
                    (stats.cardsReviewedToday / Math.max(stats.dailyGoal, 1)) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-white/5 p-3">
              <p className="text-xs text-gray-400">Cards Reviewed</p>
              <p className="text-xl font-bold text-white mt-1">{stats.cardsReviewedToday}</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3">
              <p className="text-xs text-gray-400">Time Studied</p>
              <p className="text-xl font-bold text-white mt-1">{stats.minutesStudiedToday}m</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3">
              <p className="text-xs text-gray-400">XP Earned</p>
              <p className="text-xl font-bold text-white mt-1">{stats.xp}</p>
            </div>
          </div>
        </div>
      )}

      {/* Your Exams Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Your Exams</h2>
          <Link href="/exams/create">
            <Button variant="ghost" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              New Exam
            </Button>
          </Link>
        </div>

        {examsLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="min-w-64 h-40 rounded-xl bg-white/5 border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : exams.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-12 text-center space-y-4">
            <BookOpen className="w-16 h-16 text-primary/40 mx-auto" />
            <div>
              <h3 className="text-xl font-semibold text-white">No Exams Yet</h3>
              <p className="text-gray-400 mt-2">Create your first exam to get started</p>
            </div>
            <Link href="/exams/create">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Exam
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {exams.map((exam) => {
              const stats = exam.reviewStats;
              const isDue = stats && (stats.dueToday > 0 || stats.overdue > 0);
              const needsMaterial = exam.seeds.length === 0;

              return (
                <button
                  key={exam.id}
                  onClick={() => handleExamPress(exam)}
                  className="min-w-64 group rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 backdrop-blur-xl overflow-hidden transition-all"
                >
                  {/* Header with gradient */}
                  <div className="h-24 bg-gradient-to-br from-primary/40 to-primary/20 p-4 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-white line-clamp-1">
                          {exam.subject_name}
                        </p>
                        <p className="text-xs text-gray-300">
                          {exam.seeds.length} {exam.seeds.length === 1 ? 'Topic' : 'Topics'}
                        </p>
                      </div>
                    </div>
                    {exam.averageGrade && (
                      <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur">
                        <p className="text-xs font-semibold text-white">
                          {exam.averageGrade}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-4">
                    {needsMaterial ? (
                      <div className="flex items-center gap-2 text-primary">
                        <Cloud className="w-4 h-4" />
                        <span className="text-sm font-medium">Add materials</span>
                      </div>
                    ) : isDue ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Cards Due</span>
                          <span className="font-semibold text-white">
                            {stats.dueToday + stats.overdue}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary/50"
                            style={{
                              width: `${Math.min(
                                ((stats.dueToday + stats.overdue) /
                                  Math.max(stats.totalItems, 1)) *
                                  100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <PlayCircle className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-primary">Review Due</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">All caught up!</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Add Exam Button */}
            <Link
              href="/exams/create"
              className="min-w-64 group rounded-xl border border-dashed border-white/20 hover:border-primary/50 bg-white/5 hover:bg-white/10 backdrop-blur-xl flex items-center justify-center transition-all"
            >
              <div className="flex flex-col items-center gap-2">
                <Plus className="w-8 h-8 text-white/50 group-hover:text-primary" />
                <span className="text-sm font-medium text-white/50 group-hover:text-primary">
                  Add Exam
                </span>
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <Link
          href="/upload"
          className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 backdrop-blur-xl p-6 transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <Cloud className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Upload Material</h3>
              <p className="text-sm text-gray-400 mt-1">Add new study content</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors ml-auto self-center" />
          </div>
        </Link>

        <Link
          href="/seeds"
          className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 backdrop-blur-xl p-6 transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/30 transition-colors">
              <BookOpen className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Study Materials</h3>
              <p className="text-sm text-gray-400 mt-1">Browse your materials</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors ml-auto self-center" />
          </div>
        </Link>

        <Link
          href="/exams"
          className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 backdrop-blur-xl p-6 transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-info/20 flex items-center justify-center group-hover:bg-info/30 transition-colors">
              <Zap className="w-6 h-6 text-info" />
            </div>
            <div>
              <h3 className="font-semibold text-white">All Exams</h3>
              <p className="text-sm text-gray-400 mt-1">Manage your exams</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors ml-auto self-center" />
          </div>
        </Link>
      </div>
    </div>
  );
}
