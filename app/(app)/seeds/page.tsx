
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { seedsService } from '@/lib/api/seedsService';
import { Seed } from '@/types';
import { FileText, Image, Music, Video, Loader2, Upload as UploadIcon, Trash2, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { toast } from 'sonner';

const CONTENT_TYPE_ICONS = {
  pdf: FileText,
  image: Image,
  audio: Music,
  video: Video,
  text: FileText,
  youtube: Youtube,
};

const CONTENT_TYPE_COLORS = {
  pdf: 'text-red-400',
  image: 'text-blue-400',
  audio: 'text-purple-400',
  video: 'text-green-400',
  text: 'text-gray-400',
  youtube: 'text-red-500',
};

export default function SeedsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  const loadSeeds = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { seeds: userSeeds, error: err } = await seedsService.getSeeds();
      if (err) {
        throw new Error(err);
      }
      setSeeds(userSeeds || []);
    } catch (err) {
      console.error('Error loading seeds:', err);
      setError(err instanceof Error ? err.message : 'Failed to load seeds');
    } finally {
      setIsLoading(false);
     }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSeeds();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    }
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
    if (diffInSeconds < 2592000) {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks}w ago`;
    }
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months}mo ago`;
  };

  const handleDeleteSeed = async (seedId: string, seedTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ id: seedId, title: seedTitle });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    // Store the seed for potential revert
    const seedToDelete = seeds.find(s => s.id === deleteConfirm.id);

    // Optimistic update - remove from UI immediately
    const previousSeeds = seeds;
    setSeeds(seeds.filter(s => s.id !== deleteConfirm.id));
    toast.success('Seed deleted successfully');

    try {
      // Delete in background
      await seedsService.deleteSeed(deleteConfirm.id);
    } catch (err) {
      // Revert on error
      console.error('Error deleting seed:', err);
      setSeeds(previousSeeds);
      toast.error('Failed to delete seed', {
        description: err instanceof Error ? err.message : 'An error occurred',
      });
    } finally {
      setDeleteConfirm(null);
    }
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
        <div className="space-y-3">
          {seeds.map((seed) => {
            const Icon = CONTENT_TYPE_ICONS[seed.content_type] || FileText;
            const iconColor = CONTENT_TYPE_COLORS[seed.content_type] || 'text-gray-400';

            return (
              <div
                key={seed.id}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-4 hover:bg-white/10 transition-all duration-200 cursor-pointer max-w-full active:scale-[0.98] hover:scale-[1.01]"
                onClick={() => router.push(`/seeds/${seed.id}`)}
              >
                <div className={`p-2 rounded-lg bg-white/5 flex-shrink-0 ${iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-white truncate">
                    {seed.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <span>{formatTimeAgo(seed.created_at)}</span>
                    {seed.exam_name && (
                      <>
                        <span>•</span>
                        <span className="truncate">{seed.exam_name}</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => handleDeleteSeed(seed.id, seed.title, e)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                  aria-label="Delete seed"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Delete Seed?"
        description={`Are you sure you want to delete "${deleteConfirm?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
