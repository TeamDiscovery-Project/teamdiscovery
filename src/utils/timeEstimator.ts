/**
 * Dynamic time estimator for the video processing pipeline.
 *
 * Factors that affect each step's duration:
 *   - compress:   needs real-time playback (~1.05× duration) if file > 38MB, else trivial
 *   - upload:     compressed file size / upload speed (~5 MB/s via Supabase CDN)
 *   - frames:     each frame ~0.15s; frame count = max(1, floor((duration - 0.5) / 3))
 *   - transcribe: audio processing ~0.15× real-time via Groq
 *   - describe:   Vision API ~2.5s per frame (API latency + inference)
 *   - captions:   LLM ~2s per style (4 styles) + network overhead
 */

const UPLOAD_SPEED_MBPS = 5;     // Supabase CDN is fast — ~5 MB/s observed
const TARGET_SIZE_MB = 38;
const TOTAL_STYLES = 4;
const DESCRIBE_PER_FRAME = 2.5;  // seconds per vision-model frame description (~2-3s API latency + inference)
const CAPTION_PER_STYLE = 2;     // seconds per LLM caption generation
const FRAME_EXTRACT_PER = 0.15;  // seconds per canvas frame extraction

export interface PipelineEstimates {
  /** Per-step estimates in seconds */
  steps: Record<string, number>;
  /** Total pipeline estimate in seconds */
  total: number;
  /** Number of frames that will be extracted */
  frameCount: number;
}

/**
 * Calculate processing time estimates for all pipeline steps.
 * @param fileSizeBytes  Size of the original video file in bytes
 * @param durationSeconds  Duration of the video in seconds
 * @returns Per-step and total estimates
 */
export function calculateEstimates(
  fileSizeBytes: number,
  durationSeconds: number
): PipelineEstimates {
  const fileSizeMB = fileSizeBytes / (1024 * 1024);
  const needsCompression = fileSizeMB > TARGET_SIZE_MB;

  // Frame count: start at 3s, every 3s, skip last 0.5s. At least 1.
  const frameCount = Math.max(1, Math.floor((durationSeconds - 0.5) / 3));

  // ── Step 1: Compress ──────────────────────────────────────────
  // If compression needed, MediaRecorder plays video at 1× speed with slight
  // encoding overhead (~5%). If already under 38MB, it's a 1s pass-through.
  const compress = needsCompression
    ? Math.round(durationSeconds * 1.05)
    : 1;

  // ── Step 2: Upload ────────────────────────────────────────────
  // The uploaded file is either the compressed version (~38MB) or the original.
  const uploadSizeMB = needsCompression ? TARGET_SIZE_MB : fileSizeMB;
  const upload = Math.max(3, Math.round(uploadSizeMB / UPLOAD_SPEED_MBPS));

  // ── Step 3: Extract frames ────────────────────────────────────
  // Canvas extraction: seek + drawImage + toDataURL per frame, ~0.15s each.
  const frames = Math.max(2, Math.round(frameCount * FRAME_EXTRACT_PER));

  // ── Step 4: Transcribe ────────────────────────────────────────
  // Groq Whisper processes at ~0.15× real-time for short clips.
  const transcribe = Math.round(Math.max(4, durationSeconds * 0.15));

  // ── Step 5: Describe frames ───────────────────────────────────
  // Vision model ~2.5s per frame (API latency + inference).
  const describe = Math.max(8, Math.round(frameCount * DESCRIBE_PER_FRAME));

  // ── Step 6: Generate captions ─────────────────────────────────
  // 4 styles × ~3s each (LLM inference + network). Fairly constant.
  const captions = Math.round(TOTAL_STYLES * CAPTION_PER_STYLE);

  const steps: Record<string, number> = {
    compress,
    upload,
    frames,
    transcribe,
    describe,
    captions,
  };

  const total = Object.values(steps).reduce((sum, v) => sum + v, 0);

  return { steps, total, frameCount };
}

/**
 * Calculate remaining time from current step. Sums the current step's
 * estimate plus all future steps. For the "~X remaining" display.
 */
export function calculateRemaining(
  stepEstimates: Record<string, number>,
  currentStep: string
): number {
  const stepKeys = ["compress", "upload", "frames", "transcribe", "describe", "captions"];
  const currentIdx = stepKeys.indexOf(currentStep);

  if (currentIdx === -1) return 0;

  let remaining = 0;
  for (let i = currentIdx; i < stepKeys.length; i++) {
    remaining += stepEstimates[stepKeys[i]] || 0;
  }

  return remaining;
}
