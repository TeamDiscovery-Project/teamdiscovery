import { CaptionStyle } from "../types";

export const STYLE_CONFIG: Record<CaptionStyle, { label: string; emoji: string; gradient: string }> = {
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
