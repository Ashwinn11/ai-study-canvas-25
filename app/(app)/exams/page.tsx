import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Exams - Masterly',
  description: 'Organize your study materials',
};

export default function ExamsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">My Exams</h1>
        <p className="mt-2 text-gray-400">
          Organize your study materials by subject or exam
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-8">
        <div className="text-center text-gray-400">
          <p>No exams created yet</p>
          <p className="text-sm mt-2">Create your first exam to organize your materials!</p>
        </div>
      </div>
    </div>
  );
}
