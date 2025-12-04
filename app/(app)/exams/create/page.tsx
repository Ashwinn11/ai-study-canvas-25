'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { examsService } from '@/lib/api/examsService';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ArrowLeft, Loader2, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Seed {
  id: string;
  title: string;
  content_type: string;
  created_at: string;
  processing_status: string;
  exam_names?: string[]; // Names of exams this seed is already associated with
}

export default function CreateExamPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [subjectName, setSubjectName] = useState('');
  const [selectedSeedIds, setSelectedSeedIds] = useState<Set<string>>(new Set());
  const [availableSeeds, setAvailableSeeds] = useState<Seed[]>([]);
  const [loadingSeeds, setLoadingSeeds] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSeeds = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('seeds')
        .select(`
          id,
          title,
          content_type,
          created_at,
          processing_status,
          exam_seeds (
            exams (
              subject_name
            )
          )
        `)
        .eq('user_id', user?.id || '')
        .eq('processing_status', 'completed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading seeds:', error);
        setError('Failed to load study materials');
        return;
      }

      // Transform data to include exam_names
      const seedsWithExamNames = (data || []).map((seed: any) => {
        const examNames = seed.exam_seeds
          ?.map((es: any) => es.exams?.subject_name)
          .filter(Boolean) || [];
        return {
          id: seed.id,
          title: seed.title,
          content_type: seed.content_type,
          created_at: seed.created_at,
          processing_status: seed.processing_status,
          exam_names: examNames,
        };
      });

      setAvailableSeeds(seedsWithExamNames);
    } catch (err) {
      console.error('Error loading seeds:', err);
      setError('Failed to load study materials');
    } finally {
       setLoadingSeeds(false);
     }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSeeds();
    }
  }, [user, loadSeeds]);

  const isSeedDisabled = (seed: Seed): boolean => {
    // Seed is disabled if it's processing or already associated with another exam
    const isProcessing =
      seed.processing_status !== 'completed' &&
      seed.processing_status !== 'failed';
    const hasOtherExams = !!(seed.exam_names && seed.exam_names.length > 0);
    return isProcessing || hasOtherExams;
  };

  const handleToggleSeed = (seedId: string) => {
    const seed = availableSeeds.find(s => s.id === seedId);
    if (!seed || isSeedDisabled(seed)) return;

    const newSelected = new Set(selectedSeedIds);
    if (newSelected.has(seedId)) {
      newSelected.delete(seedId);
    } else {
      newSelected.add(seedId);
    }
    setSelectedSeedIds(newSelected);
  };

  const handleCreate = async () => {
    if (!subjectName.trim()) {
      setError('Please enter a subject name for your exam');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      // Create exam
      const { exam, error: examError } = await examsService.createExam({
        subject_name: subjectName.trim(),
      });

      if (examError || !exam) {
        setError(examError || 'Failed to create exam');
        return;
      }

      // Add selected seeds to the exam
      if (selectedSeedIds.size > 0) {
        const seedIdsArray = Array.from(selectedSeedIds);
        const { errors } = await examsService.addMultipleSeedsToExam(
          exam.id,
          seedIdsArray
        );

        if (errors && errors.length > 0) {
          console.warn('Some seeds failed to add:', errors);
        }
      }

      // Navigate to exam detail page
      router.push(`/exams/${exam.id}`);
    } catch (err) {
      console.error('Error creating exam:', err);
      setError('Failed to create exam');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/exams')}
          disabled={creating}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-white">Create Exam</h1>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Subject Name Input */}
        <div className="space-y-2">
          <Label htmlFor="subject_name">
            Subject Name <span className="text-red-400">*</span>
          </Label>
          <Input
            id="subject_name"
            placeholder="e.g., Linear Algebra, Organic Chemistry"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            maxLength={100}
            disabled={creating}
            autoFocus
          />
        </div>

        {/* Seed Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Study Materials (Optional)</Label>
            {selectedSeedIds.size > 0 && (
              <span className="text-sm bg-primary/20 text-primary px-3 py-1 rounded-full">
                {selectedSeedIds.size} selected
              </span>
            )}
          </div>

          <p className="text-sm text-gray-400">
            Select materials to include in this exam
          </p>

          {loadingSeeds ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading study materials...</span>
              </div>
            </div>
          ) : availableSeeds.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
              <p className="text-gray-400 mb-2">No study materials yet</p>
              <p className="text-sm text-gray-500">
                Upload materials first, then add them to exams
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {availableSeeds.map((seed) => {
                const disabled = isSeedDisabled(seed);
                const isProcessing =
                  seed.processing_status !== 'completed' &&
                  seed.processing_status !== 'failed';
                const hasOtherExams = seed.exam_names && seed.exam_names.length > 0;

                return (
                  <button
                    key={seed.id}
                    onClick={() => handleToggleSeed(seed.id)}
                    disabled={creating || disabled}
                    className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-all ${
                      selectedSeedIds.has(seed.id)
                        ? 'border-primary bg-primary/10'
                        : disabled
                        ? 'border-white/10 bg-white/5 opacity-50'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer'
                    } disabled:cursor-not-allowed`}
                    title={
                      isProcessing
                        ? 'This material is still being processed'
                        : hasOtherExams
                        ? `Already associated with: ${seed.exam_names?.join(', ')}`
                        : ''
                    }
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedSeedIds.has(seed.id)
                          ? 'border-primary bg-primary'
                          : 'border-gray-600'
                      }`}
                    >
                      {selectedSeedIds.has(seed.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-white font-medium truncate">{seed.title}</p>
                      <p className="text-sm text-gray-400">
                        {seed.content_type} • {new Date(seed.created_at).toLocaleDateString()}
                        {isProcessing && ' • Processing...'}
                        {hasOtherExams && ` • In ${seed.exam_names?.join(', ')}`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/exams')}
            disabled={creating}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!subjectName.trim() || creating}
            className="flex-1"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Exam
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
