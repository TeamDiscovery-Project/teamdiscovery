import CaptionCard from "./CaptionCard";
import { CaptionStyle, CaptionResult } from "../types";

interface ResultsPanelProps {
  results: CaptionResult[];
  onRegenerate: (style: CaptionStyle) => void;
  regeneratingStyles: Set<CaptionStyle>;
}

export default function ResultsPanel({ results, onRegenerate, regeneratingStyles }: ResultsPanelProps) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-muted-foreground"
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
        <p className="text-sm text-muted-foreground max-w-sm">
          Upload a video and we'll generate four unique caption styles — each with
          its own personality. The magic starts when you hit that upload button!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {results.map((result) => (
        <CaptionCard
          key={result.style}
          result={result}
          onRegenerate={onRegenerate}
          isRegenerating={regeneratingStyles.has(result.style)}
        />
      ))}
    </div>
  );
}
