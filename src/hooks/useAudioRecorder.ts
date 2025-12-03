'use client';

import { useState, useCallback } from 'react';
import { audioRecorder } from '@/lib/api/audioRecorder';

interface UseAudioRecorderOptions {
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onError?: (error: Error) => void;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported] = useState(() => audioRecorder.isSupported());
  const [error, setError] = useState<Error | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      await audioRecorder.startRecording();
      setIsRecording(true);
      options.onRecordingStart?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start recording');
      setError(error);
      options.onError?.(error);
    }
  }, [options]);

  const stopRecording = useCallback(async () => {
    try {
      setError(null);
      const result = await audioRecorder.stopRecording();
      setIsRecording(false);
      options.onRecordingStop?.();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to stop recording');
      setError(error);
      options.onError?.(error);
      throw error;
    }
  }, [options]);

  const cancelRecording = useCallback(() => {
    audioRecorder.cancelRecording();
    setIsRecording(false);
    setError(null);
  }, []);

  return {
    isRecording,
    isSupported,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
