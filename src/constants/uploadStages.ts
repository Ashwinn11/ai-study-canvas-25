import { TIMEOUTS } from "./config";

export type UploadStageId =
  | "validating"
  | "reading"
  | "extracting"
  | "generating"
  | "finalizing"
  | "completed";

export interface UploadStageDefinition {
  id: UploadStageId;
  progress: number;
  minMessageDurationMs: number;
}

export const UPLOAD_STAGE_SEQUENCE: UploadStageDefinition[] = [
  {
    id: "validating",
    progress: 0.05,
    minMessageDurationMs: TIMEOUTS.UPLOAD_STAGE_VALIDATION,
  },
  {
    id: "reading",
    progress: 0.18,
    minMessageDurationMs: TIMEOUTS.UPLOAD_STAGE_READING,
  },
  {
    id: "extracting",
    progress: 0.45,
    minMessageDurationMs: TIMEOUTS.UPLOAD_STAGE_EXTRACTING,
  },
  {
    id: "generating",
    progress: 0.82,
    minMessageDurationMs: TIMEOUTS.UPLOAD_STAGE_GENERATING,
  },
  {
    id: "finalizing",
    progress: 0.95,
    minMessageDurationMs: TIMEOUTS.UPLOAD_STAGE_FINALIZING,
  },
  {
    id: "completed",
    progress: 1,
    minMessageDurationMs: TIMEOUTS.UPLOAD_STAGE_COMPLETED,
  },
];

export const UPLOAD_STAGE_PROGRESS: Record<UploadStageId, number> =
  UPLOAD_STAGE_SEQUENCE.reduce(
    (map, stage) => {
      map[stage.id] = stage.progress;
      return map;
    },
    {} as Record<UploadStageId, number>,
  );

export const UPLOAD_STAGE_INDEX: Record<UploadStageId, number> =
  UPLOAD_STAGE_SEQUENCE.reduce(
    (map, stage, index) => {
      map[stage.id] = index + 1; // 1-based to align with legacy step usage
      return map;
    },
    {} as Record<UploadStageId, number>,
  );

export const isUploadStageId = (value: string): value is UploadStageId =>
  Object.prototype.hasOwnProperty.call(UPLOAD_STAGE_PROGRESS, value);

export const UPLOAD_STAGE_MESSAGE_DURATION: Record<UploadStageId, number> =
  UPLOAD_STAGE_SEQUENCE.reduce(
    (map, stage) => {
      map[stage.id] = stage.minMessageDurationMs;
      return map;
    },
    {} as Record<UploadStageId, number>,
  );

// Extended to ensure navigation happens while progress screen is visible (smooth transition)
// Navigation happens at 500ms, dismissal at 1500ms
export const COMPLETION_DISMISS_DELAY_MS = TIMEOUTS.UI_COMPLETION_DISMISS;
