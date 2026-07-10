import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Loader2, AlertCircle, ChevronDown, RefreshCw } from "lucide-react";
import { GlitchText } from "./GlitchText";
import { CaptionResult, CaptionStyle } from "../types";
import { STYLE_CONFIG } from "../utils/styleConfig";

interface CaptionCardProps {
  result: CaptionResult;
  onRegenerate?: (style: CaptionStyle) => void;
}

const springTransition = { type: "spring" as const, stiffness: 500, damping: 30 };

const copyButtonVariants = {
  idle: { scale: 1, backgroundColor: "transparent" },
  success: {
    scale: [1, 1.03, 1],
    backgroundColor: ["rgba(0,255,136,0)", "rgba(0,255,136,0.18)", "rgba(0,255,136,0)"],
    transition: { duration: 0.3 },
  },
};

export const CaptionCard: React.FC<CaptionCardProps> = ({ result, onRegenerate }) => {
  const { style, caption, loading, error, retrying } = result;
  const styleCfg = STYLE_CONFIG[style];
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    setTilt({ x: rotateX, y: rotateY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  const handleCopy = useCallback(async () => {
    if (!caption) return;
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement("textarea");
      textarea.value = caption;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [caption]);

  const getStatusBadge = () => {
    if (retrying) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full
          bg-style-sarcastic/10 border border-style-sarcastic/30 text-style-sarcastic/80 text-xs">
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          >
            <Loader2 className="w-3 h-3 animate-spin" />
          </motion.span>
          Retrying…
        </div>
      );
    }
    if (loading) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full
          bg-secondary/10 border border-secondary/30 text-secondary/80 text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          Generating…
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full
          bg-style-sarcastic/10 border border-style-sarcastic/30 text-style-sarcastic/80 text-xs">
          <AlertCircle className="w-3 h-3" />
          Error
        </div>
      );
    }
    if (!caption && !loading && !retrying) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full
          bg-style-sarcastic/5 border border-style-sarcastic/20 text-style-sarcastic/60 text-xs">
          <AlertCircle className="w-3 h-3" />
          Failed
        </div>
      );
    }
    if (caption) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full
          bg-style-humorous-tech/10 border border-style-humorous-tech/30 text-style-humorous-tech/80 text-xs">
          <Check className="w-3 h-3" />
          Ready
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full
        bg-primary/10 border border-primary/20 text-primary/50 text-xs">
        Pending
      </div>
    );
  };

  return (
    <motion.div
      ref={cardRef}
      data-style={style}
      className="glass-panel neon-border rounded-lg p-0.5 overflow-hidden w-full
        group/card cursor-pointer"
      style={{
        transformPerspective: 1000,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={{ scale: 0.98 }}
    >
      {/* Inner container for 3D tilt */}
      <motion.div
        className="rounded-[7px] overflow-hidden bg-muted/60 h-full scanline-overlay"
        style={{
          rotateX: tilt.x,
          rotateY: tilt.y,
          borderLeft: `4px solid ${styleCfg.accentColor}`,
        }}
        transition={springTransition}
      >

        {/* Header */}
        <div className="relative flex items-center justify-between p-4 pb-2 z-10">
          <div className="flex items-center gap-2">
            <span className="text-lg" role="img" aria-label={styleCfg.label}>
              {styleCfg.emoji}
            </span>
            <GlitchText
              as="h3"
              className="text-sm font-heading font-bold text-secondary tracking-wider uppercase"
              colorA="var(--color-secondary)"
              colorB="var(--color-primary)"
            >
              {styleCfg.label}
            </GlitchText>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <motion.button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="p-1 rounded-full text-foreground/40 hover:text-secondary
                transition-all duration-200 hover:bg-secondary/10"
              whileTap={{ scale: 0.9 }}
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </motion.button>
          </div>
        </div>

        {/* Caption Body */}
        <div className="px-4 pb-2 relative z-10">
          {retrying ? (
            <div className="space-y-2">
              <motion.div
                className="h-4 rounded bg-gradient-to-r from-muted/60 via-primary/10 to-muted/60 bg-[length:200%_100%]"
                animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="h-4 w-3/4 rounded bg-gradient-to-r from-muted/60 via-primary/10 to-muted/60 bg-[length:200%_100%]"
                animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.2 }}
              />
              <motion.div
                className="h-4 w-1/2 rounded bg-gradient-to-r from-muted/60 via-primary/10 to-muted/60 bg-[length:200%_100%]"
                animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.4 }}
              />
            </div>
          ) : !caption && !loading ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-sm text-foreground/30 italic text-center">
                Couldn&apos;t generate this caption — the model didn&apos;t return a valid result.
              </p>
              {onRegenerate && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRegenerate(style); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                    text-xs font-medium text-secondary/70 border border-secondary/20
                    hover:bg-secondary/10 hover:text-secondary hover:border-secondary/40
                    active:scale-[0.97] transition-all duration-150 ease-out
                    focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-secondary"
                >
                  <RefreshCw className="w-3 h-3" />
                  Tap to retry
                </button>
              )}
            </div>
          ) : (
            <p
              className={`text-sm font-mono leading-relaxed text-foreground/90
                ${!expanded ? "line-clamp-3" : ""}`}
            >
              {caption}
            </p>
          )}
        </div>

        {/* Expanded — Full Caption + Copy */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pt-1 pb-3 border-t border-secondary/10 relative z-10">
                {/* Copy Button */}
                <motion.button
                  onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                  variants={copyButtonVariants}
                  animate={copied ? "success" : "idle"}
                  disabled={!caption}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium
                    transition-all duration-200 mt-2
                    ${copied
                      ? "bg-style-humorous-tech/20 text-style-humorous-tech border border-style-humorous-tech/40"
                      : caption
                        ? "bg-secondary/10 text-secondary border border-secondary/30 hover:bg-secondary/20"
                        : "bg-muted/50 text-foreground/20 border border-muted/50 cursor-not-allowed"
                    }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Caption
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        {error && (
          <div className="px-4 pb-3 relative z-10">
            <p className="text-xs text-style-sarcastic/70 flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {error}
            </p>
          </div>
        )}

        {/* Style Neon Bar */}
        <div
          className="h-[2px] w-full mt-1 relative z-10"
          style={{
            background: `linear-gradient(90deg, transparent, ${styleCfg.accentColor}, transparent)`,
            opacity: 0.6,
          }}
        />
      </motion.div>
    </motion.div>
  );
};
