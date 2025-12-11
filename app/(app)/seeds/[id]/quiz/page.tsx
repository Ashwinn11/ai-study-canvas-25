
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

  // Background generation polling
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [pollIntervalId, setPollIntervalId] = useState<NodeJS.Timeout | null>(null);

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
        setIsGenerating(false);
      } else {
        // No questions available - they might be generating in the background
        setIsGenerating(true);
        setGenerationMessage('Quiz questions are being generated in the background. Please wait...');
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
        const { data: questions } = await quizService.getQuizQuestionsBySeed(seedId, user.id);

        if (questions && questions.length > 0) {
          // Questions are ready!
          const questionStates: QuizQuestionState[] = questions.map((question) => ({
            ...question,
            isAnswered: false,
            showResult: false,
          }));
          setQuestions(questionStates);
          setIsGenerating(false);
          setGenerationMessage('');
        }
      } catch (err) {
        console.error('Error polling quiz questions:', err);
      }
    }, 2000);

    setPollIntervalId(intervalId);

    // Cleanup function
    return () => {
      clearInterval(intervalId);
      setPollIntervalId(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerating, user, seedId]);

  // Auto-redirect when quiz is completed
  useEffect(() => {
    if (sessionStats.completed) {
      router.push(`/seeds/${seedId}`);
    }
  }, [sessionStats.completed, router, seedId]);

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

          // NOTE: Individual practice does NOT create learning_sessions
          // Only exam reviews create learning_sessions records
          // Individual practice is purely for learning without affecting stats

          // Removed: quizService.createLearningSession()
          // This was causing database errors because learning_sessions
          // should only track exam-level sessions, not individual practice

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
        <p className="text-gray-400 text-center">Loading quiz questions...</p>
      </div>
    );
  }

  // Generating state
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
            className="h-full transition-all"
            style={{ backgroundColor: '#eac4d0', width: `${generationProgress}%` }}
          />
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

  if (sessionStats.completed) {
    return null; // Render nothing while redirecting
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
      <div className="rounded-2xl border-2 shadow-lg p-8 min-h-[300px] flex items-center justify-center" style={{ backgroundColor: '#eac4d0', borderColor: '#eac4d0' }}>
        <div className="text-center">
          <div className="text-sm mb-4 font-medium text-black">Question {currentIndex + 1}</div>
          <h2 className="text-xl text-black font-semibold leading-relaxed">
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
