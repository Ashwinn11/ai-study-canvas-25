/**
 * Upload Processor - Web Version (Matches iOS exactly)
 *
 * Supports: PDF, image, audio, text, YouTube
 * Orchestrates the file upload and processing pipeline:
 * 1. Validate file or URL
 * 2. Create initial seed
 * 3. Extract content from file/URL (via backend API)
 * 4. Validate content quality with language-aware checks
 * 5. Generate Feynman explanation (via backend AI)
 * 6. Update seed with results
 * 7. Queue flashcards and quiz generation in background (non-blocking)
 *
 * Flashcards and quiz are auto-generated in background after upload completes.
 * User sees them when they tap the flashcards/quiz buttons.
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import { seedsService } from './seedsService';
import {
  processPdfOrImage,
  transcribeAudio,
  extractDocument,
  generateFeynman,
  extractYouTubeUrl,
  type ExtractionResult,
  type FeynmanResult,
} from './documentProcessing';
import { configService } from './configService';
import { flashcardsService } from './flashcardsService';
import { quizService } from './quizService';
import { backgroundProcessor } from './backgroundProcessor';
import type { ContentType } from '@/lib/supabase/types';

export type UploadStageId =
  | 'validating'
  | 'reading'
  | 'extracting'
  | 'analyzing'
  | 'generating'
  | 'finalizing'
  | 'completed';

// Stage progress mapping (matches iOS exactly)
const UPLOAD_STAGE_PROGRESS: Record<UploadStageId, number> = {
  validating: 0.05,
  reading: 0.18,
  extracting: 0.45,
  analyzing: 0.5,
  generating: 0.82,
  finalizing: 0.95,
  completed: 1.0,
};

const UPLOAD_STAGE_INDEX: Record<UploadStageId, number> = {
  validating: 1,
  reading: 2,
  extracting: 3,
  analyzing: 4,
  generating: 5,
  finalizing: 6,
  completed: 7,
};

export interface UploadProcessorOptions {
  userId: string;
  title?: string;
  accessToken: string;
  onProgress?: (step: number, status: UploadStageId, progress: number) => void;
}

export interface ProcessedSeed {
  id: string;
  title: string;
  content_type: ContentType;
  original_content: string;
  feynman_explanation: string;
  confidence_score: number;
  processing_status: 'completed';
}

interface ExtractionMetadata {
  [key: string]: unknown;
  materialsStatus?: Record<string, 'pending' | 'ready' | 'error'>;
  language?: string;
  isMixedLanguage?: boolean;
}

class UploadProcessor {
  private emitStageProgress(
    onProgress: UploadProcessorOptions['onProgress'],
    stage: UploadStageId,
    explicitProgress?: number
  ): void {
    if (!onProgress) return;

    const step = UPLOAD_STAGE_INDEX[stage] ?? 1;
    const progress =
      typeof explicitProgress === 'number'
        ? explicitProgress
        : (UPLOAD_STAGE_PROGRESS[stage] ?? 0);

    onProgress(step, stage, progress);
  }

  async processFile(
    base64Data: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    contentType: ContentType,
    options: UploadProcessorOptions
  ): Promise<ProcessedSeed> {
    const { userId, title = fileName, onProgress, accessToken } = options;
    let seedId: string | null = null;

    try {
      this.emitStageProgress(onProgress, 'validating');

      // Create initial seed record with pending status
      const initialSeed = await this.createInitialSeed({
        userId,
        title,
        contentType,
        fileSize,
      });
      seedId = initialSeed.id;

      // Update status to extracting
      await this.updateSeedStatus(seedId, 'extracting');

      this.emitStageProgress(onProgress, 'reading');

      // Extract content based on type (base64Data already provided by caller)
      const extractionResult = await this.extractContent(
        base64Data,
        contentType,
        mimeType,
        accessToken
      );

      // Validate content quality for AI processing
      await this.validateContentQuality(extractionResult, seedId, contentType);

      this.emitStageProgress(onProgress, 'extracting');

      // Update status to analyzing
      await this.updateSeedStatus(seedId, 'analyzing');

      const generatingStart = UPLOAD_STAGE_PROGRESS['extracting'] ?? 0.45;
      const generatingTarget = UPLOAD_STAGE_PROGRESS['generating'] ?? 0.82;
      const generatingRange = Math.max(generatingTarget - generatingStart, 0);

      // Switch to generating stage with a gentle nudge forward
      this.emitStageProgress(
        onProgress,
        'generating',
        generatingStart + generatingRange * 0.02
      );

      const feynmanResult = await generateFeynman(
        extractionResult.content,
        title,
        extractionResult.metadata?.language,
        accessToken,
        (progress: number, message: string) => {
          const normalized = Math.max(0, Math.min(1, progress));
          const mapped = generatingStart + normalized * generatingRange;
          this.emitStageProgress(onProgress, 'generating', mapped);
        }
      );

      this.emitStageProgress(onProgress, 'generating', generatingTarget);
      this.emitStageProgress(onProgress, 'finalizing');

      const seed = await this.updateSeedWithResults({
        seedId,
        extractionResult,
        feynmanResult,
      });

      // Auto-generate flashcards and quiz in background (non-blocking, matching iOS)
      try {
        backgroundProcessor.generateBothInBackground(seedId, userId, "");
      } catch (genError) {
        console.warn('[UploadProcessor] Warning: Failed to queue background generation:', genError);
        // Don't fail the upload if background generation fails to queue
      }

      const finalSeed = await this.fetchProcessedSeed(seedId, userId);
      this.emitStageProgress(onProgress, 'completed');
      return finalSeed ?? seed;
    } catch (error) {
      console.error('[UploadProcessor] Error in processFile:', error);
      console.error(
        '[UploadProcessor] Error type:',
        error instanceof Error ? error.constructor.name : typeof error
      );
      console.error(
        '[UploadProcessor] Error message:',
        error instanceof Error ? error.message : String(error)
      );

      // Delete seed from database on failure (only completed seeds should be stored)
      if (seedId) {
        try {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error occurred';
          console.error(
            '[UploadProcessor] Deleting incomplete seed due to error:',
            errorMessage
          );
          await seedsService.deleteSeed(seedId);
        } catch (deleteError) {
          console.error(
            '[UploadProcessor] Failed to delete incomplete seed:',
            deleteError
          );
        }
      }

      throw new Error(
        error instanceof Error ? error.message : 'Failed to process uploaded file'
      );
    }
  }

  async processTextContent(
    text: string,
    options: UploadProcessorOptions
  ): Promise<ProcessedSeed> {
    const { userId, title = 'Text Content', onProgress, accessToken } = options;

    try {
      this.emitStageProgress(onProgress, 'validating');
      this.emitStageProgress(onProgress, 'reading');

      const extractionResult = await extractDocument(text, 'text/plain', accessToken);

      // Validate content quality for AI processing
      await this.validateContentQuality(extractionResult, undefined, 'text');

      this.emitStageProgress(onProgress, 'extracting');

      const generatingStart = UPLOAD_STAGE_PROGRESS['extracting'] ?? 0.45;
      const generatingTarget = UPLOAD_STAGE_PROGRESS['generating'] ?? 0.82;
      const generatingRange = Math.max(generatingTarget - generatingStart, 0);

      this.emitStageProgress(
        onProgress,
        'generating',
        generatingStart + generatingRange * 0.02
      );

      const feynmanResult = await generateFeynman(
        extractionResult.content,
        title,
        extractionResult.metadata?.language,
        accessToken,
        (progress: number, message: string) => {
          const normalized = Math.max(0, Math.min(1, progress));
          const mapped = generatingStart + normalized * generatingRange;
          this.emitStageProgress(onProgress, 'generating', mapped);
        }
      );

      this.emitStageProgress(onProgress, 'generating', generatingTarget);
      this.emitStageProgress(onProgress, 'finalizing');

      const seed = await this.saveSeedToDatabase({
        userId,
        title,
        contentType: 'text',
        extractionResult,
        feynmanResult,
      });

      // Auto-generate flashcards and quiz in background (non-blocking, matching iOS)
      try {
        backgroundProcessor.generateBothInBackground(seed.id, userId, "");
      } catch (genError) {
        console.warn('[UploadProcessor] Warning: Failed to queue background generation:', genError);
        // Don't fail the upload if background generation fails to queue
      }

      const finalSeed = await this.fetchProcessedSeed(seed.id, userId);
      this.emitStageProgress(onProgress, 'completed');
      return finalSeed ?? seed;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to process text content'
      );
    }
  }

  async processYoutubeUrl(
    url: string,
    options: UploadProcessorOptions
  ): Promise<ProcessedSeed> {
    const { userId, title = 'YouTube Video', onProgress, accessToken } = options;

    try {
      this.emitStageProgress(onProgress, 'validating');
      this.emitStageProgress(onProgress, 'reading');

      // Extract content from YouTube URL
      const extractionResult = await extractYouTubeUrl(url, accessToken);

      // Use video title if available and no specific title provided
      const finalTitle: string =
        title === 'YouTube Video' && typeof extractionResult.metadata?.videoTitle === 'string'
          ? (extractionResult.metadata.videoTitle as string)
          : title;

      // Validate content quality for AI processing
      await this.validateContentQuality(extractionResult, undefined, 'youtube');

      this.emitStageProgress(onProgress, 'extracting');

      const generatingStart = UPLOAD_STAGE_PROGRESS['extracting'] ?? 0.45;
      const generatingTarget = UPLOAD_STAGE_PROGRESS['generating'] ?? 0.82;
      const generatingRange = Math.max(generatingTarget - generatingStart, 0);

      this.emitStageProgress(
        onProgress,
        'generating',
        generatingStart + generatingRange * 0.02
      );

      const feynmanResult = await generateFeynman(
        extractionResult.content,
        finalTitle,
        extractionResult.metadata?.language,
        accessToken,
        (progress: number, message: string) => {
          const normalized = Math.max(0, Math.min(1, progress));
          const mapped = generatingStart + normalized * generatingRange;
          this.emitStageProgress(onProgress, 'generating', mapped);
        }
      );

      this.emitStageProgress(onProgress, 'generating', generatingTarget);
      this.emitStageProgress(onProgress, 'finalizing');

      const seed = await this.saveSeedToDatabase({
        userId,
        title: finalTitle,
        contentType: 'youtube',
        contentUrl: url,
        extractionResult,
        feynmanResult,
      });

      // Auto-generate flashcards and quiz in background (non-blocking, matching iOS)
      try {
        backgroundProcessor.generateBothInBackground(seed.id, userId, "");
      } catch (genError) {
        console.warn('[UploadProcessor] Warning: Failed to queue background generation:', genError);
        // Don't fail the upload if background generation fails to queue
      }

      const finalSeed = await this.fetchProcessedSeed(seed.id, userId);
      this.emitStageProgress(onProgress, 'completed');
      return finalSeed ?? seed;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to process YouTube video'
      );
    }
  }

  // Helper: Language-aware content length measurement
  // For CJK languages (Chinese, Japanese, Korean), use character count instead of word count
  // since these languages don't use spaces as word delimiters
  private getContentLength(content: string, language?: string): number {
    const cjkLanguages = ['zh', 'ja', 'ko', 'th']; // Chinese, Japanese, Korean, Thai
    if (language && cjkLanguages.includes(language)) {
      // For CJK languages, character count is more reliable than word count
      return content.length;
    }
    // For other languages, use word count based on space separation
    return content.split(/\s+/).filter((w) => w.length > 0).length;
  }

  private async validateContentQuality(
    extractionResult: ExtractionResult,
    seedId?: string,
    contentType?: ContentType
  ): Promise<void> {
    const content = extractionResult.content?.trim() || '';
    const language = extractionResult.metadata?.language;

    // Use language-aware content length measurement
    const contentLength = this.getContentLength(content, language);
    const charCount = content.length;
    const MIN_CONTENT_UNITS = 20; // Minimum units (words or characters depending on language)

    if (!content || contentLength < MIN_CONTENT_UNITS) {
      const { internalMessage, userMessage } =
        this.buildInsufficientContentMessages(
          contentLength,
          contentType,
          MIN_CONTENT_UNITS
        );

      // Delete incomplete seed if provided (only completed seeds should be stored)
      if (seedId) {
        seedsService.deleteSeed(seedId).catch((err) => {
          console.error('[UploadProcessor] Failed to delete incomplete seed:', err);
        });
      }

      throw new Error(userMessage);
    }

    // Check content size limits (also use language-aware measurement)
    const aiLimits = await configService.getAILimits();
    const maxWords = aiLimits.maxWords;
    const maxCharacters = aiLimits.maxCharacters;

    const contentLengthForLimit = this.getContentLength(content, language);

    // Separate character and word validation to show correct limit
    if (charCount > maxCharacters) {
      const limitMessage = `Content too large: ${charCount} characters exceeds ${maxCharacters} character limit`;

      // Delete incomplete seed if provided (only completed seeds should be stored)
      if (seedId) {
        seedsService.deleteSeed(seedId).catch((err) => {
          console.error('[UploadProcessor] Failed to delete incomplete seed:', err);
        });
      }

      throw new Error(
        `Your content has ${charCount.toLocaleString()} characters. Maximum allowed is ${maxCharacters.toLocaleString()} characters.`
      );
    }

    if (contentLengthForLimit > maxWords) {
      const limitMessage = `Content too large: ${contentLengthForLimit} words exceeds ${maxWords} word limit`;

      // Delete incomplete seed if provided (only completed seeds should be stored)
      if (seedId) {
        seedsService.deleteSeed(seedId).catch((err) => {
          console.error('[UploadProcessor] Failed to delete incomplete seed:', err);
        });
      }

      throw new Error(
        `Your content has ${contentLengthForLimit.toLocaleString()} words. Maximum allowed is ${maxWords.toLocaleString()} words.`
      );
    }
  }

  private buildInsufficientContentMessages(
    wordCount: number,
    contentType: ContentType | undefined,
    minimumWords: number
  ): { internalMessage: string; userMessage: string } {
    const internalMessage = `Content too short (${wordCount} words, need ${minimumWords}).`;
    const shortage = minimumWords - wordCount;

    switch (contentType) {
      case 'image':
        return {
          internalMessage,
          userMessage:
            wordCount === 0
              ? 'No text detected. Use a clearer photo with readable text.'
              : `Too little text (${wordCount} words found). Capture an image with at least ${minimumWords} words.`,
        };
      case 'audio':
        return {
          internalMessage,
          userMessage:
            wordCount === 0
              ? 'No speech detected. Check audio quality or use a different file.'
              : `Too short (${wordCount} words). Use audio with at least ${minimumWords} words of speech (~30 seconds).`,
        };

      case 'pdf':
        return {
          internalMessage,
          userMessage:
            wordCount === 0
              ? 'No text in this PDF. Try a text-based PDF or better quality scan.'
              : `Too little text (${wordCount} words). Upload a PDF with at least ${minimumWords} words of content.`,
        };
      case 'text':
      case 'youtube':
      default:
        return {
          internalMessage,
          userMessage:
            wordCount === 0
              ? `No content found. Please ensure the source has at least ${minimumWords} words.`
              : `Too short (${wordCount} words). Please ensure the content has at least ${minimumWords} words.`,
        };
    }
  }

  private async extractContent(
    base64Data: string,
    contentType: ContentType,
    mimeType: string,
    accessToken: string
  ): Promise<ExtractionResult> {
    switch (contentType) {
      case 'pdf':
        return processPdfOrImage(base64Data, mimeType, accessToken);

      case 'image':
        // Pass original MIME type to preserve image format (JPEG, PNG, WebP, etc.)
        return processPdfOrImage(base64Data, mimeType, accessToken);

      case 'audio':
        return transcribeAudio(base64Data, mimeType, accessToken);

      case 'text':
        // Handle DOC/DOCX/TXT files through document extraction
        return extractDocument(base64Data, mimeType, accessToken);

      case 'youtube':
        // Should be handled by processYoutubeUrl directly, but included for completeness
        return extractYouTubeUrl(base64Data, accessToken);

      default:
        throw new Error(
          `Content type ${contentType} is not supported for file extraction`
        );
    }
  }

  private async saveSeedToDatabase(params: {
    userId: string;
    title: string;
    contentType: ContentType;
    extractionResult: ExtractionResult;
    feynmanResult: FeynmanResult;
    contentUrl?: string;
  }): Promise<ProcessedSeed> {
    const {
      userId,
      title,
      contentType,
      extractionResult,
      feynmanResult,
      contentUrl,
    } = params;

    const materialsStatus: Record<string, 'pending' | 'ready' | 'error'> = {
      flashcards: 'pending',
      quiz: 'pending',
      notes: 'pending',
      teachback: 'pending',
    };

    const extractionMetadata: ExtractionMetadata = {
      ...extractionResult.metadata,
      ...feynmanResult.processingMetadata,
      materialsStatus,
    };

    const supabase = getSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase
      .from('seeds') as any)
      .insert({
        user_id: userId,
        title,
        content_type: contentType,
        content_url: contentUrl,
        content_text: extractionResult.content,
        original_content: extractionResult.content,
        feynman_explanation: feynmanResult.feynmanExplanation,
        intent: feynmanResult.intent,
        confidence_score: feynmanResult.processingMetadata.confidence,
        processing_status: 'completed',
        extraction_metadata: extractionMetadata,
        language_code: extractionResult.metadata?.language || 'en',
        is_mixed_language: extractionResult.metadata?.isMixedLanguage || false,
        language_metadata: extractionResult.metadata?.languageMetadata || null,
      })
      .select()
      .single();

    if (!error && data) {
      return data as ProcessedSeed;
    }

    console.error('[UploadProcessor] Seed insert failed:', error);
    throw new Error('Failed to save seed to database');
  }

  private async createInitialSeed(params: {
    userId: string;
    title: string;
    contentType: ContentType;
    fileSize?: number;
  }): Promise<{ id: string }> {
    const { userId, title, contentType, fileSize } = params;

    const supabase = getSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase
      .from('seeds') as any)
      .insert({
        user_id: userId,
        title,
        content_type: contentType,
        file_size: fileSize,
        processing_status: 'pending',
        is_starred: false,
        is_archived: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[UploadProcessor] Database error creating seed:', error);
      throw new Error('Failed to create initial seed record');
    }

    return data;
  }

  private async updateSeedStatus(
    seedId: string,
    status:
      | 'pending'
      | 'extracting'
      | 'analyzing'
      | 'generating'
      | 'completed'
      | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const updateData: Record<string, string | undefined> = { processing_status: status };

    if (errorMessage) {
      updateData.processing_error = errorMessage;
    }

    const supabase = getSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase
      .from('seeds') as any)
      .update(updateData)
      .eq('id', seedId);

    if (error) {
      console.error('Failed to update seed status:', error);
      // Don't throw here to avoid cascading failures
    }
  }

  private async updateSeedWithResults(params: {
    seedId: string;
    extractionResult: ExtractionResult;
    feynmanResult: FeynmanResult;
  }): Promise<ProcessedSeed> {
    const { seedId, extractionResult, feynmanResult } = params;

    const materialsStatus: Record<string, 'pending' | 'ready' | 'error'> = {
      flashcards: 'pending',
      quiz: 'pending',
      notes: 'pending',
      teachback: 'pending',
    };

    const extractionMetadata: ExtractionMetadata = {
      ...extractionResult.metadata,
      ...feynmanResult.processingMetadata,
      materialsStatus,
    };

    const baseUpdate = {
      content_text: extractionResult.content,
      original_content: extractionResult.content,
      feynman_explanation: feynmanResult.feynmanExplanation,
      intent: feynmanResult.intent,
      confidence_score: feynmanResult.processingMetadata.confidence,
      processing_status: 'completed' as const,
      extraction_metadata: extractionMetadata,
      processing_error: null,
      language_code: extractionResult.metadata?.language || 'en',
      is_mixed_language: extractionResult.metadata?.isMixedLanguage || false,
      language_metadata: extractionResult.metadata?.languageMetadata || null,
    };

    const supabase = getSupabaseClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase
      .from('seeds') as any)
      .update(baseUpdate)
      .eq('id', seedId)
      .select()
      .single();

    if (!error && data) {
      return data as ProcessedSeed;
    }

    console.error('[UploadProcessor] Seed update failed:', error);
    throw new Error('Failed to save processing results');
  }

  private async fetchProcessedSeed(
    seedId: string,
    userId: string
  ): Promise<ProcessedSeed | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('seeds')
      .select('*')
      .eq('id', seedId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[UploadProcessor] Failed to fetch processed seed:', error);
      return null;
    }

    return data as ProcessedSeed;
  }
}

export const uploadProcessor = new UploadProcessor();
