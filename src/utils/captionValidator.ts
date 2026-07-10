import type { ValidationResult } from "../types";

// ── Reasoning patterns ──────────────────────────────────────────
// If raw text matches any of these, it's likely AI thinking-out-loud.

const REASONING_PREFIXES = [
  /^(so|here|this|that|a|an|the)\s+(caption|response|idea|option|suggestion|possible|good|better|funny|witty|clever)\s+(could|would|might|may|should|can|will|is|are|was|were)\b/i,
  /^(ideas?|thoughts?|options?|possibilities?|suggestions?|angles?)\s*[:—\-–]\s*/i,
  /^(i|we)\s+(think|believe|feel|suggest|recommend|would|might|could)\b/i,
  /^here'?s?\s+(a|an|some|the|what|my|our)\b/i,
  /^(possible|maybe|perhaps|potentially)\s+(a|an|some|the)\b/i,
];

const REASONING_INLINE = [
  /\b(caption|response|output|result)\s*[:—\-–]\s*$/im,
  /\b(this|that)\s+(caption|response|idea)\s+(is|was|would|could|might|may)\b/i,
];

const SELF_REFERENCE_PATTERNS = [
  /\b(i think|i believe|i feel|i suggest|i recommend|i would|i might|i could)\b/i,
  /\b(a good caption would be|a better caption|caption could be|caption might be|caption would be)\b/i,
  /\b(that'?s? (a|an) (funny|witty|clever|good|great|nice|interesting))\b/i,
  /\b(let me|let'?s)\s+(think|try|come up with|figure out|brainstorm)\b/i,
];

const INSTRUCTION_ECHO_PATTERNS = [
  /^(a|an|the)\s+(formal|professional|sarcastic|humorous|funny|witty|clever|tech|casual)\s+caption\s+(that|which|describes|for|about)\b/i,
  /^write\s+(a|an)\s+(formal|professional|sarcastic|humorous|funny|witty|caption)\b/i,
  /^(formal|sarcastic|humorous)\s+(caption|response|output)\s*[:\-–—]\s*/i,
];

// ── Reasoning line markers (per-line filtering) ──────────────────

const REASONING_LINE_MARKERS = [
  /\b(could be|could also be|could work|could use|might work|might fit|perhaps|maybe|possibly)\b/i,
  /\b(idea:|angle:|approach:|option:|alt:|alternative:)\s*/i,
  /\b(doesn'?t fit|not sure|not quite|too much|too little|overly)\b/i,
  /\b(but that|although|however|on second thought|then again)\b/i,
];

// ── Whole-text reasoning patterns (no ^ anchor) ──────────────────
// Catches mid-paragraph reasoning leaks from LLM chain-of-thought.
// These run on the FULL cleaned text, not per-line.

const WHOLE_TEXT_REASONING = [
  /visible elements?:/i,
  /\bso I (need|should|will|can|could|might)\b/i,
  /for instance,?\s*["\u201C]/i,
  /\blet me (try|think|make|create|write|come up with)\b/i,
  /\bi need (a|an|some|to)\b/i,
  /\b(a caption about|write a caption|caption that|caption idea)/gi,
  /write\s+a\s+.*?\s+caption/i,
  /^(a|an|the)\s+\w+(\s+\w+)?\s+(shows|depicts|features|contains|displays|reveals|portrays)/i,
  /^(the|a|an)\s+(video|clip|scene|footage|frame)\s+(shows|depicts|captures|opens|begins|features)/i,
  // Placeholder echo — model copied the example text from the prompt
  /\byour\s+(short,\s*)?(original\s+)?caption\s+here\b/i,
  // Meta description — model explained the source instead of writing a caption
  /\bthe video (is|shows|depicts|features|contains)\b/i,
  /\bthe transcript (is|shows|reads|says|contains|includes)\b/i,
  /\bthe lyrics of\b/i,
  /\bthis appears to be\b/i,
];

// ── Helpers ──────────────────────────────────────────────────────

function hasTerminalPunctuation(text: string): boolean {
  return /[.!?]$/.test(text.trim());
}

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Remove emojis (keeps basic ASCII punctuation) */
function stripEmojis(text: string): string {
  return text
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Extract the longest quoted segment from a string */
function extractQuoted(text: string): string | null {
  // Smart quotes and regular quotes
  const patterns = [
    /"([^"\n]{15,})"/g,    // double quotes
    /\u201C([^\u201D\n]{15,})\u201D/g, // left/right double quotes
    /'([^'\n]{15,})'/g,    // single quotes
    /\u2018([^\u2019\n]{15,})\u2019/g, // left/right single quotes
  ];

  let best = "";
  for (const pat of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pat.exec(text)) !== null) {
      const candidate = match[1].trim();
      if (candidate.length > best.length) best = candidate;
    }
  }
  return best || null;
}

// ── Phase 1: Structural extraction ───────────────────────────────

function structuralExtraction(raw: string): string {
  // 1. Try extracting quoted text first (most reliable)
  const quoted = extractQuoted(raw);
  if (quoted) return quoted;

  // 2. Split into lines and filter out reasoning lines
  const lines = raw.split(/\n+/);
  const cleanLines = lines
    .map((l) => l.trim())
    .filter((l) => {
      if (l.length < 10) return false;
      // Filter out lines matching reasoning markers
      return !REASONING_LINE_MARKERS.some((pat) => pat.test(l));
    });

  if (cleanLines.length === 0) return raw;

  // 3. Rejoin and try to find the "best" sentence
  const rejoined = cleanLines.join(" ");

  // 4. Try to strip known reasoning prefixes from the whole text
  let result = rejoined;
  for (const pat of REASONING_PREFIXES) {
    const m = result.match(pat);
    if (m && m.index !== undefined) {
      // Find the end of this reasoning clause (up to colon or sentence end)
      const after = result.slice(m.index! + m[0].length);
      const cleaned = after.replace(/^[:\-–—\s,"']+/, "").trim();
      if (cleaned.length >= 15) {
        result = cleaned;
        break;
      }
    }
  }

  return result;
}

// ── Phase 2: Final cleaning ──────────────────────────────────────

function finalCleaning(text: string): string {
  let c = text.trim();

  // Strip emojis
  c = stripEmojis(c);

  // Strip surrounding quotes
  c = c.replace(/^["\u201C\u2018']|["\u201D\u2019']$/g, "").trim();

  // Strip "Caption:" / "Output:" / "Result:" style prefixes
  c = c.replace(
    /^(?:(?:humorous|formal|sarcastic|funny|witty|clever|tech|non-tech|casual|professional|possible)\s+)?(?:caption|response|output|result|answer|text)\s*[:\-–—]\s*/i,
    ""
  ).trim();

  // Collapse multiple spaces
  c = c.replace(/\s{2,}/g, " ");

  // Capitalize first letter
  c = capitalizeFirst(c);

  // Ensure terminal punctuation if missing (and text seems complete-ish)
  if (c.length >= 15 && !hasTerminalPunctuation(c)) {
    c += ".";
  }

  return c;
}

// ── Transcript / song lyrics detection ───────────────────────────
function hasLyricRepetition(text: string): boolean {
  const words = text.toLowerCase().replace(/[,.!?]/g, '').split(/\s+/);
  const bigrams: Record<string, number> = {};
  for (let i = 0; i < words.length - 1; i++) {
    const bg = words[i] + ' ' + words[i + 1];
    if (bg.length > 6) {
      bigrams[bg] = (bigrams[bg] || 0) + 1;
    }
  }
  return Object.values(bigrams).some(c => c >= 3);
}

// ── Main validation function ─────────────────────────────────────

export function validateCaption(raw: string): ValidationResult {
  // Null/undefined check
  if (!raw) {
    return { valid: false, reason: "empty", cleaned: "" };
  }

  const trimmed = raw.trim();

  // Empty / whitespace
  if (!trimmed) {
    return { valid: false, reason: "empty", cleaned: "" };
  }

  // Try structural extraction first
  const extracted = structuralExtraction(trimmed);
  const cleaned = finalCleaning(extracted);

  // ── Validation checks on cleaned text ──

  // Raw tag fragments — reject immediately
  if (/[<>]/.test(cleaned)) {
    return { valid: false, reason: "contains raw tag fragments", cleaned: "" };
  }

  // Min length
  if (cleaned.length < 15) {
    const shortest = cleaned.length > trimmed.length ? cleaned : trimmed;
    return {
      valid: false,
      reason: `too short (${shortest.length} chars)`,
      cleaned: shortest.length >= 10 ? finalCleaning(shortest) : undefined,
    };
  }

  // Max length (reasoning dump)
  if (cleaned.length > 500) {
    return { valid: false, reason: "too long (possible reasoning dump)", cleaned: cleaned.slice(0, 500) };
  }

  // Check reasoning patterns on the cleaned text
  for (const pat of REASONING_PREFIXES) {
    if (pat.test(cleaned)) {
      return { valid: false, reason: "starts with reasoning prefix", cleaned };
    }
  }

  for (const pat of REASONING_INLINE) {
    if (pat.test(cleaned)) {
      return { valid: false, reason: "contains reasoning pattern", cleaned };
    }
  }

  // Self-reference
  for (const pat of SELF_REFERENCE_PATTERNS) {
    if (pat.test(cleaned)) {
      return { valid: false, reason: "contains self-reference", cleaned };
    }
  }

  // Instruction echo
  for (const pat of INSTRUCTION_ECHO_PATTERNS) {
    if (pat.test(cleaned)) {
      return { valid: false, reason: "echoes style instruction", cleaned };
    }
  }

  // Whole-text reasoning (mid-paragraph leak, no ^ anchor)
  for (const pat of WHOLE_TEXT_REASONING) {
    if (pat.test(cleaned)) {
      return { valid: false, reason: "contains leaked reasoning (whole-text)", cleaned };
    }
  }

  // Video context leak — raw context markers should never reach a user
  const videoContextLeakPatterns = [
    /^#\s+(Transcript|Frame\s+Descriptions?)/mi,
    /\[\d+\.\d+s\]/,
    /^Lyrics\s+(from|of)\b/im,
    /transcript\s+is\s+(lyrics|from)\b/i,
    /frame\s+descriptions?\s+show/i,
  ];
  for (const pat of videoContextLeakPatterns) {
    if (pat.test(cleaned)) {
      return { valid: false, reason: "video context leaked into caption", cleaned: "" };
    }
  }

  // Explanatory fragments (model explaining itself instead of writing caption)
  const explanatoryPatterns = [
    /\bpossibly a (pun|joke|reference|play|metaphor|dig)\b/i,
    /\bto \w+ humor\b/i,
    /\b(that|this) (describes|captures|relates|refers|explains)\b/i,
    /\b(could be|might be|perhaps|maybe)\b.*\b(caption|joke|pun|reference)\b/i,
    // Stream-of-consciousness fragment — model rambled instead of writing a caption
    /\b(watermark|timestamp|overlay|subtitle)\s*,?\s+and\s+a\s+(transcript|caption|description)\b/i,
    /\b(transcript|caption)\s+(mentioning|saying|reading|showing)\b/i,
  ];
  for (const pat of explanatoryPatterns) {
    if (pat.test(cleaned)) {
      return { valid: false, reason: "explanatory fragment (model reasoning)", cleaned };
    }
  }

  // Incomplete sentence (only check after all cleaning — a good sentence ends with punctuation)
  if (!hasTerminalPunctuation(cleaned) && cleaned.length < 60) {
    // Short, no punctuation — likely truncated mid-thought
    return { valid: false, reason: "incomplete sentence (no terminal punctuation)", cleaned };
  }

  // Song lyrics / transcript repetition
  if (hasLyricRepetition(cleaned)) {
    return { valid: false, reason: "song lyrics detected", cleaned };
  }

  // All checks passed
  return { valid: true, cleaned };
}

/** Shortcut: validate + return the cleaned caption, or empty string if invalid */
export function cleanAndValidate(raw: string): string {
  const result = validateCaption(raw);
  return result.valid && result.cleaned ? result.cleaned : "";
}
