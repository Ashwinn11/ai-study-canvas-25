import React from 'react';
import { cn } from '@/lib/utils';

interface ComparisonBadgeProps {
  currentScore: number;
  previousScore: number | null;
  className?: string;
}

export function ComparisonBadge({ currentScore, previousScore, className }: ComparisonBadgeProps) {
  if (previousScore === null || previousScore === undefined) {
    return null;
  }

  const delta = currentScore - previousScore;
  
  // Don't show badge if no change
  if (delta === 0) {
    return null;
  }

  const isImprovement = delta > 0;
  const absDelta = Math.abs(delta);

  return (
    <div
      className={cn(
        'absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold shadow-lg',
        isImprovement
          ? 'bg-green-500/90 text-white border-2 border-green-400'
          : 'bg-red-500/90 text-white border-2 border-red-400',
        className
      )}
    >
      {isImprovement ? '↑' : '↓'}{absDelta}%
    </div>
  );
}
