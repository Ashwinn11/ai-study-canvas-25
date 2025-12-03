import { supabase } from "./supabaseWithTimeout";
import { flashcardsService } from "./flashcardsService";
import { spacedRepetitionService } from "./spacedRepetitionService";
import { recordEvent, recordError } from "@/utils/telemetry";
import { trackError, trackEvent } from "./sentry";

import { logger } from "@/utils/logger";
/**
 * Simplified background processing service for content generation
 *
 * SIMPLIFIED FOR SINGLE-DEVICE, SINGLE-EXAM ARCHITECTURE:
 * - No AsyncStorage persistence (tasks don't need to survive app restarts)
 * - No complex queue management (one exam per material)
 * - No multi-device sync (single device only)
 * - Direct task execution with simple loading states
 */

export interface BackgroundTask {
  id: string;
  type: "content_generation" | "sm2_initialization" | "cache_warmup";
  userId: string;
  seedId?: string;
  examId?: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number; // 0-100
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface ProcessingResult {
  success: boolean;
  task?: BackgroundTask;
  error?: string;
  skipped?: boolean;
}

class BackgroundProcessor {
  private activeTasks = new Map<string, BackgroundTask>();
  private taskQueue: BackgroundTask[] = [];
  private isProcessing = false;
  private readonly TASK_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CONCURRENT_TASKS = 3; // Maximum parallel tasks
  private readonly FAILURE_TTL = 24 * 60 * 60 * 1000; // 24 hours - failures expire after this time
  private readonly MAX_FAILURES = 500; // Maximum number of failure records to keep
  private lastFailures = new Map<
    string,
    { flashcards?: string; quiz?: string; updatedAt: number }
  >();

  /**
   * Generate flashcards for a seed in background
   */
  async generateFlashcardsInBackground(
    seedId: string,
    userId: string,
    options?: { quantity?: number },
  ): Promise<ProcessingResult> {
    const taskId = `flashcards_${seedId}_${Date.now()}`;

    const task: BackgroundTask = {
      id: taskId,
      type: "content_generation",
      userId,
      seedId,
      status: "pending",
      progress: 0,
      metadata: { contentType: "flashcards", options },
    };

    this.queueTask(task);
    this.clearFailuresForSeed(seedId, userId, "flashcards");

    return { success: true, task };
  }

  /**
   * Generate quiz questions for a seed in background
   */
  async generateQuizInBackground(
    seedId: string,
    userId: string,
    options?: { quantity?: number },
  ): Promise<ProcessingResult> {
    const taskId = `quiz_${seedId}_${Date.now()}`;

    const task: BackgroundTask = {
      id: taskId,
      type: "content_generation",
      userId,
      seedId,
      status: "pending",
      progress: 0,
      metadata: { contentType: "quiz", options },
    };

    this.queueTask(task);
    this.clearFailuresForSeed(seedId, userId, "quiz");

    return { success: true, task };
  }

  /**
   * Check if flashcards exist for a seed
   */
  private async checkFlashcardsExist(
    seedId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from("flashcards")
        .select("id", { count: "exact", head: true })
        .eq("seed_id", seedId)
        .eq("user_id", userId);

      if (error) {
        trackError(error, "background_processor_check_flashcards", {
          seedId,
          userId,
        });
        return false;
      }

      return (count ?? 0) > 0;
    } catch (error) {
      trackError(error, "background_processor_check_flashcards_exception", {
        seedId,
        userId,
      });
      return false;
    }
  }

  /**
   * Check if quiz questions exist for a seed
   */
  private async checkQuizExist(
    seedId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from("quiz_questions")
        .select("id", { count: "exact", head: true })
        .eq("seed_id", seedId)
        .eq("user_id", userId);

      if (error) {
        trackError(error, "background_processor_check_quiz", {
          seedId,
          userId,
        });
        return false;
      }

      return (count ?? 0) > 0;
    } catch (error) {
      trackError(error, "background_processor_check_quiz_exception", {
        seedId,
        userId,
      });
      return false;
    }
  }

  /**
   * Auto-generate both flashcards and quiz for a seed when added to exam
   * Skips generation if content already exists in DB
   */
  async generateBothInBackground(
    seedId: string,
    userId: string,
    examId: string,
    options?: { flashcardQuantity?: number; quizQuantity?: number },
  ): Promise<ProcessingResult> {
    try {
      // Check if content already exists in DB
      const [hasFlashcards, hasQuiz] = await Promise.all([
        this.checkFlashcardsExist(seedId, userId),
        this.checkQuizExist(seedId, userId),
      ]);

      // Skip if both already exist
      if (hasFlashcards && hasQuiz) {
        return { success: true, skipped: true };
      }

      // Queue flashcards if not in DB
      if (!hasFlashcards) {
        const flashcardTaskId = `flashcards_${seedId}_${Date.now()}`;
        const flashcardTask: BackgroundTask = {
          id: flashcardTaskId,
          type: "content_generation",
          userId,
          seedId,
          examId,
          status: "pending",
          progress: 0,
          metadata: {
            contentType: "flashcards",
            options: { quantity: options?.flashcardQuantity },
            retryCount: 0,
            autoGenerated: true,
          },
        };

        this.queueTask(flashcardTask);
        this.clearFailuresForSeed(seedId, userId, "flashcards");
      }

      // Queue quiz if not in DB
      if (!hasQuiz) {
        const quizTaskId = `quiz_${seedId}_${Date.now()}`;
        const quizTask: BackgroundTask = {
          id: quizTaskId,
          type: "content_generation",
          userId,
          seedId,
          examId,
          status: "pending",
          progress: 0,
          metadata: {
            contentType: "quiz",
            options: { quantity: options?.quizQuantity },
            retryCount: 0,
            autoGenerated: true,
          },
        };

        this.queueTask(quizTask);
        this.clearFailuresForSeed(seedId, userId, "quiz");
      }

      return { success: true };
    } catch (error) {
      logger.error(
        `[BackgroundProcessor] Error in generateBothInBackground for seed ${seedId}:`,
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Initialize SM2 fields in background
   */
  async initializeSM2InBackground(userId: string): Promise<ProcessingResult> {
    const taskId = `sm2_init_${userId}_${Date.now()}`;

    const task: BackgroundTask = {
      id: taskId,
      type: "sm2_initialization",
      userId,
      status: "pending",
      progress: 0,
    };

    this.queueTask(task);

    return { success: true, task };
  }

  /**
   * Warm up cache for frequently accessed data
   */
  async warmUpCacheInBackground(userId: string): Promise<ProcessingResult> {
    const taskId = `cache_warm_${userId}_${Date.now()}`;

    const task: BackgroundTask = {
      id: taskId,
      type: "cache_warmup",
      userId,
      status: "pending",
      progress: 0,
    };

    this.queueTask(task);

    return { success: true, task };
  }

  /**
   * Add task to queue and start processing if not already running
   */
  private queueTask(task: BackgroundTask): void {
    this.taskQueue.push(task);

    // Record task queued event
    recordEvent("background_task_queued", {
      taskId: task.id,
      taskType: task.type,
      seedId: task.seedId,
      examId: task.examId,
      contentType: task.metadata?.contentType,
      queueLength: this.taskQueue.length,
    });

    trackEvent("background_task_queued", {
      task_id: task.id,
      task_type: task.type,
      seed_id: task.seedId,
      exam_id: task.examId,
      content_type: task.metadata?.contentType,
      queue_length: this.taskQueue.length,
    });

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private getFailureKey(seedId: string, userId: string): string {
    return `${userId}:${seedId}`;
  }

  private recordTaskFailure(task: BackgroundTask, message: string): void {
    if (!task.seedId || !task.userId) {
      return;
    }

    const contentType = task.metadata?.contentType;
    if (contentType !== "flashcards" && contentType !== "quiz") {
      return;
    }

    const key = this.getFailureKey(task.seedId, task.userId);
    const existing = this.lastFailures.get(key) || { updatedAt: Date.now() };
    this.lastFailures.set(key, {
      ...existing,
      [contentType]: message || "Generation failed",
      updatedAt: Date.now(),
    });
  }

  private clearFailuresForSeed(
    seedId: string,
    userId: string,
    contentType?: "flashcards" | "quiz",
  ): void {
    const key = this.getFailureKey(seedId, userId);
    if (!this.lastFailures.has(key)) {
      return;
    }

    if (!contentType) {
      this.lastFailures.delete(key);
      return;
    }

    const record = this.lastFailures.get(key);
    if (!record) return;

    delete record[contentType];
    if (!record.flashcards && !record.quiz) {
      this.lastFailures.delete(key);
    } else {
      record.updatedAt = Date.now();
      this.lastFailures.set(key, record);
    }
  }

  getLastFailures(
    seedId: string,
    userId: string,
  ): { flashcards?: string; quiz?: string } | null {
    const key = this.getFailureKey(seedId, userId);
    const record = this.lastFailures.get(key);
    if (!record) {
      return null;
    }

    const failures: { flashcards?: string; quiz?: string } = {};
    if (record.flashcards) failures.flashcards = record.flashcards;
    if (record.quiz) failures.quiz = record.quiz;
    return Object.keys(failures).length > 0 ? failures : null;
  }

  clearSeedFailures(
    seedId: string,
    userId: string,
    contentType?: "flashcards" | "quiz",
  ): void {
    this.clearFailuresForSeed(seedId, userId, contentType);
  }

  /**
   * Clean up expired failure records to prevent unbounded memory growth
   * Should be called periodically (e.g., every 10-15 minutes)
   */
  cleanupExpiredFailures(): void {
    const now = Date.now();
    let removedCount = 0;

    // Remove entries older than FAILURE_TTL
    for (const [key, record] of this.lastFailures.entries()) {
      if (now - record.updatedAt > this.FAILURE_TTL) {
        this.lastFailures.delete(key);
        removedCount++;
      }
    }

    // If still over max size, remove oldest entries
    if (this.lastFailures.size > this.MAX_FAILURES) {
      const entries = Array.from(this.lastFailures.entries());
      entries.sort((a, b) => a[1].updatedAt - b[1].updatedAt);

      const toRemove = entries.slice(
        0,
        this.lastFailures.size - this.MAX_FAILURES,
      );
      for (const [key] of toRemove) {
        this.lastFailures.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.info(
        `[BackgroundProcessor] Cleaned up ${removedCount} expired failure records`,
      );
    }
  }

  /**
   * Process queued tasks with parallel execution (up to MAX_CONCURRENT_TASKS)
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    const executingTasks: Promise<void>[] = [];

    try {
      while (this.taskQueue.length > 0 || executingTasks.length > 0) {
        // Fill up to MAX_CONCURRENT_TASKS
        while (
          executingTasks.length < this.MAX_CONCURRENT_TASKS &&
          this.taskQueue.length > 0
        ) {
          const task = this.taskQueue.shift()!;

          const taskPromise = this.executeTask(task)
            .catch((error) => {
              logger.error(
                `[BackgroundProcessor] Task ${task.id} failed:`,
                error,
              );
              task.status = "failed";
              task.error =
                error instanceof Error ? error.message : "Unknown error";
              task.completedAt = new Date();
            })
            .finally(() => {
              // Remove from executing list when done
              const index = executingTasks.indexOf(taskPromise);
              if (index > -1) {
                executingTasks.splice(index, 1);
              }
            });

          executingTasks.push(taskPromise);
        }

        // Wait for at least one task to complete
        if (executingTasks.length > 0) {
          try {
            await Promise.race(executingTasks);
          } catch (error) {
            logger.error(
              "[BackgroundProcessor] Error while waiting for tasks:",
              error,
            );
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single background task
   */
  private async executeTask(task: BackgroundTask): Promise<void> {
    task.status = "running";
    task.startedAt = new Date();
    this.activeTasks.set(task.id, task);

    recordEvent("background_task_started", {
      taskId: task.id,
      taskType: task.type,
      seedId: task.seedId,
      contentType: task.metadata?.contentType,
      activeTaskCount: this.activeTasks.size,
    });

    trackEvent("background_task_started", {
      task_id: task.id,
      task_type: task.type,
      seed_id: task.seedId,
      content_type: task.metadata?.contentType,
      active_task_count: this.activeTasks.size,
    });

    // Create timeout promise (clear handle on resolution/rejection)
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error("Task timeout")),
        this.TASK_TIMEOUT,
      );
    });

    // Create execution promise
    const executionPromise = (async () => {
      switch (task.type) {
        case "content_generation":
          await this.executeContentGeneration(task);
          break;

        case "sm2_initialization":
          await this.executeSM2Initialization(task);
          break;

        case "cache_warmup":
          await this.executeCacheWarmup(task);
          break;

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
    })();

    try {
      // Race between execution and timeout
      await Promise.race([executionPromise, timeoutPromise]);

      task.status = "completed";
      task.progress = 100;

      const duration = task.startedAt
        ? Date.now() - task.startedAt.getTime()
        : 0;
      recordEvent("background_task_completed", {
        taskId: task.id,
        taskType: task.type,
        seedId: task.seedId,
        contentType: task.metadata?.contentType,
        duration,
        retryCount: task.metadata?.retryCount || 0,
      });

      trackEvent("background_task_completed", {
        task_id: task.id,
        task_type: task.type,
        seed_id: task.seedId,
        content_type: task.metadata?.contentType,
        duration,
        retry_count: task.metadata?.retryCount || 0,
      });
    } catch (error) {
      // Check if it was a timeout
      if (error instanceof Error && error.message === "Task timeout") {
        task.error = "Generation timed out after 5 minutes";
        logger.error(`[BackgroundProcessor] Task ${task.id} timed out`);
        throw error;
      }
      // Retry logic for auto-generated tasks
      const retryCount = task.metadata?.retryCount ?? 0;
      const isAutoGenerated = task.metadata?.autoGenerated === true;

      if (isAutoGenerated && retryCount < 1) {
        // Retry once
        task.metadata = task.metadata || {};
        task.metadata.retryCount = retryCount + 1;
        task.status = "pending";
        task.progress = 0;
        task.error = undefined;

        // Remove from active tasks and re-queue
        this.activeTasks.delete(task.id);
        this.queueTask(task);
        return; // Don't mark as failed, let retry happen
      }

      // Failed after retry or non-auto-generated task
      task.status = "failed";
      task.error = error instanceof Error ? error.message : "Unknown error";
      logger.error(
        `[BackgroundProcessor] Task failed${isAutoGenerated ? " after retry" : ""}: ${task.id}`,
        error,
      );

      const duration = task.startedAt
        ? Date.now() - task.startedAt.getTime()
        : 0;
      trackError(
        error instanceof Error ? error : new Error(String(error)),
        "background_task_failed",
        {
          task_id: task.id,
          task_type: task.type,
          seed_id: task.seedId,
          content_type: task.metadata?.contentType,
          duration,
          retry_count: retryCount,
          is_auto_generated: isAutoGenerated,
          was_timeout:
            error instanceof Error && error.message === "Task timeout",
        },
      );

      this.recordTaskFailure(
        task,
        task.error ||
          (error instanceof Error ? error.message : "Unknown error"),
      );
      throw error;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      task.completedAt = new Date();
      this.activeTasks.delete(task.id);
    }
  }

  /**
   * Execute content generation task
   */
  private async executeContentGeneration(task: BackgroundTask): Promise<void> {
    const { seedId, examId, metadata } = task;
    if (!seedId) throw new Error("Seed ID is required for content generation");
    const contentType =
      metadata?.contentType === "flashcards" || metadata?.contentType === "quiz"
        ? (metadata.contentType as "flashcards" | "quiz")
        : undefined;

    // VALIDATION 1: Check if seed still exists
    try {
      const { data: seed, error: seedError } = await supabase
        .from("seeds")
        .select("id")
        .eq("id", seedId)
        .single();

      if (seedError || !seed) {
        if (contentType) {
          this.clearFailuresForSeed(seedId, task.userId, contentType);
        }
        return; // Exit gracefully, no error
      }
    } catch (error) {
      if (contentType) {
        this.clearFailuresForSeed(seedId, task.userId, contentType);
      }
      return;
    }

    // VALIDATION 2: If task has examId, verify seed still in exam
    if (examId) {
      try {
        const { count, error: examSeedError } = await supabase
          .from("exam_seeds")
          .select("*", { count: "exact", head: true })
          .eq("exam_id", examId)
          .eq("seed_id", seedId);

        if (examSeedError || count === 0) {
          if (contentType) {
            this.clearFailuresForSeed(seedId, task.userId, contentType);
          }
          return; // Exit gracefully
        }
      } catch (error) {
        if (contentType) {
          this.clearFailuresForSeed(seedId, task.userId, contentType);
        }
        return;
      }
    }

    // VALIDATION 3: Check if content already exists (manual generation completed)
    if (contentType === "flashcards") {
      const hasContent = await this.checkFlashcardsExist(seedId, task.userId);
      if (hasContent) {
        this.clearFailuresForSeed(seedId, task.userId, "flashcards");
        return; // Exit gracefully
      }
    } else if (contentType === "quiz") {
      const hasContent = await this.checkQuizExist(seedId, task.userId);
      if (hasContent) {
        this.clearFailuresForSeed(seedId, task.userId, "quiz");
        return; // Exit gracefully
      }
    }

    task.progress = 10;

    // Ensure services have Supabase client
    flashcardsService.setSupabase(supabase);
    spacedRepetitionService.setSupabase(supabase);

    task.progress = 20;

    if (metadata?.contentType === "flashcards") {
      const result = await flashcardsService.createFlashcards({
        seedId,
        userId: task.userId,
        quantity: metadata.options?.quantity,
        _skipDuplicateCheck: true, // Skip check when called from background processor
      });

      if (result.error) {
        throw new Error(`Flashcard generation failed: ${result.error}`);
      }

      task.progress = 100;
      this.clearFailuresForSeed(seedId, task.userId, "flashcards");
    } else if (metadata?.contentType === "quiz") {
      // Note: Assuming there's a quizService similar to flashcardsService
      // This would need to be implemented based on your actual quiz service
      const { quizService } = require("./quizService");
      quizService.setSupabase(supabase);

      const result = await quizService.createQuizQuestions({
        seedId,
        userId: task.userId,
        quantity: metadata.options?.quantity,
        _skipDuplicateCheck: true, // Skip check when called from background processor
      });

      if (result.error) {
        throw new Error(`Quiz generation failed: ${result.error}`);
      }

      task.progress = 100;
      this.clearFailuresForSeed(seedId, task.userId, "quiz");
    }
  }

  /**
   * Execute SM2 initialization task
   */
  private async executeSM2Initialization(task: BackgroundTask): Promise<void> {
    spacedRepetitionService.setSupabase(supabase);

    task.progress = 30;

    const result = await spacedRepetitionService.initializeSM2Fields(
      task.userId,
    );

    if (!result.success) {
      throw new Error(`SM2 initialization failed: ${result.error}`);
    }

    task.progress = 100;
  }

  /**
   * Execute cache warmup task
   * NOTE: This functionality is no longer needed - cache warming happens automatically
   * through React Query and screen-level data fetching
   */
  private async executeCacheWarmup(task: BackgroundTask): Promise<void> {
    // Mark task complete immediately - no-op implementation
    task.progress = 100;
    logger.info("[BackgroundProcessor] Cache warmup task skipped (no-op)");
  }

  /**
   * Get active tasks for a user
   */
  getActiveTasks(userId: string): BackgroundTask[] {
    return Array.from(this.activeTasks.values()).filter(
      (task) => task.userId === userId,
    );
  }

  /**
   * Get queued tasks for a user (not yet running)
   */
  getQueuedTasks(userId: string): BackgroundTask[] {
    return this.taskQueue.filter((task) => task.userId === userId);
  }

  /**
   * Get detailed task state (running/queued/none + position)
   */
  getTaskState(
    seedId: string,
    userId: string,
    contentType: string,
  ): {
    status: "running" | "queued" | "none";
    position?: number;
    taskId?: string;
  } {
    // Check running tasks
    const runningTask = Array.from(this.activeTasks.values()).find(
      (t) =>
        t.seedId === seedId &&
        t.userId === userId &&
        t.metadata?.contentType === contentType &&
        t.status === "running",
    );

    if (runningTask) {
      return {
        status: "running",
        position: 0,
        taskId: runningTask.id,
      };
    }

    // Check queued tasks
    const queueIndex = this.taskQueue.findIndex(
      (t) =>
        t.seedId === seedId &&
        t.userId === userId &&
        t.metadata?.contentType === contentType &&
        t.status === "pending",
    );

    if (queueIndex !== -1) {
      return {
        status: "queued",
        position: queueIndex + 1, // +1 because position 0 is "running"
        taskId: this.taskQueue[queueIndex].id,
      };
    }

    return { status: "none" };
  }

  /**
   * Get queue position (0 = running, 1+ = waiting in queue)
   */
  getQueuePosition(
    seedId: string,
    userId: string,
    contentType: string,
  ): number | null {
    const state = this.getTaskState(seedId, userId, contentType);
    return state.position !== undefined ? state.position : null;
  }

  /**
   * Check if a task for this seed + content type is currently running OR queued
   * This prevents duplicate generation when tasks are waiting in queue
   */
  isTaskActiveOrQueued(
    seedId: string,
    userId: string,
    contentType: string,
  ): boolean {
    // Check running tasks (in activeTasks map)
    const hasRunningTask = Array.from(this.activeTasks.values()).some(
      (t) =>
        t.seedId === seedId &&
        t.userId === userId &&
        t.metadata?.contentType === contentType &&
        (t.status === "running" || t.status === "pending"), // Include pending in case it's mid-transition
    );

    if (hasRunningTask) {
      return true;
    }

    // Check queued tasks (in taskQueue array)
    const hasQueuedTask = this.taskQueue.some(
      (t) =>
        t.seedId === seedId &&
        t.userId === userId &&
        t.metadata?.contentType === contentType &&
        t.status === "pending",
    );

    if (hasQueuedTask) {
      return true;
    }

    return false;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): BackgroundTask | null {
    return this.activeTasks.get(taskId) || null;
  }

  /**
   * Cancel a task by ID (only if pending/queued, cannot cancel running tasks)
   */
  cancelTask(taskId: string): boolean {
    // First check if it's in the queue (pending)
    const queueIndex = this.taskQueue.findIndex((t) => t.id === taskId);
    if (queueIndex !== -1) {
      const task = this.taskQueue[queueIndex];
      this.taskQueue.splice(queueIndex, 1);

      return true;
    }

    // Check if it's running (cannot cancel)
    const runningTask = this.activeTasks.get(taskId);
    if (runningTask && runningTask.status === "running") {
      logger.warn(
        `[BackgroundProcessor] Cannot cancel running task: ${taskId}`,
      );
      return false;
    }

    return false;
  }

  /**
   * Cancel redundant task for seed + content type (only if queued)
   */
  cancelRedundantTask(
    seedId: string,
    userId: string,
    contentType: string,
  ): boolean {
    const state = this.getTaskState(seedId, userId, contentType);

    if (state.status === "queued" && state.taskId) {
      return this.cancelTask(state.taskId);
    }

    return false;
  }

  /**
   * Cancel tasks for a seed (optionally filtered by exam)
   * @param seedId - The seed ID to cancel tasks for
   * @param examId - Optional exam ID to only cancel tasks for this specific exam
   */
  cancelTasksBySeedId(seedId: string, examId?: string): number {
    let canceledCount = 0;

    // Remove from queue
    this.taskQueue = this.taskQueue.filter((task) => {
      // Match seedId AND examId (if provided)
      const seedMatch = task.seedId === seedId;
      const examMatch = !examId || task.examId === examId;

      if (seedMatch && examMatch) {
        canceledCount++;
        return false;
      }
      return true;
    });

    return canceledCount;
  }

  /**
   * Cancel all tasks for an exam (when exam is deleted)
   */
  cancelTasksByExamId(examId: string): number {
    let canceledCount = 0;

    // Remove from queue
    this.taskQueue = this.taskQueue.filter((task) => {
      if (task.examId === examId) {
        canceledCount++;
        return false;
      }
      return true;
    });

    return canceledCount;
  }

  /**
   * Clear all tasks for a user (on logout)
   */
  clearUserTasks(userId: string): number {
    let canceledCount = 0;

    // Remove from queue
    this.taskQueue = this.taskQueue.filter((task) => {
      if (task.userId === userId) {
        canceledCount++;
        return false;
      }
      return true;
    });

    // Note: We don't cancel running tasks, they will complete
    return canceledCount;
  }

  /**
   * Get processing statistics
   */
  getStats(): {
    activeTasks: number;
    queuedTasks: number;
    completedToday: number;
  } {
    const now = new Date();
    const today = now.toDateString();

    const completedToday = Array.from(this.activeTasks.values()).filter(
      (task) => task.completedAt && task.completedAt.toDateString() === today,
    ).length;

    return {
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
      completedToday,
    };
  }
}

// Export singleton instance
export const backgroundProcessor = new BackgroundProcessor();
