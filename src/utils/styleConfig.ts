import { CaptionStyle } from "../types";

export const STYLE_CONFIG: Record<CaptionStyle, { label: string; emoji: string; gradient: string; accentColor: string }> = {
  formal: {
    label: "Formal",
    emoji: "🎩",
    gradient: "from-style-formal/10 to-style-formal/5 border-style-formal/20",
    accentColor: "#00f0ff",
  },
  sarcastic: {
    label: "Sarcastic",
    emoji: "😏",
    gradient: "from-style-sarcastic/10 to-style-sarcastic/5 border-style-sarcastic/20",
    accentColor: "#ff2d95",
  },
  humorous_tech: {
    label: "Humorous Tech",
    emoji: "🤖",
    gradient: "from-style-humorous-tech/10 to-style-humorous-tech/5 border-style-humorous-tech/20",
    accentColor: "#00ff88",
  },
  humorous_non_tech: {
    label: "Humorous Non‑Tech",
    emoji: "😂",
    gradient: "from-style-humorous-nontech/10 to-style-humorous-nontech/5 border-style-humorous-nontech/20",
    accentColor: "#ffaa00",
  },
};
