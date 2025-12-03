import { ServiceError } from "./serviceError";
import { fetchWithTimeout } from './timeoutUtils';
import { recordEvent, recordError } from "@/utils/telemetry";
import { supabase } from "./supabaseClient";
import { configService } from "./configService";
import { API_ENDPOINTS } from "@/constants/config";

const DEFAULT_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";

export async function processPdfViaBackend(
  base64Data: string,
  mimeType: string,
) {
  if (!DEFAULT_BASE_URL) {
    throw new ServiceError(
      "Backend URL not configured for Document AI",
      "documentAiClient",
      "BACKEND_NOT_CONFIGURED",
      "PDF processing requires server configuration. Please contact support.",
      false,
    );
  }

  // Get user session for JWT auth
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new ServiceError(
      "Not authenticated",
      "documentAiClient",
      "AUTH_FAILED",
      "You must be logged in to process PDFs",
      false,
    );
  }

  const url = `${DEFAULT_BASE_URL.replace(/\/$/, "")}${API_ENDPOINTS.DOCUMENT_AI_PROCESS}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };

  const startTime = Date.now();

  try {
    // Get dynamic timeout from backend config
    const timeout = await configService.getTimeout("documentAi");

    const resp = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ contentBase64: base64Data, mimeType }),
      },
      timeout,
    );

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      let errorResponse: any = null;
      let errorCode = "DOCAI_BACKEND_ERROR";
      let userMessage =
        "Unable to process this document right now. Please try again later.";
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
          shouldRetry = false; // Backend-provided messages are usually non-retryable
        }

        // Handle specific error codes
        if (errorCode === "DOCUMENT_TOO_LARGE") {
          shouldRetry = false;
          // Backend message already includes page count details
        } else if (errorCode === "DOCUMENT_TOO_LARGE_FOR_AI") {
          shouldRetry = false;
          // Backend message includes estimated character count and recommended pages
        }
      } catch (parseError) {
        // If JSON parsing fails, use the raw text or default message
        if (text && text.length < 200) {
          userMessage = text;
        }
      }

      const error = new ServiceError(
        `Document OCR failed: ${resp.status} ${text}`,
        "documentAiClient",
        errorCode,
        userMessage,
        shouldRetry,
      );

      recordError("documentai_ocr_failed", error, {
        mimeType,
        statusCode: resp.status,
        errorCode,
        duration: Date.now() - startTime,
      });

      throw error;
    }

    const data = await resp.json();
    const duration = Date.now() - startTime;

    recordEvent("documentai_ocr_success", {
      mimeType,
      textLength: data.text?.length || 0,
      source: data.metadata?.source,
      language: data.metadata?.language,
      pageCount: data.metadata?.pageCount,
      duration,
    });

    return {
      text: data.text as string,
      metadata: data.metadata || { source: "document_ai" },
    };
  } catch (error) {
    if (error instanceof ServiceError) {
      throw error;
    }

    const wrappedError = new ServiceError(
      "Document AI request failed",
      "documentAiClient",
      "DOCAI_REQUEST_FAILED",
      "Unable to process this document. Please try again.",
      true,
      error instanceof Error ? error : undefined,
    );

    recordError("documentai_request_failed", wrappedError, {
      mimeType,
      duration: Date.now() - startTime,
    });

    throw wrappedError;
  }
}
