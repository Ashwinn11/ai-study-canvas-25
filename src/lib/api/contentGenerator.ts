import { ServiceError } from "./serviceError";
import { feynmanAIService } from "./feynmanAI";
import { chatCompletion } from "./openAIClient";
import { configService } from "./configService";
import {
  getReturnOnlyJsonFlashcards,
  getReturnOnlyJsonQuiz,
  getFlashcardsUserTemplate,
  getQuizUserTemplate,
  renderPromptTemplate,
} from "./prompts";
import { Seed, ContentIntent } from "@/types";

import { logger } from "@/utils/logger";
import { safeJSONParse } from "@/utils/safeJson";
import { ErrorHandler } from "@/utils/errorHandler";
export interface FlashcardGenerationResult {
  question: string;
  answer: string;
  difficulty: number;
  conceptId?: string;
  topicId?: string;
  cardType?: "definition" | "application" | "example" | "comparison";
}

export interface QuizGenerationResult {
  question: string;
  options: string[];
  correct_answer: number;
  difficulty: number;
  topicId?: string;
  bloomsLevel?:
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";
}

export interface FlashcardGenerationBundle {
  flashcards: FlashcardGenerationResult[];
}

export interface QuizGenerationBundle {
  quizQuestions: QuizGenerationResult[];
}

export class ContentGenerationService {
  async generateFlashcardsFromSeed(
    seed: Seed,
    userId: string,
    requestedQuantity?: number,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<FlashcardGenerationBundle> {
    onProgress?.(0.0, "Initializing flashcard generation...");

    try {
      // Verify Feynman explanation exists
      if (!seed.feynman_explanation || seed.feynman_explanation.length < 50) {
        throw new ServiceError(
          "Feynman explanation not available",
          "contentGenerator",
          "MISSING_FEYNMAN",
          "Learning materials not ready yet. Please wait for content processing to complete.",
          false,
        );
      }

      onProgress?.(0.2, "Preparing flashcard generation...");

      onProgress?.(0.3, "Generating flashcards with AI...");

      // Get config to determine max quantity (AI will decide optimal within range)
      const flashcardsConfig = await configService.getAIConfig("flashcards");

      // Generate flashcards directly from Feynman explanation using existing AI method
      // Let AI decide optimal quantity between min and max (don't force requestedQuantity)
      const flashcards = await this.generateAIPoweredFlashcards(
        seed.feynman_explanation, // Use Feynman instead of raw content
        seed.title,
        flashcardsConfig.maxQuantity, // Pass max so AI can decide optimal within range
        seed.language_code, // Pass language for multilingual generation
        seed.intent || "Educational", // Pass intent for adaptive generation
        (aiProgress) => {
          // Map AI progress (0-1) to our range (0.3-0.9)
          onProgress?.(
            0.3 + aiProgress * 0.6,
            "Generating flashcards with AI...",
          );
        },
      );

      logger.debug('[ContentGenerator] Generated flashcards:', {
        count: flashcards.length,
        first: flashcards[0],
        sample: flashcards.slice(0, 2),
      });

      onProgress?.(1.0, "Flashcards generated successfully!");

      return {
        flashcards,
      };
    } catch (error) {
      ErrorHandler.handleAsyncError(error, "content-generation.flashcards", {
        severity: "high",
        additionalInfo: { function: "ContentGenerator.generateFlashcards" },
      });

      if (error instanceof ServiceError) {
        throw error;
      }

      throw new ServiceError(
        "Failed to generate flashcards",
        "contentGenerator",
        "FLASHCARD_GENERATION_ERROR",
        "Unable to create flashcards from this content. Please try again.",
        true,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async generateQuizFromSeed(
    seed: Seed,
    userId: string,
    requestedQuantity?: number,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<QuizGenerationBundle> {
    onProgress?.(0.0, "Initializing quiz generation...");

    try {
      // Verify Feynman explanation exists
      if (!seed.feynman_explanation || seed.feynman_explanation.length < 50) {
        throw new ServiceError(
          "Feynman explanation not available",
          "contentGenerator",
          "MISSING_FEYNMAN",
          "Learning materials not ready yet. Please wait for content processing to complete.",
          false,
        );
      }

      onProgress?.(0.2, "Preparing quiz generation...");

      onProgress?.(0.3, "Generating quiz questions with AI...");

      // Get config to determine max quantity (AI will decide optimal within range)
      const quizConfig = await configService.getAIConfig("quiz");

      // Generate quiz questions directly from Feynman explanation using existing AI method
      // Let AI decide optimal quantity between min and max (don't force requestedQuantity)
      const quizQuestions = await this.generateAIPoweredQuiz(
        seed.feynman_explanation, // Use Feynman instead of raw content
        seed.title,
        quizConfig.maxQuantity, // Pass max so AI can decide optimal within range
        seed.language_code, // Pass language for multilingual generation
        seed.intent || "Educational", // Pass intent for adaptive generation
        (aiProgress) => {
          // Map AI progress (0-1) to our range (0.3-0.9)
          onProgress?.(
            0.3 + aiProgress * 0.6,
            "Generating quiz questions with AI...",
          );
        },
      );

      onProgress?.(1.0, "Quiz questions generated successfully!");

      return {
        quizQuestions,
      };
    } catch (error) {
      ErrorHandler.handleAsyncError(error, "content-generation.quiz", {
        severity: "high",
        additionalInfo: { function: "ContentGenerator.generateQuiz" },
      });

      if (error instanceof ServiceError) {
        throw error;
      }

      throw new ServiceError(
        "Failed to generate quiz questions",
        "contentGenerator",
        "QUIZ_GENERATION_ERROR",
        "Unable to create quiz questions from this content. Please try again.",
        true,
        error instanceof Error ? error : undefined,
      );
    }
  }

  // AI-powered generation methods

  private async generateAIPoweredFlashcards(
    content: string,
    title: string | undefined,
    quantity: number,
    language?: string,
    intent: ContentIntent = "Educational",
    onProgress?: (progress: number) => void,
  ): Promise<FlashcardGenerationResult[]> {
    onProgress?.(0.1);

    // Get dynamic config for flashcard generation
    const flashcardsConfig = await configService.getAIConfig("flashcards");
    const fullConfig = await configService.getConfig();
    const modelLimits = fullConfig.ai.modelLimits || {};
    const modelMaxTokens = modelLimits[flashcardsConfig.model] || 16384;

    // Validate quantity to prevent impossible requests (use backend config)
    const validatedQuantity = Math.min(quantity, flashcardsConfig.maxQuantity);

    // Content limited to 50k characters at upload level - use full content for better quality
    const extractedContent = content;

    // Fetch prompts from backend (intent-specific template for 80% token reduction!)
    const [systemPrompt, userTemplate] = await Promise.all([
      getReturnOnlyJsonFlashcards(),
      getFlashcardsUserTemplate(intent), // Pass intent to get specific template
    ]);
    const intentDistribution =
      await configService.getFlashcardIntentDistribution(intent);

    // Add language instruction if content is not in English
    const languageInstruction =
      language && language !== "en"
        ? `\n\nCRITICAL LANGUAGE INSTRUCTION:\nThe source content is in ${language.toUpperCase()}.\nGenerate ALL flashcards (questions AND answers) in ${language.toUpperCase()}.\nMaintain the source language throughout - do NOT translate to English.`
        : "";

    const prompt = renderPromptTemplate(userTemplate, {
      language_instruction: languageInstruction,
      intent,
      intent_distribution: JSON.stringify(intentDistribution),
      content: extractedContent,
      min_quantity: String(flashcardsConfig.minQuantity),
      max_quantity: String(flashcardsConfig.maxQuantity),
    });

    onProgress?.(0.3);
    const content_text = await chatCompletion({
      model: flashcardsConfig.model,
      systemPrompt: systemPrompt,
      userPrompt: prompt,
      temperature: flashcardsConfig.temperature,
      maxTokens: Math.min(
        modelMaxTokens,
        Math.max(flashcardsConfig.maxTokens, 6000 + flashcardsConfig.maxQuantity * 180),
      ),
      responseFormat: { type: "json_object" },
      cacheNamespace: "content-generator-flashcards-v6-multilingual",
      cacheKeyParts: [prompt],
      validateBeforeCache: (content) => {
        // Only cache if we can successfully parse the JSON
        const parsed = safeJSONParse(
          content,
          null,
          "contentGenerator.generateFlashcardsFromSeed.validateBeforeCache",
        ) as any;
        return !!(
          parsed &&
          (parsed.flashcards || parsed.cards || Array.isArray(parsed))
        );
      },
    });

    const { extractJsonFromText } = require("@/utils/aiParsing");

    let cards;
    try {
      cards = extractJsonFromText(content_text);

      // Validate parsed result structure
      if (!cards || typeof cards !== "object") {
        throw new Error("Parsed result is not an object");
      }
    } catch (parseError) {
      logger.error("[ContentGenerator] Flashcard parsing failed:", parseError);

      throw new ServiceError(
        "AI response parsing failed",
        "contentGenerator",
        "JSON_PARSE_ERROR",
        "Unable to process AI response. The content may be too complex. Try breaking it into smaller sections.",
        true,
        parseError instanceof Error ? parseError : undefined,
      );
    }

    // Normalize to array regardless of top-level shape
    let normalized: any[] = [];
    if (Array.isArray(cards)) {
      normalized = cards;
    } else if (cards && typeof cards === "object") {
      const obj = cards as any;
      // Common wrappers produced under JSON object response_format
      const candidate =
        obj.flashcards || obj.cards || obj.items || obj.data || obj.results;
      if (Array.isArray(candidate)) {
        normalized = candidate;
      } else if (Array.isArray(obj.questions)) {
        // Some prompts may return a generic { questions: [...] } even for flashcards
        normalized = obj.questions;
      }
    }

    // Only cap at absolute maximum to ensure quality (don't truncate AI's optimal decision)
    let result = Array.isArray(normalized)
      ? normalized.slice(0, flashcardsConfig.maxQuantity)
      : [];

    logger.debug('[ContentGenerator] Flashcards before validation:', {
      count: result.length,
      first: result[0],
      sample: result.slice(0, 2),
    });

    // Validate that all items have required fields (question and answer)
    result = result.filter((item: any, index: number) => {
      if (!item || typeof item !== 'object') {
        logger.warn(`[ContentGenerator] Filtering out non-object flashcard item at index ${index}:`, item);
        return false;
      }
      if (!item.question || !item.answer) {
        logger.warn(`[ContentGenerator] Filtering out flashcard at index ${index} with missing question or answer:`, {
          has_question: !!item.question,
          has_answer: !!item.answer,
          keys: Object.keys(item || {}),
          item,
        });
        return false;
      }
      return true;
    });

    logger.debug('[ContentGenerator] Flashcards after validation:', {
      count: result.length,
      first: result[0],
    });

    onProgress?.(1.0);
    return result;
  }

  private async generateAIPoweredQuiz(
    content: string,
    title: string | undefined,
    quantity: number,
    language?: string,
    intent: ContentIntent = "Educational",
    onProgress?: (progress: number) => void,
  ): Promise<QuizGenerationResult[]> {
    onProgress?.(0.1);

    // Get dynamic config for quiz generation
    const quizConfig = await configService.getAIConfig("quiz");
    const fullConfig = await configService.getConfig();
    const modelLimits = fullConfig.ai.modelLimits || {};
    const modelMaxTokens = modelLimits[quizConfig.model] || 16384;

    // Validate quantity to prevent impossible requests (use backend config)
    const validatedQuantity = Math.min(quantity, quizConfig.maxQuantity);

    // Content limited to 50k characters at upload level - use full content for better quality
    const extractedContent = content;

    // Fetch prompts from backend (intent-specific template for 80% token reduction!)
    const [systemPrompt, userTemplate] = await Promise.all([
      getReturnOnlyJsonQuiz(),
      getQuizUserTemplate(intent), // Pass intent to get specific template
    ]);
    const intentDistribution =
      await configService.getQuizIntentDistribution(intent);

    // Add language instruction if content is not in English
    const languageInstruction =
      language && language !== "en"
        ? `\n\nCRITICAL LANGUAGE INSTRUCTION:\nThe source content is in ${language.toUpperCase()}.\nGenerate ALL quiz questions and options in ${language.toUpperCase()}.\nMaintain the source language throughout - do NOT translate to English.`
        : "";

    const prompt = renderPromptTemplate(userTemplate, {
      language_instruction: languageInstruction,
      intent,
      intent_distribution: JSON.stringify(intentDistribution),
      content: extractedContent,
      min_quantity: String(quizConfig.minQuantity),
      max_quantity: String(quizConfig.maxQuantity),
    });

    onProgress?.(0.3);
    const content_text = await chatCompletion({
      model: quizConfig.model,
      systemPrompt: systemPrompt,
      userPrompt: prompt,
      temperature: quizConfig.temperature,
      maxTokens: Math.min(
        modelMaxTokens,
        Math.max(quizConfig.maxTokens, 5000 + quizConfig.maxQuantity * 220),
      ),
      responseFormat: { type: "json_object" },
      cacheNamespace: "content-generator-quiz-v6-multilingual",
      cacheKeyParts: [prompt],
      validateBeforeCache: (content) => {
        // Only cache if we can successfully parse the JSON
        const parsed = safeJSONParse(
          content,
          null,
          "contentGenerator.generateQuizFromSeed.validateBeforeCache",
        ) as any;
        return !!(
          parsed &&
          (parsed.questions || parsed.quizQuestions || Array.isArray(parsed))
        );
      },
    });

    const { extractJsonFromText } = require("@/utils/aiParsing");

    let quizzes;
    try {
      quizzes = extractJsonFromText(content_text);

      // Validate parsed result structure
      if (!quizzes || typeof quizzes !== "object") {
        throw new Error("Parsed result is not an object");
      }
    } catch (parseError) {
      logger.error("[ContentGenerator] Quiz parsing failed:", parseError);

      throw new ServiceError(
        "AI response parsing failed",
        "contentGenerator",
        "JSON_PARSE_ERROR",
        "Unable to process AI response. The content may be too complex. Try breaking it into smaller sections.",
        true,
        parseError instanceof Error ? parseError : undefined,
      );
    }

    // Normalize to array regardless of top-level shape
    let normalizedQ: any[] = [];
    if (Array.isArray(quizzes)) {
      normalizedQ = quizzes;
    } else if (quizzes && typeof quizzes === "object") {
      const obj = quizzes as any;
      const candidate =
        obj.questions ||
        obj.quizQuestions ||
        obj.items ||
        obj.data ||
        obj.results;
      if (Array.isArray(candidate)) {
        normalizedQ = candidate;
      }
    }

    // Only cap at absolute maximum to ensure quality (don't truncate AI's optimal decision)
    let result = Array.isArray(normalizedQ)
      ? normalizedQ.slice(0, quizConfig.maxQuantity)
      : [];

    // Validate that all items have required fields (question and options)
    result = result.filter((item: any) => {
      if (!item || typeof item !== 'object') {
        logger.warn('[ContentGenerator] Filtering out non-object quiz item:', item);
        return false;
      }
      if (!item.question || !Array.isArray(item.options) || item.options.length === 0) {
        logger.warn('[ContentGenerator] Filtering out quiz question with missing or invalid fields:', item);
        return false;
      }
      return true;
    });

    onProgress?.(1.0);
    return result;
  }

  /**
   * Extract key content from Feynman explanation for efficient token usage
   *
   * For 200+ page documents, the Feynman explanation can be 30-50K tokens.
   * This is too large for flashcard/quiz generation. Instead of truncating,
   * we intelligently extract the highest-value sections:
   * - [TL;DR] sections
   * - [Core Concepts] sections
   * - [Commonly Confused] sections
   * - [Memory Hooks]
   * - [Why This Matters]
   * - Major headers (##)
   *
   * This preserves learning quality while reducing token usage from 50K → 10-12K
   */
  // Content extraction removed - documents limited to 50k characters at upload level

  private capitalizeFirst(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  // NOTE: Intent distributions now fetched from backend via configService.getFlashcardIntentDistribution()
  // and configService.getQuizIntentDistribution() - see generateAIPoweredFlashcards and generateAIPoweredQuiz methods
  // This allows rapid iteration on Bloom's taxonomy distributions without app rebuilds
}

export const contentGeneratorService = new ContentGenerationService();
