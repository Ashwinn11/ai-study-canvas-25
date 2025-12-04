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
  Sparkles,
  ArrowUpRight,
  Lightbulb,
  Gamepad2,
  BookOpenCheck,
  Trash2,
  X
} from 'lucide-react';
import { useChat, ExplanationMode } from '@/hooks/useChat';
import { brainBotService } from '@/lib/api/brainBotService';
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
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>('simple');
  const { messages, isLoading: chatLoading, error: chatError, sendMessage } = useChat({
    seedTitle: seed?.title,
    seedContent: seed?.feynman_explanation || seed?.content_text || undefined,
    explanationMode,
  });
  const [chatInput, setChatInput] = useState('');
  const [showVibeCheck, setShowVibeCheck] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isBrainBotOpen, setIsBrainBotOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const suggestedQuestions = useMemo(() => SUGGESTED_QUESTIONS_BY_MODE[explanationMode], [explanationMode]);
  const messageCount = messages.length;

  useEffect(() => {
    if (!showQuickActions && messageCount >= 4) {
      setShowQuickActions(true);
    }
  }, [messageCount, showQuickActions]);

  useEffect(() => {
    if (messageCount === 0) {
      setShowVibeCheck(false);
      setShowQuickActions(false);
    }
  }, [messageCount]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleSuggestedQuestion = (question: string) => {
    setChatInput(question);
  };

  const handleExplanationModeChange = (mode: ExplanationMode) => {
    setExplanationMode(mode);
    setShowVibeCheck(false);
  };

  const handleSend = async () => {
    if (!chatInput.trim() || chatLoading) {
      return;
    }

    const trimmed = chatInput.trim();

    if (brainBotService.detectStress(trimmed)) {
      setShowVibeCheck(true);
    }

    setChatInput('');
    await sendMessage(trimmed);
  };

  const handleCloseBrainBot = () => {
    setIsBrainBotOpen(false);
  };

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
  }, [user, seedId, loadSeed]);

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
              className="flex items-center gap-4 p-6 rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 hover:from-purple-200 hover:via-pink-200 hover:to-blue-200 transition-colors shadow-lg group"
            >
              <div className="p-3 rounded-lg bg-purple-400 group-hover:bg-purple-500 transition-colors">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-800 mb-1">Flashcards</h3>
                <p className="text-sm text-gray-600">
                  Practice with spaced repetition
                </p>
              </div>
            </button>

            <button
              onClick={() => router.push(`/seeds/${seed.id}/quiz`)}
              className="flex items-center gap-4 p-6 rounded-lg border-2 border-blue-300 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 hover:from-blue-200 hover:via-purple-200 hover:to-pink-200 transition-colors shadow-lg group"
            >
              <div className="p-3 rounded-lg bg-blue-400 group-hover:bg-blue-500 transition-colors">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-800 mb-1">Quiz</h3>
                <p className="text-sm text-gray-600">
                  Test your knowledge
                </p>
              </div>
            </button>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setIsBrainBotOpen(true)}
              disabled={!seed.feynman_explanation}
              className="flex items-center gap-4 p-6 rounded-xl border-2 border-pink-300 bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 transition-colors shadow-lg hover:border-pink-400 hover:from-pink-200 hover:via-purple-200 hover:to-blue-200 disabled:opacity-60 disabled:cursor-not-allowed w-full max-w-md"
            >
              <div className="p-3 rounded-lg bg-gradient-to-br from-pink-300 to-purple-300">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-800 mb-1">Ask BrainBot</h3>
                <p className="text-sm text-gray-600">
                  Chat about this material in real time
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

      {isBrainBotOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl h-[85vh] rounded-3xl border border-white/10 bg-[rgba(15,15,25,0.95)] shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">BrainBot</p>
                <h3 className="text-xl font-semibold text-white">Study assistant for {seed.title}</h3>
              </div>
              <button
                onClick={handleCloseBrainBot}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-300"
                aria-label="Close BrainBot"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden p-6 flex flex-col">
              <div className="flex items-center gap-3 border border-white/10 rounded-2xl px-3 py-2 mb-4">
                <span className="text-xs font-semibold bg-primary/20 text-primary px-2 py-1 rounded-full">Mode</span>
                {EXPLANATION_MODES.map(({ mode, label }) => (
                  <button
                    key={mode}
                    onClick={() => handleExplanationModeChange(mode)}
                    className={`rounded-full px-3 py-1 text-sm transition-colors ${
                      explanationMode === mode
                        ? 'bg-white text-slate-900 font-semibold'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center text-center gap-5 py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <div className="max-w-xl space-y-2">
                      <h3 className="text-xl font-semibold text-white">Hi! I'm BrainBot</h3>
                      <p className="text-gray-400">
                        Ask me anything about this study material and I'll tailor the explanation style to what you need.
                      </p>
                    </div>
                    <div className="w-full max-w-xl space-y-2 text-left">
                      <p className="text-sm text-gray-400">Suggested questions:</p>
                      {suggestedQuestions.map((question) => (
                        <button
                          key={question}
                          onClick={() => handleSuggestedQuestion(question)}
                          className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-gray-200 transition-colors hover:border-primary/60 hover:text-white"
                        >
                          <span className="flex-1">{question}</span>
                          <ArrowUpRight className="h-4 w-4 text-primary" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.length > 0 && (
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                              isUser
                                ? 'bg-gradient-to-r from-primary/80 to-primary text-white shadow-lg shadow-primary/20'
                                : 'border border-white/10 bg-white/10 text-gray-100'
                            }`}
                          >
                            <div className="prose prose-invert prose-sm max-w-none">
                              {isUser ? (
                                <p className="whitespace-pre-wrap leading-relaxed text-white">{msg.content}</p>
                              ) : (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    p: (props) => (
                                      <p className="leading-relaxed text-gray-200" {...props} />
                                    ),
                                    strong: (props) => (
                                      <strong className="text-white" {...props} />
                                    ),
                                    em: (props) => (
                                      <em className="text-gray-300" {...props} />
                                    ),
                                    ul: (props) => (
                                      <ul className="list-disc list-inside space-y-1 text-gray-200" {...props} />
                                    ),
                                    ol: (props) => (
                                      <ol className="list-decimal list-inside space-y-1 text-gray-200" {...props} />
                                    ),
                                    li: (props) => <li className="leading-relaxed" {...props} />,
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    code: ({ inline, ...props }: any) =>
                                      inline ? (
                                        <code className="rounded bg-white/20 px-1.5 py-0.5 text-xs" {...props} />
                                      ) : (
                                        <code className="block whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-xs" {...props} />
                                      ),
                                  }}
                                >
                                  {msg.content}
                                </ReactMarkdown>
                              )}
                            </div>
                            <span
                              className={`mt-2 block text-[11px] ${
                                isUser ? 'text-white/80' : 'text-gray-400'
                              }`}
                            >
                              {formatTimestamp(msg.timestamp)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-gray-200">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-primary/80" />
                      <span className="h-2 w-2 animate-pulse rounded-full bg-primary/60" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 animate-pulse rounded-full bg-primary/40" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}

                {chatError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {chatError}
                  </div>
                )}

                {showVibeCheck && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
                    <div className="flex items-center gap-2 font-semibold text-amber-200">
                      <Lightbulb className="h-4 w-4" />
                      <span>Feeling stuck? Let's make this easier.</span>
                    </div>
                    <p className="mt-2 text-amber-100/90">
                      Switch to a simpler explanation or try another activity to reinforce the material.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          handleExplanationModeChange('simple');
                          setChatInput('Can you explain this more simply?');
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-300/60 bg-white/5 px-3 py-2 text-sm text-amber-100 transition-colors hover:bg-amber-500/20"
                      >
                        <Lightbulb className="h-4 w-4" />
                        Simplify it
                      </button>
                      <button
                        onClick={() => {
                          setIsBrainBotOpen(false);
                          router.push(`/seeds/${seed?.id}/quiz`);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/20 px-3 py-2 text-sm text-white transition-colors hover:bg-primary/30"
                      >
                        <Gamepad2 className="h-4 w-4" />
                        Try a quiz
                      </button>
                      <button
                        onClick={() => {
                          setIsBrainBotOpen(false);
                          router.push(`/seeds/${seed?.id}/flashcards`);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-white transition-colors hover:bg-primary/20"
                      >
                        <BookOpenCheck className="h-4 w-4" />
                        Review flashcards
                      </button>
                      <button
                        onClick={() => setShowVibeCheck(false)}
                        className="ml-auto text-sm text-amber-200/80 transition-colors hover:text-amber-100"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                {showQuickActions && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-50">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-semibold">Ready to test yourself?</span>
                      <button
                        onClick={() => setShowQuickActions(false)}
                        className="text-xs text-emerald-200/80 transition-colors hover:text-emerald-100"
                      >
                        Dismiss
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        onClick={() => {
                          setIsBrainBotOpen(false);
                          router.push(`/seeds/${seed?.id}/quiz`);
                        }}
                        className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500/90"
                      >
                        <Gamepad2 className="h-4 w-4" />
                        Quick Quiz
                      </button>
                      <button
                        onClick={() => {
                          setIsBrainBotOpen(false);
                          router.push(`/seeds/${seed?.id}/flashcards`);
                        }}
                        className="flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-50 transition-colors hover:bg-emerald-500/30"
                      >
                        <BookOpenCheck className="h-4 w-4" />
                        Practice Cards
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="flex items-end gap-3">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ask BrainBot a question..."
                    rows={1}
                    className="flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={handleSend}
                    disabled={chatLoading || !chatInput.trim()}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/90 disabled:bg-primary/40"
                  >
                    {chatLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
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
