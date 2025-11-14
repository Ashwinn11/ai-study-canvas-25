'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { seedsService } from '@/lib/api/seeds';
import { Seed } from '@/lib/supabase/types';
import { FileText, Image, Music, Video, Loader2, Upload as UploadIcon, Star, Archive, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CONTENT_TYPE_ICONS = {
  pdf: FileText,
  image: Image,
  audio: Music,
  video: Video,
  text: FileText,
};

const CONTENT_TYPE_COLORS = {
  pdf: 'text-red-400',
  image: 'text-blue-400',
  audio: 'text-purple-400',
  video: 'text-green-400',
  text: 'text-gray-400',
};

export default function SeedsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSeeds();
    }
  }, [user]);

  const loadSeeds = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const userSeeds = await seedsService.getUserSeeds(user.id);
      setSeeds(userSeeds);
    } catch (err) {
      console.error('Error loading seeds:', err);
      setError(err instanceof Error ? err.message : 'Failed to load seeds');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const getStatusBadge = (status?: string) => {
    const statusColors = {
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      extracting: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      analyzing: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      completed: 'bg-green-500/10 text-green-500 border-green-500/20',
      failed: 'bg-red-500/10 text-red-500 border-red-500/20',
    };

    const color = status ? statusColors[status as keyof typeof statusColors] : statusColors.completed;
    const label = status || 'completed';

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${color}`}>
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading your study materials...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">My Seeds</h1>
          <p className="mt-2 text-gray-400">
            All your uploaded study materials
          </p>
        </div>

        <div className="rounded-lg border border-red-500/20 bg-red-500/10 backdrop-blur-xl p-8">
          <div className="text-center">
            <p className="text-red-500 font-medium">Failed to load seeds</p>
            <p className="text-sm text-gray-400 mt-2">{error}</p>
            <Button
              onClick={loadSeeds}
              variant="outline"
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My Seeds</h1>
          <p className="mt-2 text-gray-400">
            {seeds.length === 0
              ? 'No study materials yet'
              : `${seeds.length} study ${seeds.length === 1 ? 'material' : 'materials'}`}
          </p>
        </div>
        <Button onClick={() => router.push('/upload')}>
          <UploadIcon className="h-4 w-4 mr-2" />
          Upload New
        </Button>
      </div>

      {seeds.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-12">
          <div className="text-center space-y-4">
            <FileText className="h-16 w-16 text-gray-500 mx-auto" />
            <div>
              <p className="text-lg font-medium text-white">No seeds yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Upload your first study material to get started!
              </p>
            </div>
            <Button onClick={() => router.push('/upload')}>
              <UploadIcon className="h-4 w-4 mr-2" />
              Upload Now
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {seeds.map((seed) => {
            const Icon = CONTENT_TYPE_ICONS[seed.content_type];
            const iconColor = CONTENT_TYPE_COLORS[seed.content_type];

            return (
              <div
                key={seed.id}
                className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-6 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => {
                  // TODO: Navigate to seed detail page
                  console.log('Seed clicked:', seed.id);
                }}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg bg-white/5 ${iconColor}`}>
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {seed.title}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {formatDate(seed.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(seed.processing_status)}
                        {seed.is_starred && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                    </div>

                    {seed.feynman_explanation && (
                      <p className="text-sm text-gray-300 mt-3 line-clamp-2">
                        {seed.feynman_explanation.substring(0, 200)}...
                      </p>
                    )}

                    {seed.processing_error && (
                      <p className="text-sm text-red-400 mt-2">
                        Error: {seed.processing_error}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                      <span className="capitalize">{seed.content_type}</span>
                      {seed.intent && (
                        <>
                          <span>•</span>
                          <span>{seed.intent}</span>
                        </>
                      )}
                      {seed.language_code && seed.language_code !== 'en' && (
                        <>
                          <span>•</span>
                          <span>{seed.language_code.toUpperCase()}</span>
                        </>
                      )}
                      {seed.confidence_score && (
                        <>
                          <span>•</span>
                          <span>
                            {Math.round(seed.confidence_score * 100)}% confidence
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
