/**
 * Document Processing API Client
 *
 * Handles communication with the backend server for:
 * - PDF/Image OCR (Document AI, Vision API)
 * - Audio transcription (Speech-to-Text)
 * - Video transcription (Speech-to-Text)
 * - Document text extraction (DOC, DOCX, TXT)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  console.warn('NEXT_PUBLIC_API_BASE_URL not configured');
}

export interface ExtractionResult {
  content: string;
  metadata?: {
    confidence?: number;
    language?: string;
    pageCount?: number;
    duration?: number;
    source?: string;
    isMixedLanguage?: boolean;
    languageMetadata?: Record<string, number>;
    [key: string]: unknown;
  };
}

export interface FeynmanResult {
  feynmanExplanation: string;
  intent: 'Educational' | 'Comprehension' | 'Reference' | 'Analytical' | 'Procedural';
  processingMetadata: {
    confidence: number;
    wordCount: number;
    processingTime: number;
  };
}

/**
 * Process PDF or Image using Document AI / Vision API
 */
export async function processPdfOrImage(
  base64Data: string,
  mimeType: string,
  accessToken: string
): Promise<{ text: string; metadata?: Record<string, unknown> }> {
  if (!API_BASE_URL) {
    throw new Error('Backend URL not configured');
  }

  const url = `${API_BASE_URL}/api/documentai/process`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      contentBase64: base64Data,
      mimeType,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Failed to process document';

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch {
      // Use default error message
    }

    throw new Error(errorMessage);
  }

  const result = await response.json();
  return result;
}

/**
 * Transcribe audio file using Speech-to-Text
 */
export async function transcribeAudio(
  base64Data: string,
  mimeType: string,
  accessToken: string,
  languageHints?: string[]
): Promise<{ text: string; metadata?: Record<string, unknown> }> {
  if (!API_BASE_URL) {
    throw new Error('Backend URL not configured');
  }

  const url = `${API_BASE_URL}/api/audio/transcribe`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      contentBase64: base64Data,
      mimeType,
      languageHints,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Failed to transcribe audio';

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch {
      // Use default error message
    }

    throw new Error(errorMessage);
  }

  const result = await response.json();
  return result;
}

/**
 * Transcribe video file using Speech-to-Text
 */
export async function transcribeVideo(
  base64Data: string,
  mimeType: string,
  accessToken: string,
  languageHints?: string[]
): Promise<{ text: string; metadata?: Record<string, unknown> }> {
  if (!API_BASE_URL) {
    throw new Error('Backend URL not configured');
  }

  const url = `${API_BASE_URL}/api/video/transcribe`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      contentBase64: base64Data,
      mimeType,
      languageHints,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Failed to transcribe video';

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch {
      // Use default error message
    }

    throw new Error(errorMessage);
  }

  const result = await response.json();
  return result;
}

/**
 * Extract text from document (DOC, DOCX, TXT)
 */
export async function extractDocument(
  base64Data: string,
  mimeType: string,
  accessToken: string
): Promise<{ text: string; metadata?: Record<string, unknown> }> {
  if (!API_BASE_URL) {
    throw new Error('Backend URL not configured');
  }

  const url = `${API_BASE_URL}/api/document/extract`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      contentBase64: base64Data,
      mimeType,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Failed to extract document';

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch {
      // Use default error message
    }

    throw new Error(errorMessage);
  }

  const result = await response.json();
  return result;
}

/**
 * Generate Feynman explanation using AI
 */
/**
 * Generate Feynman explanation using chatCompletion
 * Matches iOS feynmanAI.ts lines 37-173
 */
export async function generateFeynman(
  content: string,
  title: string,
  language: string | undefined,
  accessToken: string,
  onProgress?: (progress: number, message: string) => void
): Promise<FeynmanResult> {
  const { chatCompletion } = await import('./openAIClient');
  const { configService } = await import('./configService');
  const { getConditionalSystemPrompt, buildConditionalPrompt } = await import('./conditionalFeynmanPrompt');

  const startTime = Date.now();

  try {
    // Get dynamic config limits (matching iOS lines 49-52)
    const feynmanConfig = await configService.getAIConfig('feynman');
    const { maxWords, maxCharacters } = feynmanConfig;

    // Basic content validation (matching iOS lines 55-67)
    onProgress?.(0.05, 'Analyzing content...');
    const cleanedContent = content.trim();
    if (!cleanedContent || cleanedContent.length < 10) {
      throw new Error('Content is blank or too short. Please provide meaningful text content.');
    }

    // Validate content limits (matching iOS lines 71-76)
    const contentLength = getContentLength(cleanedContent, language);
    const charCount = cleanedContent.length;

    if (charCount > maxCharacters) {
      throw new Error(
        `Your content has ${charCount.toLocaleString()} characters. Maximum allowed is ${maxCharacters.toLocaleString()} characters.`
      );
    }

    if (contentLength > maxWords) {
      throw new Error(
        `Your content has ${contentLength.toLocaleString()} words. Maximum allowed is ${maxWords.toLocaleString()} words.`
      );
    }

    onProgress?.(0.1, 'Preparing content...');
    onProgress?.(0.2, 'Building explanation framework...');

    // Build conditional prompt (matching iOS lines 83-87)
    const prompt = await buildConditionalPrompt(cleanedContent, title, language);

    onProgress?.(0.3, 'Generating study materials...');

    // Call chatCompletion (matching iOS lines 90-100)
    const aiContent = await chatCompletion({
      model: feynmanConfig.model,
      systemPrompt: await getConditionalSystemPrompt(),
      userPrompt: prompt,
      temperature: feynmanConfig.temperature,
      maxTokens: feynmanConfig.maxTokens,
      timeoutMs: feynmanConfig.timeoutMs,
    });

    onProgress?.(0.7, 'Processing AI response...');

    if (!aiContent) {
      throw new Error('AI processing failed to generate content. Please try again.');
    }

    onProgress?.(0.8, 'Extracting key concepts...');

    // Parse response (matching iOS lines 116)
    const parsedResult = parseFeynmanResponse(aiContent);

    onProgress?.(0.9, 'Building learning materials...');

    const processingTime = Date.now() - startTime;

    // Build result (matching iOS lines 123-136)
    const result: FeynmanResult = {
      ...parsedResult,
      processingMetadata: {
        confidence: calculateConfidence(cleanedContent, parsedResult, language),
        wordCount: contentLength,
        processingTime,
      },
    };

    onProgress?.(1.0, 'Study materials ready!');

    return result;
  } catch (error) {
    console.error('[Feynman] Error during processing:', error);
    throw error instanceof Error ? error : new Error('Failed to generate explanation. Please try again.');
  }
}

/**
 * Parse Feynman response from AI
 * Matching iOS lines 175-208
 */
function parseFeynmanResponse(
  response: string
): Omit<FeynmanResult, 'processingMetadata'> {
  try {
    if (!response || response.trim().length === 0) {
      throw new Error('Empty response from AI');
    }

    // Extract intent from first line (matching iOS lines 184)
    const { intent, cleanedResponse } = extractIntentFromResponse(response);

    return {
      feynmanExplanation: cleanedResponse.trim(),
      intent,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    console.error('Failed to process AI response:', errorMessage);
    throw new Error('Unable to process AI response. Please try again.');
  }
}

/**
 * Extract intent from response
 * Matching iOS lines 210-249
 */
function extractIntentFromResponse(response: string): {
  intent: 'Educational' | 'Comprehension' | 'Reference' | 'Analytical' | 'Procedural';
  cleanedResponse: string;
} {
  // AI outputs: "INTENT: Educational\n\n# Title\n..."
  const lines = response.split('\n');
  const firstLine = lines[0]?.trim();

  // Check if first line has intent in expected format
  const intentMatch = firstLine?.match(
    /^INTENT:\s*(Educational|Comprehension|Reference|Analytical|Procedural)$/i
  );

  if (intentMatch) {
    const detectedIntent = intentMatch[1];
    // Normalize to proper case
    const intent = (detectedIntent.charAt(0).toUpperCase() +
      detectedIntent.slice(1).toLowerCase()) as
      'Educational' | 'Comprehension' | 'Reference' | 'Analytical' | 'Procedural';

    // Remove the INTENT line and any following blank lines
    let startIndex = 1;
    while (startIndex < lines.length && lines[startIndex].trim() === '') {
      startIndex++;
    }

    const cleanedResponse = lines.slice(startIndex).join('\n');

    console.log(`[Feynman] Extracted intent: ${intent}`);
    return { intent, cleanedResponse };
  }

  // Fallback: If AI didn't output intent properly, default to Educational
  console.warn('[Feynman] Intent not found in expected format, defaulting to Educational');
  console.warn(`[Feynman] First line was: ${firstLine}`);

  return {
    intent: 'Educational',
    cleanedResponse: response,
  };
}

/**
 * Calculate confidence score
 * Matching iOS lines 251-267
 */
function calculateConfidence(
  originalContent: string,
  result: Omit<FeynmanResult, 'processingMetadata'>,
  language?: string
): number {
  let confidence = 0.5; // Base confidence

  // Increase confidence based on result completeness
  if (result.feynmanExplanation.length > 100) confidence += 0.3;

  // Adjust based on source content length (language-aware)
  const contentLength = getContentLength(originalContent, language);
  if (contentLength > 100) confidence += 0.1;
  if (contentLength > 500) confidence += 0.1;

  return Math.min(confidence, 1.0);
}

/**
 * Get content length (language-aware)
 * Matching iOS lines 273-279
 */
function getContentLength(content: string, language?: string): number {
  const cjkLanguages = ['zh', 'ja', 'ko', 'th'];
  if (language && cjkLanguages.includes(language)) {
    return content.length; // Character count for CJK
  }
  return content.split(/\s+/).filter(Boolean).length; // Word count for others
}
