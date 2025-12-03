import { useState, useEffect } from 'react';
import { backgroundProcessor, BackgroundTask } from '@/lib/api/backgroundProcessor';

/**
 * Hook to monitor background tasks in real-time
 * Provides visibility into queued and active tasks for a user
 */
export function useBackgroundTasks(userId: string | null) {
  const [queuedTasks, setQueuedTasks] = useState<BackgroundTask[]>([]);
  const [activeTasks, setActiveTasks] = useState<BackgroundTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setQueuedTasks([]);
      setActiveTasks([]);
      setIsLoading(false);
      return;
    }

    // Initial load
    setQueuedTasks(backgroundProcessor.getQueuedTasks(userId));
    setActiveTasks(backgroundProcessor.getActiveTasks(userId));
    setIsLoading(false);

    // Poll for updates every second
    const interval = setInterval(() => {
      setQueuedTasks(backgroundProcessor.getQueuedTasks(userId));
      setActiveTasks(backgroundProcessor.getActiveTasks(userId));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [userId]);

  // Helper functions for UI
  const getTasksForSeed = (seedId: string) => {
    return {
      queued: queuedTasks.filter(t => t.seedId === seedId),
      active: activeTasks.filter(t => t.seedId === seedId),
    };
  };

  const getTotalTaskCount = () => queuedTasks.length + activeTasks.length;

  const hasTasksForSeed = (seedId: string) => {
    return queuedTasks.some(t => t.seedId === seedId) ||
           activeTasks.some(t => t.seedId === seedId);
  };

  const getFlashcardTasksForSeed = (seedId: string) => {
    return {
      queued: queuedTasks.find(t =>
        t.seedId === seedId && t.metadata?.contentType === 'flashcards'
      ),
      active: activeTasks.find(t =>
        t.seedId === seedId && t.metadata?.contentType === 'flashcards'
      ),
    };
  };

  const getQuizTasksForSeed = (seedId: string) => {
    return {
      queued: queuedTasks.find(t =>
        t.seedId === seedId && t.metadata?.contentType === 'quiz'
      ),
      active: activeTasks.find(t =>
        t.seedId === seedId && t.metadata?.contentType === 'quiz'
      ),
    };
  };

  return {
    queuedTasks,
    activeTasks,
    isLoading,
    totalTasks: getTotalTaskCount(),
    getTasksForSeed,
    hasTasksForSeed,
    getFlashcardTasksForSeed,
    getQuizTasksForSeed,
  };
}

/**
 * Hook to get summary statistics for background tasks
 */
export function useBackgroundTaskStats(userId: string | null) {
  const { queuedTasks, activeTasks } = useBackgroundTasks(userId);

  const flashcardTasksQueued = queuedTasks.filter(
    t => t.metadata?.contentType === 'flashcards'
  ).length;

  const quizTasksQueued = queuedTasks.filter(
    t => t.metadata?.contentType === 'quiz'
  ).length;

  const flashcardTasksActive = activeTasks.filter(
    t => t.metadata?.contentType === 'flashcards'
  ).length;

  const quizTasksActive = activeTasks.filter(
    t => t.metadata?.contentType === 'quiz'
  ).length;

  return {
    flashcards: {
      queued: flashcardTasksQueued,
      active: flashcardTasksActive,
      total: flashcardTasksQueued + flashcardTasksActive,
    },
    quiz: {
      queued: quizTasksQueued,
      active: quizTasksActive,
      total: quizTasksQueued + quizTasksActive,
    },
    overall: {
      queued: queuedTasks.length,
      active: activeTasks.length,
      total: queuedTasks.length + activeTasks.length,
    },
  };
}
