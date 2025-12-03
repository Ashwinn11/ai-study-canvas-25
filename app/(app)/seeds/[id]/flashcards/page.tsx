'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { flashcardsService } from '@/lib/api/flashcards';
import { xpService } from '@/lib/api/xpService';
import { streakService } from '@/lib/api/streakService';
import { achievementEngine } from '@/lib/api/achievementEngine';
import { dailyGoalTrackerService } from '@/lib/api/dailyGoalTracker';
import { Flashcard } from '@/lib/supabase/types';
import { ArrowLeft, Loader2, RotateCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FlashcardState extends Flashcard {
  isFlipped: boolean;
}

export default function FlashcardsPracticePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const seedId = params.id as string;

  const [flashcards, setFlashcards] = useState<FlashcardState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    total: 0,
  });
  const [sessionStartTime] = useState<number>(Date.now());
  const [sessionComplete, setSessionComplete] = useState(false);

  const currentCard = flashcards[currentIndex] ?? null;

  useEffect(() => {
    if (user && seedId) {
      loadFlashcards();
    }
  }, [user, seedId]);

  const loadFlashcards = async () => {
    if (!user || !seedId) return;

    setIsLoading(true);
    setError(null);

    try {
      const existingCards = await flashcardsService.getFlashcards(seedId, user.id);

      if (existingCards && existingCards.length > 0) {
        const flashcardStates: FlashcardState[] = existingCards.map((card) => ({
          ...card,
          isFlipped: false,
        }));
        setFlashcards(flashcardStates);
        setSessionStats({ reviewed: 0, total: existingCards.length });
        setIsLoading(false);
        return;
      }

      // No existing flashcards - need to generate
      setIsGenerating(true);
      setIsLoading(false);

      const createdCards = await flashcardsService.createFlashcards({
        seedId,
        userId: user.id,
        onProgress: (progress, message) => {
          setGenerationProgress(progress);
          setGenerationMessage(message);
        },
      });

      if (!createdCards || createdCards.length === 0) {
        throw new Error('No flashcards could be generated from this content');
      }

      const flashcardStates: FlashcardState[] = createdCards.map((card) => ({
        ...card,
        isFlipped: false,
      }));

      setFlashcards(flashcardStates);
      setSessionStats({ reviewed: 0, total: createdCards.length });
      setIsGenerating(false);
    } catch (err) {
      console.error('Error loading flashcards:', err);
      setError(err instanceof Error ? err.message : 'Failed to load flashcards');
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const flipCard = () => {
    if (!currentCard) return;
    setFlashcards((prev) =>
      prev.map((card, index) =>
        index === currentIndex ? { ...card, isFlipped: !card.isFlipped } : card
      )
    );
  };

  const nextCard = async () => {
    const newReviewedCount = sessionStats.reviewed + 1;
    setSessionStats({ ...sessionStats, reviewed: newReviewedCount });

    // Award XP for flashcard review (assuming all reviews = confident)
    if (user) {
      const xpResult = xpService.calculateXP('flashcard', 4); // Quality 4 = confident
      await xpService.awardXP(user.id, xpResult.amount);
    }

    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setFlashcards((prev) =>
        prev.map((card, index) =>
          index === currentIndex + 1 ? { ...card, isFlipped: false } : card
        )
      );
    } else {
      // Session completed
      if (user) {
        try {
          const timeSpentSeconds = Math.round((Date.now() - sessionStartTime) / 1000);

          // Save learning session
          await flashcardsService.createLearningSession(seedId, user.id, {
            totalItems: flashcards.length,
            correctItems: newReviewedCount,
            timeSpent: timeSpentSeconds,
            metadata: {
              sessionType: 'flashcards-practice',
              source: 'exam-review',
            },
          });

          // Get user's daily goal
          const { data: profile } = await (await import('@/lib/supabase/client')).getSupabaseClient()
            .from('profiles')
            .select('daily_cards_goal')
            .eq('id', user.id)
            .maybeSingle();

          const dailyGoal = (profile as Record<string, unknown> | null)?.['daily_cards_goal'] as number || 20;

          // Update streak after session
          await streakService.updateStreakAfterSession(user.id, dailyGoal);

          // Check for achievement unlocks
          await achievementEngine.checkAndUnlockAchievements(user.id);

          // Maybe surprise achievement
          await achievementEngine.maybeSurpriseAchievement(user.id);

          // Mark daily goal as celebrated (if met)
          const alreadyCelebrated = await dailyGoalTrackerService.hasAlreadyCelebratedToday(user.id);
          if (!alreadyCelebrated && newReviewedCount >= dailyGoal) {
            await dailyGoalTrackerService.markGoalCelebratedToday(user.id);
          }
        } catch (error) {
          console.error('Error finalizing session:', error);
        }
      }

      setSessionComplete(true);
    }
  };

  const handleClose = () => {
    if (confirm('Exit flashcard practice?')) {
      router.push(`/seeds/${seedId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <p className="text-gray-400">{generationMessage}</p>
        <div className="w-64 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all"
            style={{ width: `${generationProgress * 100}%` }}
          />
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="space-y-6 p-4">
        <Button variant="ghost" onClick={() => router.push(`/seeds/${seedId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Material
        </Button>

        <div className="rounded-lg border border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent p-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-white">Practice Complete</h2>
            <p className="text-gray-400">
              You reviewed {sessionStats.reviewed} out of {sessionStats.total} flashcards
            </p>
            <Button onClick={() => window.location.reload()}>
              <RotateCw className="h-4 w-4 mr-2" />
              Review Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="text-center text-gray-400 p-4">
        No flashcards available
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm text-gray-400">
          {sessionStats.reviewed + 1} / {sessionStats.total}
        </div>
      </div>

      {/* Flashcard */}
      <div
        onClick={flipCard}
        className="cursor-pointer perspective"
      >
        <div
          className={`relative h-80 rounded-lg border border-orange-500/30 bg-gradient-to-br from-slate-800 to-slate-900 p-6 flex items-center justify-center transition-transform duration-500 ${
            currentCard.isFlipped ? 'scale-95' : ''
          }`}
          style={{
            transform: currentCard.isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">
              {currentCard.isFlipped ? 'Answer' : 'Question'}
            </p>
            <p className="text-xl text-white leading-relaxed">
              {currentCard.isFlipped ? currentCard.answer : currentCard.question}
            </p>
            <p className="text-xs text-gray-500 mt-4">Click to flip</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 justify-center">
        <Button
          onClick={nextCard}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          Next Card
        </Button>
      </div>

      {/* Progress */}
      <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 transition-all"
          style={{
            width: `${((sessionStats.reviewed + 1) / sessionStats.total) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
