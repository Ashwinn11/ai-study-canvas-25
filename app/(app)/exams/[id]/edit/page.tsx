
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { examsService } from '@/lib/api/examsService';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ArrowLeft, Loader2, Save, Check, X } from 'lucide-react';
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

export default function EditExamPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const examId = params.id as string;

  const [subjectName, setSubjectName] = useState('');
  const [originalSubjectName, setOriginalSubjectName] = useState('');
  const [selectedSeedIds, setSelectedSeedIds] = useState<Set<string>>(new Set());
  const [originalSeedIds, setOriginalSeedIds] = useState<Set<string>>(new Set());
  const [availableSeeds, setAvailableSeeds] = useState<Seed[]>([]);
  const [loadingExam, setLoadingExam] = useState(true);
  const [loadingSeeds, setLoadingSeeds] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExam = useCallback(async () => {
    if (!examId) return;

    try {
      setLoadingExam(true);
      const { examWithSeeds, error: examError } = await examsService.getExamWithSeeds(examId);

      if (examError || !examWithSeeds) {
        setError(examError || 'Failed to load exam');
        return;
      }

      setSubjectName(examWithSeeds.subject_name);
      setOriginalSubjectName(examWithSeeds.subject_name);

      const seedIds = new Set(examWithSeeds.seeds?.map(s => s.id) || []);
      setSelectedSeedIds(seedIds);
      setOriginalSeedIds(seedIds);
    } catch (err) {
      console.error('Error loading exam:', err);
      setError('Failed to load exam');
    } finally {
      setLoadingExam(false);
    }
  }, [examId]);

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
              id,
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

      // Transform data to include exam_names, excluding current exam
      const seedsWithExamNames = (data || []).map((seed: any) => {
        const examNames = seed.exam_seeds
          ?.filter((es: any) => es.exams?.id !== examId) // Exclude current exam
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
  }, [user, examId]);

  useEffect(() => {
    if (user && examId) {
      loadExam();
      loadSeeds();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, examId]);

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

  const handleSave = async () => {
    if (!subjectName.trim()) {
      setError('Please enter a subject name for your exam');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Update exam name if changed
      if (subjectName.trim() !== originalSubjectName) {
        const { error: updateError } = await examsService.updateExam(examId, {
          subject_name: subjectName.trim(),
        });

        if (updateError) {
          setError(updateError);
          return;
        }
      }

      // Calculate seeds to add and remove
      const seedsToAdd = Array.from(selectedSeedIds).filter(
        id => !originalSeedIds.has(id)
      );
      const seedsToRemove = Array.from(originalSeedIds).filter(
        id => !selectedSeedIds.has(id)
      );

      // Add new seeds
      if (seedsToAdd.length > 0) {
        const { errors } = await examsService.addMultipleSeedsToExam(
          examId,
          seedsToAdd
        );

        if (errors && errors.length > 0) {
          console.warn('Some seeds failed to add:', errors);
        }
      }

      // Remove seeds
      for (const seedId of seedsToRemove) {
        const { error: removeError } = await examsService.removeSeedFromExam(
          examId,
          seedId
        );

        if (removeError) {
          console.warn('Failed to remove seed:', seedId, removeError);
        }
      }

      // Navigate back to exam detail page
      router.push(`/exams/${examId}`);
    } catch (err) {
      console.error('Error saving exam:', err);
      setError('Failed to save exam');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = 
    subjectName.trim() !== originalSubjectName ||
    selectedSeedIds.size !== originalSeedIds.size ||
    Array.from(selectedSeedIds).some(id => !originalSeedIds.has(id));

  if (loadingExam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading exam...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/exams/${examId}`)}
          disabled={saving}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-white">Edit Exam</h1>
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
            disabled={saving}
            autoFocus
          />
        </div>

        {/* Seed Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Study Materials</Label>
            {selectedSeedIds.size > 0 && (
              <span className="text-sm bg-primary/20 text-primary px-3 py-1 rounded-full">
                {selectedSeedIds.size} selected
              </span>
            )}
          </div>

          <p className="text-sm text-gray-400">
            Add or remove materials from this exam
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
                const isSelected = selectedSeedIds.has(seed.id);
                const wasOriginallySelected = originalSeedIds.has(seed.id);

                return (
                  <button
                    key={seed.id}
                    onClick={() => handleToggleSeed(seed.id)}
                    disabled={saving || disabled}
                    className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-all ${
                      isSelected
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
                        isSelected
                          ? 'border-primary bg-primary'
                          : 'border-gray-600'
                      }`}
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium truncate">{seed.title}</p>
                        {wasOriginallySelected && !isSelected && (
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                            Will remove
                          </span>
                        )}
                        {!wasOriginallySelected && isSelected && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                            Will add
                          </span>
                        )}
                      </div>
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
            onClick={() => router.push(`/exams/${examId}`)}
            disabled={saving}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!subjectName.trim() || !hasChanges || saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
