import { Copy, RefreshCw, Check, Save, X } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { CaptionStyle, CaptionResult } from "../types";
import { STYLE_CONFIG } from "../utils/styleConfig";

interface CaptionCardProps {
  result: CaptionResult;
  onRegenerate: (style: CaptionStyle) => void;
  isRegenerating: boolean;
  onEdit?: (style: CaptionStyle, newCaption: string) => void;
  compact?: boolean;
}

export default function CaptionCard({
  result,
  onRegenerate,
  isRegenerating,
  onEdit,
  compact = false,
}: CaptionCardProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(result.caption);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const config = STYLE_CONFIG[result.style];

  // Sync editText when result.caption changes externally (e.g. regenerate)
  useEffect(() => {
    if (!isEditing) {
      setEditText(result.caption);
    }
  }, [result.caption, isEditing]);

  // Auto-focus and select textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = result.caption;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartEdit = () => {
    if (result.loading || result.error || !onEdit) return;
    setEditText(result.caption);
    setIsEditing(true);
  };

  const handleSave = useCallback(() => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== result.caption && onEdit) {
      onEdit(result.style, trimmed);
    }
    setIsEditing(false);
  }, [editText, result.caption, result.style, onEdit]);

  const handleCancel = useCallback(() => {
    setEditText(result.caption);
    setIsEditing(false);
  }, [result.caption]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isEditing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, handleSave, handleCancel]);

  // --- Action buttons (shared between compact and full layouts) ---
  const actionButtons = (
    <div className="flex items-center gap-1">
      {/* Regenerate */}
      <button
        onClick={() => onRegenerate(result.style)}
        disabled={isRegenerating || isEditing}
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
        <RefreshCw
          className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`}
        />
      </button>

      {/* Copy */}
      <button
        onClick={handleCopy}
        disabled={isEditing}
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
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );

  // --- Caption content (shared) ---
  const captionContent = (
    <div className="flex-1 min-w-0">
      {result.loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      ) : result.error ? (
        <p className="text-sm text-destructive italic">{result.error}</p>
      ) : isEditing ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="
              w-full min-h-[80px] p-3 resize-y rounded-lg
              text-sm text-foreground leading-relaxed
              bg-background border border-primary/30
              focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
              transition-all duration-150
              placeholder:text-muted-foreground
            "
            placeholder="Write your caption..."
            rows={3}
          />
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={handleCancel}
              className="
                p-1.5 rounded-lg text-muted-foreground
                hover:bg-muted hover:text-foreground
                transition-all duration-150 ease-out
                active:scale-[0.97]
              "
              aria-label="Cancel editing"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={handleSave}
              disabled={!editText.trim()}
              className="
                p-1.5 rounded-lg
                bg-primary/15 text-primary
                hover:bg-primary/25
                transition-all duration-150 ease-out
                active:scale-[0.97]
                disabled:opacity-40 disabled:cursor-not-allowed
              "
              aria-label="Save caption"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <p
          onClick={handleStartEdit}
          className={`
            text-sm text-foreground leading-relaxed whitespace-pre-wrap
            ${onEdit ? "cursor-pointer rounded-lg -mx-1.5 -my-1 px-1.5 py-1 hover:bg-foreground/5 transition-colors duration-100" : ""}
          `}
          title={onEdit ? "Click to edit" : undefined}
        >
          {result.caption || "Waiting..."}
        </p>
      )}
    </div>
  );

  // --- Compact layout (stacked view) ---
  if (compact) {
    return (
      <motion.div
        whileHover={{ y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.08)" }}
        className={`
          relative flex items-start gap-4 p-4 rounded-xl border bg-muted
          bg-gradient-to-br ${config.gradient}
          transition-all duration-300 ease-out
        `}
      >
        {/* Left: emoji + label */}
        <div className="flex-shrink-0 flex items-center gap-2 min-w-[130px] pt-0.5">
          <span className="text-lg" role="img" aria-hidden="true">
            {config.emoji}
          </span>
          <h3 className="font-heading font-semibold text-foreground text-sm whitespace-nowrap">
            {config.label}
          </h3>
        </div>

        {/* Center: caption */}
        {captionContent}

        {/* Right: actions */}
        <div className="flex-shrink-0">{actionButtons}</div>
      </motion.div>
    );
  }

  // --- Full card layout (grid view) ---
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.08)" }}
      className={`
        relative flex flex-col p-5 rounded-xl border bg-muted
        bg-gradient-to-br ${config.gradient}
        transition-all duration-300 ease-out
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
        {actionButtons}
      </div>

      {/* Caption text */}
      {captionContent}
    </motion.div>
  );
}
