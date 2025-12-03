'use client';

import { useRef, useCallback } from 'react';

interface UseFilePickerOptions {
  accept?: string;
  multiple?: boolean;
  onSelect?: (files: File[]) => void;
  onError?: (error: Error) => void;
}

export function useFilePicker(options: UseFilePickerOptions = {}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      if (files.length === 0) {
        return;
      }

      try {
        options.onSelect?.(files);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('File selection failed');
        options.onError?.(err);
      }

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [options]
  );

  return {
    openPicker,
    input: (
      <input
        ref={inputRef}
        type="file"
        accept={options.accept || '*/*'}
        multiple={options.multiple || false}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    ),
  };
}