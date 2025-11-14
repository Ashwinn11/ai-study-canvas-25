import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Seeds - Masterly',
  description: 'Your study materials',
};

export default function SeedsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">My Seeds</h1>
        <p className="mt-2 text-gray-400">
          All your uploaded study materials
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-8">
        <div className="text-center text-gray-400">
          <p>No seeds yet</p>
          <p className="text-sm mt-2">Upload your first study material to get started!</p>
        </div>
      </div>
    </div>
  );
}
