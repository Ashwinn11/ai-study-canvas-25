import { processPdfViaBackend } from "./documentAiClient";
import { transcribeAudio } from "./mediaTranscriptionClient";
import { extractDocument } from "./documentExtractClient";
import { extractYouTubeCaptions } from "./youtubeClient";
import { ServiceError } from "./serviceError";
import { franc } from "franc-min";

import { logger } from "@/utils/logger";
export interface ExtractionResult {
  content: string;
  metadata?: {
    confidence?: number;
    language?: string;
    pageCount?: number;
    duration?: number;
    source?: string;
    // Additional fields for different extraction types
    videoTitle?: string;
    channelTitle?: string;
    captionSource?: string;
    encoding?: string;
    [key: string]: any; // Allow additional metadata fields
  };
}

export class ContentExtractionService {
  private lastDetectedLanguage?: string; // Track language for subsequent audio/video hints

  // PDF extraction using Document AI (primary) with Vision fallback (via backend)
  async extractFromPDF(base64Data: string): Promise<ExtractionResult> {
    try {
      // Route to backend which uses Document AI and falls back to Vision async
      const { text, metadata } = await processPdfViaBackend(
        base64Data,
        "application/pdf",
      );

      // Track detected language for potential use in audio/video
      if (metadata?.language) {
        this.lastDetectedLanguage = metadata.language;
      }

      return {
        content: text,
        metadata: {
          ...metadata,
          confidence: metadata?.confidence || 0.9,
          source: metadata?.source || "document_ai",
          pageCount: metadata?.pageCount,
        },
      };
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      throw new ServiceError(
        "Unexpected error during PDF OCR",
        "contentExtraction",
        "PDF_OCR_ERROR",
        "Failed to extract text from PDF. Please try again.",
        true,
        error instanceof Error ? error : undefined,
      );
    }
  }

  // Image OCR using server endpoint (Vision API or Document AI)
  async extractFromImage(
    base64Data: string,
    originalMimeType?: string,
  ): Promise<ExtractionResult> {
    try {
      // Route images through the same server endpoint for consistency
      // Use the original MIME type if provided (e.g., 'image/jpeg', 'image/png', 'image/webp')
      const mimeType = originalMimeType || "image/png";
      const { text, metadata } = await processPdfViaBackend(
        base64Data,
        mimeType,
      );

      // Track detected language for potential use in audio/video
      if (metadata?.language) {
        this.lastDetectedLanguage = metadata.language;
      }

      return {
        content: text,
        metadata: {
          ...metadata,
          confidence: metadata?.confidence || 0.8,
          source: metadata?.source || "vision_api",
        },
      };
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      throw new ServiceError(
        "Unexpected error during image OCR",
        "contentExtraction",
        "IMAGE_OCR_ERROR",
        "Failed to extract text from image. Please try again.",
        true,
        error instanceof Error ? error : undefined,
      );
    }
  }

  // Audio extraction using backend (STT long-running)
  async extractFromAudio(
    base64Data: string,
    mimeType: string,
  ): Promise<ExtractionResult> {
    try {
      // Pass language hint if previously detected from PDF/Image OCR
      const languageHints = this.lastDetectedLanguage
        ? [this.lastDetectedLanguage]
        : [];

      const { text, metadata } = await transcribeAudio(
        base64Data,
        mimeType,
        languageHints,
      );
      if (metadata?.language) {
        this.lastDetectedLanguage = metadata.language;
      }
      return {
        content: text,
        metadata: {
          ...(metadata || {}),
          language: metadata?.language,
          confidence: metadata?.confidence ?? 0.85,
          source: metadata?.source ?? "speech_to_text",
        },
      };
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      throw new ServiceError(
        "Unexpected error during audio transcription",
        "contentExtraction",
        "AUDIO_TRANSCRIPTION_ERROR",
        "Failed to transcribe audio. Please try again.",
        true,
        error instanceof Error ? error : undefined,
      );
    }
  }



  // Text processing (direct)
  async extractFromText(text: string): Promise<ExtractionResult> {
    if (!text || text.trim().length === 0) {
      throw new ServiceError(
        "No text content provided",
        "contentExtraction",
        "EMPTY_TEXT",
        "Please provide some text content to process.",
        false,
      );
    }

    // Basic language detection for direct text input
    // For now, default to English. Future enhancement: use franc-min or OpenAI for detection
    const detectedLanguage = this.detectTextLanguage(text.trim());
    if (detectedLanguage) {
      this.lastDetectedLanguage = detectedLanguage;
    }

    return {
      content: text.trim(),
      metadata: {
        language: detectedLanguage,
        confidence: 1.0,
        source: "direct_text",
      },
    };
  }

  // Document extraction for DOC/DOCX/TXT files
  async extractFromDocument(
    base64Data: string,
    mimeType: string,
  ): Promise<ExtractionResult> {
    try {
      // Call backend document extraction service
      const { text, metadata } = await extractDocument(base64Data, mimeType);

      if (!text || text.trim().length === 0) {
        throw new ServiceError(
          "Document extraction returned empty text",
          "contentExtraction",
          "EMPTY_DOCUMENT",
          "No text could be extracted from this document. The file may be empty or corrupted.",
          false,
        );
      }

      // Detect language from extracted text
      const detectedLanguage = this.detectTextLanguage(text);
      if (detectedLanguage) {
        this.lastDetectedLanguage = detectedLanguage;
      }

      return {
        content: text,
        metadata: {
          ...(metadata || {}),
          language: detectedLanguage,
          confidence: metadata?.confidence ?? 0.9,
          source: metadata?.source || "document_extraction",
          wordCount: metadata?.wordCount,
          charCount: metadata?.charCount,
          isMixedLanguage: false,
          languageMetadata: detectedLanguage ? { [detectedLanguage]: 1 } : null,
        },
      };
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      throw new ServiceError(
        "Unexpected error during document extraction",
        "contentExtraction",
        "DOCUMENT_EXTRACT_ERROR",
        "Failed to extract text from document. Please ensure the file is a valid text document.",
        true,
        error instanceof Error ? error : undefined,
      );
    }
  }

  // YouTube URL extraction
  async extractFromYoutubeUrl(url: string): Promise<ExtractionResult> {
    try {
      const { text, metadata } = await extractYouTubeCaptions(url);

      if (!text || text.trim().length === 0) {
        throw new ServiceError(
          "YouTube video has empty captions",
          "contentExtraction",
          "EMPTY_CAPTIONS",
          "The captions for this video appear to be empty.",
          false
        );
      }

      // Detect language if not provided by backend
      let detectedLanguage = metadata.language;
      if (!detectedLanguage || detectedLanguage === 'und') {
        detectedLanguage = this.detectTextLanguage(text);
      }

      if (detectedLanguage) {
        this.lastDetectedLanguage = detectedLanguage;
      }

      return {
        content: text,
        metadata: {
          ...metadata,
          language: detectedLanguage,
          confidence: 0.95, // High confidence for captions
          source: "youtube_captions",
          isMixedLanguage: false,
        },
      };
    } catch (error) {
      if (error instanceof ServiceError) throw error;

      throw new ServiceError(
        "Unexpected error during YouTube extraction",
        "contentExtraction",
        "YOUTUBE_EXTRACT_ERROR",
        "Failed to extract content from YouTube video.",
        true,
        error instanceof Error ? error : undefined
      );
    }
  }

  // Language detection using franc-min library
  private detectTextLanguage(text: string): string {
    // Need at least 100 characters for reliable detection (increased from 50)
    if (text.length < 100) {
      return "en"; // Default to English for very short text
    }

    // Use franc-min for language detection (supports 170+ languages)
    const detectedLang = franc(text, { minLength: 100 });

    // franc returns ISO 639-3 codes, convert to ISO 639-1
    const iso6393To6391: Record<string, string> = {
      eng: "en",
      fra: "fr",
      spa: "es",
      deu: "de",
      ita: "it",
      por: "pt",
      rus: "ru",
      jpn: "ja",
      kor: "ko",
      cmn: "zh", // Mandarin Chinese
      arb: "ar", // Standard Arabic
      hin: "hi",
      ben: "bn",
      urd: "ur",
      vie: "vi",
      tha: "th",
      nld: "nl",
      pol: "pl",
      ukr: "uk",
      ron: "ro",
      ell: "el",
      hun: "hu",
      ces: "cs",
      swe: "sv",
      fin: "fi",
      nor: "no",
      dan: "da",
    };

    // If franc detected a language, convert to ISO 639-1
    if (detectedLang && detectedLang !== "und" && iso6393To6391[detectedLang]) {
      return iso6393To6391[detectedLang];
    }

    // Fallback: Use character pattern matching for scripts franc might miss
    const cjkPattern = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/;
    const arabicPattern = /[\u0600-\u06ff\u0750-\u077f]/;
    const cyrillicPattern = /[\u0400-\u04ff]/;

    if (cjkPattern.test(text)) {
      return "zh";
    } else if (arabicPattern.test(text)) {
      return "ar";
    } else if (cyrillicPattern.test(text)) {
      return "ru";
    }

    // Default to English if detection failed
    return "en";
  }

  // Helper methods
  private getAudioEncoding(mimeType: string): string {
    switch (mimeType) {
      case "audio/wav":
        return "LINEAR16";
      case "audio/flac":
        return "FLAC";
      case "audio/ogg":
        return "OGG_OPUS";
      case "audio/mp3":
      case "audio/mpeg":
        return "MP3";
      case "audio/webm":
        return "WEBM_OPUS";
      case "audio/amr":
        return "AMR";
      case "audio/amr-wb":
        return "AMR_WB";
      default:
        return "LINEAR16"; // Default fallback
    }
  }

  private getDefaultSampleRate(mimeType: string): number {
    switch (mimeType) {
      case "audio/wav":
        return 44100;
      case "audio/flac":
        return 44100;
      case "audio/ogg":
        return 48000;
      case "audio/mp3":
      case "audio/mpeg":
        return 44100;
      case "audio/webm":
        return 48000;
      case "audio/amr":
        return 8000;
      case "audio/amr-wb":
        return 16000;
      default:
        return 16000; // Safe default for Speech-to-Text
    }
  }

  private estimateAudioDuration(
    audioSizeBytes: number,
    sampleRateHertz: number,
  ): number {
    // Rough estimation: assuming 16-bit audio
    const bytesPerSecond = sampleRateHertz * 2; // 2 bytes per sample for 16-bit
    return Math.round(audioSizeBytes / bytesPerSecond);
  }
}

export const contentExtractionService = new ContentExtractionService();
