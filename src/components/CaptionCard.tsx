import { Copy, RefreshCw, Check } from "lucide-react";
import { useState } from "react";
import { CaptionStyle, CaptionResult } from "../types";

interface CaptionCardProps {
  result: CaptionResult;
  onRegenerate: (style: CaptionStyle) => void;
  isRegenerating: boolean;
}

const STYLE_CONFIG: Record<CaptionStyle, { label: string; emoji: string; gradient: string }> = {
  formal: {
    label: "Formal",
    emoji: "🎩",
    gradient: "from-blue-500/10 to-blue-600/5 border-blue-500/20",
  },
  sarcastic: {
    label: "Sarcastic",
    emoji: "😏",
    gradient: "from-amber-500/10 to-amber-600/5 border-amber-500/20",
  },
  humorous_tech: {
    label: "Humorous Tech",
    emoji: "🤖",
    gradient: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20",
  },
  humorous_non_tech: {
    label: "Humorous Non‑Tech",
    emoji: "😂",
    gradient: "from-purple-500/10 to-purple-600/5 border-purple-500/20",
  },
};

export default function CaptionCard({ result, onRegenerate, isRegenerating }: CaptionCardProps) {
  const [copied, setCopied] = useState(false);
  const config = STYLE_CONFIG[result.style];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = result.caption;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`
        relative flex flex-col p-5 rounded-xl border bg-muted
        bg-gradient-to-br ${config.gradient}
        transition-all duration-300 ease-out
        hover:shadow-md hover:-translate-y-0.5
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-hidden="true">
            {config.emoji}
          </span>
          <h3 className="font-heading font-semibold text-foreground text-sm">
            {config.label}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          {/* Regenerate */}
          <button
            onClick={() => onRegenerate(result.style)}
            disabled={isRegenerating}
            className={`
              p-2 rounded-lg text-muted-foreground
              hover:bg-muted hover:text-foreground
              transition-all duration-150 ease-out
              active:scale-[0.97]
              focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            aria-label={`Regenerate ${config.label} caption`}
          >
            <RefreshCw className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`} />
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className={`
              p-2 rounded-lg
              transition-all duration-150 ease-out
              active:scale-[0.97]
              focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary
              ${copied
                ? "bg-emerald-500/15 text-emerald-600"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }
            `}
            aria-label={copied ? "Copied!" : `Copy ${config.label} caption`}
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Caption text */}
      <div className="flex-1">
        {result.loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        ) : result.error ? (
          <p className="text-sm text-destructive italic">
            {result.error}
          </p>
        ) : (
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {result.caption || "Waiting..."}
          </p>
        )}
      </div>
    </div>
  );
}
