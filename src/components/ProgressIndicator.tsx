import { motion } from "framer-motion";
import { Check, Loader2, AlertCircle, Clock } from "lucide-react";

export type PipelineStep =
  | "upload"
  | "compress"
  | "frames"
  | "transcribe"
  | "describe"
  | "captions"
  | "done";

const STEPS: { key: PipelineStep; label: string }[] = [
  { key: "compress", label: "Compress" },
  { key: "upload", label: "Upload" },
  { key: "frames", label: "Extract Frames" },
  { key: "transcribe", label: "Transcribe" },
  { key: "describe", label: "Describe Frames" },
  { key: "captions", label: "Generate Captions" },
];

interface ProgressIndicatorProps {
  currentStep: PipelineStep;
  error: string | null;
  stepElapsed: number;
  stepTimes: Record<string, number>;
  activeModel: string | null;
  stepEstimates: Record<string, number>;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function ProgressIndicator({
  currentStep,
  error,
  stepElapsed,
  stepTimes,
  activeModel,
  stepEstimates,
}: ProgressIndicatorProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-start gap-2 sm:gap-3">
        {STEPS.map((step, i) => {
          const stepState =
            currentStep === "done" || i < currentIndex
              ? "done"
              : i === currentIndex
              ? "active"
              : "idle";

          const isDone = stepState === "done";
          const isActive = stepState === "active";

          return (
            <div
              key={step.key}
              className="flex-1 flex flex-col items-center gap-2 min-w-0"
            >
              {/* Icon circle */}
              <motion.div
                className={`
                  relative w-10 h-10 rounded-full flex items-center justify-center
                  flex-shrink-0 transition-colors duration-300
                  ${
                    isDone
                      ? "bg-primary text-on-primary"
                      : isActive
                      ? "bg-primary/15 text-primary ring-2 ring-primary/40"
                      : "bg-muted text-muted-foreground"
                  }
                `}
                animate={
                  isActive
                    ? {
                        boxShadow: [
                          "0 0 0 0px rgba(var(--color-primary-rgb, 99, 102, 241), 0.4)",
                          "0 0 0 8px rgba(var(--color-primary-rgb, 99, 102, 241), 0)",
                        ],
                      }
                    : {}
                }
                transition={{
                  duration: 2,
                  repeat: isActive ? Infinity : 0,
                  ease: "easeInOut",
                }}
              >
                {error && isActive ? (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                ) : isDone ? (
                  <Check className="w-5 h-5" />
                ) : isActive ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="text-xs font-semibold">{i + 1}</span>
                )}

                {/* Active glow ring */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary/50"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </motion.div>

              {/* Label */}
              <span
                className={`
                  text-[10px] sm:text-xs text-center leading-tight
                  transition-colors duration-300
                  ${isActive ? "text-foreground font-semibold" : "text-muted-foreground"}
                `}
              >
                {step.label}
              </span>

              {/* Completed duration badge */}
              {isDone && stepTimes[step.key] !== undefined && (
                <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(stepTimes[step.key])}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Status bar — model badge + timer + ETA */}
      {currentStep !== "done" && !error && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-4 text-xs text-muted-foreground bg-muted/50 rounded-xl px-4 py-2.5 border border-border/50"
        >
          {/* Model badge */}
          {activeModel && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {activeModel}
            </span>
          )}

          {/* Timer */}
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Elapsed: {formatTime(stepElapsed)}
          </span>

          {/* ETA */}
          {stepEstimates[currentStep] && (
            <span className="text-muted-foreground/60">
              ~{formatTime(stepEstimates[currentStep])} estimated
            </span>
          )}
        </motion.div>
      )}

      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive text-center"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
}
