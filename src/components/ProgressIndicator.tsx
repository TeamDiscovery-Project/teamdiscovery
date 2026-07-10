import { motion } from "framer-motion";
import { Check, Loader2, AlertCircle, Clock, Timer } from "lucide-react";
import { calculateRemaining } from "../utils/timeEstimator";

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

function Diamond({
  state,
  children,
}: {
  state: "done" | "active" | "idle";
  children: React.ReactNode;
}) {
  const baseClasses =
    "relative w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center flex-shrink-0 transition-colors duration-500";

  const stateClasses =
    state === "done"
      ? "bg-style-humorous-tech/20 text-style-humorous-tech rotate-45"
      : state === "active"
        ? "bg-primary/15 text-primary rotate-45"
        : "bg-muted/30 text-foreground/40 rotate-45";

  return (
    <motion.div
      className={`${baseClasses} ${stateClasses}`}
      style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
      animate={
        state === "active"
          ? {
              boxShadow: [
                "0 0 6px 1px rgba(0,240,255,0.25)",
                "0 0 18px 4px rgba(0,240,255,0.5)",
                "0 0 6px 1px rgba(0,240,255,0.25)",
              ],
            }
          : {}
      }
      transition={{
        duration: 2,
        repeat: state === "active" ? Infinity : 0,
        ease: "easeInOut",
      }}
    >
      {/* Inner content (counter-rotated) */}
      <span className="relative -rotate-45 flex items-center justify-center">
        {children}
      </span>
    </motion.div>
  );
}

function ConnectingLine({
  state,
}: {
  state: "done" | "active" | "idle";
}) {
  return (
    <div className="flex-1 flex items-center px-0.5 min-w-[8px]">
      <div
        className={`
          h-[2px] w-full transition-all duration-500
          ${state === "done" ? "bg-gradient-to-r from-style-humorous-tech to-style-humorous-tech" : ""}
          ${state === "active" ? "bg-gradient-to-r from-style-humorous-tech to-primary/30" : ""}
          ${state === "idle" ? "bg-border/30" : ""}
        `}
      />
    </div>
  );
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
  const totalRemaining = calculateRemaining(stepEstimates, currentStep);

  return (
    <div className="space-y-6">
      {/* Circuit-node step indicators */}
      <div className="flex items-center gap-0">
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
              className="flex-1 flex flex-col items-center gap-1.5 min-w-0"
            >
              <div className="flex items-center w-full">
                {/* Leading connector */}
                {i > 0 && (
                  <ConnectingLine
                    state={
                      isDone || isActive ? (isActive ? "active" : "done") : "idle"
                    }
                  />
                )}

                {/* Diamond node */}
                <Diamond state={stepState}>
                  {error && isActive ? (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  ) : isDone ? (
                    <Check className="w-5 h-5" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span className="text-xs font-semibold">{i + 1}</span>
                  )}
                </Diamond>

                {/* Trailing connector */}
                {i < STEPS.length - 1 && (
                  <ConnectingLine
                    state={
                      isDone ? "done" : isActive ? "active" : "idle"
                    }
                  />
                )}
              </div>

              {/* Label */}
              <span
                className={`
                  text-[9px] sm:text-[11px] text-center leading-tight px-0.5
                  whitespace-nowrap transition-colors duration-300
                  ${isActive ? "text-secondary font-semibold" : "text-foreground/40"}
                `}
              >
                {step.label}
              </span>

            </div>
          );
        })}
      </div>

      {/* Status bar — model badge + timer + ETA */}
      {currentStep !== "done" && !error && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs text-foreground/40 rounded-xl px-4 py-2.5"
        >
          {/* Model badge */}
          {activeModel && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {activeModel}
            </span>
          )}

          {/* Timer */}
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-secondary" />
            Elapsed: {formatTime(stepElapsed)}
          </span>

          {/* Total remaining */}
          {totalRemaining > 0 && (
            <span className="flex items-center gap-1.5 text-secondary font-medium">
              <Timer className="w-3.5 h-3.5" />
              ~{formatTime(totalRemaining)} estimated
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
