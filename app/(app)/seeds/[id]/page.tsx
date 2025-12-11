
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { seedsService } from '@/lib/api/seedsService';
import { Seed } from '@/types';
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
  Send,
  ArrowUpRight,
  Lightbulb,
  Gamepad2,
  BookOpenCheck,
  Trash2,
  X,
  MessageCircle,
  Mic
} from 'lucide-react';
import { useChat, ExplanationMode } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

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

const EXPLANATION_MODES: Array<{ mode: ExplanationMode; label: string }> = [
  { mode: 'simple', label: 'Simple' },
  { mode: 'analogy', label: 'Analogy' },
  { mode: 'technical', label: 'Technical' },
  { mode: 'fun', label: 'Fun' },
];

const SUGGESTED_QUESTIONS_BY_MODE: Record<ExplanationMode, string[]> = {
  simple: [
    'Can you explain this in simpler terms?',
    'What are the key concepts here?',
    'Can you give me an example?',
  ],
  analogy: [
    'What is this similar to in real life?',
    'Can you give me an analogy for this?',
    'How is this like something I already know?',
  ],
  technical: [
    'What are the precise definitions?',
    'How does this work under the hood?',
    'What are the technical details?',
  ],
  fun: [
    'Tell me a fun fact about this!',
    "Explain this like I'm 5 years old",
    'Make a joke about this topic',
  ],
};

export default function SeedDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [seed, setSeed] = useState<Seed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'content'>('summary');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);



  const seedId = params.id as string;

  const loadSeed = useCallback(async () => {
    if (!user || !seedId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { seed: seedData, error: seedError } = await seedsService.getSeed(seedId);

      if (seedError || !seedData) {
        setError(seedError || 'Seed not found');
        return;
      }

      setSeed(seedData);
    } catch (err) {
      console.error('Error loading seed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load seed');
    } finally {
      setIsLoading(false);
    }
  }, [user, seedId]);

  useEffect(() => {
    if (user && seedId) {
      loadSeed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, seedId]);

  const handleDeleteSeed = useCallback(async () => {
    setShowDeleteDialog(true);
  }, []);

  const confirmDeleteSeed = useCallback(async () => {
    if (!seed) return;

    const { error } = await seedsService.deleteSeed(seed.id);
    if (error) {
      console.error(error);
      return;
    }

    router.push('/seeds');
  }, [seed, router]);

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

  const Icon = CONTENT_TYPE_ICONS[seed.content_type] || FileText;
  const iconColor = CONTENT_TYPE_COLORS[seed.content_type] || 'text-gray-400';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/seeds')}
          className="gap-2 flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDeleteSeed}
            className="p-2 rounded-lg hover:bg-red-500/10 transition-colors flex-shrink-0"
            title="Delete seed"
          >
            <Trash2 className="h-5 w-5 text-red-400" />
          </button>
        </div>
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push(`/seeds/${seed.id}/flashcards`)}
              className="flex items-center gap-4 p-6 rounded-lg border-2 transition-colors shadow-lg group"
              style={{ backgroundColor: '#b8e0d2', borderColor: '#b8e0d2' }}
            >
              <div className="p-3 rounded-lg transition-colors" style={{ backgroundColor: '#2d6a56' }}>
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-black mb-1">Flashcards</h3>
                <p className="text-sm text-black">
                  Practice with spaced repetition
                </p>
              </div>
            </button>

            <button
              onClick={() => router.push(`/seeds/${seed.id}/quiz`)}
              className="flex items-center gap-4 p-6 rounded-lg border-2 transition-colors shadow-lg group"
              style={{ backgroundColor: '#eac4d0', borderColor: '#eac4d0' }}
            >
              <div className="p-3 rounded-lg transition-colors" style={{ backgroundColor: '#c68399' }}>
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-black mb-1">Quiz</h3>
                <p className="text-sm text-black">
                  Test your knowledge
                </p>
              </div>
            </button>
          </div>
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



      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteSeed}
        title="Delete Material"
        description={`Are you sure you want to delete "${seed?.title}"? This will remove all associated study materials.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
