/**
 * Upload Processor - Matches iOS app exactly
 *
 * Supports: PDF, image, audio, text, YouTube
 * Orchestrates the file upload and processing pipeline:
 * 1. Validate file or URL
 * 2. Create initial seed
 * 3. Extract content from file/URL (via backend API)
 * 4. Validate content quality
 * 5. Generate Feynman explanation (via backend AI)
 * 6. Update seed with results
 */

import { seedsService } from './seeds';
import {
  processPdfOrImage,
  transcribeAudio,
  extractDocument,
  generateFeynman,
  extractYouTubeUrl,
  ExtractionResult,
} from './documentProcessing';
import { Seed } from '../supabase/types';
import { configService } from './configService';

export type ContentType = 'pdf' | 'image' | 'audio' | 'text' | 'youtube';

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
  title?: string;
  file?: File;
  textContent?: string;
  youtubeUrl?: string;
  onProgress?: (progress: UploadProgress) => void;
  accessToken: string;
}

// Stage progress mapping (matches iOS app exactly)
const STAGE_PROGRESS: Record<UploadStage, number> = {
  validating: 0.05,    // 5% (was 0.02)
  reading: 0.18,       // 18% (was 0.15)
  extracting: 0.45,    // 45%
  generating: 0.82,    // 82%
  finalizing: 0.95,    // 95% (was 0.92)
  completed: 1.0,      // 100%
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
    const { userId, title, file, textContent, youtubeUrl, onProgress, accessToken } = options;

    if (!file && !textContent && !youtubeUrl) {
      throw new Error('Either file, textContent, or youtubeUrl must be provided');
    }

    // If YouTube URL is provided
    if (youtubeUrl) {
      return this.processYoutubeUrl(youtubeUrl, {
        userId,
        title: title || 'YouTube Video',
        onProgress,
        accessToken,
      });
    }

    // If text content is provided directly
    if (textContent) {
      return this.processTextContent(textContent, {
        userId,
        title: title || 'Text Content',
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

    // Validate file size using dynamic limits
    // Map content types to config service types
    const configType = contentType === 'pdf' ? 'document' : 
                      contentType === 'text' ? 'document' : 
                      contentType as 'image' | 'audio';
    
    const maxSize = await configService.getMaxFileSizeByType(configType);
    
    if (fileSize > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1024 / 1024);
      const actualSizeMB = Math.round(fileSize / 1024 / 1024);
      throw new Error(
        `Your file is ${actualSizeMB}MB. Maximum allowed is ${maxSizeMB}MB.`
      );
    }

    this.emitProgress(onProgress, 'reading');

    // Convert file to base64
    const base64Data = await this.fileToBase64(file);

    // Create initial seed
    const { id: seedId } = await seedsService.createInitialSeed({
      userId,
      title: title || file.name,
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
      await this.validateContentQuality(extractionResult, contentType);

      // Update status to analyzing
      await seedsService.updateSeed(seedId, {
        processingStatus: 'analyzing',
      });

      // Generate Feynman explanation
      this.emitProgress(onProgress, 'generating');
      const feynmanResult = await generateFeynman(
        extractionResult.content,
        title || file.name,
        extractionResult.metadata?.language,
        accessToken,
        onProgress ? (progress: number, message: string) => {
          onProgress({ stage: 'generating', progress, message });
        } : undefined
      );

      this.emitProgress(onProgress, 'finalizing');

      // Update seed with final results
      const completedSeed = await seedsService.updateSeed(seedId, {
        contentText: extractionResult.content,
        originalContent: extractionResult.content,
        feynmanExplanation: feynmanResult.feynmanExplanation,
        intent: feynmanResult.intent,
        confidenceScore: feynmanResult.processingMetadata.confidence,
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
   * Process text content directly
   */
  private async processTextContent(
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
    await this.validateContentQuality(extractionResult, 'text');

    this.emitProgress(onProgress, 'extracting');

    // Create seed
    const { id: seedId } = await seedsService.createInitialSeed({
      userId,
      title,
      contentType: 'text',
    });

    try {
      // Generate Feynman explanation
      this.emitProgress(onProgress, 'generating');
      const feynmanResult = await generateFeynman(
        extractionResult.content,
        title,
        extractionResult.metadata?.language,
        accessToken,
        onProgress ? (progress: number, message: string) => {
          onProgress({ stage: 'generating', progress, message });
        } : undefined
      );

      this.emitProgress(onProgress, 'finalizing');

      // Update seed with results
      const completedSeed = await seedsService.updateSeed(seedId, {
        contentText: extractionResult.content,
        originalContent: extractionResult.content,
        feynmanExplanation: feynmanResult.feynmanExplanation,
        intent: feynmanResult.intent,
        confidenceScore: feynmanResult.processingMetadata.confidence,
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
   * Process YouTube URL
   */
  private async processYoutubeUrl(
    url: string,
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

    // Extract content from YouTube URL
    const extractionResult = await extractYouTubeUrl(url, accessToken);

    // Use video title if available
    const finalTitle =
      title === 'YouTube Video' && typeof extractionResult.metadata?.videoTitle === 'string'
        ? (extractionResult.metadata.videoTitle as string)
        : title;

    // Validate content quality
    await this.validateContentQuality(extractionResult, 'youtube');

    this.emitProgress(onProgress, 'extracting');

    // Create seed with YouTube content
    const { id: seedId } = await seedsService.createInitialSeed({
      userId,
      title: finalTitle,
      contentType: 'youtube',
    });

    try {
      // Generate Feynman explanation
      this.emitProgress(onProgress, 'generating');
      const feynmanResult = await generateFeynman(
        extractionResult.content,
        finalTitle,
        extractionResult.metadata?.language,
        accessToken,
        onProgress ? (progress: number, message: string) => {
          onProgress({ stage: 'generating', progress, message });
        } : undefined
      );

      this.emitProgress(onProgress, 'finalizing');

      // Update seed with results
      const completedSeed = await seedsService.updateSeed(seedId, {
        contentText: extractionResult.content,
        originalContent: extractionResult.content,
        feynmanExplanation: feynmanResult.feynmanExplanation,
        intent: feynmanResult.intent,
        confidenceScore: feynmanResult.processingMetadata.confidence,
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
   * Language-aware content length measurement
   * For CJK languages, use character count; for others, use word count
   */
  private getContentLength(content: string, language?: string): number {
    const cjkLanguages = ['zh', 'ja', 'ko', 'th'];
    if (language && cjkLanguages.includes(language)) {
      return content.length;
    }
    return content.split(/\s+/).filter((w) => w.length > 0).length;
  }

  /**
   * Validate extracted content quality
   */
  private async validateContentQuality(
    extractionResult: ExtractionResult,
    contentType: ContentType
  ): Promise<void> {
    const content = extractionResult.content?.trim() || '';
    const language = extractionResult.metadata?.language;

    // Use language-aware content length measurement
    const contentLength = this.getContentLength(content, language);
    const charCount = content.length;
    const MIN_CONTENT_UNITS = 20;

    if (!content || contentLength < MIN_CONTENT_UNITS) {
      const errorMessages: Record<ContentType, string> = {
        image: contentLength === 0
          ? 'No text detected. Use a clearer photo with readable text.'
          : `Too little text (${contentLength} words found). Capture an image with at least ${MIN_CONTENT_UNITS} words.`,
        audio: contentLength === 0
          ? 'No speech detected. Check audio quality or use a different file.'
          : `Too short (${contentLength} words). Use audio with at least ${MIN_CONTENT_UNITS} words of speech.`,
        pdf: contentLength === 0
          ? 'No text in this PDF. Try a text-based PDF or better quality scan.'
          : `Too little text (${contentLength} words). Upload a PDF with at least ${MIN_CONTENT_UNITS} words.`,
        text: contentLength === 0
          ? `No content entered. Please add at least ${MIN_CONTENT_UNITS} words.`
          : `Too short (${contentLength} words). Please add at least ${MIN_CONTENT_UNITS} more words.`,
        youtube: contentLength === 0
          ? 'No content found. Please ensure the source has at least ${MIN_CONTENT_UNITS} words.'
          : `Too short (${contentLength} words). Please ensure the content has at least ${MIN_CONTENT_UNITS} words.`,
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
   * Extract content based on file type
   */
  private async extractContent(
    base64Data: string,
    contentType: ContentType,
    mimeType: string,
    accessToken: string
  ): Promise<ExtractionResult> {
    switch (contentType) {
      case 'pdf':
      case 'image':
        return processPdfOrImage(base64Data, mimeType, accessToken);

      case 'audio':
        return transcribeAudio(base64Data, mimeType, accessToken);

      case 'text':
        return extractDocument(base64Data, mimeType, accessToken);

      default:
        throw new Error(`Unsupported content type: ${contentType}`);
    }
  }

  /**
   * Convert file to base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
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
