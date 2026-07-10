export type CaptionStyle =
  | "formal"
  | "sarcastic"
  | "humorous_tech"
  | "humorous_non_tech";

export type JobStatus = "uploaded" | "processing" | "ready" | "error";

export interface Job {
  id: string;
  storage_path: string;
  filename: string;
  duration_seconds: number;
  status: JobStatus;
  transcript: string | null;
  frame_descriptions: Record<string, string> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Caption {
  id: string;
  job_id: string;
  style: CaptionStyle;
  caption: string;
  created_at: string;
}

export interface CaptionResults {
  formal: string;
  sarcastic: string;
  humorous_tech: string;
  humorous_non_tech: string;
}

export const CAPTION_STYLES: {
  key: CaptionStyle;
  label: string;
  color: string;
  icon: string;
}[] = [
  {
    key: "formal",
    label: "Formal",
    color: "var(--color-style-formal)",
    icon: "briefcase",
  },
  {
    key: "sarcastic",
    label: "Sarcastic",
    color: "var(--color-style-sarcastic)",
    icon: "smile",
  },
  {
    key: "humorous_tech",
    label: "Humorous (Tech)",
    color: "var(--color-style-humorous-tech)",
    icon: "terminal",
  },
  {
    key: "humorous_non_tech",
    label: "Humorous (Non-Tech)",
    color: "var(--color-style-humorous-nontech)",
    icon: "sparkles",
  },
];

/** Caption validation result from captionValidator */
export interface ValidationResult {
  valid: boolean;
  reason?: string;   // why it failed (for logging)
  cleaned?: string;  // best-effort cleaned version
}

/** UI-level caption state for rendering */
export interface CaptionResult {
  style: CaptionStyle;
  caption: string;
  loading: boolean;
  error: string | null;
  retrying?: boolean;  // set when the system is auto-retrying this caption
}

export const CAPTION_STYLE_LABELS: Record<CaptionStyle, string> = {
  formal: "Formal",
  sarcastic: "Sarcastic",
  humorous_tech: "Humorous (Tech)",
  humorous_non_tech: "Humorous (Non-Tech)",
};

/** Timing instrumentation for a single pipeline step */
export interface StepTiming {
  step: string;
  ms: number;
}

export const CAPTION_STYLE_COLORS: Record<CaptionStyle, string> = {
  formal: "var(--color-style-formal)",
  sarcastic: "var(--color-style-sarcastic)",
  humorous_tech: "var(--color-style-humorous-tech)",
  humorous_non_tech: "var(--color-style-humorous-nontech)",
};
