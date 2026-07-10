import { useState, useRef, useEffect } from "react";
import { LayoutGrid, AlignJustify, Copy, Check, Download, FileText, FileJson } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { CaptionCard } from "./CaptionCard";
import { CaptionStyle, CaptionResult, StepTiming } from "../types";
import { STYLE_CONFIG } from "../utils/styleConfig";

type ViewMode = "grid" | "stack";

interface ResultsPanelProps {
  results: CaptionResult[];
  onRegenerate: (style: CaptionStyle) => void;
  regeneratingStyles: Set<CaptionStyle>;
  onEditCaption?: (style: CaptionStyle, newCaption: string) => void;
  timings?: StepTiming[];
}

function formatCaptionsForCopy(results: CaptionResult[]): string {
  return results
    .map((r) => {
      const config = STYLE_CONFIG[r.style];
      return `${config.emoji} ${config.label}\n${r.caption}`;
    })
    .join("\n\n");
}

function formatCaptionsForJson(results: CaptionResult[]): object[] {
  return results.map((r) => ({
    style: r.style,
    label: STYLE_CONFIG[r.style].label,
    caption: r.caption,
  }));
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ResultsPanel({
  results,
  onRegenerate,
  regeneratingStyles,
  onEditCaption,
  timings,
}: ResultsPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [copiedAll, setCopiedAll] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);

  // Close download dropdown on outside click
  useEffect(() => {
    if (!downloadOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setDownloadOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [downloadOpen]);

  const handleCopyAll = async () => {
    const text = formatCaptionsForCopy(results);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast.success("All 4 captions copied!");
  };

  const handleDownloadTxt = () => {
    const text = formatCaptionsForCopy(results);
    downloadFile(text, "captions.txt", "text/plain");
    setDownloadOpen(false);
  };

  const handleDownloadJson = () => {
    const json = formatCaptionsForJson(results);
    downloadFile(JSON.stringify(json, null, 2), "captions.json", "application/json");
    setDownloadOpen(false);
  };

  if (results.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-foreground/30"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
            />
          </svg>
        </div>
        <h3 className="font-heading font-semibold text-foreground text-lg mb-1">
          Your captions will appear here
        </h3>
        <p className="text-sm text-foreground/40 max-w-sm">
          Upload a video and we'll generate four unique caption styles — each with
          its own personality. The magic starts when you hit that upload button!
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-4 md:p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Left: count */}
        <p className="text-sm neon-text-cyan font-medium">
          {results.length} Caption{results.length !== 1 ? "s" : ""}
        </p>

        {/* Right: controls */}
        <div className="flex items-center gap-1">
          {/* View toggle — neon styled */}
          <div className="flex items-center rounded-lg overflow-hidden neon-border mr-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`
                p-1.5 transition-all duration-150 ease-out
                active:scale-[0.97]
                ${viewMode === "grid"
                  ? "bg-accent text-white shadow-[0_0_10px_var(--color-accent)]"
                  : "text-foreground/40 hover:text-foreground/80 bg-background/30"
                }
              `}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("stack")}
              className={`
                p-1.5 transition-all duration-150 ease-out
                active:scale-[0.97]
                ${viewMode === "stack"
                  ? "bg-accent text-white shadow-[0_0_10px_var(--color-accent)]"
                  : "text-foreground/40 hover:text-foreground/80 bg-background/30"
                }
              `}
              aria-label="Stack view"
              aria-pressed={viewMode === "stack"}
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>

          {/* Copy All */}
          <button
            onClick={handleCopyAll}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-150 ease-out
              active:scale-[0.97]
              focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-secondary
              ${copiedAll
                ? "bg-secondary/15 text-secondary shadow-[0_0_8px_var(--color-secondary)]"
                : "text-foreground/40 hover:text-foreground/80"
              }
            `}
            aria-label={copiedAll ? "All copied!" : "Copy all captions"}
          >
            {copiedAll ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Copy All</span>
          </button>

          {/* Download */}
          <div ref={downloadRef} className="relative">
            <button
              onClick={() => setDownloadOpen((prev) => !prev)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                transition-all duration-150 ease-out
                active:scale-[0.97]
                focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-secondary
                text-foreground/40 hover:text-foreground/80
              `}
              aria-label="Download captions"
              aria-haspopup="true"
              aria-expanded={downloadOpen}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {downloadOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="
                  absolute right-0 top-full mt-1 w-44 py-1 rounded-lg
                  glass-panel border border-white/5 shadow-lg z-20
                "
                role="menu"
              >
                <button
                  onClick={handleDownloadTxt}
                  className="
                    w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground
                    hover:bg-white/5 transition-colors duration-100
                  "
                  role="menuitem"
                >
                  <FileText className="w-4 h-4 text-foreground/40" />
                  Plain Text (.txt)
                </button>
                <button
                  onClick={handleDownloadJson}
                  className="
                    w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground
                    hover:bg-white/5 transition-colors duration-100
                  "
                  role="menuitem"
                >
                  <FileJson className="w-4 h-4 text-foreground/40" />
                  JSON (.json)
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Timing breakdown */}
      {timings && timings.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-foreground/50 font-mono flex-wrap">
          <span className="text-foreground/40">⏱</span>
          <span>
            Processing:{" "}
            {((timings.find((t) => t.step === "total")?.ms ?? 0) / 1000).toFixed(1)}s
          </span>
          <span className="text-foreground/20">·</span>
          {timings
            .filter((t) => t.step !== "total")
            .map((t, i) => (
              <span key={t.step} className="inline-flex items-center gap-1">
                {i > 0 && <span className="text-foreground/20">·</span>}
                <span className="text-foreground/40">{t.step}:</span>
                <span className={t.ms > 5000 ? "text-warning" : ""}>
                  {(t.ms / 1000).toFixed(1)}s
                  {t.ms > 5000 && (
                    <span className="ml-0.5 text-[10px]" title="This step took longer than 5 seconds">
                      ⚠️
                    </span>
                  )}
                </span>
              </span>
            ))}
        </div>
      )}

      {/* Neon divider */}
      <div className="neon-divider" />

      {/* Cards */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((result, i) => (
            <motion.div
              key={result.style}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.35,
                delay: i * 0.1,
                ease: [0.23, 1, 0.32, 1],
              }}
            >
              <CaptionCard
                result={result}
                onRegenerate={onRegenerate}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((result, i) => (
            <motion.div
              key={result.style}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                delay: i * 0.08,
                ease: "easeOut",
              }}
            >
              <CaptionCard
                result={result}
                onRegenerate={onRegenerate}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
