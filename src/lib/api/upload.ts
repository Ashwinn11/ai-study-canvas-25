/**
 * Upload Processor
 *
 * Orchestrates the file upload and processing pipeline:
 * 1. Validate file
 * 2. Create initial seed
 * 3. Extract content from file (via backend API)
 * 4. Validate content quality
 * 5. Generate Feynman explanation (via backend AI)
 * 6. Update seed with results
 */

import { seedsService } from './seeds';
import {
  processPdfOrImage,
  transcribeAudio,
  transcribeVideo,
  extractDocument,
  generateFeynman,
  ExtractionResult,
} from './documentProcessing';
import { Seed } from '../supabase/types';

export type ContentType = 'pdf' | 'image' | 'audio' | 'video' | 'text';

export type UploadStage =
  | 'validating'
  | 'reading'
  | 'extracting'
  | 'generating'
  | 'finalizing'
  | 'completed';

export interface UploadProgress {
  stage: UploadStage;
  progress: number; // 0-100
  message: string;
}

export interface UploadOptions {
  userId: string;
  title: string;
  file?: File;
  textContent?: string;
  onProgress?: (progress: UploadProgress) => void;
  accessToken: string;
}

// Stage progress mapping (matches iOS app)
const STAGE_PROGRESS: Record<UploadStage, number> = {
  validating: 0.02,
  reading: 0.15,
  extracting: 0.45,
  generating: 0.82,
  finalizing: 0.92,
  completed: 1.0,
};

const STAGE_MESSAGES: Record<UploadStage, string> = {
  validating: 'Validating file...',
  reading: 'Reading file...',
  extracting: 'Extracting content...',
  generating: 'Generating study materials...',
  finalizing: 'Finalizing...',
  completed: 'Upload complete!',
};

class UploadProcessor {
  private emitProgress(
    onProgress: ((progress: UploadProgress) => void) | undefined,
    stage: UploadStage,
    customProgress?: number
  ) {
    const progress = customProgress !== undefined ? customProgress : STAGE_PROGRESS[stage];
    onProgress?.({
      stage,
      progress: Math.round(progress * 100),
      message: STAGE_MESSAGES[stage],
    });
  }

  /**
   * Process file upload
   */
  async processFile(options: UploadOptions): Promise<Seed> {
    const { userId, title, file, textContent, onProgress, accessToken } = options;

    if (!file && !textContent) {
      throw new Error('Either file or textContent must be provided');
    }

    // If text content is provided directly
    if (textContent) {
      return this.processTextContent(textContent, {
        userId,
        title,
        onProgress,
        accessToken,
      });
    }

    // Otherwise process the file
    if (!file) {
      throw new Error('File is required');
    }

    this.emitProgress(onProgress, 'validating');

    // Determine content type from file
    const contentType = this.getContentTypeFromFile(file);
    const fileSize = file.size;

    // Validate file size (max 50MB for videos, 20MB for others)
    const maxSize = contentType === 'video' ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
    if (fileSize > maxSize) {
      throw new Error(
        `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`
      );
    }

    this.emitProgress(onProgress, 'reading');

    // Convert file to base64
    const base64Data = await this.fileToBase64(file);

    // Create initial seed
    const { id: seedId } = await seedsService.createInitialSeed({
      userId,
      title,
      contentType,
      fileSize,
    });

    try {
        // Update status to extracting
        await seedsService.updateSeed(seedId, {
          processingStatus: 'extracting',
        });

        this.emitProgress(onProgress, 'extracting');

        // Extract content based on file type
        const extractionResult = await this.extractContent(
          base64Data,
          contentType,
          file.type,
          accessToken
        );

        // Validate content quality
        this.validateContentQuality(extractionResult, contentType);

        // Update status to analyzing
        await seedsService.updateSeed(seedId, {
          processingStatus: 'analyzing',
        });

        // DISABLED: Feynman generation endpoint doesn't exist yet (/api/ai/feynman returns 404)
        // TODO: Re-enable when backend endpoint is available
        // this.emitProgress(onProgress, 'generating');
        // const feynmanResult = await generateFeynman(...);

        this.emitProgress(onProgress, 'finalizing');

        // Update seed with final results (without Feynman explanation for now)
        const completedSeed = await seedsService.updateSeed(seedId, {
          contentText: extractionResult.content,
          originalContent: extractionResult.content,
          // feynmanExplanation: null, // Skip for now - endpoint doesn't exist
          // intent: 'Educational', // Default
          confidenceScore: extractionResult.metadata?.confidence || 0.8,
          processingStatus: 'completed',
          extractionMetadata: {
            ...extractionResult.metadata,
            materialsStatus: {
              flashcards: 'pending',
              quiz: 'pending',
              notes: 'pending',
              teachback: 'pending',
            },
          },
          languageCode: extractionResult.metadata?.language || 'en',
          isMixedLanguage: extractionResult.metadata?.isMixedLanguage || false,
          languageMetadata: extractionResult.metadata?.languageMetadata || null,
          processingError: null,
        });

        this.emitProgress(onProgress, 'completed');

        return completedSeed;
      } catch (error) {
        // Update seed with error status
        await seedsService.updateSeed(seedId, {
          processingStatus: 'failed',
          processingError: error instanceof Error ? error.message : 'Unknown error',
        });

        // Delete the failed seed
        await seedsService.deleteSeed(seedId);

        throw error;
      }
  }

  /**
   * Process text content directly (no file)
   */
  async processTextContent(
    text: string,
    options: {
      userId: string;
      title: string;
      onProgress?: (progress: UploadProgress) => void;
      accessToken: string;
    }
  ): Promise<Seed> {
    const { userId, title, onProgress, accessToken } = options;

    this.emitProgress(onProgress, 'validating');
    this.emitProgress(onProgress, 'reading');

    // Create extraction result from text
    const extractionResult: ExtractionResult = {
      content: text,
      metadata: {
        source: 'text_input',
      },
    };

    // Validate content quality
    this.validateContentQuality(extractionResult, 'text');

    this.emitProgress(onProgress, 'extracting');

    // Create seed
    const { id: seedId } = await seedsService.createInitialSeed({
      userId,
      title,
      contentType: 'text',
    });

    try {
        // DISABLED: Feynman generation endpoint doesn't exist yet (/api/ai/feynman returns 404)
        // TODO: Re-enable when backend endpoint is available
        // this.emitProgress(onProgress, 'generating');
        // const feynmanResult = await generateFeynman(...);

        this.emitProgress(onProgress, 'finalizing');

        // Update seed with results (without Feynman explanation for now)
        const completedSeed = await seedsService.updateSeed(seedId, {
          contentText: extractionResult.content,
          originalContent: extractionResult.content,
          // feynmanExplanation: null, // Skip for now - endpoint doesn't exist
          // intent: 'Educational', // Default
          confidenceScore: extractionResult.metadata?.confidence || 0.8,
          processingStatus: 'completed',
          extractionMetadata: {
            ...extractionResult.metadata,
            materialsStatus: {
              flashcards: 'pending',
              quiz: 'pending',
              notes: 'pending',
              teachback: 'pending',
            },
          },
          languageCode: extractionResult.metadata?.language || 'en',
          processingError: null,
        });

        this.emitProgress(onProgress, 'completed');

        return completedSeed;
      } catch (error) {
        // Delete the failed seed
        await seedsService.deleteSeed(seedId);
        throw error;
      }
  }

  /**
   * Extract content based on file type
   */
  private async extractContent(
    base64Data: string,
    contentType: ContentType,
    mimeType: string,
    accessToken: string
  ): Promise<ExtractionResult> {
    let result: { text: string; metadata?: Record<string, unknown> };

    switch (contentType) {
      case 'pdf':
      case 'image':
        result = await processPdfOrImage(base64Data, mimeType, accessToken);
        break;

      case 'audio':
        result = await transcribeAudio(base64Data, mimeType, accessToken);
        break;

      case 'video':
        result = await transcribeVideo(base64Data, mimeType, accessToken);
        break;

      case 'text':
        result = await extractDocument(base64Data, mimeType, accessToken);
        break;

      default:
        throw new Error(`Unsupported content type: ${contentType}`);
    }

    return {
      content: result.text,
      metadata: result.metadata,
    };
  }

  /**
   * Validate extracted content quality
   */
  private validateContentQuality(
    extractionResult: ExtractionResult,
    contentType: ContentType
  ): void {
    const content = extractionResult.content?.trim() || '';
    const MIN_WORDS = 20;

    // Count words
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    if (!content || wordCount < MIN_WORDS) {
      const errorMessages: Record<ContentType, string> = {
        image: wordCount === 0
          ? 'No text detected in image. Use a clearer photo with readable text.'
          : `Too little text (${wordCount} words). Capture an image with at least ${MIN_WORDS} words.`,
        audio: wordCount === 0
          ? 'No speech detected. Check audio quality or use a different file.'
          : `Too short (${wordCount} words). Use audio with at least ${MIN_WORDS} words of speech.`,
        video: wordCount === 0
          ? 'No speech detected. Ensure your video has clear, audible speech.'
          : `Too short (${wordCount} words). Use a video with at least ${MIN_WORDS} words of speech.`,
        pdf: wordCount === 0
          ? 'No text in this PDF. Try a text-based PDF or better quality scan.'
          : `Too little text (${wordCount} words). Upload a PDF with at least ${MIN_WORDS} words.`,
        text: wordCount === 0
          ? `No content entered. Please add at least ${MIN_WORDS} words.`
          : `Too short (${wordCount} words). Please add at least ${MIN_WORDS - wordCount} more words.`,
      };

      throw new Error(errorMessages[contentType]);
    }
  }

  /**
   * Determine content type from file
   */
  private getContentTypeFromFile(file: File): ContentType {
    const mimeType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    // PDF
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return 'pdf';
    }

    // Images
    if (
      mimeType.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|bmp|webp)$/.test(fileName)
    ) {
      return 'image';
    }

    // Audio
    if (
      mimeType.startsWith('audio/') ||
      /\.(mp3|wav|m4a|aac|ogg|flac)$/.test(fileName)
    ) {
      return 'audio';
    }

    // Video
    if (
      mimeType.startsWith('video/') ||
      /\.(mp4|mov|avi|mkv|webm)$/.test(fileName)
    ) {
      return 'video';
    }

    // Documents (text)
    if (
      mimeType.includes('document') ||
      mimeType.includes('text') ||
      /\.(doc|docx|txt)$/.test(fileName)
    ) {
      return 'text';
    }

    throw new Error(`Unsupported file type: ${mimeType || fileName}`);
  }

  /**
   * Convert file to base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }
}

export const uploadProcessor = new UploadProcessor();
