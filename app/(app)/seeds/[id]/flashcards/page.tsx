
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { flashcardsService } from '@/lib/api/flashcardsService';
import { xpService } from '@/lib/api/xpService';
import { streakService } from '@/lib/api/streakService';
import { achievementEngine } from '@/lib/api/achievementEngine';
import { dailyGoalTrackerService } from '@/lib/api/dailyGoalTracker';
import { Flashcard } from '@/types';
import { ArrowLeft, Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

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
  const [error, setError] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    total: 0,
  });
  const [sessionStartTime] = useState<number>(Date.now());
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Background generation polling
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [pollIntervalId, setPollIntervalId] = useState<NodeJS.Timeout | null>(null);

  const currentCard = flashcards[currentIndex] ?? null;

  const loadFlashcards = useCallback(async () => {
    if (!user || !seedId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: cards, error: fetchError } = await flashcardsService.getFlashcardsBySeed(seedId, user.id);

      if (fetchError) {
        throw new Error(fetchError);
      }

      if (cards && cards.length > 0) {
        const flashcardStates: FlashcardState[] = cards.map((card) => ({
          ...card,
          isFlipped: false,
        }));
        setFlashcards(flashcardStates);
        setSessionStats({ reviewed: 0, total: cards.length });
        setIsGenerating(false);
      } else {
        // No flashcards available - they might be generating in the background
        setIsGenerating(true);
        setGenerationMessage('Flashcards are being generated in the background. Please wait...');
      }
    } catch (err) {
      console.error('Error loading flashcards:', err);
      setError(err instanceof Error ? err.message : 'Failed to load flashcards');
    } finally {
      setIsLoading(false);
    }
  }, [user, seedId]);

  useEffect(() => {
    if (user && seedId) {
      loadFlashcards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, seedId]);

  // Handle background generation polling
  useEffect(() => {
    if (!isGenerating) {
      // Clear any existing poll interval
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
        setPollIntervalId(null);
      }
      return;
    }

    // Poll every 2 seconds while generating
    const intervalId = setInterval(async () => {
      if (!user || !seedId) return;

      try {
        const { data: cards } = await flashcardsService.getFlashcardsBySeed(seedId, user.id);

        if (cards && cards.length > 0) {
          // Flashcards are ready!
          const flashcardStates: FlashcardState[] = cards.map((card) => ({
            ...card,
            isFlipped: false,
          }));
          setFlashcards(flashcardStates);
          setSessionStats({ reviewed: 0, total: cards.length });
          setIsGenerating(false);
          setGenerationMessage('');
          clearInterval(intervalId);
          setPollIntervalId(null);
        }
      } catch (err) {
        console.error('Error polling flashcards:', err);
      }
    }, 2000);

    setPollIntervalId(intervalId);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isGenerating, user, seedId]);

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

    // NOTE: Individual practice does NOT award XP, update streaks, or unlock achievements
    // Only exam reviews contribute to XP, streaks, accuracy, and grades
    // This is purely for learning and practice

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

          // NOTE: Individual practice does NOT create learning_sessions
          // Only exam reviews create learning_sessions records
          // Individual practice is purely for learning without affecting stats

          // Removed: flashcardsService.createLearningSession()
          // This was causing database errors because learning_sessions
          // should only track exam-level sessions, not individual practice

          // NOTE: Individual practice does NOT:
          // - Update streaks
          // - Unlock achievements
          // - Count toward daily goals
          // - Award XP
          // Only exam reviews contribute to these metrics
        } catch (error) {
          console.error('Error finalizing session:', error);
        }
      }

      // Auto-redirect to seed material when all flashcards are reviewed
      router.push(`/seeds/${seedId}`);
    }
  };

  const handleClose = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    router.push(`/seeds/${seedId}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="absolute top-4 left-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <img
          src="/brand-assets/icon.png"
          alt="Masterly"
          className="h-20 w-20 animate-bounce"
        />
        <p className="text-gray-400 text-center">Loading flashcards...</p>
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
      <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/seeds/${seedId}`)}
          className="absolute top-4 left-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <img
          src="/brand-assets/icon.png"
          alt="Masterly"
          className="h-20 w-20 animate-bounce"
        />
        <p className="text-gray-400 text-center">{generationMessage}</p>
        <div className="w-64 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all"
            style={{ width: `${generationProgress * 100}%` }}
          />
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    return null; // Auto-redirect happens above, render nothing while redirecting
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
        style={{ perspective: '1000px' }}
      >
        <div
          className={`relative h-80 rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 p-6 flex items-center justify-center transition-transform duration-500 shadow-lg ${
            currentCard.isFlipped ? 'scale-95' : ''
          }`}
          style={{
            transform: currentCard.isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          <div 
            className="text-center absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 rounded-lg"
            style={{
              transform: currentCard.isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            <p className="text-xs text-purple-600 mb-2 font-medium">
              {currentCard.isFlipped ? 'Answer' : 'Question'}
            </p>
            <p className="text-xl text-gray-800 leading-relaxed font-medium">
              {currentCard.isFlipped ? currentCard.answer : currentCard.question}
            </p>
            <p className="text-xs text-purple-500 mt-4">Click to flip</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 justify-center">
        <Button
          onClick={nextCard}
          className="bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white"
        >
          Next Card
        </Button>
      </div>

      {/* Progress */}
      <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all"
          style={{
            width: `${((sessionStats.reviewed + 1) / sessionStats.total) * 100}%`,
          }}
        />
      </div>

      {/* Exit Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={confirmExit}
        title="Exit Flashcard Practice?"
        description="Are you sure you want to exit? Your progress will be saved."
        confirmText="Exit"
        cancelText="Continue Practicing"
        variant="warning"
      />
    </div>
  );
}
