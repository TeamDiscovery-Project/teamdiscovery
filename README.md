# TeamDiscovery — Multi-Style AI Video Captioning

> **"One video. Four personalities. Infinite engagement."**
>
> Upload a video and watch our AI pipeline transform it into four stylized captions — Formal, Sarcastic, Humorous Tech, and Humorous Non-Tech — each with its own unique voice. Built for creators, marketers, and content teams who need social-ready captions that match any brand tone.

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React 18"/>
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite" alt="Vite 7"/>
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss" alt="Tailwind CSS 4"/>
  <img src="https://img.shields.io/badge/Framer_Motion-12-0055FF?logo=framer" alt="Framer Motion"/>
  <img src="https://img.shields.io/badge/Supabase-Edge_Functions-3ECF8E?logo=supabase" alt="Supabase"/>
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker" alt="Docker"/>
</p>

---

## 🔥 What Problem Does This Solve?

Writing captions is time-consuming. Writing captions in **multiple tones** for different platforms and audiences is even harder. TeamDiscovery automates this entirely — drop in a video, and get four distinct, AI-generated captions in seconds. No prompt engineering. No switching between tools. Just results.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🎬 **Video Processing Pipeline** | In-browser compression, frame extraction, audio extraction — all automated |
| 🧠 **Multi-Model AI** | Vision models describe frames, Groq transcribes audio, DeepSeek-V4-Pro generates captions |
| 🎨 **4 Caption Styles** | Formal · Sarcastic · Humorous Tech · Humorous Non-Tech |
| ⏱️ **Pipeline Timing** | Console-based step timing breakdown shows exactly how long each pipeline stage takes |
| ✅ **Quality Validation** | Built-in validator catches AI reasoning dumps, instruction echoes, and incomplete output — with 3-attempt auto-retry |
| 🔄 **Per-Style Regeneration** | Regenerate any individual caption without re-running the whole pipeline |
| 🖥️ **Cyberpunk UI** | Particle-canvas background, neon borders, glitch-text effects, 3D tilt cards, and animated pipeline progress |
| 🐳 **Docker Ready** | One-command deployment with nginx serving the production build |
| 📋 **Copy & Download** | Copy individual captions, copy all at once, or download as TXT/JSON |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        BROWSER (React App)                         │
│                                                                    │
│  Upload → Compress → Extract Frames → Extract Audio               │
│     │          │              │               │                    │
│     ▼          ▼              ▼               ▼                    │
│  [Supabase Storage]  [Canvas API]      [MediaRecorder]             │
│     │                    │               │                         │
│     ▼                    ▼               ▼                         │
│  ┌──────────────────────────────────────────────┐                  │
│  │           SUPABASE EDGE FUNCTIONS             │                  │
│  │                                               │                  │
│  │  /transcribe ──── Groq Whisper                │                  │
│  │  /describe-frames ─ Fireworks Vision Models   │                  │
│  │  /generate-caption ─ DeepSeek-V4-Pro          │                  │
│  │  /generate-all-captions ─ Batch Generation    │                  │
│  └──────────────────────────────────────────────┘                  │
│     │                                                              │
│     ▼                                                              │
│  ┌─────────────────────┐     ┌──────────────────────┐              │
│  │    Supabase DB       │     │  Caption Validator    │              │
│  │  jobs + captions    │     │  Reasoning filter +   │              │
│  │  tables             │     │  3-attempt retry loop │              │
│  └─────────────────────┘     └──────────────────────┘              │
└────────────────────────────────────────────────────────────────────┘
```

### Processing Pipeline

1. **Upload** — Video validated (30–120 sec, video formats only)
2. **Compress** — In-browser re-encoding to ≤38MB (targets Supabase 50MB limit)
3. **Upload to Storage** — Secure Supabase Storage bucket
4. **Extract Audio** — Audio track isolated and uploaded for transcription
5. **Transcribe** — Groq Whisper model transcribes audio → text
6. **Extract Frames** — 1 frame per 3 seconds via Canvas API
7. **Describe Frames** — Fireworks Vision models generate scene descriptions
8. **Generate Captions** — DeepSeek-V4-Pro creates 4 styled captions from combined context
9. **Validate & Retry** — Each caption passes through 7 validation rules; failed captions retry 3× with progressive backoff (0 → 500ms → 1000ms)

---

## 🛠️ Tech Stack

### Frontend
| Tech | Role |
|---|---|
| **React 18** + **TypeScript 5.9** | Component-based UI with full type safety |
| **Vite 7** | Lightning-fast dev server and optimized builds |
| **Tailwind CSS 4** | Utility-first CSS with custom cyberpunk theme via `@theme` directive |
| **Framer Motion 12** | Page transitions, 3D tilt cards, spring animations, AnimatePresence |
| **Lucide React** | Consistent iconography |
| **Sonner** | Toast notifications |

### Backend (Supabase)
| Service | Role |
|---|---|
| **Supabase Storage** | Video, audio, and frame storage |
| **Supabase Database** | `jobs` and `captions` tables with row-level security |
| **Supabase Edge Functions** | 4 Deno functions handling all AI calls |

### AI Models
| Model | Used For |
|---|---|
| **Groq Whisper** | Audio transcription (via `/transcribe`) |
| **Fireworks Vision Models** | Frame/scene description (via `/describe-frames`) |
| **DeepSeek-V4-Pro** | Multi-style caption generation (via `/generate-caption` & `/generate-all-captions`) |

### DevOps
| Tool | Role |
|---|---|
| **Docker** + **Docker Compose** | Containerized deployment |
| **Nginx** (Alpine) | Production static serving with gzip, caching, and SPA fallback |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm
- **Supabase project** with the following Edge Functions deployed:
  - `transcribe`
  - `describe-frames`
  - `generate-caption`
  - `generate-all-captions`

### Environment Variables

> ⚠️ **Required** — The app will not render without these. A missing `.env` file causes a black screen because the Supabase client throws a fatal error during module initialization.

Copy `.env.example` to `.env` with your actual Supabase credentials:

```bash
cp .env.example .env
```

Then edit `.env` with real values:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable (anon) key from your project dashboard → Settings → API |

### Local Development

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

### Docker

```bash
docker compose up --build
```

The app is served at `http://localhost:3000` via nginx.

---

## 📁 Project Structure

```
TeamDiscovery/
├── src/
│   ├── App.tsx                   # Main app: upload, pipeline orchestration, state
│   ├── main.tsx                  # React root mount
│   ├── types.ts                  # TypeScript interfaces & constants
│   ├── index.css                 # Tailwind @theme, custom utilities, animations
│   ├── lib/
│   │   └── supabase.ts           # Supabase client (anon key)
│   ├── components/
│   │   ├── AnimatedBackground.tsx # Particle canvas + ambient blobs
│   │   ├── CaptionCard.tsx        # Individual caption with tilt, copy, expand
│   │   ├── GlitchText.tsx         # Cyberpunk glitch-slice text effect
│   │   ├── NeonFrame.tsx          # Corner-bracket frame with scanline
│   │   ├── ProgressIndicator.tsx  # Diamond-node pipeline stepper
│   │   ├── ResultsPanel.tsx       # Caption grid/stack views, copy, download
│   │   └── UploadZone.tsx         # Drag-and-drop video upload
│   └── utils/
│       ├── audioExtractor.ts      # Browser audio track isolation
│       ├── captionValidator.ts    # AI output validation & cleaning
│       ├── frameExtractor.ts      # Canvas-based frame capture
│       ├── styleConfig.ts         # Per-style colors, emojis, gradients
│       ├── timeEstimator.ts       # Per-step time estimates for pipeline progress
│       └── videoCompressor.ts     # MediaRecorder-based re-encoding
├── public/
│   └── nativelyai.svg            # App favicon
├── Dockerfile                    # Multi-stage: Node build → nginx serve
├── docker-compose.yml            # Single-service orchestration
├── nginx.conf                    # Gzip, caching, SPA fallback
├── .dockerignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

---

## 🎨 Design System

TeamDiscovery features a custom **cyberpunk neon** design language:

- **Palette:** Deep void background (`#0a0a0f`), hot magenta primary (`#ff2d95`), cyan secondary (`#00f0ff`), purple accent (`#7b2fff`)
- **Typography:** Plus Jakarta Sans (headings/body) + JetBrains Mono (captions)
- **Effects:** Frosted glass panels, neon text glow, animated corner-bracket frames, CRT scanlines, particle parallax background, 3D tilt cards
- **Motion:** Spring-based transitions, staggered card entrances, glitch-text on hover, pulse-glow on drag-over
- **Accessibility:** `prefers-reduced-motion` support, ARIA labels on all interactive elements, keyboard navigation

---

## 🧪 Caption Quality System

The `captionValidator.ts` module performs rigorous AI output filtering:

### Two-Phase Cleaning
1. **Structural Extraction** — Extracts quoted text, filters reasoning-line markers, strips known reasoning prefixes
2. **Final Cleaning** — Strips emojis, style prefixes (`"Caption:"`, `"Formal caption:"`), normalizes whitespace & punctuation

### Seven Validation Rules
| # | Rule | Catches |
|---|---|---|
| 1 | Empty/whitespace | Null responses |
| 2 | Min length (< 20 chars) | Truncated output |
| 3 | Max length (> 500 chars) | Reasoning dumps |
| 4 | Reasoning prefixes | "Here's a caption...", "I think..." |
| 5 | Inline reasoning | "This caption is...", "A good caption would be..." |
| 6 | Self-reference | "I believe", "Let me think..." |
| 7 | Instruction echo | "A formal caption that describes..." |

Failed captions trigger up to 3 retries with progressive backoff (0ms → 500ms → 1000ms).

---

### Pipeline Timing

Every processing step is instrumented with precise timing. After generation completes, open the browser console to see a detailed `console.table` breakdown:

```
┌────────────────────┬──────────┬─────────┬─────────┐
│ Step               │ Duration │ Success │ Retries │
├────────────────────┼──────────┼─────────┼─────────┤
│ compress           │ 2.34s    │ true    │ 0       │
│ upload             │ 4.12s    │ true    │ 0       │
│ transcribe         │ 1.89s    │ true    │ 0       │
│ frames             │ 0.45s    │ true    │ 0       │
│ describe           │ 22.50s   │ true    │ 0       │
│ captions           │ 8.76s    │ true    │ 0       │
│ TOTAL              │ 40.06s   │ —       │ —       │
└────────────────────┴──────────┴─────────┴─────────┘
```

This is also surfaced in the UI under ResultsPanel → Timing tab (if available).

---

## 🩺 Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| **Black screen on load** | Missing `.env` file (Supabase client crashes) | Create `.env` from `.env.example` with real credentials |
| **Upload fails with "Storage not found"** | Supabase storage bucket not created | Run `CREATE BUCKET` migration in Supabase dashboard |
| **Edge functions return 404** | Functions not deployed | Deploy all 4 functions via Supabase CLI or dashboard |
| **"Failed to fetch" errors** | CORS or network issue | Check Supabase project is active and URL is correct |
| **Caption generation hangs** | AI model timeout or rate limit | Check Supabase Edge Function logs for errors |
| **Video compression very slow** | Large input video | Videos > 100MB may take longer; trim before uploading |

---

## ⚠️ Known Limitations

- **Video length**: Optimized for 30–120 second clips. Longer videos may exceed memory limits during in-browser processing.
- **File size**: Videos are compressed to ≤38MB for Supabase upload. Very high-bitrate videos may lose noticeable quality.
- **Browser support**: Requires a modern Chromium-based browser (Chrome, Edge, Brave, Arc) for MediaRecorder and Canvas API support.
- **Cold starts**: Supabase Edge Functions may experience 1–3 second cold starts on first invocation after inactivity.
- **Rate limits**: DeepSeek-V4-Pro and Groq APIs may throttle under heavy concurrent usage.

---

## 👥 Team

| Name | Role |
|---|---|
| **Kartik Dave** | **Team Leader** |
| Pruthvirajsinh Rathod | Developer |
| Priyanshu Koshti | Developer |
| Aakash Gupta | Developer |
| Harshrajsinh Gohil | Developer |

---

## 📄 License

MIT — Built with ❤️ for hackathons.

---

<p align="center">
  <sub>Powered by React · Supabase · DeepSeek · Groq · Fireworks AI</sub>
</p>
