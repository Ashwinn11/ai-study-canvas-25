
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { spacedRepetitionService, type ReviewItem } from '@/lib/api/spacedRepetitionService';
import { flashcardsService } from '@/lib/api/flashcardsService';
import { quizService } from '@/lib/api/quizService';
import { dailyGoalTrackerService } from '@/lib/api/dailyGoalTracker';
import { xpService } from '@/lib/api/xpService';
import { streakService } from '@/lib/api/streakService';
import { achievementEngine } from '@/lib/api/achievementEngine';
import { reviewProgressService } from '@/lib/api/reviewProgressService';
import { profileStatsService } from '@/lib/api/profileStatsService';
import { useGlobalRefresh } from '@/hooks/useGlobalRefresh';
import { scoreToGrade, getGradeMessage } from '@/lib/utils/gradeUtils';
import { Flashcard, QuizQuestion } from '@/lib/supabase/types';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ArrowLeft, Loader2, RotateCw, Check, X, Target, Flame, Award, Rocket, Zap, Brain, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { toast } from 'sonner';
import { ComparisonBadge } from '@/components/review/ComparisonBadge';

const MOMENTUM_MESSAGES: Array<{ text: string; icon: typeof Rocket }> = [
  { text: "You're building momentum!", icon: Rocket },
  { text: 'Great flow—keep going!', icon: Flame },
  { text: 'Nice streak, stay sharp!', icon: Zap },
  { text: 'Learning mode: engaged!', icon: Crosshair },
  { text: 'Brains are warming up!', icon: Brain },
];

export default function ExamReviewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const examId = params.id as string;
  const mode = searchParams.get('mode') || 'review'; // 'review' or 'practice'
  const isPracticeMode = mode === 'practice';

  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [sessionStartTime] = useState<number>(Date.now());
  const [stats, setStats] = useState({
    flashcardCorrect: 0,
    flashcardTotal: 0,
    quizCorrect: 0,
    quizTotal: 0,
  });
  const [sessionComplete, setSessionComplete] = useState(false);
  const [completionStreak, setCompletionStreak] = useState<number | null>(null);
  const [exitAnimation, setExitAnimation] = useState<'left' | 'right' | 'up' | null>(null);

  // Drag state for smooth swipe animations
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | null>(null);

  const { refreshGlobal } = useGlobalRefresh();

  const supabaseRef = useRef(getSupabaseClient());
  const chunkSequenceRef = useRef(0);

  useEffect(() => {
    reviewProgressService.setSupabase(supabaseRef.current);
  }, []);

  useEffect(() => {
    if (user && !isPracticeMode) {
      const today = new Date().toISOString().split('T')[0];
      dailyGoalTrackerService.setSessionDate(user.id, today);
    }
  }, [user, isPracticeMode]);

  const [sessionXP, setSessionXP] = useState(0);
  const [xpFeedback, setXpFeedback] = useState<{ amount: number; label: string } | null>(null);

  // Daily goal tracking
  const [dailyGoal, setDailyGoal] = useState<number>(20);
  const [dailyGoalMet, setDailyGoalMet] = useState<boolean>(false);

  // Enhanced celebrations: Combo counter
  const [comboCount, setComboCount] = useState<number>(0);
  const [cardsReviewed, setCardsReviewed] = useState<number>(0);
  const [halfwayToastShown, setHalfwayToastShown] = useState<boolean>(false);

  // Momentum + motivation cues
  const [showMomentumBadge, setShowMomentumBadge] = useState(false);
  const [momentumMessage, setMomentumMessage] = useState<{ text: string; icon: typeof Rocket }>({ text: '', icon: Rocket });

  // Achievement celebration modal state
  const [unlockedAchievement, setUnlockedAchievement] = useState<{ name: string; description?: string } | null>(null);

  // Confirmation dialog state
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Internal refs for tracking session progress
  const resultsRef = useRef<Map<string, number>>(new Map());
  const cardsSinceBadgeRef = useRef(0);
  const nextBadgeThresholdRef = useRef(3 + Math.floor(Math.random() * 3));
  const goalCelebratedRef = useRef(false);

  // Previous score for comparison badge
  const [previousScore, setPreviousScore] = useState<number | undefined>(undefined);

  useEffect(() => {
    goalCelebratedRef.current = false;
    cardsSinceBadgeRef.current = 0;
    nextBadgeThresholdRef.current = 3 + Math.floor(Math.random() * 3);
    setDailyGoalMet(false);
  }, [examId, user]);

  const loadReviewItems = useCallback(async () => {
    if (!user || !examId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch previous exam report score for comparison badge
      const { data: previousReports } = await supabaseRef.current
        .from('exam_reports')
        .select('score_percentage')
        .eq('user_id', user.id)
        .eq('exam_id', examId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (previousReports && previousReports.length > 0) {
        setPreviousScore((previousReports[0] as any).score_percentage);
      }

      const { flashcards, quizQuestions, error: fetchError } =
        await spacedRepetitionService.getExamReviewItems(user.id, examId, 50);

      if (fetchError) {
        setError(fetchError);
        setIsLoading(false);
        return;
      }

      // Convert to unified ReviewItem format
      const quizItems: ReviewItem[] = quizQuestions.map((qq) => ({
        id: qq.id,
        type: 'quiz' as const,
        seed_id: qq.seed_id,
        seed_title: 'Quiz Question',
        content: qq,
        next_due_date: qq.next_due_date,
        interval: qq.interval,
        repetitions: qq.repetitions,
        easiness_factor: qq.easiness_factor,
      }));

      const flashcardItems: ReviewItem[] = flashcards.map((fc) => ({
        id: fc.id,
        type: 'flashcard' as const,
        seed_id: fc.seed_id,
        seed_title: 'Flashcard',
        content: fc,
        next_due_date: fc.next_due_date,
        interval: fc.interval,
        repetitions: fc.repetitions,
        easiness_factor: fc.easiness_factor,
      }));

      const items = [...quizItems, ...flashcardItems];

      if (items.length === 0) {
        setError('No review items available for this exam yet. Generate flashcards and quizzes from your seeds first.');
        setIsLoading(false);
        return;
      }

      // Shuffle items for variety
      const shuffled = items.sort(() => Math.random() - 0.5);
      setReviewItems(shuffled);
      setIsLoading(false);
      
      // Load user's daily goal
      const { data: profile } = await supabaseRef.current
        .from('profiles')
        .select('daily_cards_goal')
        .eq('id', user.id)
        .maybeSingle();
        
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((profile as any)?.daily_cards_goal) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setDailyGoal((profile as any).daily_cards_goal);
      }
    } catch (err) {
      console.error('Error loading review items:', err);
      setError(err instanceof Error ? err.message : 'Failed to load review items');
      setIsLoading(false);
    }
  }, [user, examId, isPracticeMode]);

  useEffect(() => {
    if (user && examId) {
      loadReviewItems();
    }
  }, [user, examId, loadReviewItems]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const already = await dailyGoalTrackerService.hasAlreadyCelebratedToday(user.id);
        if (!cancelled) {
          goalCelebratedRef.current = already;
          setDailyGoalMet(already);
        }
      } catch (err) {
        console.error('Error checking daily goal status:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!showMomentumBadge) {
      setMomentumMessage({ text: '', icon: Rocket });
      return;
    }
    const timer = setTimeout(() => setShowMomentumBadge(false), 2200);
    return () => clearTimeout(timer);
  }, [showMomentumBadge]);

  const recordProgress = useCallback(
    (updatedStats: typeof stats) => {
      const totalAttempts = updatedStats.quizTotal + updatedStats.flashcardTotal;

      // Momentum badge logic
      cardsSinceBadgeRef.current += 1;
      if (cardsSinceBadgeRef.current >= nextBadgeThresholdRef.current) {
        cardsSinceBadgeRef.current = 0;
        nextBadgeThresholdRef.current = 3 + Math.floor(Math.random() * 3);

        const cue = MOMENTUM_MESSAGES[Math.floor(Math.random() * MOMENTUM_MESSAGES.length)];
        setMomentumMessage(cue);
        setShowMomentumBadge(true);
      }

      if (!user) return;

      // Daily goal celebration (only show once per session)
      // Use local dailyGoal state for mid-session check
      // Note: Final validation uses fresh DB value at session end to prevent mismatches
      if (dailyGoal > 0 && totalAttempts >= dailyGoal && !goalCelebratedRef.current) {
        goalCelebratedRef.current = true;
        setDailyGoalMet(true);
        dailyGoalTrackerService
          .markGoalCelebratedToday(user.id)
          .catch((err) => {
            console.error('Error marking daily goal celebration:', err);
            goalCelebratedRef.current = false;
            setDailyGoalMet(false);
          });

        toast.success('daily goal crushed! 🎯', {
          description: `${totalAttempts} cards crushed today! 💪`,
          duration: 4000,
          icon: <Target className="w-5 h-5 text-green-500" />,
        });
      }
    },
    [dailyGoal, user]
  );

  const logReviewChunk = useCallback(
    async (item: ReviewItem, isCorrect: boolean, quality: number, isFinal: boolean) => {
      if (!user || isPracticeMode) return;
      try {
        chunkSequenceRef.current += 1;
        await reviewProgressService.logChunk({
          userId: user.id,
          seedId: item.seed_id,
          sessionType: item.type === 'quiz' ? 'quiz' : 'flashcards',
          totalItems: 1,
          correctItems: isCorrect ? 1 : 0,
          examId,
          chunkStartIndex: currentIndex,
          chunkEndIndex: currentIndex,
          totalReviewItems: reviewItems.length,
          isFinalChunk: isFinal,
          chunkSequence: chunkSequenceRef.current,
          reviewedCardIds: [item.id],
        });
      } catch (err) {
        console.error('Error logging review chunk:', err);
      }
    },
    [user, isPracticeMode, examId, currentIndex, reviewItems.length]
  );

  const currentItem = reviewItems[currentIndex] || null;
  const isLastItem = currentIndex === reviewItems.length - 1;

  const showXPFeedbackAnim = (amount: number, label: string) => {
    setXpFeedback({ amount, label });
    // Hide after animation
    setTimeout(() => {
      setXpFeedback(null);
    }, 1500);
  };

  const moveToNext = useCallback(async () => {
    if (isLastItem) {
      // Session complete - save learning session (matching iOS)
      if (user && examId) {
        try {
          const timeSpentSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
          const totalItems = stats.flashcardTotal + stats.quizTotal;
          const correctItems = stats.flashcardCorrect + stats.quizCorrect;

          // Create learning session via supabase (matching iOS lines 1378-1420)
          const { getSupabaseClient } = await import('@/lib/supabase/client');
          const supabase = getSupabaseClient();

          const score = totalItems > 0 ? correctItems / totalItems : 0;

          // Create exam report (matching iOS - this contributes to average grade)
          // NOTE: A database trigger automatically creates a learning_sessions record from this exam_report
          // This learning_sessions record is what's used to calculate cardsReviewedToday and daily goal progress
          // Only create report for actual review mode, not practice mode
          if (!isPracticeMode) {
            const scorePercentage = Math.round(score * 100);
            const letterGrade = scoreToGrade(scorePercentage);

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            await supabase.from('exam_reports').insert({
              user_id: user.id,
              exam_id: examId,
              letter_grade: letterGrade,
              score_percentage: scorePercentage,
              total_items: totalItems,
              correct_items: correctItems,
              metadata: {
                flashcard_count: stats.flashcardTotal,
                flashcard_correct: stats.flashcardCorrect,
                quiz_count: stats.quizTotal,
                quiz_correct: stats.quizCorrect,
                time_spent: timeSpentSeconds,
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            // NOTE: XP is now awarded per-card, so we don't award it here anymore.

            // Fetch fresh daily goal from database (matching iOS implementation)
            // This ensures we use the current value, not a potentially stale local state
            console.log('[DailyGoal] Session complete - fetching fresh goal from database');
            console.log('[DailyGoal] Local state dailyGoal:', dailyGoal);
            console.log('[DailyGoal] Cards reviewed this session:', totalItems);

            const { data: userStats } = await profileStatsService.getUserStats(user.id);
            const dbDailyGoal = (userStats as any)?.dailyCardsGoal || (userStats as any)?.preferences?.dailyCardsGoal;
            const finalDailyGoal = dbDailyGoal || dailyGoal || 20;

            console.log('[DailyGoal] Database dailyCardsGoal:', dbDailyGoal);
            console.log('[DailyGoal] Final goal to use:', finalDailyGoal);
            console.log('[DailyGoal] Goal met?', totalItems >= finalDailyGoal);

            // Update streak after session with fresh goal value
            console.log('[DailyGoal] Calling updateStreakAfterSession with goal:', finalDailyGoal);
            const streakResult = await streakService.updateStreakAfterSession(user.id, finalDailyGoal);
            console.log('[DailyGoal] Streak update result:', streakResult);
            setCompletionStreak(streakResult.currentStreak);

            // Check for achievement unlocks
            const newAchievements = await achievementEngine.checkAndUnlockAchievements(user.id);

            // Maybe surprise achievement
            const surprise = await achievementEngine.maybeSurpriseAchievement(user.id);
            if (surprise) newAchievements.push(surprise);

            // Mark daily goal as celebrated (if met) - use the fresh goal value
            let showGoalToast = false;
            console.log('[DailyGoal] Checking if goal should be celebrated:');
            console.log('[DailyGoal]   finalDailyGoal > 0?', finalDailyGoal > 0);
            console.log('[DailyGoal]   totalItems >= finalDailyGoal?', totalItems >= finalDailyGoal);
            console.log('[DailyGoal]   goalCelebratedRef.current?', goalCelebratedRef.current);

            if (finalDailyGoal > 0 && totalItems >= finalDailyGoal && !goalCelebratedRef.current) {
              try {
                console.log('[DailyGoal] Marking goal as celebrated');
                await dailyGoalTrackerService.markGoalCelebratedToday(user.id);
                console.log('[DailyGoal] Goal marked as celebrated successfully');
              } catch (err) {
                console.error('Error marking daily goal at completion:', err);
              }
              goalCelebratedRef.current = true;
              setDailyGoalMet(true);
              showGoalToast = true;
              console.log('[DailyGoal] Daily goal will be shown in toast');
            } else {
              console.log('[DailyGoal] Goal not celebrated (conditions not met)');
            }

            // Filter newly unlocked achievements (avoid duplicates)
            const freshAchievements = newAchievements.filter((achievement) => {
              if (!achievement.unlocked_at) return false;
              const unlockedMs = new Date(achievement.unlocked_at).getTime();
              return Date.now() - unlockedMs < 5000;
            });

            if (freshAchievements.length > 0 && !unlockedAchievement) {
              const first = freshAchievements[0];
              setUnlockedAchievement({
                name: first.name || 'Achievement Unlocked',
                description: first.description || 'You earned a new badge!',
              });
            }

            // Show toasts (staggered)
            let delay = 500;

            if (showGoalToast) {
              setTimeout(() => {
                toast.success('Daily Goal Crushed!', {
                  description: `You reviewed ${totalItems} cards today!`,
                  duration: 4000,
                  icon: <Target className="w-5 h-5 text-green-500" />,
                });
              }, delay);
              delay += 1500;
            }

            // Check if user earned a freeze from streak milestone (every 7 days)
            if (streakResult.currentStreak > 0 && streakResult.currentStreak % 7 === 0) {
              setTimeout(() => {
                toast.success('Freeze Earned! 🧊', {
                  description: 'Your streak is now protected',
                  duration: 4000,
                });
              }, delay);
              delay += 1500;
            }

            // Show freeze used toast if applicable
            if ((streakResult as any).freezeUsed) {
              setTimeout(() => {
                toast.success('Streak Saved! 🧊', {
                  description: '1 freeze used to protect your streak',
                  duration: 4000,
                });
              }, delay);
              delay += 1500;
            }

            freshAchievements.forEach((achievement, index) => {
              setTimeout(() => {
                toast.success(achievement.name ?? 'Achievement Unlocked', {
                  description: achievement.description || 'New badge unlocked!',
                  duration: 4000,
                  icon: <Award className="w-5 h-5 text-purple-500" />,
                });
              }, delay + index * 1500);
            });

            // Small delay to ensure learning_sessions is fully committed before refreshing stats
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('[DailyGoal] Calling refreshGlobal after session save');
            await refreshGlobal({ refreshAll: true, force: true });
            console.log('[DailyGoal] refreshGlobal completed');
          }
        } catch (error) {
          console.error('Error saving exam review session:', error);
        }
      }

      setSessionComplete(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setSelectedAnswer(null);
      setShowQuizResult(false);
      setSwipeDirection(null);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [isLastItem, user, examId, sessionStartTime, stats, dailyGoal, isPracticeMode, refreshGlobal, unlockedAchievement]);

  // Quiz answer handler (matching iOS lines 1011-1057)
  const handleQuizAnswer = async (answerIndex: number) => {
    if (!user || showQuizResult || currentItem.type !== 'quiz') return;

    const quizContent = currentItem.content as QuizQuestion;
    const isCorrect = answerIndex === quizContent.correct_answer;

    setSelectedAnswer(answerIndex);
    setShowQuizResult(true);

    // STRICT SM2 QUALITY SCALE
    // Correct = 3 (proves understanding, consistent progression)
    // Incorrect = 1 (forces interval reset to 1 day for proper SM2 algorithm)
    const quality = isCorrect ? 3 : 1;
    resultsRef.current.set(currentItem.id, quality);

    setStats((prev) => {
      const updated = {
        ...prev,
        quizCorrect: prev.quizCorrect + (isCorrect ? 1 : 0),
        quizTotal: prev.quizTotal + 1,
      };
      recordProgress(updated);
      return updated;
    });

    // Enhanced celebrations: Combo counter
    if (isCorrect) {
      const newCombo = comboCount + 1;
      setComboCount(newCombo);

      // Show combo toast at milestones
      if (newCombo === 5) {
        toast.success('5x COMBO! 🔥', {
          description: "you're on fire!",
          duration: 2000,
        });
      } else if (newCombo === 10) {
        toast.success('10x COMBO! 🔥', {
          description: 'no cap, you\'re cooking!',
          duration: 2000,
        });
      } else if (newCombo === 15) {
        toast.success('15x COMBO! 🔥', {
          description: 'absolute legend!',
          duration: 2000,
        });
      }
    } else {
      // Reset combo on incorrect answer
      setComboCount(0);
    }

    // Track cards reviewed for mid-session encouragement
    const newCardsReviewed = cardsReviewed + 1;
    setCardsReviewed(newCardsReviewed);

    // Mid-session encouragement (every 10 cards)
    if (newCardsReviewed % 10 === 0 && newCardsReviewed > 0) {
      const encouragementMessages = [
        "you're cooking! 🔥",
        'big brain energy 🧠',
        'locked in fr 💪',
        'no cap, you\'re crushing it 🎯',
        'keep going bestie! ✨',
      ];
      const randomMessage = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
      toast(randomMessage, { duration: 2000 });
    }

    // Progress milestone (50% completion)
    const progress = newCardsReviewed / reviewItems.length;
    if (progress >= 0.5 && progress < 0.55 && !halfwayToastShown) {
      setHalfwayToastShown(true);
      toast.success('Halfway there! 💪', { duration: 3000 });
    }

    // Update SM2 in background (non-blocking) - Skip in practice mode
    if (!isPracticeMode) {
      quizService
        .reviewQuizQuestion(currentItem.id, isCorrect)
        .catch((err) => console.error('Error updating quiz SM2:', err));
    }

    // Calculate and award XP (matching iOS)
    const xpResult = xpService.calculateXP('quiz', isCorrect);
    setSessionXP((prev) => prev + xpResult.amount);
    await xpService.awardXP(user.id, xpResult.amount);
    showXPFeedbackAnim(xpResult.amount, xpResult.reason);

    if (!isPracticeMode && currentItem) {
      logReviewChunk(currentItem, isCorrect, quality, isLastItem).catch((err) =>
        console.error('Error logging quiz chunk:', err)
      );
    }

    // Move to next immediately with minimal feedback delay
    setTimeout(() => {
      moveToNext();
    }, 500);
  };

  // Flashcard rating handler (matching iOS lines 1068-1110)
  const handleFlashcardRating = async (direction: 'left' | 'right' | 'up', quality: number) => {
    if (!user) return;

    const isCorrect = quality >= 3;

    resultsRef.current.set(currentItem.id, quality);

    setStats((prev) => {
      const updated = {
        ...prev,
        flashcardCorrect: prev.flashcardCorrect + (isCorrect ? 1 : 0),
        flashcardTotal: prev.flashcardTotal + 1,
      };
      recordProgress(updated);
      return updated;
    });

    // Enhanced celebrations: Combo counter (same as quiz)
    if (isCorrect) {
      const newCombo = comboCount + 1;
      setComboCount(newCombo);

      if (newCombo === 5) {
        toast.success('5x COMBO! 🔥', { description: "you're on fire!", duration: 2000 });
      } else if (newCombo === 10) {
        toast.success('10x COMBO! 🔥', { description: 'no cap, you\'re cooking!', duration: 2000 });
      } else if (newCombo === 15) {
        toast.success('15x COMBO! 🔥', { description: 'absolute legend!', duration: 2000 });
      }
    } else {
      setComboCount(0);
    }

    // Track cards and show encouragement
    const newCardsReviewed = cardsReviewed + 1;
    setCardsReviewed(newCardsReviewed);

    if (newCardsReviewed % 10 === 0 && newCardsReviewed > 0) {
      const messages = ["you're cooking! 🔥", 'big brain energy 🧠', 'locked in fr 💪', 'no cap, you\'re crushing it 🎯', 'keep going bestie! ✨'];
      toast(messages[Math.floor(Math.random() * messages.length)], { duration: 2000 });
    }

    const progress = newCardsReviewed / reviewItems.length;
    if (progress >= 0.5 && progress < 0.55 && !halfwayToastShown) {
      setHalfwayToastShown(true);
      toast.success('Halfway there! 💪', { duration: 3000 });
    }

    // Update SM2 in background (non-blocking) - Skip in practice mode
    if (!isPracticeMode) {
      flashcardsService
        .reviewFlashcard(currentItem.id, direction, quality)
        .catch((err) => console.error('Error updating flashcard SM2:', err));
    }

    // Calculate and award XP (matching iOS)
    const xpResult = xpService.calculateXP('flashcard', quality);
    setSessionXP((prev) => prev + xpResult.amount);
    await xpService.awardXP(user.id, xpResult.amount);
    showXPFeedbackAnim(xpResult.amount, xpResult.reason);

    if (!isPracticeMode && currentItem) {
      logReviewChunk(currentItem, isCorrect, quality, isLastItem).catch((err) =>
        console.error('Error logging flashcard chunk:', err)
      );
    }

    // Trigger exit animation
    setExitAnimation(direction);

    // Move to next after animation
    setTimeout(() => {
      setExitAnimation(null);
      moveToNext();
    }, 300);
  };

  const handleButtonPress = (direction: 'left' | 'right' | 'up', quality: number) => {
    handleFlashcardRating(direction, quality);
  };

  const flipCard = () => {
    if (!currentItem || currentItem.type !== 'flashcard') return;
    setIsFlipped(!isFlipped);
  };

  // Pointer event handlers for smooth drag
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!currentItem || currentItem.type !== 'flashcard' || !isFlipped || exitAnimation) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffset({ x: 0, y: 0 });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !currentItem || currentItem.type !== 'flashcard' || !isFlipped || exitAnimation) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setDragOffset({ x: deltaX, y: deltaY });

    // Calculate swipe direction (matching iOS thresholds)
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    let direction: 'left' | 'right' | 'up' | null = null;

    // Horizontal has priority if dominant
    if (absX > absY) {
      if (deltaX > 50) {
        direction = 'right';
      } else if (deltaX < -50) {
        direction = 'left';
      }
    } else if (absY > absX && deltaY < -100) {
      direction = 'up';
    }

    setSwipeDirection(direction);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (!currentItem || currentItem.type !== 'flashcard' || !isFlipped || exitAnimation) {
      setDragOffset({ x: 0, y: 0 });
      setSwipeDirection(null);
      return;
    }

    const absX = Math.abs(dragOffset.x);
    const absY = Math.abs(dragOffset.y);

    // Thresholds matching iOS
    const horizontalPass = absX > 100;
    const verticalPass = absY > 150;
    const horizontalDominant = absX >= absY;
    const verticalDominant = !horizontalDominant;

    let direction: 'left' | 'right' | 'up' | null = null;

    if (horizontalDominant && horizontalPass) {
      direction = dragOffset.x > 0 ? 'right' : 'left';
    } else if (verticalDominant && verticalPass && dragOffset.y < 0) {
      direction = 'up';
    }

    if (direction) {
      // Swipe committed - trigger rating
      const quality = direction === 'left' ? 1 : direction === 'up' ? 3 : 4;
      handleFlashcardRating(direction, quality);
    } else {
      // Swipe cancelled - spring back to center
      setDragOffset({ x: 0, y: 0 });
      setSwipeDirection(null);
    }
  };

  const handleExit = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    router.push(`/exams/${examId}`);
  };

  // Calculate overlay opacity and border width based on drag distance
  const getOverlayOpacity = () => {
    const absX = Math.abs(dragOffset.x);
    const absY = Math.abs(dragOffset.y);
    const effectiveY = dragOffset.y < 0 ? absY : 0;
    const effectiveDistance = Math.max(absX, effectiveY);
    return Math.min(0.85, effectiveDistance / 150);
  };

  const getBorderWidth = () => {
    const absX = Math.abs(dragOffset.x);
    const absY = Math.abs(dragOffset.y);
    const effectiveY = dragOffset.y < 0 ? absY : 0;
    const effectiveDistance = Math.max(absX, effectiveY);
    return Math.min(3, effectiveDistance / 50);
  };

  const getSwipeStyle = () => {
    switch (swipeDirection) {
      case 'left':
        return { borderColor: 'rgb(239, 68, 68)', text: 'Forgot', textColor: 'text-red-400' };
      case 'right':
        return { borderColor: 'rgb(34, 197, 94)', text: 'Know', textColor: 'text-green-400' };
      case 'up':
        return { borderColor: 'rgb(59, 130, 246)', text: 'Somewhat', textColor: 'text-blue-400' };
      default:
        return { borderColor: 'transparent', text: '', textColor: '' };
    }
  };

  const swipeStyle = getSwipeStyle();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading review session...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push(`/exams/${examId}`)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Exam
        </Button>

        <div className="rounded-lg border border-red-500/20 bg-red-500/10 backdrop-blur-xl p-8">
          <div className="text-center space-y-4">
            <p className="text-red-500 font-medium">{error}</p>
            <Button onClick={loadReviewItems} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalCorrect = stats.flashcardCorrect + stats.quizCorrect;
  const totalItems = stats.flashcardTotal + stats.quizTotal;
  const scorePercentage = totalItems > 0 ? Math.round((totalCorrect / totalItems) * 100) : 0;
  const letterGrade = scoreToGrade(scorePercentage);

  // Get grade color
  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-400';
    if (grade.startsWith('B')) return 'text-blue-400';
    if (grade.startsWith('C')) return 'text-purple-400';
    if (grade.startsWith('D')) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreColor = (pct: number) => {
    if (pct >= 90) return 'bg-green-500';
    if (pct >= 80) return 'bg-blue-500';
    if (pct >= 70) return 'bg-purple-500';
    return 'bg-primary';
  };

  const scoreColor = getScoreColor(scorePercentage);
  const gradeColor = getGradeColor(letterGrade);

  // Completion modal (matching iOS exam completion - Receipt Style)
  if (sessionComplete) {
    const timeSpentSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
    const mins = Math.floor(timeSpentSeconds / 60);
    const secs = timeSpentSeconds % 60;
    const timeString = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    const displayStreak = completionStreak ?? 0;

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        {/* Report Card Container */}
        <div className="bg-[#F8F9FA] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
          
          {/* 1. Header Strip (Receipt Look) */}
          <div className="bg-white px-6 py-4 border-b-2 border-dashed border-gray-200 flex justify-between items-center">
            <span className="font-mono text-gray-900 uppercase tracking-widest font-bold text-sm">
              Session Report
            </span>
            <div className="bg-gray-900 px-2 py-1 rounded text-[10px] text-white font-bold tracking-wider">
              COMPLETED
            </div>
          </div>

          {/* 2. Main Body */}
          <div className="p-8 flex flex-col items-center">
            
            {/* Topic */}
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
              TOPIC
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 text-center mb-8 line-clamp-2">
              {isPracticeMode ? 'Practice Session' : 'Exam Review'}
            </h2>

            {/* Grade Hero */}
            <div className="relative mb-8">
              <div className={`w-32 h-32 rounded-full border-4 ${
                letterGrade.startsWith('A') ? 'border-green-400 bg-green-50' :
                letterGrade.startsWith('B') ? 'border-blue-400 bg-blue-50' :
                letterGrade.startsWith('C') ? 'border-purple-400 bg-purple-50' :
                'border-orange-400 bg-orange-50'
              } flex items-center justify-center`}>
                <span className={`text-6xl font-black ${
                  letterGrade.startsWith('A') ? 'text-green-500' :
                  letterGrade.startsWith('B') ? 'text-blue-500' :
                  letterGrade.startsWith('C') ? 'text-purple-500' :
                  'text-orange-500'
                }`}>
                  {letterGrade}
                </span>
              </div>
              {/* Score Badge */}
              <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full border-2 border-white text-xs font-bold text-white shadow-sm ${
                letterGrade.startsWith('A') ? 'bg-green-500' :
                letterGrade.startsWith('B') ? 'bg-blue-500' :
                letterGrade.startsWith('C') ? 'bg-purple-500' :
                'bg-orange-500'
              }`}>
                {scorePercentage}% SCORE
              </div>
              {/* Comparison Badge */}
              {previousScore !== undefined && (
                <ComparisonBadge 
                  currentScore={scorePercentage} 
                  previousScore={previousScore}
                  className="-top-4 -right-4"
                />
              )}
            </div>

            {/* Stats Grid */}
            <div className="w-full space-y-3 font-mono text-sm">
              {/* Items Reviewed */}
              <div className="flex justify-between items-center">
                <span className="text-gray-500 uppercase">Items Reviewed</span>
                <div className="flex-1 mx-3 border-b border-dotted border-gray-300 h-1 relative top-1"></div>
                <span className="font-bold text-gray-900">{totalItems}</span>
              </div>

              {/* Time Spent */}
              <div className="flex justify-between items-center">
                <span className="text-gray-500 uppercase">Time Spent</span>
                <div className="flex-1 mx-3 border-b border-dotted border-gray-300 h-1 relative top-1"></div>
                <span className="font-bold text-gray-900">{timeString}</span>
              </div>

              {/* Streak */}
              <div className="flex justify-between items-center">
                <span className="text-gray-500 uppercase">Streak</span>
                <div className="flex-1 mx-3 border-b border-dotted border-gray-300 h-1 relative top-1"></div>
                <div className="flex items-center gap-1 font-bold text-orange-500">
                  {displayStreak} Days <Flame className="w-4 h-4 fill-orange-500" />
                </div>
              </div>
            </div>

            {/* Breakdown */}
            {(stats.flashcardTotal > 0 || stats.quizTotal > 0) && (
              <div className="w-full mt-6 pt-4 border-t border-dashed border-gray-200 space-y-1">
                {stats.flashcardTotal > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Flashcards</span>
                    <span>{stats.flashcardCorrect}/{stats.flashcardTotal}</span>
                  </div>
                )}
                {stats.quizTotal > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Quiz Questions</span>
                    <span>{stats.quizCorrect}/{stats.quizTotal}</span>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* 3. Footer Actions */}
          <div className="bg-gray-100 p-6 border-t border-gray-200 flex flex-col gap-4 items-center">
            <p className="text-xs italic text-gray-500 text-center">
              "{getGradeMessage(letterGrade)}"
            </p>
            
            <div className="flex w-full gap-3">
              <Button 
                onClick={() => router.push(`/exams/${examId}`)} 
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
              >
                Done
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-gray-300 hover:bg-white"
                onClick={() => {
                setSessionComplete(false);
                setCurrentIndex(0);
                setStats({ flashcardCorrect: 0, flashcardTotal: 0, quizCorrect: 0, quizTotal: 0 });
                setSessionXP(0);
                setXpFeedback(null);
                setShowMomentumBadge(false);
                setMomentumMessage({ text: '', icon: Rocket });
                cardsSinceBadgeRef.current = 0;
                nextBadgeThresholdRef.current = 3 + Math.floor(Math.random() * 3);
                resultsRef.current.clear();
                loadReviewItems();

                }}
              >
                Try Again
              </Button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (!currentItem) return null;

  const progressPercentage = Math.round(((currentIndex + 1) / reviewItems.length) * 100);
  const progressWidth = ((currentIndex + 1) / reviewItems.length) * 100;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleExit} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Exit
        </Button>
        
        {/* Session XP Display */}
        {sessionXP > 0 && (
          <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
            <span className="text-xs font-bold text-primary">+{sessionXP} XP</span>
          </div>
        )}

        <div className="text-sm text-gray-400">
          {isPracticeMode ? 'Practice Test' : 'Review Mode'}
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">
            {currentIndex + 1} of {reviewItems.length}
          </span>
          <span className="text-primary font-semibold">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-1">
          <div
            className="bg-primary h-1 rounded-full transition-all duration-300"
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>

      {/* Current Item Type Badge */}
      <div className="flex items-center gap-2">
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            currentItem.type === 'quiz'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-purple-500/20 text-purple-400'
          }`}
        >
          {currentItem.type === 'quiz' ? 'Quiz Question' : 'Flashcard'}
        </span>
      </div>

      {/* Quiz Question */}
      {currentItem.type === 'quiz' && (
        <div className="space-y-6">
          {/* Question Card */}
          <div className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 shadow-lg p-8 min-h-[300px] flex items-center justify-center">
            <p className="text-xl text-gray-800 text-center leading-relaxed font-semibold">
              {(currentItem.content as QuizQuestion).question}
            </p>
          </div>

          {/* Answer Options */}
          <div className="grid gap-3">
            {(currentItem.content as QuizQuestion).options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === (currentItem.content as QuizQuestion).correct_answer;
              const showResult = showQuizResult;

              let buttonClass = 'rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-primary/30 hover:bg-white/10 text-white';

              if (showResult) {
                if (isCorrect) {
                  buttonClass = 'rounded-xl border-2 border-green-500 bg-green-500/20 p-4 text-left';
                } else if (isSelected) {
                  buttonClass = 'rounded-xl border-2 border-red-500 bg-red-500/20 p-4 text-left';
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => handleQuizAnswer(index)}
                  disabled={showQuizResult}
                  className={buttonClass}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{option}</span>
                    {showResult && isCorrect && <Check className="h-5 w-5 text-green-400" />}
                    {showResult && isSelected && !isCorrect && <X className="h-5 w-5 text-red-400" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation (shown after answering) */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {showQuizResult && (currentItem.content as any).explanation && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-gray-400 mb-2">Explanation:</p>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <p className="text-white">{(currentItem.content as any).explanation}</p>
            </div>
          )}
        </div>
      )}

      {/* Flashcard */}
      {currentItem.type === 'flashcard' && (
        <div className="space-y-6">
          {/* Card */}
          <div className="flex items-center justify-center min-h-[500px]">
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className={`relative w-full max-w-2xl select-none ${
                exitAnimation
                  ? 'transition-all duration-300'
                  : isDragging
                  ? ''
                  : 'transition-all duration-200'
              } ${
                exitAnimation === 'left'
                  ? '-translate-x-[120%] opacity-0 -rotate-12'
                  : exitAnimation === 'right'
                  ? 'translate-x-[120%] opacity-0 rotate-12'
                  : exitAnimation === 'up'
                  ? '-translate-y-[120%] opacity-0'
                  : ''
              }`}
              style={
                !exitAnimation && (isDragging || dragOffset.x !== 0 || dragOffset.y !== 0)
                  ? {
                      transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${
                        (dragOffset.x / 20) * (isDragging ? 1 : 0)
                      }deg)`,
                      transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }
                  : undefined
              }
            >
              {/* Card container with flip animation */}
              <div
                className="relative cursor-pointer"
                style={{
                  perspective: '1000px',
                  minHeight: '400px',
                }}
                onClick={flipCard}
              >
                <div
                  className={`relative w-full transition-transform duration-500 transform-gpu`}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                >
                  {/* Front - Question */}
                  <div
                    className={`absolute inset-0 backface-hidden rounded-2xl border-2 border-purple-300 bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 shadow-lg p-8 ${
                      !isFlipped ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      minHeight: '400px',
                      borderColor: swipeStyle.borderColor,
                      borderWidth: `${getBorderWidth()}px`,
                      transition: 'border-color 0.1s',
                    }}
                  >
                    <div className="flex flex-col h-full">
                      <div className="text-sm text-purple-600 mb-4 font-medium">Question</div>
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-xl text-gray-800 text-center leading-relaxed font-medium">
                          {(currentItem.content as Flashcard).question}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-purple-500 mt-4 font-medium">
                        <RotateCw className="h-4 w-4" />
                        <span>Tap to flip</span>
                      </div>
                    </div>

                    {/* Swipe feedback overlay - dark background */}
                    <div
                      className="absolute inset-0 rounded-2xl bg-black pointer-events-none"
                      style={{ opacity: getOverlayOpacity() }}
                    />

                    {/* Swipe feedback text - centered rating label */}
                    {swipeDirection && (
                      <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{
                          opacity: Math.min(1, getOverlayOpacity() * 2),
                        }}
                      >
                        <div className={`text-5xl font-bold ${swipeStyle.textColor}`}>
                          {swipeStyle.text}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Back - Answer */}
                  <div
                    className={`absolute inset-0 backface-hidden rounded-2xl border-2 border-purple-300 bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 shadow-lg p-8 ${
                      isFlipped ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      minHeight: '400px',
                      borderColor: swipeStyle.borderColor,
                      borderWidth: `${getBorderWidth()}px`,
                      transition: 'border-color 0.1s',
                    }}
                  >
                    <div className="flex flex-col h-full">
                      <div className="text-sm text-purple-600 mb-4 font-medium">Answer</div>
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-xl text-gray-800 text-center leading-relaxed font-medium">
                          {(currentItem.content as Flashcard).answer}
                        </p>
                      </div>
                    </div>

                    {/* Swipe feedback overlay - dark background */}
                    <div
                      className="absolute inset-0 rounded-2xl bg-black pointer-events-none"
                      style={{ opacity: getOverlayOpacity() }}
                    />

                    {/* Swipe feedback text - centered rating label */}
                    {swipeDirection && (
                      <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{
                          opacity: Math.min(1, getOverlayOpacity() * 2),
                        }}
                      >
                        <div className={`text-5xl font-bold ${swipeStyle.textColor}`}>
                          {swipeStyle.text}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          {isFlipped && (
            <div className="space-y-4">
              <div className="text-center text-sm text-gray-500">
                Swipe or use buttons to rate your knowledge
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => handleButtonPress('left', 1)}
                  disabled={!!exitAnimation}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                >
                  <span className="text-2xl">←</span>
                  <span className="text-sm text-red-400 font-medium">Forgot</span>
                </button>

                <button
                  onClick={() => handleButtonPress('up', 3)}
                  disabled={!!exitAnimation}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                >
                  <span className="text-2xl">↑</span>
                  <span className="text-sm text-blue-400 font-medium">Somewhat</span>
                </button>

                <button
                  onClick={() => handleButtonPress('right', 4)}
                  disabled={!!exitAnimation}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                >
                  <span className="text-2xl">→</span>
                  <span className="text-sm text-green-400 font-medium">Know</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating XP Feedback */}
      {xpFeedback && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-5xl font-bold text-primary drop-shadow-lg">
            +{xpFeedback.amount} XP
          </div>
          <div className="text-xl font-medium text-white drop-shadow-md mt-2">
            {xpFeedback.label}
          </div>
        </div>
      )}

      {showMomentumBadge && momentumMessage.text && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg">
            {momentumMessage.icon && <momentumMessage.icon className="w-4 h-4" />}
            <span>{momentumMessage.text}</span>
          </div>
        </div>
      )}

      {unlockedAchievement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white px-8 py-10 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{unlockedAchievement.name}</h3>
            <p className="mt-2 text-sm text-slate-600">
              {unlockedAchievement.description || 'You earned a new badge!'}
            </p>
            <Button className="mt-6 w-full" onClick={() => setUnlockedAchievement(null)}>
              Keep going
            </Button>
          </div>
        </div>
      )}

      {/* Exit Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={confirmExit}
        title="Exit Review Session?"
        description="Are you sure you want to exit this review session? Your progress will be saved."
        confirmText="Exit"
        cancelText="Continue Reviewing"
        variant="warning"
      />
    </div>
  );
}
