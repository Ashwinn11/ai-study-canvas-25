import { useState, useCallback, useRef, useEffect } from "react";
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  type AudioRecorder,
} from "expo-audio";
import { useQueryClient } from "@tanstack/react-query";
import { uploadProcessor } from "../services/uploadProcessor";
import { useAuth } from "./useAuth";
import { useModalHelpers } from "./useModal";
import { ServiceError } from "../services/serviceError";
import { ContentType } from "../types";
import { recordError } from "@/utils/telemetry";
import { configService } from "../services/configService";
import PickerManager from "@/utils/pickerManager";
import { logger } from "@/utils/logger";
import { useSubscription } from "./useSubscription";
import { useUploadLimit } from "./useUploadLimit";
import { paywallService } from '@/lib/api/paywallService';
import {
  UPLOAD_STAGE_PROGRESS,
  UploadStageId,
  isUploadStageId,
  UPLOAD_STAGE_SEQUENCE,
  UPLOAD_STAGE_MESSAGE_DURATION,
  UPLOAD_STAGE_INDEX,
  COMPLETION_DISMISS_DELAY_MS,
} from "../constants/uploadStages";

const PRIMARY_STAGES = UPLOAD_STAGE_SEQUENCE.filter(
  (stage) => stage.id !== "completed",
);
const PRIMARY_STAGE_COUNT = PRIMARY_STAGES.length;

interface StageQueueItem {
  stageId: UploadStageId;
  message: string;
  targetProgress: number;
  stepIndex: number;
}

export type ProgressStep =
  | "uploading"
  | "processing"
  | "analyzing"
  | "completed";

export interface UseUploadResult {
  isUploading: boolean;
  isRecording: boolean;
  recordingDuration: number;
  error: string | null;
  processingStatus: string | null;
  processingProgress: number;
  currentStep: {
    step: number;
    totalSteps: number;
    stepName: string;
    progress: number;
  };
  lastCreatedSeedId: string | null;
  setLastCreatedSeedId: (id: string | null) => void;
  pickFiles: () => Promise<void>;
  pickOrCaptureImage: () => Promise<void>;
  pickAudio: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
  processTextContent: (text: string, title?: string) => Promise<void>;
  processYoutubeUrl: (url: string, title?: string) => Promise<void>;
  clearError: () => void;
  checkEntitlementAndShowPaywall: () => Promise<boolean>;
}

export const useUpload = (navigation?: any): UseUploadResult => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  // Displayed (smoothed) progress shown to the user
  const [processingProgress, setProcessingProgress] = useState(0);
  // Internal: last actual progress reported by the processor
  const actualProgressRef = useRef(0);
  const progressTargetRef = useRef(0);
  // Internal: fake progress ticker
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentUploadTypeRef = useRef<ContentType | "unknown">("unknown");
  const stageStartRef = useRef(0);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleStageRef = useRef<UploadStageId | null>(null);
  const pendingStageRef = useRef<StageQueueItem | null>(null);
  const [currentStep, setCurrentStep] = useState({
    step: 1,
    totalSteps: PRIMARY_STAGE_COUNT,
    stepName: "Starting...",
    progress: 0,
  });

  // Audio recording - using hook for recorder instance
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track last created seed for navigation
  const [lastCreatedSeedId, setLastCreatedSeedId] = useState<string | null>(null);
  const successfulUploadIdRef = useRef<string | null>(null);

  const { user } = useAuth();
  const { showError } = useModalHelpers();
  const queryClient = useQueryClient();
  const { hasActiveSubscription } = useSubscription();
  const { freeTrialExpired, incrementUploadCount } = useUploadLimit();

  // Track upload operation state to prevent inconsistencies
  const uploadOperationRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Check entitlement and show paywall if needed
  const checkEntitlementAndShowPaywall =
    useCallback(async (): Promise<boolean> => {
      // Subscribed users can always upload
      if (hasActiveSubscription) {
        return true;
      }

      // Free trial expired: show paywall
      if (freeTrialExpired) {
        try {
          const hasEntitlement = await paywallService.presentPaywallIfNeeded(user?.id);
          return hasEntitlement;
        } catch (error) {
          logger.error("[Upload] Paywall error:", error);
          Alert.alert(
            "Unable to show subscription options",
            "Please try again in a moment.",
            [{ text: "OK" }],
          );
          return false;
        }
      }

      return true;
    }, [hasActiveSubscription, freeTrialExpired, user?.id]);

  const clearStageTimer = useCallback(() => {
    if (stageTimerRef.current) {
      clearTimeout(stageTimerRef.current);
      stageTimerRef.current = null;
    }
  }, []);

  const clearCompletionTimer = useCallback(() => {
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
  }, []);

  const scheduleCompletionDismissal = useCallback(() => {
    clearCompletionTimer();
    logger.info("[Upload] Scheduling completion dismissal");
    completionTimerRef.current = setTimeout(() => {
      // Guard: Only update state if component is still mounted
      if (mountedRef.current) {
        // Set both states atomically to trigger navigation effect
        if (successfulUploadIdRef.current) {
          logger.info(
            "[Upload] Completion timer fired, setting lastCreatedSeedId:",
            successfulUploadIdRef.current,
          );
          setLastCreatedSeedId(successfulUploadIdRef.current);

          // Increment upload count for free users (subscribed users have unlimited)
          if (!hasActiveSubscription) {
            incrementUploadCount();
          }

          successfulUploadIdRef.current = null; // Clean up
        } else {
          logger.warn(
            "[Upload] Completion timer fired but successfulUploadIdRef is null",
          );
        }
        setIsUploading(false);
      } else {
        logger.warn("[Upload] Completion timer fired but component unmounted");
      }
      completionTimerRef.current = null;
    }, COMPLETION_DISMISS_DELAY_MS);
  }, [clearCompletionTimer, setIsUploading, setLastCreatedSeedId, hasActiveSubscription, incrementUploadCount]);

  const resetStageState = useCallback(() => {
    clearStageTimer();
    clearCompletionTimer();
    visibleStageRef.current = null;
    pendingStageRef.current = null;
    stageStartRef.current = 0;
    stageStartRef.current = 0;
  }, [clearStageTimer, clearCompletionTimer]);

  const promoteStage = useCallback(
    (item: StageQueueItem) => {
      clearStageTimer();
      pendingStageRef.current = null;
      visibleStageRef.current = item.stageId;
      stageStartRef.current = Date.now();

      const stepData = {
        step: Math.min(item.stepIndex, PRIMARY_STAGE_COUNT),
        totalSteps: PRIMARY_STAGE_COUNT,
        stepName: item.message,
        progress: item.targetProgress,
      };

      setProcessingStatus(item.message);
      setCurrentStep(stepData);

      if (navigation) {
        navigation.setParams({ currentStep: stepData });
      }

      if (item.stageId === "completed") {
        progressTargetRef.current = Math.max(progressTargetRef.current, 1);
        actualProgressRef.current = Math.max(actualProgressRef.current, 1);
        setProcessingProgress(1);
        scheduleCompletionDismissal();
      }
    },
    [clearStageTimer, navigation, scheduleCompletionDismissal],
  );

  const enqueueStage = useCallback(
    (stageId: UploadStageId, targetProgress: number) => {
      const stepIndex = UPLOAD_STAGE_INDEX[stageId] ?? PRIMARY_STAGE_COUNT;
      const message = getStageMessage(stageId, currentUploadTypeRef.current);

      progressTargetRef.current = Math.max(
        progressTargetRef.current,
        targetProgress,
      );
      actualProgressRef.current = Math.max(
        actualProgressRef.current,
        targetProgress,
      );

      const stageData: StageQueueItem = {
        stageId,
        message,
        targetProgress,
        stepIndex,
      };

      // CRITICAL FIX: Always promote "completed" stage immediately to ensure
      // the completion timer is set before the finally block runs
      if (stageId === "completed") {
        promoteStage(stageData);
        return;
      }

      if (
        visibleStageRef.current === null ||
        visibleStageRef.current === stageId
      ) {
        promoteStage(stageData);
        return;
      }

      const currentStage = visibleStageRef.current;
      const minDuration = currentStage
        ? (UPLOAD_STAGE_MESSAGE_DURATION[currentStage] ?? 0)
        : 0;
      const elapsed = Date.now() - stageStartRef.current;

      if (elapsed >= minDuration) {
        promoteStage(stageData);
        return;
      }

      pendingStageRef.current = stageData;
      clearStageTimer();
      const remaining = Math.max(minDuration - elapsed, 0);
      stageTimerRef.current = setTimeout(() => {
        stageTimerRef.current = null;
        if (
          pendingStageRef.current &&
          pendingStageRef.current.stageId === stageData.stageId
        ) {
          promoteStage(pendingStageRef.current);
        }
      }, remaining);
    },
    [promoteStage, clearStageTimer],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearStageTimer();
      clearCompletionTimer();
    };
  }, [clearCompletionTimer, clearStageTimer]);

  const clearError = useCallback(() => {
    // Only allow clearing if not currently uploading
    if (!isUploading) {
      setError(null);
      setProcessingStatus(null);
      setProcessingProgress(0);
      setCurrentStep({
        step: 1,
        totalSteps: PRIMARY_STAGE_COUNT,
        stepName: "Starting...",
        progress: 0,
      });
      progressTargetRef.current = 0;
      actualProgressRef.current = 0;
      resetStageState();
      uploadOperationRef.current = null;
    }
  }, [isUploading, resetStageState]);

  const handleProgress = useCallback(
    (step: number, status: string, progress: number) => {
      if (isUploadStageId(status)) {
        const stageId: UploadStageId = status;
        const stageProgress = UPLOAD_STAGE_PROGRESS[stageId] ?? 0;
        const providedProgress =
          typeof progress === "number" ? progress : stageProgress;
        const targetProgress = Math.max(stageProgress, providedProgress);

        enqueueStage(stageId, targetProgress);
        return;
      }

      const fallbackMessage = status;
      const fallbackProgress =
        typeof progress === "number" ? progress : actualProgressRef.current;
      progressTargetRef.current = Math.max(
        progressTargetRef.current,
        fallbackProgress,
      );
      actualProgressRef.current = Math.max(
        actualProgressRef.current,
        fallbackProgress,
      );

      setProcessingStatus(fallbackMessage);
      const stepData = {
        step,
        totalSteps: PRIMARY_STAGE_COUNT,
        stepName: fallbackMessage,
        progress: fallbackProgress,
      };
      setCurrentStep(stepData);

      if (navigation) {
        navigation.setParams({ currentStep: stepData });
      }
    },
    [enqueueStage, navigation],
  );

  // Start/stop a gentle fake progress ticker while uploading.
  useEffect(() => {
    if (!isUploading) {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      actualProgressRef.current = 0;
      progressTargetRef.current = 0;
      setProcessingProgress(0);
      resetStageState();
      return;
    }

    // Initialize displayed progress if needed
    setProcessingProgress((p) => (p > 0 ? p : 0.03));

    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    progressTimerRef.current = setInterval(() => {
      setProcessingProgress((prev) => {
        const target = Math.max(
          progressTargetRef.current,
          actualProgressRef.current,
        );
        if (target <= prev) {
          return prev;
        }

        const remaining = target - prev;
        const step =
          remaining > 0.3
            ? 0.03
            : remaining > 0.15
              ? 0.015
              : remaining > 0.05
                ? 0.008
                : 0.004;

        const next = Math.min(prev + step, target);
        return next;
      });
    }, 250);

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [isUploading, resetStageState]);

  // Handle errors appropriately - show alerts for user-actionable errors, log technical errors silently
  const handleError = useCallback(
    (error: unknown, context: string) => {
      recordError(`upload.${context}`, error);
      let userMessage =
        "Something went wrong while processing your content. Please check your connection and try again.";
      let modalTitle: "Action Required" | "Upload Failed" = "Upload Failed";

      clearStageTimer();
      clearCompletionTimer();
      visibleStageRef.current = null;
      pendingStageRef.current = null;
      stageStartRef.current = 0;

      if (error instanceof ServiceError) {
        userMessage = error.getUserMessage();
        modalTitle = error.canRetry() ? "Upload Failed" : "Action Required";
        logger.error(`[Upload Error] ${context}:`, error);
        error.log();
        setError(userMessage);
        showError(userMessage, modalTitle);
        return;
      }

      if (typeof error === "string") {
        userMessage = error;
        modalTitle = "Action Required";
      } else if (error instanceof Error) {
        logger.error(`[Upload Error] ${context}:`, error);
      }

      setError(userMessage);
      showError(userMessage, modalTitle);
    },
    [clearCompletionTimer, clearStageTimer, showError],
  );

  const pickFiles = useCallback(async () => {
    return await PickerManager.executePicker("pickFiles", async () => {
      if (!user) {
        handleError("Please sign in to upload files", "pickFiles");
        return;
      }

      try {
        // Opening file picker for documents only

        // Clear previous errors first
        setError(null);
        setProcessingStatus(null);
        setProcessingProgress(0);

        // CRITICAL: Add a small delay to ensure modal has fully closed
        // expo-document-picker sometimes fails to open if called immediately after modal closes
        await new Promise(resolve => setTimeout(resolve, 300));

        // Open document picker for PDF/DOC/DOCX/TXT files only
        const result = await DocumentPicker.getDocumentAsync({
          type: [
            "application/pdf", // PDF documents
            "text/plain", // TXT files
            "text/rtf", // RTF files
            "application/msword", // DOC files
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX files
          ],
          copyToCacheDirectory: true,
        });

        if (result.canceled) {
          // Document selection canceled by user
          return;
        }

        const file = result.assets[0];

        // CRITICAL: Set uploading state IMMEDIATELY after file selection
        // This ensures progress screen appears instantly, before any async operations
        resetStageState();
        progressTargetRef.current = 0;
        actualProgressRef.current = 0;
        setIsUploading(true);
        setProcessingProgress(0.03);
        setProcessingStatus("Validating your upload…");
        setCurrentStep({
          step: 1,
          totalSteps: PRIMARY_STAGE_COUNT,
          stepName: "Validating your upload…",
          progress: 0.03,
        });

        // Validate file size (dynamic limit from backend config)
        const fileType = getFileTypeForSizeLimit(
          file.name,
          file.mimeType || "",
        );
        const maxSizeBytes = await configService.getMaxFileSizeByType(fileType);
        if (file.size && file.size > maxSizeBytes) {
          const actualSizeMB = Math.round(file.size / (1024 * 1024));
          const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
          handleError(
            `Your file is ${actualSizeMB}MB. Maximum allowed is ${maxSizeMB}MB.`,
            "pickFiles",
          );
          return;
        }

        // Validate file type and get content type
        const contentType = getContentTypeFromMime(file.mimeType || "");
        const validationResult = validateFileType(
          file.name,
          file.mimeType || "",
          contentType,
        );

        if (!validationResult.isValid) {
          handleError(validationResult.errorMessage, "pickFiles");
          return;
        }

        // Set content type for progress messages
        currentUploadTypeRef.current = contentType;
        enqueueStage("validating", UPLOAD_STAGE_PROGRESS["validating"]);

        // Convert file to base64 using expo-file-system (React Native compatible)
        const base64Data = await FileSystem.readAsStringAsync(file.uri, {
          encoding: "base64",
        });

        // No navigation; HomeScreen will show LoadingScreen
        const uploadResult = await uploadProcessor.processFile(
          base64Data,
          file.name,
          file.size || 0,
          file.mimeType || "application/octet-stream",
          contentType,
          {
            userId: user.id,
            title: file.name,
            onProgress: handleProgress,
          },
        );

        enqueueStage("completed", 1);

        // Invalidate seeds cache so new seed appears without manual refresh
        queryClient.invalidateQueries({
          queryKey: ["seeds", user?.id],
          refetchType: "all", // Refetch both active and inactive queries
        });
        queryClient.invalidateQueries({
          queryKey: ["reviewStats", user?.id],
          refetchType: "all",
        });

        // Store upload result ID in ref for atomic state update with isUploading
        successfulUploadIdRef.current = uploadResult.id;
        logger.info("[Upload] pickFiles - Set successfulUploadIdRef:", uploadResult.id);
      } catch (err) {
        handleError(err, "pickFiles");

        // Clean up progress state on error
        setProcessingStatus(null);
        setCurrentStep({
          step: 1,
          totalSteps: PRIMARY_STAGE_COUNT,
          stepName: "Starting...",
          progress: 0,
        });
      } finally {
        if (!completionTimerRef.current) {
          setIsUploading(false);
        }
      }
    });
  }, [
    user,
    handleProgress,
    handleError,
    navigation,
    resetStageState,
    enqueueStage,
    queryClient,
    checkEntitlementAndShowPaywall,
  ]);

  const pickOrCaptureImage = useCallback(async () => {
    return await PickerManager.executePicker("pickOrCaptureImage", async () => {
      if (!user) {
        handleError("Please sign in to upload images", "pickOrCaptureImage");
        return;
      }

      try {
        // Clear previous errors first
        setError(null);
        setProcessingStatus(null);
        setProcessingProgress(0);

        // CRITICAL: Add a small delay to ensure modal has fully closed
        // Image picker sometimes fails to open if called immediately after modal closes
        await new Promise(resolve => setTimeout(resolve, 300));

        // Check camera permissions first
        const cameraPermission = await ImagePicker.getCameraPermissionsAsync();
        const mediaLibraryPermission =
          await ImagePicker.getMediaLibraryPermissionsAsync();

        // Show choice dialog or default to library
        let result;

        if (
          cameraPermission.status === "granted" &&
          mediaLibraryPermission.status === "granted"
        ) {
          // Both permissions available - you could show a choice dialog here
          // For now, default to library as it's more reliable
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });
        } else {
          // Request media library permission and use library
          if (mediaLibraryPermission.status !== "granted") {
            const permissionResult =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.status !== "granted") {
              handleError(
                "Please grant photo library access to upload images",
                "pickOrCaptureImage",
              );
              return;
            }
          }

          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });
        }

        if (result.canceled) {
          // User canceled - this is normal
          return;
        }

        const asset = result.assets[0];

        // CRITICAL: Set uploading state IMMEDIATELY after image selection
        const contentType: ContentType = "image";
        resetStageState();
        currentUploadTypeRef.current = contentType;
        progressTargetRef.current = 0;
        actualProgressRef.current = 0;
        setIsUploading(true);
        setProcessingProgress(0.03);
        setProcessingStatus("Validating your image…");
        setCurrentStep({
          step: 1,
          totalSteps: PRIMARY_STAGE_COUNT,
          stepName: "Validating your image…",
          progress: 0.03,
        });

        const validationResult = validateFileType(
          "image.jpg",
          asset.type === "image" ? "image/jpeg" : "image/png",
          contentType,
        );

        if (!validationResult.isValid) {
          handleError(validationResult.errorMessage, "pickOrCaptureImage");
          return;
        }

        // Validate file size (dynamic limit from backend config)
        const maxSizeBytes = await configService.getMaxFileSizeByType("image");
        if (asset.fileSize && asset.fileSize > maxSizeBytes) {
          const actualSizeMB = Math.round(asset.fileSize / (1024 * 1024));
          const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
          handleError(
            `Your image is ${actualSizeMB}MB. Maximum allowed is ${maxSizeMB}MB.`,
            "pickOrCaptureImage",
          );
          return;
        }

        enqueueStage("validating", UPLOAD_STAGE_PROGRESS["validating"]);

        // Convert image to base64 using expo-file-system
        const base64Data = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: "base64",
        });

        const uploadResult = await uploadProcessor.processFile(
          base64Data,
          "image.jpg",
          asset.fileSize || 0,
          asset.type === "image" ? "image/jpeg" : "image/png",
          "image",
          {
            userId: user.id,
            title: "Image",
            onProgress: handleProgress,
          },
        );

        enqueueStage("completed", 1);

        // Invalidate seeds cache so new seed appears without manual refresh
        queryClient.invalidateQueries({
          queryKey: ["seeds", user?.id],
          refetchType: "all", // Refetch both active and inactive queries
        });
        queryClient.invalidateQueries({
          queryKey: ["reviewStats", user?.id],
          refetchType: "all",
        });

        // Store upload result ID in ref for atomic state update with isUploading
        successfulUploadIdRef.current = uploadResult.id;
      } catch (err) {
        handleError(err, "pickOrCaptureImage");

        // Clean up progress state on error
        setProcessingStatus(null);
        setCurrentStep({
          step: 1,
          totalSteps: PRIMARY_STAGE_COUNT,
          stepName: "Starting...",
          progress: 0,
        });
      } finally {
        if (!completionTimerRef.current) {
          setIsUploading(false);
        }
      }
    });
  }, [
    user,
    handleProgress,
    handleError,
    navigation,
    resetStageState,
    enqueueStage,
    queryClient,
    checkEntitlementAndShowPaywall,
  ]);

  const pickAudio = useCallback(async () => {
    return await PickerManager.executePicker("pickAudio", async () => {
      if (!user) {
        handleError("Please sign in to upload audio", "pickAudio");
        return;
      }

      try {
        // Clear previous errors first
        setError(null);
        setProcessingStatus(null);
        setProcessingProgress(0);

        // CRITICAL: Add a small delay to ensure modal has fully closed
        // Document picker sometimes fails to open if called immediately after modal closes
        await new Promise(resolve => setTimeout(resolve, 300));

        // Open file picker for audio files only
        const result = await DocumentPicker.getDocumentAsync({
          type: [
            "audio/*", // Audio files (MP3, WAV, M4A, etc.)
          ],
          copyToCacheDirectory: true,
        });

        if (result.canceled) {
          // Selection canceled by user
          return;
        }

        const file = result.assets[0];

        // Determine content type early for progress messages
        const contentType = "audio";
        const mediaType = "audio";

        // CRITICAL: Set uploading state IMMEDIATELY after file selection
        resetStageState();
        currentUploadTypeRef.current = contentType;
        progressTargetRef.current = 0;
        actualProgressRef.current = 0;
        setIsUploading(true);
        setProcessingProgress(0.03);
        setProcessingStatus(`Validating your ${mediaType}…`);
        setCurrentStep({
          step: 1,
          totalSteps: PRIMARY_STAGE_COUNT,
          stepName: `Validating your ${mediaType}…`,
          progress: 0.03,
        });

        // Validate file size (dynamic limit from backend config)
        const fileType = getFileTypeForSizeLimit(
          file.name,
          file.mimeType || "",
        );
        const maxSizeBytes = await configService.getMaxFileSizeByType(fileType);
        if (file.size && file.size > maxSizeBytes) {
          const actualSizeMB = Math.round(file.size / (1024 * 1024));
          const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
          handleError(
            `Your ${fileType} file is ${actualSizeMB}MB. Maximum allowed is ${maxSizeMB}MB.`,
            "pickAudio",
          );
          return;
        }

        // Validate file type
        const validationResult = validateFileType(
          file.name,
          file.mimeType || "",
          contentType,
        );

        if (!validationResult.isValid) {
          handleError(validationResult.errorMessage, "pickAudio");
          return;
        }

        enqueueStage("validating", UPLOAD_STAGE_PROGRESS["validating"]);

        // Convert file to base64 using expo-file-system
        const base64Data = await FileSystem.readAsStringAsync(file.uri, {
          encoding: "base64",
        });

        const uploadResult = await uploadProcessor.processFile(
          base64Data,
          file.name,
          file.size || 0,
          file.mimeType || "application/octet-stream",
          contentType,
          {
            userId: user.id,
            title: file.name,
            onProgress: handleProgress,
          },
        );

        enqueueStage("completed", 1);

        // Invalidate seeds cache so new seed appears without manual refresh
        queryClient.invalidateQueries({
          queryKey: ["seeds", user?.id],
          refetchType: "all", // Refetch both active and inactive queries
        });
        queryClient.invalidateQueries({
          queryKey: ["reviewStats", user?.id],
          refetchType: "all",
        });

        // Store upload result ID in ref for atomic state update with isUploading
        successfulUploadIdRef.current = uploadResult.id;
      } catch (err) {
        handleError(err, "pickAudio");

        // Clean up progress state on error
        setProcessingStatus(null);
        setCurrentStep({
          step: 1,
          totalSteps: PRIMARY_STAGE_COUNT,
          stepName: "Starting...",
          progress: 0,
        });
      } finally {
        if (!completionTimerRef.current) {
          setIsUploading(false);
        }
      }
    });
  }, [
    user,
    handleProgress,
    handleError,
    navigation,
    resetStageState,
    enqueueStage,
    queryClient,
    checkEntitlementAndShowPaywall,
  ]);

  const startRecording = useCallback(async () => {

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow microphone access to record audio.",
        );
        return;
      }

      // Set audio mode for iOS recording compatibility
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionModeAndroid: "doNotMix",
        interruptionMode: "doNotMix",
        shouldRouteThroughEarpiece: false,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1000);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Error", "Failed to start recording");
    }
  }, [checkEntitlementAndShowPaywall, audioRecorder]);

  const stopRecording = useCallback(async () => {
    if (!audioRecorder.isRecording) return;

    try {
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (!uri || typeof uri !== "string") {
        throw new Error("No recording URI found");
      }

      // Process the recorded file
      if (!user) {
        handleError("Please sign in to save recording", "stopRecording");
        return;
      }

      resetStageState();
      currentUploadTypeRef.current = "audio";
      progressTargetRef.current = 0;
      actualProgressRef.current = 0;
      setIsUploading(true);
      setProcessingProgress(0.03);
      setProcessingStatus("Processing recording…");
      setCurrentStep({
        step: 1,
        totalSteps: PRIMARY_STAGE_COUNT,
        stepName: "Processing recording…",
        progress: 0.03,
      });

      enqueueStage("validating", UPLOAD_STAGE_PROGRESS["validating"]);

      // Convert file to base64 using expo-file-system
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });

      const uploadResult = await uploadProcessor.processFile(
        base64Data,
        `recording_${Date.now()}.m4a`,
        0, // Size will be determined by processor or fetch
        "audio/m4a",
        "audio",
        {
          userId: user.id,
          title: "Voice Note",
          onProgress: handleProgress,
        },
      );

      enqueueStage("completed", 1);

      queryClient.invalidateQueries({ queryKey: ["seeds", user?.id] });

      setTimeout(() => {
        if (navigation && uploadResult.id) {
          (navigation as any).navigate("MaterialDetail", {
            seedId: uploadResult.id,
          });
        }
      }, 500);
    } catch (err) {
      handleError(err, "stopRecording");
      setProcessingStatus(null);
      setCurrentStep({
        step: 1,
        totalSteps: PRIMARY_STAGE_COUNT,
        stepName: "Starting...",
        progress: 0,
      });
    } finally {
      if (!completionTimerRef.current) {
        setIsUploading(false);
      }
    }
  }, [
    audioRecorder,
    user,
    handleProgress,
    handleError,
    navigation,
    resetStageState,
    enqueueStage,
    queryClient,
  ]);

  const cancelRecording = useCallback(async () => {
    if (!audioRecorder.isRecording) return;

    try {
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      audioRecorder.stop();
      setRecordingDuration(0);
    } catch (err) {
      console.error("Failed to cancel recording", err);
    }
  }, [audioRecorder]);

  const processTextContent = useCallback(
    async (text: string, title?: string) => {
      if (!user) {
        handleError(
          "Please sign in to process text content",
          "processTextContent",
        );
        return;
      }

      if (!text || text.trim().length < 10) {
        handleError(
          "Please provide meaningful text content (at least 10 characters)",
          "processTextContent",
        );
        return;
      }

      try {
        // CRITICAL: Set uploading state IMMEDIATELY to show progress screen
        // This ensures progress screen appears instantly, before any async operations
        resetStageState();
        currentUploadTypeRef.current = "text";
        progressTargetRef.current = 0;
        actualProgressRef.current = 0;
        setError(null);
        setIsUploading(true);
        setProcessingProgress(0.03);
        setProcessingStatus("Validating your text…");
        setCurrentStep({
          step: 1,
          totalSteps: PRIMARY_STAGE_COUNT,
          stepName: "Validating your text…",
          progress: 0.03,
        });

        // Validate text length against backend config
        const maxTextChars = await configService.getMaxTextContentCharacters();
        const actualChars = text.trim().length;
        if (actualChars > maxTextChars) {
          handleError(
            `Your text has ${actualChars.toLocaleString()} characters. Maximum allowed is ${maxTextChars.toLocaleString()} characters.`,
            "processTextContent",
          );
          return;
        }

        enqueueStage("validating", UPLOAD_STAGE_PROGRESS["validating"]);

        // No navigation; HomeScreen will show LoadingScreen

        const uploadResult = await uploadProcessor.processTextContent(text, {
          userId: user.id,
          title: title || "Text Content",
          onProgress: handleProgress,
        });

        enqueueStage("completed", 1);

        // Invalidate seeds cache so new seed appears without manual refresh
        queryClient.invalidateQueries({
          queryKey: ["seeds", user?.id],
          refetchType: "all", // Refetch both active and inactive queries
        });
        queryClient.invalidateQueries({
          queryKey: ["reviewStats", user?.id],
          refetchType: "all",
        });

        // Store upload result ID in ref for atomic state update with isUploading
        successfulUploadIdRef.current = uploadResult.id;
      } catch (err) {
        handleError(err, "processTextContent");

        // Clean up progress state on error
        setProcessingStatus(null);
        setCurrentStep({
          step: 1,
          totalSteps: PRIMARY_STAGE_COUNT,
          stepName: "Starting...",
          progress: 0,
        });
      } finally {
        if (!completionTimerRef.current) {
          setIsUploading(false);
        }
      }
    },
    [
      user,
      handleProgress,
      handleError,
      navigation,
      resetStageState,
      enqueueStage,
      queryClient,
    ],
  );

  const processYoutubeUrl = useCallback(
    async (url: string, title?: string) => {
      if (!user) {
        handleError(
          "Please sign in to process YouTube videos",
          "processYoutubeUrl",
        );
        return;
      }

      try {
        // CRITICAL: Set uploading state IMMEDIATELY to show progress screen
        // This ensures progress screen appears instantly, before any async operations
        resetStageState();
        currentUploadTypeRef.current = "youtube";
        progressTargetRef.current = 0;
        actualProgressRef.current = 0;
        setError(null);
        setIsUploading(true);
        setProcessingProgress(0.03);
        setProcessingStatus("Validating YouTube URL…");
        setCurrentStep({
          step: 1,
          totalSteps: PRIMARY_STAGE_COUNT,
          stepName: "Validating YouTube URL…",
          progress: 0.03,
        });

        enqueueStage("validating", UPLOAD_STAGE_PROGRESS["validating"]);

        const uploadResult = await uploadProcessor.processYoutubeUrl(url, {
          userId: user.id,
          title: title || "YouTube Video",
          onProgress: handleProgress,
        });

        enqueueStage("completed", 1);

        // Invalidate seeds cache so new seed appears without manual refresh
        queryClient.invalidateQueries({
          queryKey: ["seeds", user?.id],
          refetchType: "all", // Refetch both active and inactive queries
        });
        queryClient.invalidateQueries({
          queryKey: ["reviewStats", user?.id],
          refetchType: "all",
        });

        // Store upload result ID in ref for atomic state update with isUploading
        successfulUploadIdRef.current = uploadResult.id;
      } catch (err) {
        handleError(err, "processYoutubeUrl");

        // Clean up progress state on error
        setProcessingStatus(null);
        setCurrentStep({
          step: 1,
          totalSteps: PRIMARY_STAGE_COUNT,
          stepName: "Starting...",
          progress: 0,
        });
      } finally {
        if (!completionTimerRef.current) {
          setIsUploading(false);
        }
      }
    },
    [
      user,
      handleProgress,
      handleError,
      navigation,
      resetStageState,
      enqueueStage,
      queryClient,
    ],
  );

  return {
    isUploading,
    isRecording,
    recordingDuration,
    error,
    processingStatus,
    processingProgress,
    currentStep,
    lastCreatedSeedId,
    setLastCreatedSeedId,
    pickFiles,
    pickOrCaptureImage,
    pickAudio,
    startRecording,
    stopRecording,
    cancelRecording,
    processTextContent,
    processYoutubeUrl,
    clearError,
    checkEntitlementAndShowPaywall,
  };
};

// Helper functions
function getContentLabel(contentType: ContentType | "unknown"): string {
  switch (contentType) {
    case "pdf":
      return "PDF";
    case "image":
      return "image";
    case "audio":
      return "audio file";
    case "text":
      return "text";
    case "youtube":
      return "YouTube video";
    default:
      return "content";
  }
}

function getStageMessage(
  stage: UploadStageId,
  contentType: ContentType | "unknown",
): string {
  const label = getContentLabel(contentType);

  switch (stage) {
    case "validating":
      return contentType === "youtube"
        ? "Validating YouTube URL…"
        : "Validating your upload…";
    case "reading":
      return contentType === "youtube"
        ? "Extracting captions from video…"
        : `Reviewing your ${label}…`;
    case "extracting":
      return `Extracting insights from your ${label}…`;
    case "generating":
      return "Generating personalized study materials…";
    case "finalizing":
      return "Finalizing your mastery set…";
    case "completed":
      return "Your mastery set is ready!";
    default:
      return "Processing your content…";
  }
}

function getFileTypeForSizeLimit(
  fileName: string,
  mimeType: string,
): "pdf" | "image" | "audio" | "document" {
  // Check MIME type first
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType === "application/pdf") {
    return "pdf";
  }

  if (mimeType.startsWith("audio/")) {
    return "audio";
  }

  // Check file extension for documents
  const extension = fileName.toLowerCase().split(".").pop() || "";
  const documentExtensions = ["txt", "rtf", "doc", "docx"];

  if (documentExtensions.includes(extension)) {
    return "document";
  }

  // Default fallback
  return "document";
}

function getContentTypeFromMime(mimeType: string): ContentType {
  // Image files
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  // PDF files
  if (mimeType === "application/pdf") {
    return "pdf";
  }

  // Audio files
  if (mimeType.startsWith("audio/")) {
    return "audio";
  }

  // Text files
  if (mimeType.startsWith("text/")) {
    return "text";
  }

  // Document files (DOC, DOCX, etc.)
  if (
    mimeType === "application/msword" ||
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/rtf"
  ) {
    return "text"; // Treat documents as text for now
  }

  // Default fallback - try to detect from file extension or default to text
  return "text";
}

function validateFileType(
  fileName: string,
  mimeType: string,
  contentType: ContentType,
): { isValid: boolean; errorMessage: string } {
  // Get file extension
  const extension = fileName.toLowerCase().split(".").pop() || "";

  // Define supported formats for each content type
  const supportedFormats: Record<ContentType, string[]> = {
    image: ["jpg", "jpeg", "png", "gif", "bmp", "webp"],
    pdf: ["pdf"],
    audio: ["mp3", "wav", "m4a", "aac", "ogg", "flac", "wma"],
    text: ["txt", "rtf", "doc", "docx"],
    youtube: [], // YouTube URLs don't have file extensions
  };

  const supportedExtensions = supportedFormats[contentType] || [];

  if (!supportedExtensions.includes(extension)) {
    return {
      isValid: false,
      errorMessage: `Unsupported ${contentType} format. Supported formats: ${supportedExtensions.join(", ").toUpperCase()}`,
    };
  }

  // Additional validations based on content type
  switch (contentType) {
    case "audio":
      return {
        isValid: true,
        errorMessage: "", // Audio processing is now supported
      };

    case "pdf":
      return {
        isValid: true,
        errorMessage: "", // PDF processing is now supported
      };

    case "image":
      return {
        isValid: true,
        errorMessage: "", // Image processing already working
      };

    case "text":
      return {
        isValid: true,
        errorMessage: "", // Text processing already working
      };

    default:
      return {
        isValid: false,
        errorMessage:
          "File type not supported. Please choose a PDF, image, audio, video, or text file.",
      };
  }
}
