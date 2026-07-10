import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, Film, AlertCircle } from "lucide-react";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function UploadZone({ onFileSelected, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith("video/")) {
      return "This doesn't look like a video file. Try an MP4, WebM, or MOV.";
    }
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      const typeError = validateFile(file);
      if (typeError) {
        setError(typeError);
        return;
      }

      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      const url = URL.createObjectURL(file);
      video.src = url;

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        const duration = video.duration;

        if (!isFinite(duration) || duration < 30) {
          setError("Your video is too short. We need at least 30 seconds to work our magic.");
          return;
        }
        if (duration > 120) {
          setError("That's a bit long! Keep it under 2 minutes (120 seconds) for best results.");
          return;
        }

        onFileSelected(file);
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        setError("We couldn't read that video file. Try another format?");
      };
    },
    [onFileSelected]
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        className={`
          relative flex flex-col items-center justify-center w-full min-h-[280px]
          rounded-2xl cursor-pointer
          transition-all duration-300 ease-out
          group
          ${
            isDragging
              ? "glass-panel neon-border scale-[1.01] animate-pulse-glow"
              : disabled
                ? "glass-panel border-border/30 cursor-not-allowed opacity-50"
                : "glass-panel neon-border hover:scale-[1.01]"
          }
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
        `}
        aria-label="Upload a video file"
        aria-describedby={error ? "upload-error" : undefined}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
          disabled={disabled}
        />

        {/* Drag-over glow ring */}
        {isDragging && (
          <motion.div
            className="absolute inset-4 rounded-2xl border-2 border-primary/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.02, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ filter: "blur(2px)" }}
          />
        )}

        <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          {isDragging ? (
            <>
              <motion.div
                className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center"
                animate={{ transform: "translateY(-4px)" }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              >
                <Film className="w-8 h-8 text-primary" />
              </motion.div>
              <p className="text-lg font-semibold text-foreground neon-text">
                Drop it like it's hot!
              </p>
              <p className="text-sm text-secondary/80">
                We'll take it from here
              </p>
            </>
          ) : (
            <>
              <motion.div
                className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center"
                animate={{ transform: "translateY(-6px)" }}
                transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              >
                <Upload className="w-8 h-8 text-secondary" />
              </motion.div>
              <div>
                <p className="text-lg font-semibold text-foreground">
                  Drop your video here
                </p>
                <p className="text-sm text-secondary/80 mt-1">
                  or click to browse — MP4, WebM, MOV
                </p>
              </div>
              <span className="text-xs text-foreground/40 bg-surface px-3 py-1 rounded-full border border-border">
                30–120 seconds ideal
              </span>
            </>
          )}
        </div>
      </div>

      {error && (
        <div
          id="upload-error"
          role="alert"
          className="mt-3 flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
