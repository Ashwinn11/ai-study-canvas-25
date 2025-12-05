'use client';

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadLimitModal({ isOpen, onClose }: UploadLimitModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0" />
          <h2 className="text-lg font-semibold text-white">Free uploads limit reached</h2>
        </div>

        <p className="text-gray-300">
          You've used all 3 free uploads. Subscription plans coming soon to get unlimited uploads!
        </p>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-100">
          Keep learning and studying! We'll notify you when subscription plans are available.
        </div>

        <Button
          onClick={onClose}
          variant="default"
          className="w-full"
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
