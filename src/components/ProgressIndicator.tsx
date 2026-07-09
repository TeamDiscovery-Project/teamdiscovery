import { Check, Loader2, Clock } from "lucide-react";

export type PipelineStep =
  | "compress"
  | "upload"
  | "frames"
  | "transcribe"
  | "describe"
  | "captions"
  | "done";

interface StepInfo {
  label: string;
  description: string;
}

const STEPS: Record<PipelineStep, StepInfo> = {
  compress: { label: "Compress", description: "Optimizing video for upload" },
  upload: { label: "Upload", description: "Sending to the cloud" },
  frames: { label: "Extract Frames", description: "Pulling key moments from your video" },
  transcribe: { label: "Transcribe", description: "Turning speech into text" },
  describe: { label: "Describe Frames", description: "Understanding what's happening visually" },
  captions: { label: "Generate Captions", description: "Crafting four unique styles" },
  done: { label: "Done", description: "Your captions are ready!" },
};

const STEP_ORDER: PipelineStep[] = [
  "compress",
  "upload",
  "frames",
  "transcribe",
  "describe",
  "captions",
  "done",
];

interface ProgressIndicatorProps {
  currentStep: PipelineStep;
  error?: string | null;
}

export default function ProgressIndicator({ currentStep, error }: ProgressIndicatorProps) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="w-full" role="status" aria-label="Processing progress">
      <div className="flex items-center justify-between gap-1">
        {STEP_ORDER.map((step, index) => {
          const stepInfo = STEPS[step];
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={step} className="flex-1 flex flex-col items-center">
              {/* Connector line (above on desktop, hidden on mobile) */}
              <div className="hidden sm:flex items-center w-full mb-2">
                {index > 0 && (
                  <div
                    className={`flex-1 h-0.5 rounded-full transition-colors duration-500 ${
                      isCompleted || isCurrent
                        ? "bg-primary"
                        : "bg-muted-foreground/20"
                    }`}
                  />
                )}
                {index < STEP_ORDER.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 rounded-full transition-colors duration-500 ${
                      isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                    }`}
                  />
                )}
              </div>

              {/* Step circle */}
              <div
                className={`
                  relative w-10 h-10 rounded-full flex items-center justify-center
                  transition-all duration-300 ease-out
                  ${isCompleted
                    ? "bg-primary text-on-primary"
                    : isCurrent
                      ? "bg-primary/15 text-primary ring-2 ring-primary/30 ring-offset-2"
                      : "bg-muted text-muted-foreground"
                  }
                `}
              >
                {isCompleted && <Check className="w-5 h-5" />}
                {isCurrent && !error && (
                  <Loader2 className="w-5 h-5 animate-spin" />
                )}
                {isCurrent && error && (
                  <Clock className="w-5 h-5" />
                )}
                {isPending && (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={`
                  mt-2 text-xs font-medium text-center leading-tight
                  ${isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"}
                `}
              >
                {stepInfo.label}
              </span>

              {/* Current step description */}
              {isCurrent && !error && (
                <span className="text-xs text-muted-foreground mt-1 text-center animate-pulse">
                  {stepInfo.description}...
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Full-width progress bar for mobile */}
      <div className="mt-4 sm:hidden">
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${(currentIndex / (STEP_ORDER.length - 1)) * 100}%`,
            }}
          />
        </div>
        {currentStep !== "done" && !error && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            {STEPS[currentStep].description}...
          </p>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive text-center">
          {error}
        </div>
      )}
    </div>
  );
}
