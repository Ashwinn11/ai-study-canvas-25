'use client';

import { XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: string | null;
  onRetry?: () => void;
}

export function UploadErrorModal({ isOpen, onClose, error, onRetry }: UploadErrorModalProps) {
  if (!isOpen || !error) return null;

  // Determine if this is a user-fixable error that should show retry
  const isRetryable = !error.includes('Not authenticated') && 
                      !error.includes('Authentication required');

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <XCircle className="h-6 w-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white mb-2">Upload Failed</h2>
            <p className="text-gray-300 text-sm leading-relaxed">{error}</p>
          </div>
        </div>

        {/* Helpful tips based on error type */}
        {(error.includes('Unsupported') || error.includes('UNSUPPORTED_FORMAT')) && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-100 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Supported formats:</p>
              <p className="text-xs">PDF, DOC, DOCX, TXT, JPG, PNG, GIF, BMP, WEBP, MP3, WAV, M4A, AAC, OGG, FLAC</p>
            </div>
          </div>
        )}

        {error.includes('No text detected') && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-100 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>Try using a clearer image with better lighting and readable text.</p>
          </div>
        )}

        {(error.includes('Too short') || error.includes('Too little text')) && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-100 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>Please provide more content (at least 20 words) for better study materials.</p>
          </div>
        )}

        {error.includes('Maximum allowed') && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-100 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>Try splitting your content into smaller sections or compress your file.</p>
          </div>
        )}

        {(error.includes('NO_CAPTIONS') || error.includes('No captions found')) && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-100 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">This video doesn't have captions available.</p>
              <p className="text-xs">Try a different video or enable captions on your YouTube video.</p>
            </div>
          </div>
        )}

        {error.includes('Invalid YouTube URL') && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-100 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>Please provide a valid YouTube video URL (e.g., https://www.youtube.com/watch?v=...)</p>
          </div>
        )}

        {(error.includes('No speech detected') || error.includes('Failed to transcribe')) && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-100 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Audio transcription failed</p>
              <p className="text-xs">Make sure your audio is clear and contains speech. Background noise may affect quality.</p>
            </div>
          </div>
        )}

        {(error.includes('AI processing failed') || error.includes('Unable to process AI response')) && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-100 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>Our AI service is temporarily unavailable. Please try again in a moment.</p>
          </div>
        )}

        {(error.includes('Backend URL not configured') || error.includes('Server configuration error')) && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-100 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>Service configuration error. Please contact support if this persists.</p>
          </div>
        )}

        {error.includes('Failed to create initial seed') && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-100 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>Database error. Please check your connection and try again.</p>
          </div>
        )}

        <div className="flex gap-3">
          {isRetryable && onRetry && (
            <Button
              onClick={() => {
                onClose();
                onRetry();
              }}
              variant="default"
              className="flex-1"
            >
              Try Again
            </Button>
          )}
          <Button
            onClick={onClose}
            variant={isRetryable ? "outline" : "default"}
            className={isRetryable ? "flex-1" : "w-full"}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
