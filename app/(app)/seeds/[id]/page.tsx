'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { seedsService } from '@/lib/api/seeds';
import { Seed } from '@/lib/supabase/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText,
  Image,
  Music,
  Video,
  Loader2,
  ArrowLeft,
  BookOpen,
  Brain,
  Trophy,
  Star,
  StarOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const CONTENT_TYPE_ICONS = {
  pdf: FileText,
  image: Image,
  audio: Music,
  video: Video,
  youtube: Video,
  text: FileText,
};

const CONTENT_TYPE_COLORS = {
  pdf: 'text-red-400',
  image: 'text-blue-400',
  audio: 'text-purple-400',
  video: 'text-green-400',
  youtube: 'text-red-500',
  text: 'text-gray-400',
};

export default function SeedDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [seed, setSeed] = useState<Seed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'content'>('summary');

  const seedId = params.id as string;

  useEffect(() => {
    if (user && seedId) {
      loadSeed();
    }
  }, [user, seedId]);

  const loadSeed = async () => {
    if (!user || !seedId) return;

    setIsLoading(true);
    setError(null);

    try {
      const seedData = await seedsService.getSeed(seedId, user.id);

      if (!seedData) {
        setError('Seed not found');
        return;
      }

      setSeed(seedData);
    } catch (err) {
      console.error('Error loading seed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load seed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStar = async () => {
    if (!seed) return;

    try {
      await seedsService.updateSeed(seed.id, {
        // TODO: Add is_starred to UpdateSeedParams
      });

      setSeed({
        ...seed,
        is_starred: !seed.is_starred,
      });
    } catch (err) {
      console.error('Error toggling star:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !seed) {
    return (
      <div className="space-y-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/seeds')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Seeds
        </Button>

        <div className="rounded-lg border border-red-500/20 bg-red-500/10 backdrop-blur-xl p-8">
          <div className="text-center">
            <p className="text-red-500 font-medium">
              {error || 'Seed not found'}
            </p>
            <Button
              onClick={() => router.push('/seeds')}
              variant="outline"
              className="mt-4"
            >
              Back to Seeds
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const Icon = CONTENT_TYPE_ICONS[seed.content_type];
  const iconColor = CONTENT_TYPE_COLORS[seed.content_type];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/seeds')}
          className="gap-2 flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <button
          onClick={handleToggleStar}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
        >
          {seed.is_starred ? (
            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
          ) : (
            <StarOff className="h-5 w-5 text-gray-400" />
          )}
        </button>
      </div>

      {/* Seed Info */}
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg bg-white/5 flex-shrink-0 ${iconColor}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white mb-1">
            {seed.title}
          </h1>
          {seed.exam_name && (
            <p className="text-sm text-gray-400">
              {seed.exam_name}
            </p>
          )}
        </div>
      </div>

      {/* Processing Status */}
      {seed.processing_status !== 'completed' && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 backdrop-blur-xl p-4">
          <p className="text-sm text-yellow-500">
            {seed.processing_status === 'pending' && 'Processing pending...'}
            {seed.processing_status === 'extracting' && 'Extracting content...'}
            {seed.processing_status === 'analyzing' && 'Analyzing content...'}
            {seed.processing_status === 'failed' && `Processing failed: ${seed.processing_error || 'Unknown error'}`}
          </p>
        </div>
      )}

      {/* Study Actions */}
      {seed.processing_status === 'completed' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => router.push(`/seeds/${seed.id}/flashcards`)}
            className="flex items-center gap-4 p-6 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-xl group"
          >
            <div className="p-3 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
              <Brain className="h-6 w-6 text-blue-400" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-white mb-1">Flashcards</h3>
              <p className="text-sm text-gray-400">
                Practice with spaced repetition
              </p>
            </div>
          </button>

          <button
            onClick={() => router.push(`/seeds/${seed.id}/quiz`)}
            className="flex items-center gap-4 p-6 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-xl group"
          >
            <div className="p-3 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
              <Trophy className="h-6 w-6 text-purple-400" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-white mb-1">Quiz</h3>
              <p className="text-sm text-gray-400">
                Test your knowledge
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Content Tabs */}
      {seed.processing_status === 'completed' && (
        <>
          <div className="flex gap-2 border-b border-white/10">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'summary'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'content'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Original Content
            </button>
          </div>

          {/* Content Display */}
          <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            {activeTab === 'summary' && seed.feynman_explanation && (
              <div className="prose prose-invert max-w-none">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-white m-0">
                    Feynman Explanation
                  </h3>
                </div>
                <div className="text-gray-300">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-white mt-6 mb-4" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-xl font-bold text-white mt-5 mb-3" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-white mt-4 mb-2" {...props} />,
                    p: ({node, ...props}) => <p className="text-gray-300 mb-4 leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-2" {...props} />,
                    li: ({node, ...props}) => <li className="text-gray-300" {...props} />,
                    strong: ({node, ...props}) => <strong className="text-white font-semibold" {...props} />,
                    em: ({node, ...props}) => <em className="text-gray-200 italic" {...props} />,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    code: ({node, inline, ...props}: any) =>
                      inline ? (
                        <code className="bg-white/10 text-primary px-1.5 py-0.5 rounded text-sm" {...props} />
                      ) : (
                        <code className="block bg-white/10 text-gray-200 p-4 rounded-lg my-4 overflow-x-auto" {...props} />
                      ),
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary pl-4 italic text-gray-400 my-4" {...props} />,
                  }}
                >
                  {seed.feynman_explanation}
                </ReactMarkdown>
                </div>
              </div>
            )}

            {activeTab === 'content' && seed.content_text && (
              <div className="text-gray-300 whitespace-pre-wrap">
                {seed.content_text}
              </div>
            )}

            {activeTab === 'summary' && !seed.feynman_explanation && (
              <p className="text-gray-400 text-center py-8">
                No summary available
              </p>
            )}

            {activeTab === 'content' && !seed.content_text && (
              <p className="text-gray-400 text-center py-8">
                No content available
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
