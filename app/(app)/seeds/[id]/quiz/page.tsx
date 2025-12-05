'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { quizService } from '@/lib/api/quizService';
import { QuizAttempt } from '@/types';
import { xpService } from '@/lib/api/xpService';
import { streakService } from '@/lib/api/streakService';
import { achievementEngine } from '@/lib/api/achievementEngine';
import { dailyGoalTrackerService } from '@/lib/api/dailyGoalTracker';
import { QuizQuestion } from '@/types';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCw,
  Star,
  Rocket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface QuizQuestionState extends QuizQuestion {
  selectedAnswer?: number;
  isAnswered: boolean;
  showResult: boolean;
  explanation?: string;
}

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const seedId = params.id as string;

  const [questions, setQuestions] = useState<QuizQuestionState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    completed: false,
  });
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [sessionStartTime] = useState<number>(Date.now());
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  // Fix for build error: missing state variables
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);

  const currentQuestion = questions[currentIndex] ?? null;

  const loadQuizQuestions = useCallback(async () => {
    if (!user || !seedId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: questions, error: fetchError } = await quizService.getQuizQuestionsBySeed(seedId, user.id);

      if (fetchError) {
        throw new Error(fetchError);
      }

      if (questions && questions.length > 0) {
        const questionStates: QuizQuestionState[] = questions.map((question) => ({
          ...question,
          isAnswered: false,
          showResult: false,
        }));
        setQuestions(questionStates);
      } else {
        throw new Error('No quiz questions available. They are being generated in the background. Please try again in a moment.');
      }
    } catch (err) {
      console.error('Error loading quiz questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quiz questions');
    } finally {
      setIsLoading(false);
    }
  }, [user, seedId]);

  useEffect(() => {
    if (user && seedId) {
      loadQuizQuestions();
    }
  }, [user, seedId, loadQuizQuestions]);

  const handleSelectAnswer = useCallback(
    async (answerIndex: number) => {
      if (!currentQuestion || currentQuestion.isAnswered || !user) return;

      const isCorrect = answerIndex === currentQuestion.correct_answer;

      // NOTE: Individual practice does NOT award XP
      // Only exam reviews contribute to XP, streaks, accuracy, and grades
      // This is purely for learning and practice

      // Track this attempt
      const attempt: QuizAttempt = {
        question_id: currentQuestion.id,
        selected_answer: answerIndex,
        is_correct: isCorrect,
        time_spent: 0,
      };

      setAttempts((prev) => {
        const filteredAttempts = prev.filter((a) => a.question_id !== currentQuestion.id);
        return [...filteredAttempts, attempt];
      });

      setQuestions((prev) =>
        prev.map((question, index) =>
          index === currentIndex
            ? {
                ...question,
                selectedAnswer: answerIndex,
                isAnswered: true,
                showResult: true,
              }
            : question
        )
      );

      setSessionStats((prev) => ({
        ...prev,
        correct: isCorrect ? prev.correct + 1 : prev.correct,
        incorrect: isCorrect ? prev.incorrect : prev.incorrect + 1,
      }));

      setShowFeedback(true);

      // NOTE: Individual quiz practice does NOT update SM-2
      // SM-2 is only used in exam review mode
      // This matches iOS behavior where practice is separate from spaced repetition

      // Auto-advance after 1.5 seconds
      setTimeout(() => {
        handleContinue();
      }, 1500);
    },
    [currentQuestion, currentIndex, user]
  );

  const handleContinue = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowFeedback(false);
    } else {
      // Quiz completed - save to database
      if (user && seedId) {
        try {
          const timeSpentSeconds = Math.round((Date.now() - sessionStartTime) / 1000);

          // Save quiz session (for tracking only, does not affect XP/streaks)
          await quizService.createLearningSession(seedId, user.id, {
            totalItems: questions.length,
            correctItems: sessionStats.correct,
            timeSpent: timeSpentSeconds,
            attempts: attempts,
            metadata: {
              incorrect: sessionStats.incorrect,
              sessionType: 'quiz',
              source: 'individual-practice',
            },
          });

          // NOTE: Individual practice does NOT:
          // - Update streaks
          // - Unlock achievements
          // - Count toward daily goals
          // - Award XP
          // Only exam reviews contribute to these metrics
        } catch (error) {
          console.error('Error finalizing quiz session:', error);
        }
      }

      setSessionStats((prev) => ({ ...prev, completed: true }));
    }
  };

  const handleClose = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    router.push(`/seeds/${seedId}`);
  };

  const restartQuiz = () => {
    setCurrentIndex(0);
    setShowFeedback(false);
    setSessionStats({ correct: 0, incorrect: 0, completed: false });
    setAttempts([]);
    setQuestions((prev) =>
      prev.map((question) => ({
        ...question,
        selectedAnswer: undefined,
        isAnswered: false,
        showResult: false,
      }))
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading quiz questions...</span>
        </div>
      </div>
    );
  }

  // Generating state
  if (isGenerating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Generating Quiz</h1>
        </div>

        <div className="rounded-lg border-2 border-blue-300 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 shadow-lg p-8">
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
              Please keep this page open while we generate your quiz questions
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || questions.length === 0) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push(`/seeds/${seedId}`)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Seed
        </Button>

        <div className="rounded-lg border border-red-500/20 bg-red-500/10 backdrop-blur-xl p-8">
          <div className="text-center space-y-4">
            <p className="text-red-500 font-medium">
              {error || 'No quiz questions could be generated from this content'}
            </p>
            <Button onClick={loadQuizQuestions} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = Math.round(((currentIndex + 1) / questions.length) * 100);
  const progressWidth = ((currentIndex + 1) / questions.length) * 100;
  const totalQuestions = questions.length;
  const scorePercentage = Math.round((sessionStats.correct / totalQuestions) * 100);

  // Get score color based on percentage (matching iOS)
  const getScoreColor = (pct: number) => {
    if (pct >= 90) return 'bg-green-500';
    if (pct >= 80) return 'bg-blue-500';
    if (pct >= 70) return 'bg-purple-500';
    return 'bg-primary';
  };

  const scoreColor = getScoreColor(scorePercentage);

  // Completion modal - Matching iOS quiz variant
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
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-500" />
              Solid performance!
            </h2>

            {/* Combined summary - No redundancy (matching iOS) */}
            <p className="text-lg text-gray-300">
              {sessionStats.correct} nailed, {sessionStats.incorrect} to master
            </p>
          </div>

          {/* Action Button (matching iOS) */}
          <div className="flex justify-center">
            <Button
              onClick={restartQuiz}
              className="px-8"
              size="lg"
            >
              Try Again & Ace It
              <Rocket className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const isCorrectAnswer = currentQuestion.selectedAnswer === currentQuestion.correct_answer;

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
            {currentIndex + 1} of {questions.length}
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

      {/* Question Card */}
      <div className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 shadow-lg p-8 min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-purple-600 mb-4 font-medium">Question {currentIndex + 1}</div>
          <h2 className="text-xl text-gray-800 font-semibold leading-relaxed">
            {currentQuestion.question}
          </h2>
        </div>
      </div>

      {/* Answer Options */}
      <div className="space-y-3">
        {currentQuestion.options.map((option, index) => {
          const isSelected = currentQuestion.selectedAnswer === index;
          const isCorrect = index === currentQuestion.correct_answer;
          const showResult = currentQuestion.showResult;

          let buttonClass =
            'w-full text-left p-4 rounded-lg border transition-all duration-200 ';

          if (!showResult) {
            // Before answer
            buttonClass +=
              'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white';
          } else if (isSelected && isCorrect) {
            // Selected correct answer
            buttonClass +=
              'border-green-500/50 bg-green-500/20 text-green-400 font-medium';
          } else if (isSelected && !isCorrect) {
            // Selected incorrect answer
            buttonClass += 'border-red-500/50 bg-red-500/20 text-red-400 font-medium';
          } else if (isCorrect) {
            // Show correct answer
            buttonClass +=
              'border-green-500/50 bg-green-500/20 text-green-400 font-medium';
          } else {
            // Other options
            buttonClass += 'border-white/10 bg-white/5 text-gray-400';
          }

          return (
            <button
              key={index}
              onClick={() => handleSelectAnswer(index)}
              disabled={currentQuestion.isAnswered}
              className={buttonClass}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="flex-1">{option}</span>
                {showResult && isSelected && isCorrect && (
                  <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                )}
                {showResult && isSelected && !isCorrect && (
                  <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                )}
                {showResult && !isSelected && isCorrect && (
                  <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Explanation (shown after answer) */}
      {showFeedback && currentQuestion.explanation && (
        <div
          className={`p-4 rounded-lg border ${
            isCorrectAnswer
              ? 'border-green-500/20 bg-green-500/10'
              : 'border-red-500/20 bg-red-500/10'
          }`}
        >
          <div className="flex items-start gap-3">
            {isCorrectAnswer ? (
              <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div
                className={`font-medium mb-1 ${
                  isCorrectAnswer ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {isCorrectAnswer ? 'Correct!' : 'Incorrect'}
              </div>
              <p className="text-sm text-gray-300">{currentQuestion.explanation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={confirmExit}
        title="Exit Quiz?"
        description="Are you sure you want to exit this quiz session? Your progress will not be saved."
        confirmText="Exit"
        cancelText="Continue Quiz"
        variant="warning"
      />
    </div>
  );
}
