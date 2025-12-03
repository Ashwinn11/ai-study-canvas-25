import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { backgroundProcessor } from '@/lib/api/backgroundProcessor';

import { logger } from "@/utils/logger";
export interface ContentGenerationProgress {
  flashcards: number; // 0-100
  quiz: number; // 0-100
}

export interface QueueState {
  flashcards: 'none' | 'running' | 'queued';
  quiz: 'none' | 'running' | 'queued';
  flashcardsPosition?: number; // Queue position
  quizPosition?: number;
}

export interface UseContentGenerationReturn {
  progress: ContentGenerationProgress;
  isGenerating: boolean;
  queueState: QueueState;
  hasFailures: boolean;
  failures: {
    flashcards?: string; // Error message
    quiz?: string;
  };
}

/**
 * Hook to track content generation progress for a seed
 * Polls background processor every 2 seconds to get task status
 */
export const useContentGeneration = (seedId?: string): UseContentGenerationReturn => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ContentGenerationProgress>({
    flashcards: 100,
    quiz: 100,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [queueState, setQueueState] = useState<QueueState>({
    flashcards: 'none',
    quiz: 'none',
  });
  const [failures, setFailures] = useState<{ flashcards?: string; quiz?: string }>({});

  useEffect(() => {
    if (!seedId || !user) {
      setProgress({ flashcards: 100, quiz: 100 });
      setIsGenerating(false);
      setQueueState({ flashcards: 'none', quiz: 'none' });
      setFailures({});
      return;
    }

    const checkStatus = () => {
      try {
        // Check both running and queued tasks
        const activeTasks = backgroundProcessor.getActiveTasks(user.id);
        const queuedTasks = backgroundProcessor.getQueuedTasks(user.id);
        const allTasks = [...activeTasks, ...queuedTasks];
        const seedTasks = allTasks.filter((t) => t.seedId === seedId);

        const flashcardTask = seedTasks.find(
          (t) => t.metadata?.contentType === 'flashcards',
        );
        const quizTask = seedTasks.find(
          (t) => t.metadata?.contentType === 'quiz',
        );

        // Update progress
        const newProgress = {
          flashcards: flashcardTask?.progress ?? 100,
          quiz: quizTask?.progress ?? 100,
        };
        setProgress(newProgress);

        // Determine queue state for flashcards
        let flashcardState: 'none' | 'running' | 'queued' = 'none';
        let flashcardPosition: number | undefined;

        if (flashcardTask) {
          if (flashcardTask.status === 'running') {
            flashcardState = 'running';
            flashcardPosition = 0;
          } else if (flashcardTask.status === 'pending') {
            flashcardState = 'queued';
            flashcardPosition = backgroundProcessor.getQueuePosition(seedId, user.id, 'flashcards') ?? undefined;
          }
        }

        // Determine queue state for quiz
        let quizState: 'none' | 'running' | 'queued' = 'none';
        let quizPosition: number | undefined;

        if (quizTask) {
          if (quizTask.status === 'running') {
            quizState = 'running';
            quizPosition = 0;
          } else if (quizTask.status === 'pending') {
            quizState = 'queued';
            quizPosition = backgroundProcessor.getQueuePosition(seedId, user.id, 'quiz') ?? undefined;
          }
        }

        setQueueState({
          flashcards: flashcardState,
          quiz: quizState,
          flashcardsPosition: flashcardPosition,
          quizPosition: quizPosition,
        });

        // Track failures (persisted + current task state)
        const persistedFailures =
          backgroundProcessor.getLastFailures(seedId, user.id) || {};
        const nextFailures: { flashcards?: string; quiz?: string } = {
          ...persistedFailures,
        };

        if (flashcardTask?.status === 'failed' && flashcardTask.error) {
          nextFailures.flashcards = flashcardTask.error;
        }
        if (quizTask?.status === 'failed' && quizTask.error) {
          nextFailures.quiz = quizTask.error;
        }

        setFailures(nextFailures);

        // Check if any tasks are still running or queued
        const hasRunningTasks = seedTasks.some(
          (t) => t.status === 'running' || t.status === 'pending',
        );
        setIsGenerating(hasRunningTasks);
      } catch (error) {
        logger.error('[useContentGeneration] Error polling tasks:', error);
        setIsGenerating(false);
      }
    };

    // Initial check
    checkStatus();

    // Poll every 5 seconds (optimized for battery life)
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, [seedId, user]);

  const hasFailures = Boolean(failures.flashcards || failures.quiz);

  return { progress, isGenerating, queueState, hasFailures, failures };
};
