import { ServiceError } from "./serviceError";
import { chatCompletion } from "./openAIClient";
import { ContentIntent } from "@/types";
import {
  getConditionalSystemPrompt,
  buildConditionalPrompt,
} from "./conditionalFeynmanPrompt";
import { configService } from "./configService";
import type { FeynmanConfig } from "./configService";
import { TIMEOUTS, FILE_LIMITS, LANGUAGE_CONFIG } from "@/constants/config";

import { logger } from "@/utils/logger";

// Note: All limits are now fetched from backend config dynamically
// No hardcoded constants - ensures single source of truth

export interface FeynmanResult {
  feynmanExplanation: string;
  intent: ContentIntent; // Educational, Comprehension, Reference, Analytical, or Procedural
  processingMetadata: {
    confidence: number;
    wordCount: number;
    processingTime: number;
    chunksProcessed?: number;
    totalChunks?: number;
  };
}

export class FeynmanAIService {
  // No client-side initialization needed - all AI calls proxy through backend
  // Backend validates API availability and handles authentication

  private checkAvailability() {
    // Backend will return appropriate error if OpenAI is unavailable
    // No client-side check needed
  }

  async generateFeynmanSeed(
    originalContent: string,
    title?: string,
    language?: string,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<FeynmanResult> {
    this.checkAvailability(); // Guard against disabled service

    const startTime = Date.now();

    try {
      // Get dynamic config limits
      const feynmanConfig = await configService.getAIConfig("feynman");
      const { maxWords, maxCharacters, maxChunks, maxChunkSize, cacheTtlMs } =
        feynmanConfig;
      const resolvedCacheTtl = cacheTtlMs ?? TIMEOUTS.FEYNMAN_CACHE_DEFAULT_TTL;

      // Basic content validation
      onProgress?.(0.05, "Analyzing content...");

      // Check for completely blank/unreadable content
      const cleanedContent = originalContent.trim();
      if (
        !cleanedContent ||
        cleanedContent.length < FILE_LIMITS.MIN_CONTENT_LENGTH
      ) {
        throw new ServiceError(
          "Content is blank or too short",
          "feynmanAI",
          "BLANK_CONTENT",
          "Unable to process this content. Please provide meaningful text content.",
          false,
        );
      }

      const workingContent = originalContent;

      const { contentLength } = this.ensureContentWithinLimits(
        workingContent,
        maxWords,
        maxCharacters,
        language,
      );

      onProgress?.(0.1, "Preparing content...");
      onProgress?.(0.2, "Building explanation framework...");

      // Build single conditional prompt (AI analyzes and generates in one call)
      // Pass language for language-aware prompting
      const prompt = await buildConditionalPrompt(
        workingContent,
        title,
        language,
      );

      onProgress?.(0.3, "Generating study materials...");
      const content = await chatCompletion({
        model: feynmanConfig.model,
        systemPrompt: await getConditionalSystemPrompt(),
        userPrompt: prompt,
        temperature: feynmanConfig.temperature,
        maxTokens: feynmanConfig.maxTokens,
        cacheNamespace: "feynman-plain-text-v3",
        cacheKeyParts: [prompt.substring(0, 1000)],
        cacheTtlMs: resolvedCacheTtl,
        timeoutMs: feynmanConfig.timeoutMs,
      });

      onProgress?.(0.7, "Processing AI response...");

      if (!content) {
        logger.error("[FeynmanAI] Empty content from OpenAI response");
        throw new ServiceError(
          "OpenAI returned empty response",
          "feynmanAI",
          "EMPTY_AI_RESPONSE",
          "AI processing failed to generate content. Please try again.",
          true,
        );
      }

      onProgress?.(0.8, "Extracting key concepts...");
      const parsedResult = this.parseFeynmanResponse(content);

      onProgress?.(0.9, "Building learning materials...");

      const processingTime = Date.now() - startTime;

      // Enhanced result (with internal metadata, not shown to user)
      const result: FeynmanResult = {
        ...parsedResult,
        processingMetadata: {
          confidence: this.calculateConfidence(
            workingContent,
            parsedResult,
            language,
          ),
          wordCount: contentLength,
          processingTime,
          chunksProcessed: 1,
          totalChunks: 1,
        },
      };

      onProgress?.(1.0, "Study materials ready!");

      return result;
    } catch (error) {
      logger.error("[FeynmanAI] Error during processing:", error);
      logger.error("[FeynmanAI] Error type:", error?.constructor?.name);
      logger.error(
        "[FeynmanAI] Error message:",
        error instanceof Error ? error.message : "Unknown error",
      );

      if (error instanceof Error) {
        logger.error("[FeynmanAI] Error stack:", error.stack);
      }

      if (error instanceof ServiceError) {
        logger.error("[FeynmanAI] ServiceError details:", {
          message: error.message,
          code: error.code,
          userMessage: error.userMessage,
          shouldRetry: error.shouldRetry,
        });
        throw error;
      }

      logger.error("[FeynmanAI] Unexpected error, wrapping in ServiceError");
      throw new ServiceError(
        "Unexpected error during Feynman processing",
        "feynmanAI",
        "FEYNMAN_GENERATION_ERROR",
        "Failed to generate explanation. Please try again.",
        true,
        error instanceof Error ? error : undefined,
      );
    }
  }

  private parseFeynmanResponse(
    response: string,
  ): Omit<FeynmanResult, "processingMetadata"> {
    try {
      if (!response || response.trim().length === 0) {
        throw new Error("Empty response from AI");
      }

      // Extract intent from first line (format: "INTENT: Educational")
      const { intent, cleanedResponse } =
        this.extractIntentFromResponse(response);

      return {
        feynmanExplanation: cleanedResponse.trim(),
        intent,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown parsing error";
      logger.error("Failed to process AI response:", errorMessage);
      logger.error(
        "Response preview:",
        response?.substring(0, 200) || "no response",
      );

      throw new ServiceError(
        "Failed to parse AI response",
        "feynmanAI",
        "PARSE_ERROR",
        "Unable to process AI response. Please try again.",
        true,
        error instanceof Error ? error : undefined,
      );
    }
  }

  private extractIntentFromResponse(response: string): {
    intent: ContentIntent;
    cleanedResponse: string;
  } {
    // AI outputs: "INTENT: Educational\n\n# Title\n..."
    // Extract the intent and remove it from response
    // Sometimes AI puts title before INTENT, so check first 3 lines

    const lines = response.split("\n");

    // Check first 3 lines for INTENT (handles edge cases where AI puts title first)
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i]?.trim();
      const intentMatch = line?.match(
        /^INTENT:\s*(Educational|Comprehension|Reference|Analytical|Procedural)$/i,
      );

      if (intentMatch) {
        const detectedIntent = intentMatch[1];
        // Normalize to proper case
        const intent = (detectedIntent.charAt(0).toUpperCase() +
          detectedIntent.slice(1).toLowerCase()) as ContentIntent;

        // Remove everything up to and including the INTENT line
        // Then skip any following blank lines
        let startIndex = i + 1;
        while (startIndex < lines.length && lines[startIndex].trim() === "") {
          startIndex++;
        }

        const cleanedResponse = lines.slice(startIndex).join("\n");

        logger.info(
          `[FeynmanAI] Extracted intent: ${intent} (found on line ${i + 1})`,
        );
        return { intent, cleanedResponse };
      }
    }

    // Fallback: If AI didn't output intent properly, default to Educational
    logger.warn(
      "[FeynmanAI] Intent not found in first 3 lines, defaulting to Educational",
    );
    logger.warn(
      `[FeynmanAI] First 3 lines were: ${lines.slice(0, 3).join(" | ")}`,
    );

    return {
      intent: "Educational",
      cleanedResponse: response,
    };
  }

  private calculateConfidence(
    originalContent: string,
    result: Omit<FeynmanResult, "processingMetadata">,
    language?: string,
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on result completeness
    if (result.feynmanExplanation.length > 100) confidence += 0.3;

    // Adjust based on source content length (language-aware)
    const contentLength = this.getContentLength(originalContent, language);
    if (contentLength > 100) confidence += 0.1;
    if (contentLength > 500) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  // Chunking removed - documents limited to 50k characters at upload level
  // All content processed as single-pass AI generation

  // Language-aware content length measurement (matches uploadProcessor logic)
  private getContentLength(content: string, language?: string): number {
    const cjkLanguages = LANGUAGE_CONFIG.CJK_LANGUAGE_CODES;
    if (language && cjkLanguages.includes(language as any)) {
      return content.length; // Character count for CJK
    }
    return content.split(/\s+/).filter(Boolean).length; // Word count for others
  }

  private ensureContentWithinLimits(
    content: string,
    maxWords: number,
    maxCharacters: number,
    language?: string,
  ): {
    contentLength: number;
    charCount: number;
  } {
    const trimmed = content.trim();
    const charCount = trimmed.length;
    const contentLength = this.getContentLength(trimmed, language);

    if (contentLength < 10 || charCount < 10) {
      throw new ServiceError(
        "Content is blank or too short",
        "feynmanAI",
        "BLANK_CONTENT",
        "Unable to process this content. Please provide meaningful text content.",
        false,
      );
    }

    // Separate character and word validation to show correct limit
    if (charCount > maxCharacters) {
      throw new ServiceError(
        `Content too large: ${charCount} characters exceeds ${maxCharacters} character limit`,
        "feynmanAI",
        "CONTENT_TOO_LARGE",
        `Your content has ${charCount.toLocaleString()} characters. Maximum allowed is ${maxCharacters.toLocaleString()} characters.`,
        false,
      );
    }

    if (contentLength > maxWords) {
      throw new ServiceError(
        `Content too large: ${contentLength} words exceeds ${maxWords} word limit`,
        "feynmanAI",
        "CONTENT_TOO_LARGE",
        `Your content has ${contentLength.toLocaleString()} words. Maximum allowed is ${maxWords.toLocaleString()} words.`,
        false,
      );
    }

    return { contentLength, charCount };
  }

  // Chunk processing removed - all content processed as single-pass generation
}

export const feynmanAIService = new FeynmanAIService();
