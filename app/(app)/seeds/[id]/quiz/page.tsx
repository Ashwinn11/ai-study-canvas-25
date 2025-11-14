'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { quizService, QuizAttempt } from '@/lib/api/quiz';
import { QuizQuestion } from '@/lib/supabase/types';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuizQuestionState extends QuizQuestion {
  selectedAnswer?: number;
  isAnswered: boolean;
  showResult: boolean;
}

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const seedId = params.id as string;

  const [questions, setQuestions] = useState<QuizQuestionState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    completed: false,
  });
  const [sessionStartTime] = useState<number>(Date.now());
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const currentQuestion = questions[currentIndex] ?? null;

  useEffect(() => {
    if (user && seedId) {
      loadQuizQuestions();
    }
  }, [user, seedId]);

  const loadQuizQuestions = async () => {
    if (!user || !seedId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Try to load existing quiz questions
      const existingQuestions = await quizService.getQuizQuestionsBySeed(seedId, user.id);

      if (existingQuestions && existingQuestions.length > 0) {
        const questionStates: QuizQuestionState[] = existingQuestions.map((question) => ({
          ...question,
          isAnswered: false,
          showResult: false,
        }));
        setQuestions(questionStates);
        setIsLoading(false);
        return;
      }

      // No existing quiz questions - need to generate
      setIsGenerating(true);
      setIsLoading(false);

      const createdQuestions = await quizService.createQuizQuestions({
        seedId,
        userId: user.id,
        quantity: 10,
        onProgress: (progress, message) => {
          setGenerationProgress(progress);
          setGenerationMessage(message);
        },
      });

      if (!createdQuestions || createdQuestions.length === 0) {
        throw new Error('No quiz questions could be generated from this content');
      }

      const questionStates: QuizQuestionState[] = createdQuestions.map((question) => ({
        ...question,
        isAnswered: false,
        showResult: false,
      }));

      setQuestions(questionStates);
      setIsGenerating(false);
    } catch (err) {
      console.error('Error loading quiz questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quiz questions');
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const handleSelectAnswer = useCallback(
    async (answerIndex: number) => {
      if (!currentQuestion || currentQuestion.isAnswered || !user) return;

      const isCorrect = answerIndex === currentQuestion.correct_answer;

      // Track this attempt
      const attempt: QuizAttempt = {
        questionId: currentQuestion.id,
        selectedAnswer: String(answerIndex),
        isCorrect,
        timeSpent: 0,
      };

      setAttempts((prev) => {
        const filteredAttempts = prev.filter((a) => a.questionId !== currentQuestion.id);
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

      // Review question with SM-2
      try {
        await quizService.reviewQuizQuestion(currentQuestion.id, isCorrect);
      } catch (err) {
        console.error('Error reviewing quiz question:', err);
      }

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
        } catch (error) {
          console.error('Error saving quiz session:', error);
        }
      }

      setSessionStats((prev) => ({ ...prev, completed: true }));
    }
  };

  const handleClose = () => {
    if (confirm('Are you sure you want to exit this quiz session?')) {
      router.push(`/seeds/${seedId}`);
    }
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
            <h2 className="text-2xl font-bold text-white">💯 Solid performance!</h2>

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
              Try Again & Ace It 🚀
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
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl p-8 space-y-6">
        <div>
          <div className="text-sm text-gray-400 mb-4">Question {currentIndex + 1}</div>
          <h2 className="text-xl text-white font-medium leading-relaxed">
            {currentQuestion.question}
          </h2>
        </div>

        {/* Options */}
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
      </div>
    </div>
  );
}
