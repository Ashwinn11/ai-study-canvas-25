import { ServiceError } from './serviceError';
import { fetchWithTimeout } from './timeoutUtils';
import { supabase } from './supabaseClient';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '';

function getBaseUrl(): string {
  if (!BASE_URL) {
    throw new ServiceError(
      'Backend URL not configured',
      'documentExtractClient',
      'BACKEND_NOT_CONFIGURED',
      'Document extraction requires server configuration.',
      false
    );
  }
  return BASE_URL.replace(/\/$/, '');
}

/**
 * Extract text from DOC/DOCX/TXT files using backend service.
 *
 * @param contentBase64 - Base64-encoded document content
 * @param mimeType - Document MIME type (e.g., 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
 */
export async function extractDocument(
  contentBase64: string,
  mimeType: string
) {
  // Get user session for JWT auth
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new ServiceError(
      'Not authenticated',
      'documentExtractClient',
      'AUTH_FAILED',
      'You must be logged in to extract documents',
      false
    );
  }

  const url = `${getBaseUrl()}/api/document/extract`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
  const resp = await fetchWithTimeout(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ contentBase64, mimeType })
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    let errorResponse: any = null;
    let errorCode = 'DOCUMENT_EXTRACT_FAILED';
    let userMessage = 'Unable to extract text from this document. Please try again later.';
    let shouldRetry = true;

    // Try to parse JSON error response from backend
    try {
      errorResponse = JSON.parse(text);

      // Use backend's error code if available
      if (errorResponse.error) {
        errorCode = errorResponse.error;
      }

      // Use backend's specific error message if available
      if (errorResponse.message) {
        userMessage = errorResponse.message;
      } else if (errorResponse.details) {
        // Check if error details contain useful information
        const details = errorResponse.details.toLowerCase();
        if (details.includes('too large') || details.includes('character limit')) {
          userMessage = 'Document is too large. Please split it into smaller files.';
          shouldRetry = false;
        } else if (details.includes('format') || details.includes('corrupt')) {
          userMessage = 'Document format not supported or file is corrupted. Try converting to DOCX or TXT.';
          shouldRetry = false;
        } else if (details.includes('empty')) {
          userMessage = 'Document appears to be empty. Please check the file and try again.';
          shouldRetry = false;
        } else {
          // Use details if they're short enough
          if (errorResponse.details.length < 200) {
            userMessage = errorResponse.details;
          }
        }
      }
    } catch (parseError) {
      // If JSON parsing fails, use the raw text or default message
      if (text && text.length < 200) {
        userMessage = text;
      }
    }

    throw new ServiceError(
      `Document extraction failed: ${resp.status} ${text}`,
      'documentExtractClient',
      errorCode,
      userMessage,
      shouldRetry
    );
  }

  return resp.json();
}
