import { useState, useEffect } from "react";
import { seedsService } from '@/lib/api/seedsService';
import { Seed } from "@/types";

import { logger } from "@/utils/logger";
export interface UseExamFormOptions {
  initialSubjectName?: string;
  initialExamDate?: Date | null;
  initialSeedIds?: string[];
  currentExamId?: string;
  currentExamName?: string;
}

export interface UseExamFormResult {
  // Form state
  subjectName: string;
  setSubjectName: (value: string) => void;
  hasExamDate: boolean;
  setHasExamDate: (value: boolean) => void;
  examDate: Date;
  setExamDate: (value: Date) => void;
  showDatePicker: boolean;
  setShowDatePicker: (value: boolean) => void;

  // Seed selection
  selectedSeedIds: Set<string>;
  availableSeeds: Seed[];
  loadingSeeds: boolean;
  error: string | null;
  setError: (value: string | null) => void;

  // Methods
  loadSeeds: () => Promise<void>;
  handleToggleSeed: (seedId: string) => void;
  handleDateChange: (event: any, selectedDate?: Date) => void;
  handleDatePickerDismiss: () => void;

  // Reset form
  resetForm: () => void;
}

/**
 * Shared exam form logic for Create and Edit modals
 * Handles seed loading, date picking, and form state management
 */
export const useExamForm = (
  options: UseExamFormOptions = {},
): UseExamFormResult => {
  const {
    initialSubjectName = "",
    initialExamDate = null,
    initialSeedIds = [],
    currentExamId,
    currentExamName,
  } = options;

  // Form state
  const [subjectName, setSubjectName] = useState(initialSubjectName);
  const [hasExamDate, setHasExamDate] = useState(!!initialExamDate);
  const [examDate, setExamDate] = useState(initialExamDate || new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Seed selection
  const [selectedSeedIds, setSelectedSeedIds] = useState<Set<string>>(
    new Set(initialSeedIds),
  );
  const [availableSeeds, setAvailableSeeds] = useState<Seed[]>([]);
  const [loadingSeeds, setLoadingSeeds] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load seeds on mount
  useEffect(() => {
    loadSeeds();
  }, []);

  const loadSeeds = async () => {
    try {
      setLoadingSeeds(true);
      setError(null);

      const { seeds, error: seedsError } = await seedsService.getSeeds({
        limit: 100,
      });

      if (seedsError) {
        logger.error("Failed to load seeds:", seedsError);
        setError("Failed to load study materials");
        setAvailableSeeds([]);
        return;
      }

      // Show all completed seeds, but mark availability based on exam associations
      const completedSeeds = (seeds || []).filter(
        (seed) => seed.processing_status === "completed",
      );
      setAvailableSeeds(completedSeeds);
    } catch (err) {
      logger.error("Load seeds exception:", err);
      setError("Failed to load study materials");
      setAvailableSeeds([]);
    } finally {
      setLoadingSeeds(false);
    }
  };

  const handleToggleSeed = (seedId: string) => {
    setSelectedSeedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(seedId)) {
        newSet.delete(seedId);
      } else {
        // Check if seed is available for selection
        const seed = availableSeeds.find((s) => s.id === seedId);
        if (seed) {
          // Seed is available if it has no exam associations or only belongs to current exam
          const hasOtherExams =
            seed.exam_names &&
            seed.exam_names.length > 0 &&
            (!currentExamName ||
              !seed.exam_names.includes(currentExamName) ||
              seed.exam_names.length > 1);

          if (!hasOtherExams) {
            newSet.add(seedId);
          }
        }
      }
      return newSet;
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    // Web environment - hide picker after selection
    setShowDatePicker(false);
    if (selectedDate) {
      setExamDate(selectedDate);
    }
  };

  const handleDatePickerDismiss = () => {
    setShowDatePicker(false);
  };

  const resetForm = () => {
    setSubjectName(initialSubjectName);
    setHasExamDate(!!initialExamDate);
    setExamDate(initialExamDate || new Date());
    setShowDatePicker(false);
    setSelectedSeedIds(new Set(initialSeedIds));
    setError(null);
  };

  return {
    // Form state
    subjectName,
    setSubjectName,
    hasExamDate,
    setHasExamDate,
    examDate,
    setExamDate,
    showDatePicker,
    setShowDatePicker,

    // Seed selection
    selectedSeedIds,
    availableSeeds,
    loadingSeeds,
    error,
    setError,

    // Methods
    loadSeeds,
    handleToggleSeed,
    handleDateChange,
    handleDatePickerDismiss,
    resetForm,
  };
};
