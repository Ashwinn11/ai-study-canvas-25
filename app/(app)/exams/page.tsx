'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { examsService, Exam } from '@/lib/api/exams';
import { spacedRepetitionService, ExamReviewStats } from '@/lib/api/spacedRepetition';
import { Plus, BookOpen, Loader2, Trash2, Flame, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ExamsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [reviewStats, setReviewStats] = useState<Record<string, ExamReviewStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadExams();
    }
  }, [user]);

  const loadExams = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { exams: data, error: err } = await examsService.getExams();

      if (err) {
        setError(err);
        return;
      }

      setExams(data || []);

      // Load review stats for each exam (matching iOS)
      if (data && data.length > 0) {
        const statsPromises = data.map(async (exam) => {
          try {
            const stats = await spacedRepetitionService.getExamReviewStats(exam.id, user.id);
            return { examId: exam.id, stats };
          } catch {
            return { examId: exam.id, stats: null };
          }
        });

        const statsResults = await Promise.all(statsPromises);
        const statsMap: Record<string, ExamReviewStats> = {};
        statsResults.forEach(({ examId, stats }) => {
          if (stats) {
            statsMap[examId] = stats;
          }
        });
        setReviewStats(statsMap);
      }
    } catch (err) {
      console.error('Error loading exams:', err);
      setError('Failed to load exams');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateExam = () => {
    router.push('/exams/create');
  };

  const handleExamClick = (examId: string) => {
    router.push(`/exams/${examId}`);
  };

  const handleDeleteExam = async (examId: string, examName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${examName}"? This will remove the exam but keep all study materials.`)) {
      return;
    }

    try {
      const { error } = await examsService.deleteExam(examId);

      if (error) {
        alert(`Failed to delete exam: ${error}`);
        return;
      }

      // Reload exams
      loadExams();
    } catch (err) {
      console.error('Error deleting exam:', err);
      alert('Failed to delete exam');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading exams...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Exams</h1>
          <Button onClick={handleCreateExam}>
            <Plus className="h-4 w-4 mr-2" />
            Create Exam
          </Button>
        </div>

        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-500">{error}</p>
          <Button onClick={loadExams} variant="outline" className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Exams</h1>
        <Button onClick={handleCreateExam}>
          <Plus className="h-4 w-4 mr-2" />
          Create Exam
        </Button>
      </div>

      {/* Exams List */}
      {exams.length === 0 ? (
        <div className="text-center py-16">
          <div className="flex justify-center mb-6">
            <div className="p-6 rounded-full bg-white/5">
              <BookOpen className="h-16 w-16 text-gray-500" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No exams yet</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Create your first exam to organize your study materials and track your progress
          </p>
          <Button onClick={handleCreateExam}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Exam
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => {
            const stats = reviewStats[exam.id];
            const hasDue = stats && stats.due_today > 0;
            const hasOverdue = stats && stats.overdue > 0;

            return (
              <div
                key={exam.id}
                onClick={() => handleExamClick(exam.id)}
                className="group relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 hover:bg-white/10 transition-all cursor-pointer active:scale-[0.98] hover:scale-[1.01] duration-200"
              >
                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteExam(exam.id, exam.subject_name, e)}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                  aria-label="Delete exam"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="space-y-3">
                  {/* Icon */}
                  <div className="p-3 rounded-lg bg-primary/10 w-fit">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>

                  {/* Exam Name */}
                  <h3 className="text-xl font-semibold text-white pr-8">
                    {exam.subject_name}
                  </h3>

                  {/* Due Status (matching iOS ExamCard lines 153-173) */}
                  {stats && (
                    <div className="space-y-1.5">
                      {hasOverdue && (
                        <div className="flex items-center gap-1.5 text-red-500">
                          <Flame className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {stats.overdue} card{stats.overdue !== 1 ? 's' : ''} overdue
                          </span>
                        </div>
                      )}
                      {hasDue && !hasOverdue && (
                        <div className="flex items-center gap-1.5 text-blue-500">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {stats.due_today} card{stats.due_today !== 1 ? 's' : ''} due today
                          </span>
                        </div>
                      )}
                      {!hasDue && stats.available_items > 0 && (
                        <div className="flex items-center gap-1.5 text-green-500">
                          <span className="text-sm font-medium">All caught up!</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Date */}
                  <p className="text-sm text-gray-400">
                    Created {new Date(exam.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
