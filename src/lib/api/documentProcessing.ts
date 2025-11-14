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
export async function generateFeynman(
  content: string,
  title: string,
  language: string | undefined,
  accessToken: string,
  onProgress?: (progress: number, message: string) => void
): Promise<FeynmanResult> {
  if (!API_BASE_URL) {
    throw new Error('Backend URL not configured');
  }

  const url = `${API_BASE_URL}/api/ai/feynman`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      content,
      title,
      language,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Failed to generate explanation';

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
