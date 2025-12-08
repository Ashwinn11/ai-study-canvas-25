
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { examsService, type ExamWithSeeds } from '@/lib/api/examsService';
import { spacedRepetitionService } from '@/lib/api/spacedRepetitionService';
import { ArrowLeft, Loader2, Pencil, Trash2, PlayCircle, BookOpen, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showDeleteConfirm } from '@/lib/utils/confirmationUtils';

export default function ExamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const examId = params.id as string;

  const [exam, setExam] = useState<ExamWithSeeds | null>(null);
  const [reviewStats, setReviewStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExamData = useCallback(async () => {
    if (!user || !examId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load exam with seeds
      const { examWithSeeds, error: examError } = await examsService.getExamWithSeeds(examId);

      if (examError || !examWithSeeds) {
        setError(examError || 'Exam not found');
        setIsLoading(false);
        return;
      }

      setExam(examWithSeeds);

      // Load review stats
      // Initialize Supabase client (required for React Native-based service)
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      spacedRepetitionService.setSupabase(supabase);
      
      const stats = await spacedRepetitionService.getReviewStatsForExam(user.id, examId);
      setReviewStats(stats);

      setIsLoading(false);
    } catch (err) {
      console.error('Error loading exam data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load exam');
      setIsLoading(false);
     }
  }, [user, examId]);

  useEffect(() => {
    if (user && examId) {
      loadExamData();
    }
  }, [user, examId, loadExamData]);

  const handleStartReview = (isPracticeMode: boolean) => {
    router.push(`/exams/${examId}/review?mode=${isPracticeMode ? 'practice' : 'review'}`);
  };

  const handleDeleteExam = async () => {
    if (!await showDeleteConfirm(`Are you sure you want to delete "${exam?.subject_name}"? This will remove the exam but keep all study materials.`)) {
      return;
    }

    const { error } = await examsService.deleteExam(examId);
    if (error) {
      alert('Failed to delete exam. Please try again.');
      return;
    }

    router.push('/exams');
  };

  const handleSeedClick = (seedId: string) => {
    router.push(`/seeds/${seedId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading exam...</span>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/exams')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Exams
        </Button>

        <div className="rounded-lg border border-red-500/20 bg-red-500/10 backdrop-blur-xl p-8">
          <div className="text-center space-y-4">
            <p className="text-red-500 font-medium">{error || 'Exam not found'}</p>
            <Button onClick={loadExamData} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hasReviewItems = reviewStats && reviewStats.totalItems > 0;
  const hasDueItems = reviewStats && (reviewStats.dueToday > 0 || reviewStats.overdue > 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/exams')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Exams
        </Button>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleDeleteExam}>
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-white">{exam.subject_name}</h1>

      {/* Review Stats Card */}
      {exam.seeds.length > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-xl p-6 space-y-6">
          {hasReviewItems ? (
            <>
              {/* Stats Pills - 3 columns */}
              <div className="grid grid-cols-3 gap-4">
                {/* Overdue Cards */}
                <div
                  className={`rounded-lg p-4 ${
                    reviewStats.overdue > 0
                      ? 'bg-primary/10 border border-primary/20'
                      : 'bg-white/5'
                  }`}
                >
                  <div className="text-sm text-gray-400 mb-1">Overdue cards</div>
                  <div
                    className={`text-2xl font-bold ${
                      reviewStats.overdue > 0 ? 'text-primary' : 'text-white'
                    }`}
                  >
                    {reviewStats.overdue}
                  </div>
                </div>

                {/* Due Today */}
                <div className="rounded-lg bg-white/5 p-4">
                  <div className="text-sm text-gray-400 mb-1">Today due</div>
                  <div className="text-2xl font-bold text-white">{reviewStats.dueToday}</div>
                </div>

                {/* Total Cards */}
                <div className="rounded-lg bg-white/5 p-4">
                  <div className="text-sm text-gray-400 mb-1">Total Cards</div>
                  <div className="text-2xl font-bold text-white">{reviewStats.totalItems}</div>
                </div>
              </div>

              {/* Bottom Row: Grade + Action Button */}
              <div className="flex items-center justify-between gap-4">
                {/* Grade Display */}
                <div
                  className={`rounded-lg px-4 py-2 ${
                    reviewStats.averageGrade ? 'bg-green-500/10' : 'bg-white/5'
                  }`}
                >
                  <span className="text-sm font-semibold text-gray-400">Grade: </span>
                  <span
                    className={`text-sm font-bold ${
                      reviewStats.averageGrade ? 'text-green-400' : 'text-gray-500'
                    }`}
                  >
                    {reviewStats.averageGrade || 'N/A'}
                  </span>
                </div>

                {/* Smart Review Button - Only show when there are due items (matching iOS) */}
                {hasDueItems ? (
                  <Button onClick={() => handleStartReview(false)} className="gap-2" size="lg">
                    <PlayCircle className="h-5 w-5" />
                    Review Due
                  </Button>
                ) : (
                  <div className="text-center py-4 px-6 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      <span className="text-sm font-semibold text-green-400">Caught up!</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">All review items completed for today</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Empty State: No flashcards/quizzes generated yet
            <div className="text-center py-8 space-y-4">
              <BookOpen className="h-12 w-12 text-primary/40 mx-auto" />
              <h3 className="text-xl font-semibold text-white">Ready to Start Practicing?</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Generate flashcards and quizzes from your study materials below to begin your prep
                sessions
              </p>
              <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
                <span>↓</span>
                <span>Tap any material below</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Study Materials Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">
          Study Materials ({exam.seeds.length})
        </h2>

        {exam.seeds.length > 0 ? (
          <div className="grid gap-3">
            {exam.seeds
              .filter((seed) => seed.processing_status === 'completed')
              .map((seed) => (
                <button
                  key={seed.id}
                  onClick={() => handleSeedClick(seed.id)}
                  className="group rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 text-left transition-all hover:border-primary/30 hover:bg-white/10 active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-white group-hover:text-primary transition-colors">
                        {seed.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {seed.content_type?.toUpperCase() || 'DOCUMENT'}
                      </p>
                    </div>
                    <ArrowLeft className="h-5 w-5 text-gray-500 rotate-180 group-hover:text-primary transition-colors" />
                  </div>
                </button>
              ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center">
            <p className="text-gray-400 mb-4">No study materials yet</p>
            <p className="text-sm text-gray-500">Add seeds to this exam to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
