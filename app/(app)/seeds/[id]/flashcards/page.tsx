'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { flashcardsService } from '@/lib/api/flashcards';
import { Flashcard } from '@/lib/supabase/types';
import {
  ArrowLeft,
  Loader2,
  RotateCw,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FlashcardState extends Flashcard {
  isFlipped: boolean;
  isKnown: boolean;
}

export default function FlashcardsPage() {
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
    correct: 0,
    needReview: 0,
    completed: false,
  });
  const [sessionStartTime] = useState<number>(Date.now());
  const [exitAnimation, setExitAnimation] = useState<'left' | 'right' | 'up' | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | null>(null);

  // Drag state for smooth swipe animations
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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
      // Try to load existing flashcards
      const existingCards = await flashcardsService.getFlashcards(seedId, user.id);

      if (existingCards && existingCards.length > 0) {
        const flashcardStates: FlashcardState[] = existingCards.map((card) => ({
          ...card,
          isFlipped: false,
          isKnown: false,
        }));
        setFlashcards(flashcardStates);
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
        isKnown: false,
      }));

      setFlashcards(flashcardStates);
      setIsGenerating(false);
    } catch (err) {
      console.error('Error loading flashcards:', err);
      setError(err instanceof Error ? err.message : 'Failed to load flashcards');
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const handleSwipeRating = useCallback(
    async (direction: 'left' | 'right' | 'up', quality: number) => {
      if (!user || !currentCard || currentCard.isKnown) return;

      // Mark card as processed
      setFlashcards((prev) =>
        prev.map((card, index) =>
          index === currentIndex ? { ...card, isKnown: true } : card
        )
      );

      // Update session stats
      const isCorrect = quality >= 3;
      const newStats = {
        ...sessionStats,
        correct: sessionStats.correct + (isCorrect ? 1 : 0),
        needReview: sessionStats.needReview + (isCorrect ? 0 : 1),
      };
      setSessionStats(newStats);

      // Trigger exit animation
      setExitAnimation(direction);

      // Review flashcard (SM-2 update happens in service)
      try {
        await flashcardsService.reviewFlashcard(currentCard.id, direction);
      } catch (err) {
        console.error('Error reviewing flashcard:', err);
      }

      // Wait for animation to complete before moving to next card
      setTimeout(() => {
        setExitAnimation(null);
        nextCard(newStats);
      }, 300);
    },
    [user, currentCard, currentIndex, sessionStats]
  );

  const nextCard = async (latestStats: typeof sessionStats) => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      // Reset flip state for next card
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
          await flashcardsService.createLearningSession(seedId, user.id, {
            totalItems: flashcards.length,
            correctItems: latestStats.correct,
            timeSpent: timeSpentSeconds,
            metadata: {
              needReview: latestStats.needReview,
              sessionType: 'flashcards',
              source: 'individual-practice',
            },
          });
        } catch (error) {
          console.error('Error saving flashcard session:', error);
        }
      }

      setSessionStats((prev) => ({ ...prev, completed: true }));
    }
  };

  const handleButtonPress = (direction: 'left' | 'right' | 'up', quality: number) => {
    handleSwipeRating(direction, quality);
  };

  const flipCard = () => {
    if (!currentCard) return;
    setFlashcards((prev) =>
      prev.map((card, index) =>
        index === currentIndex ? { ...card, isFlipped: !card.isFlipped } : card
      )
    );
  };

  const handleClose = () => {
    if (confirm('Are you sure you want to exit this flashcard session?')) {
      router.push(`/seeds/${seedId}`);
    }
  };

  const restartSession = () => {
    setCurrentIndex(0);
    setSessionStats({ correct: 0, needReview: 0, completed: false });
    setFlashcards((prev) =>
      prev.map((card) => ({
        ...card,
        isFlipped: false,
        isKnown: false,
      }))
    );
  };

  // Pointer event handlers for smooth drag (matching iOS gesture behavior)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!currentCard || !currentCard.isFlipped || exitAnimation) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffset({ x: 0, y: 0 });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !currentCard || !currentCard.isFlipped || exitAnimation) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setDragOffset({ x: deltaX, y: deltaY });

    // Calculate swipe direction (matching iOS thresholds)
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    let direction: 'left' | 'right' | 'up' | null = null;

    // Horizontal has priority if dominant (matching iOS)
    if (absX > absY) {
      if (deltaX > 50) {
        direction = 'right';
      } else if (deltaX < -50) {
        direction = 'left';
      }
    } else if (absY > absX && deltaY < -100) {
      // Only up swipe if vertical dominant
      direction = 'up';
    }

    setSwipeDirection(direction);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (!currentCard || !currentCard.isFlipped || exitAnimation) {
      setDragOffset({ x: 0, y: 0 });
      setSwipeDirection(null);
      return;
    }

    const absX = Math.abs(dragOffset.x);
    const absY = Math.abs(dragOffset.y);

    // Thresholds matching iOS (lines 303-304 in SwipeFlashcard.tsx)
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
      handleSwipeRating(direction, quality);
    } else {
      // Swipe cancelled - spring back to center
      setDragOffset({ x: 0, y: 0 });
      setSwipeDirection(null);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading flashcards...</span>
        </div>
      </div>
    );
  }

  // Generating state
  if (isGenerating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Generating Flashcards</h1>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-8">
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <div>
              <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
              <p className="text-center text-gray-300">{generationMessage}</p>
              <p className="text-center text-sm text-gray-400 mt-2">
                {generationProgress}%
              </p>
            </div>
            <p className="text-center text-sm text-gray-500">
              Please keep this page open while we generate your flashcards
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || flashcards.length === 0) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push(`/seeds/${seedId}`)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Seed
        </Button>

        <div className="rounded-lg border border-red-500/20 bg-red-500/10 backdrop-blur-xl p-8">
          <div className="text-center space-y-4">
            <p className="text-red-500 font-medium">
              {error || 'No flashcards could be generated from this content'}
            </p>
            <Button onClick={loadFlashcards} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = Math.round(((currentIndex + 1) / flashcards.length) * 100);
  const progressWidth = ((currentIndex + 1) / flashcards.length) * 100;
  const totalCards = flashcards.length;
  const scorePercentage = totalCards > 0 ? Math.round((sessionStats.correct / totalCards) * 100) : 0;

  // Get score color based on percentage (matching iOS)
  const getScoreColor = (pct: number) => {
    if (pct >= 90) return 'bg-green-500';
    if (pct >= 80) return 'bg-blue-500';
    if (pct >= 70) return 'bg-purple-500';
    return 'bg-primary';
  };

  const scoreColor = getScoreColor(scorePercentage);

  // Completion modal - Matching iOS flashcards variant
  if (sessionStats.completed) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/10 p-8 max-w-md w-full space-y-6 shadow-2xl">
          {/* Score Circle */}
          <div className="flex flex-col items-center space-y-4">
            <div
              className={`w-36 h-36 rounded-full ${scoreColor} flex items-center justify-center`}
            >
              <span className="text-5xl font-bold text-white">{scorePercentage}%</span>
            </div>

            {/* Title - Emotional (matching iOS) */}
            <h2 className="text-2xl font-bold text-white">🔥 You're on fire!</h2>

            {/* Summary - No redundancy (matching iOS) */}
            <p className="text-lg text-gray-300">
              {sessionStats.correct} cards locked in 🔒
            </p>

            {/* Challenge framing (matching iOS) */}
            {sessionStats.needReview > 0 && (
              <p className="text-lg text-primary">
                {sessionStats.needReview} more to conquer
              </p>
            )}
          </div>

          {/* Action Button (matching iOS) */}
          <div className="flex justify-center">
            <Button
              onClick={restartSession}
              className="px-8"
              size="lg"
            >
              Master It Again! 💪
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard) return null;

  // Get swipe direction color and text
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

  // Calculate overlay opacity based on drag distance (matching iOS lines 498-507)
  const getOverlayOpacity = () => {
    const absX = Math.abs(dragOffset.x);
    const absY = Math.abs(dragOffset.y);
    const effectiveY = dragOffset.y < 0 ? absY : 0;
    const effectiveDistance = Math.max(absX, effectiveY);

    // Fade in overlay as user drags (0 to 0.85 over 150px)
    return Math.min(0.85, effectiveDistance / 150);
  };

  // Calculate border width based on drag distance (matching iOS lines 533-538)
  const getBorderWidth = () => {
    const absX = Math.abs(dragOffset.x);
    const absY = Math.abs(dragOffset.y);
    const effectiveY = dragOffset.y < 0 ? absY : 0;
    const effectiveDistance = Math.max(absX, effectiveY);

    // Border grows from 0 to 3px over 150px
    return Math.min(3, effectiveDistance / 50);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleClose} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Exit
        </Button>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">
            {currentIndex + 1} of {flashcards.length}
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

      {/* Flashcard */}
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
                transform: currentCard.isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front - Question */}
              <div
                className={`absolute inset-0 backface-hidden rounded-2xl border bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl p-8 ${
                  !currentCard.isFlipped ? 'opacity-100' : 'opacity-0'
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
                  <div className="text-sm text-gray-400 mb-4">Question</div>
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-xl text-white text-center leading-relaxed">
                      {currentCard.question}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-4">
                    <RotateCw className="h-4 w-4" />
                    <span>Tap to flip</span>
                  </div>
                </div>

                {/* Swipe feedback overlay - dark background (matching iOS) */}
                <div
                  className="absolute inset-0 rounded-2xl bg-black pointer-events-none"
                  style={{ opacity: getOverlayOpacity() }}
                />

                {/* Swipe feedback text - centered rating label */}
                {swipeDirection && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{
                      opacity: Math.min(1, getOverlayOpacity() * 2), // Fade in text faster than overlay
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
                className={`absolute inset-0 backface-hidden rounded-2xl border bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl p-8 ${
                  currentCard.isFlipped ? 'opacity-100' : 'opacity-0'
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
                  <div className="text-sm text-gray-400 mb-4">Answer</div>
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-xl text-white text-center leading-relaxed">
                      {currentCard.answer}
                    </p>
                  </div>
                </div>

                {/* Swipe feedback overlay - dark background (matching iOS) */}
                <div
                  className="absolute inset-0 rounded-2xl bg-black pointer-events-none"
                  style={{ opacity: getOverlayOpacity() }}
                />

                {/* Swipe feedback text - centered rating label */}
                {swipeDirection && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{
                      opacity: Math.min(1, getOverlayOpacity() * 2), // Fade in text faster than overlay
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
      {currentCard.isFlipped && (
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
              <ChevronLeft className="h-6 w-6 text-red-400" />
              <span className="text-sm text-red-400 font-medium">Forgot</span>
            </button>

            <button
              onClick={() => handleButtonPress('up', 3)}
              disabled={!!exitAnimation}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
            >
              <ChevronUp className="h-6 w-6 text-blue-400" />
              <span className="text-sm text-blue-400 font-medium">Somewhat</span>
            </button>

            <button
              onClick={() => handleButtonPress('right', 4)}
              disabled={!!exitAnimation}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
            >
              <ChevronRight className="h-6 w-6 text-green-400" />
              <span className="text-sm text-green-400 font-medium">Know</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
