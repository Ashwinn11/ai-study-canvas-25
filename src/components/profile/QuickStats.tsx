import { Flame, Book, Award } from 'lucide-react';

interface QuickStatsProps {
  currentStreak: number;
  cardsReviewed: number;
  averageGrade: string;
}

export function QuickStats({
  currentStreak,
  cardsReviewed,
  averageGrade,
}: QuickStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Streak */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col items-center justify-center min-h-[100px]">
        <Flame className="h-6 w-6 text-red-400 mb-2" />
        <div className="text-2xl font-bold text-white">{currentStreak}</div>
        <div className="text-xs text-gray-400 text-center mt-1">Day Streak</div>
      </div>

      {/* Cards Reviewed */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col items-center justify-center min-h-[100px]">
        <Book className="h-6 w-6 text-blue-400 mb-2" />
        <div className="text-2xl font-bold text-white">{cardsReviewed}</div>
        <div className="text-xs text-gray-400 text-center mt-1">Reviewed</div>
      </div>

      {/* Average Grade */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col items-center justify-center min-h-[100px]">
        <Award className="h-6 w-6 text-purple-400 mb-2" />
        <div className="text-2xl font-bold text-white">{averageGrade || '-'}</div>
        <div className="text-xs text-gray-400 text-center mt-1">Avg Grade</div>
      </div>
    </div>
  );
}
