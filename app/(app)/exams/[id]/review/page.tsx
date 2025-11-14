'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { spacedRepetitionService, type ReviewItem } from '@/lib/api/spacedRepetition';
import { flashcardsService } from '@/lib/api/flashcards';
import { quizService } from '@/lib/api/quiz';
import { scoreToGrade } from '@/lib/utils/gradeUtils';
import { Flashcard, QuizQuestion } from '@/lib/supabase/types';
import { ArrowLeft, Loader2, RotateCw, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [exitAnimation, setExitAnimation] = useState<'left' | 'right' | 'up' | null>(null);

  // Drag state for smooth swipe animations
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | null>(null);

  // Store quality ratings for each item
  const results = new Map<string, number>();

  useEffect(() => {
    if (user && examId) {
      loadReviewItems();
    }
  }, [user, examId]);

  const loadReviewItems = async () => {
    if (!user || !examId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { flashcards, quizQuestions, error: fetchError } =
        await spacedRepetitionService.getExamReviewItems(user.id, examId, isPracticeMode);

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
    } catch (err) {
      console.error('Error loading review items:', err);
      setError(err instanceof Error ? err.message : 'Failed to load review items');
      setIsLoading(false);
    }
  };

  const currentItem = reviewItems[currentIndex] || null;
  const isLastItem = currentIndex === reviewItems.length - 1;

  const moveToNext = useCallback(() => {
    if (isLastItem) {
      // Session complete
      setSessionComplete(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setSelectedAnswer(null);
      setShowQuizResult(false);
      setSwipeDirection(null);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [isLastItem]);

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
    results.set(currentItem.id, quality);

    setStats((prev) => ({
      ...prev,
      quizCorrect: prev.quizCorrect + (isCorrect ? 1 : 0),
      quizTotal: prev.quizTotal + 1,
    }));

    // Update SM2 in background (non-blocking) - Skip in practice mode
    if (!isPracticeMode) {
      quizService
        .reviewQuizQuestion(currentItem.id, isCorrect)
        .catch((err) => console.error('Error updating quiz SM2:', err));
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

    results.set(currentItem.id, quality);
    setStats((prev) => ({
      ...prev,
      flashcardCorrect: prev.flashcardCorrect + (isCorrect ? 1 : 0),
      flashcardTotal: prev.flashcardTotal + 1,
    }));

    // Update SM2 in background (non-blocking) - Skip in practice mode
    if (!isPracticeMode) {
      flashcardsService
        .reviewFlashcard(currentItem.id, direction)
        .catch((err) => console.error('Error updating flashcard SM2:', err));
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
    if (confirm('Are you sure you want to exit this review session?')) {
      router.push(`/exams/${examId}`);
    }
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

  // Completion modal (matching iOS exam completion)
  if (sessionComplete) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/10 p-8 max-w-md w-full space-y-6 shadow-2xl">
          {/* Score Circle */}
          <div className="flex flex-col items-center space-y-4">
            <div className={`w-36 h-36 rounded-full ${scoreColor} flex items-center justify-center`}>
              <span className="text-5xl font-bold text-white">{scorePercentage}%</span>
            </div>

            {/* Letter Grade */}
            <div className={`text-4xl font-bold ${gradeColor}`}>{letterGrade}</div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white">
              {isPracticeMode ? '🎯 Practice Complete!' : '🔥 Review Session Complete!'}
            </h2>

            {/* Score Breakdown */}
            <div className="w-full space-y-2">
              {stats.flashcardTotal > 0 && (
                <div className="flex justify-between text-gray-300">
                  <span>Flashcards:</span>
                  <span className="font-semibold">
                    {stats.flashcardCorrect}/{stats.flashcardTotal}
                  </span>
                </div>
              )}
              {stats.quizTotal > 0 && (
                <div className="flex justify-between text-gray-300">
                  <span>Quiz:</span>
                  <span className="font-semibold">
                    {stats.quizCorrect}/{stats.quizTotal}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button onClick={() => router.push(`/exams/${examId}`)} className="w-full" size="lg">
              Back to Exam
            </Button>
            <Button
              onClick={() => {
                setSessionComplete(false);
                setCurrentIndex(0);
                setStats({ flashcardCorrect: 0, flashcardTotal: 0, quizCorrect: 0, quizTotal: 0 });
                results.clear();
                loadReviewItems();
              }}
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
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
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl p-8 min-h-[300px] flex items-center justify-center">
            <p className="text-xl text-white text-center leading-relaxed">
              {(currentItem.content as QuizQuestion).question}
            </p>
          </div>

          {/* Answer Options */}
          <div className="grid gap-3">
            {(currentItem.content as QuizQuestion).options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === (currentItem.content as QuizQuestion).correct_answer;
              const showResult = showQuizResult;

              let buttonClass = 'rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-primary/30 hover:bg-white/10';

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
          {showQuizResult && (currentItem.content as QuizQuestion).explanation && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-gray-400 mb-2">Explanation:</p>
              <p className="text-white">{(currentItem.content as QuizQuestion).explanation}</p>
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
                    className={`absolute inset-0 backface-hidden rounded-2xl border bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl p-8 ${
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
                      <div className="text-sm text-gray-400 mb-4">Question</div>
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-xl text-white text-center leading-relaxed">
                          {(currentItem.content as Flashcard).question}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-4">
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
                    className={`absolute inset-0 backface-hidden rounded-2xl border bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl p-8 ${
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
                      <div className="text-sm text-gray-400 mb-4">Answer</div>
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-xl text-white text-center leading-relaxed">
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
    </div>
  );
}
