import { useState, useRef, useCallback } from "react";
import { Toaster, toast } from "sonner";
import { Sparkles, Video, RefreshCw } from "lucide-react";
import { supabase } from "./lib/supabase";
import { extractFrames } from "./utils/frameExtractor";
import { compressVideo } from "./utils/videoCompressor";
import { extractAudio } from "./utils/audioExtractor";
import UploadZone from "./components/UploadZone";
import ProgressIndicator, { type PipelineStep } from "./components/ProgressIndicator";
import ResultsPanel from "./components/ResultsPanel";
import type { CaptionStyle, CaptionResult, CaptionResults } from "./types";
import { CAPTION_STYLES, CAPTION_STYLE_LABELS } from "./types";

// Edge function base URL
const FUNCTIONS_URL =
  "https://nseofqhsninmfzqnvkvl.supabase.co/functions/v1";

// Anon key for edge function calls
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZW9mcWhzbmlubWZ6cW52a3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MjYyNTIsImV4cCI6MjA4MTAwMjI1Mn0.ynRuG4hEmGCo_KfavnOxWRD72AfxxE1f04100i3ZvCY";

type AppPhase = "upload" | "processing" | "results";

export default function App() {
  // --- Upload state ---
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  // --- Pipeline state ---
  const [phase, setPhase] = useState<AppPhase>("upload");
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>("upload");
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // --- Results state ---
  const [results, setResults] = useState<CaptionResult[]>([]);
  const [regeneratingStyles, setRegeneratingStyles] = useState<Set<CaptionStyle>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  // Ref to track if component is still mounted
  const mountedRef = useRef(true);
  // Ref to stored video URL for cleanup
  const previewUrlRef = useRef<string | null>(null);

  // --- Handlers ---

  const handleFileSelected = useCallback((file: File) => {
    // Clean up previous preview
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;

    // Read duration
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;

    video.onloadedmetadata = () => {
      if (!mountedRef.current) return;
      setVideoFile(file);
      setVideoPreviewUrl(url);
      setVideoDuration(Math.round(video.duration));
      setPhase("upload");
      setResults([]);
      setPipelineError(null);
      setJobId(null);
      setPipelineStep("upload");
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("Couldn't read that video file. Try a different format?");
    };
  }, []);

  // Ref to store video context for regeneration
  const videoContextRef = useRef<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!videoFile) return;

    setIsGenerating(true);
    setPipelineError(null);
    setPhase("processing");
    setPipelineStep("compress");
    setResults([]);

    try {
      // --- File size check ---
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (videoFile.size > maxSize) {
        throw new Error(
          `Video is too large (${(videoFile.size / (1024 * 1024)).toFixed(0)}MB). Keep it under 500MB.`
        );
      }

      // --- Step 1: Compress video ---
      setPipelineStep("compress");
      const compressedFile = await compressVideo(videoFile);

      // --- Step 2: Upload video to Supabase Storage ---
      setPipelineStep("upload");
      const fileExt = compressedFile.name.split(".").pop() || "mp4";
      const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, compressedFile);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // --- Step 2b: Try to extract audio (skip gracefully if video is silent) ---
      let transcript = "";

      try {
        const audioFile = await extractAudio(compressedFile);
        const audioFileName = `${Date.now()}-${crypto.randomUUID()}-audio.webm`;

        const { error: audioUploadError } = await supabase.storage
          .from("videos")
          .upload(audioFileName, audioFile);

        if (!audioUploadError) {
          // --- Transcribe audio (tiny audio file, well under Groq's 25MB limit) ---
          setPipelineStep("transcribe");

          const transcribeRes = await fetch(`${FUNCTIONS_URL}/transcribe`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${ANON_KEY}`,
            },
            body: JSON.stringify({ storagePath: audioFileName }),
          });

          if (transcribeRes.ok) {
            const data = await transcribeRes.json();
            transcript = data.transcript || "";
          }
        }
      } catch {
        // No audio track — totally fine, caption from visuals alone
        transcript = "";
      }

      // --- Step 3: Create job record in DB ---
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .insert({
          storage_path: fileName,
          filename: compressedFile.name,
          status: "uploading",
          duration_seconds: videoDuration,
        })
        .select("id")
        .single();

      if (jobError || !jobData) {
        throw new Error(jobError?.message || "Failed to create job");
      }

      const jid = jobData.id;
      setJobId(jid);

      // --- Step 4: Extract frames in browser ---
      setPipelineStep("frames");
      const frames = await extractFrames(videoFile);

      // --- Step 6: Describe frames ---
      setPipelineStep("describe");

      const frameBase64s = frames.map((f) => f.dataUrl.split(",")[1]);
      const describeRes = await fetch(`${FUNCTIONS_URL}/describe-frames`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ frames: frameBase64s }),
      });

      if (!describeRes.ok) {
        const err = await describeRes.json().catch(() => ({}));
        throw new Error(err.details || err.error || "Frame description failed");
      }

      const describeData = await describeRes.json();
      // Diagnostic: function returned model list instead of descriptions
      if (!describeData.descriptions && describeData.total_models !== undefined) {
        const visionModels = describeData.vision_models || [];
        throw new Error(
          "MODEL LIST — Vision models: " +
          JSON.stringify(visionModels.slice(0, 10)) +
          " | Total: " + describeData.total_models
        );
      }
      const descriptions = describeData.descriptions;

      // --- Step 7: Build video context ---
      const videoContext = [
        `# Transcript\n${transcript}`,
        `# Frame Descriptions`,
        ...descriptions.map((d: string, i: number) => `[${frames[i]?.timestamp.toFixed(1)}s] ${d}`),
      ].join("\n\n");

      videoContextRef.current = videoContext;

      // Update job with processing results
      await supabase
        .from("jobs")
        .update({
          transcript,
          frame_descriptions: descriptions,
          status: "processing",
        })
        .eq("id", jid);

      // --- Step 8: Generate all captions ---
      setPipelineStep("captions");

      const genRes = await fetch(`${FUNCTIONS_URL}/generate-all-captions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ videoContext }),
      });

      if (!genRes.ok) {
        const err = await genRes.json().catch(() => ({}));
        throw new Error(err.error || "Caption generation failed");
      }

      const { captions } = await genRes.json();

      // --- Step 9: Save captions to DB ---
      const captionInserts = Object.entries(captions).map(
        ([style, text]) => ({
          job_id: jid,
          style,
          text,
        })
      );

      await supabase.from("captions").insert(captionInserts);

      // Update job status
      await supabase
        .from("jobs")
        .update({ status: "ready" })
        .eq("id", jid);

      // --- Done ---
      setPipelineStep("done");

      const allResults: CaptionResult[] = CAPTION_STYLES.map((s) => ({
        style: s.key,
        caption: (captions as CaptionResults)[s.key] || "",
        loading: false,
        error: null,
      }));

      setResults(allResults);
      setPhase("results");

      toast.success("Your captions are ready! 🎉");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Try again?";
      setPipelineError(message);
      setPhase("upload");
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }, [videoFile]);

  const handleRegenerate = useCallback(
    async (style: CaptionStyle) => {
      const videoContext = videoContextRef.current;
      if (!videoContext) {
        toast.error("No video context available. Please re-generate from scratch.");
        return;
      }

      setRegeneratingStyles((prev) => new Set(prev).add(style));

      // Set the specific card to loading state
      setResults((prev) =>
        prev.map((r) =>
          r.style === style ? { ...r, loading: true, error: null } : r
        )
      );

      try {
        const res = await fetch(
          `${FUNCTIONS_URL}/generate-caption`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${ANON_KEY}`,
            },
            body: JSON.stringify({ videoContext, style }),
          }
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Regeneration failed");
        }

        const { caption } = await res.json();

        setResults((prev) =>
          prev.map((r) =>
            r.style === style
              ? { ...r, caption, loading: false }
              : r
          )
        );

        toast.success(`${CAPTION_STYLE_LABELS[style]} caption regenerated!`);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to regenerate caption";
        setResults((prev) =>
          prev.map((r) =>
            r.style === style
              ? { ...r, loading: false, error: message }
              : r
          )
        );
        toast.error(message);
      } finally {
        setRegeneratingStyles((prev) => {
          const next = new Set(prev);
          next.delete(style);
          return next;
        });
      }
    },
    []
  );

  const handleReset = useCallback(() => {
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setVideoDuration(null);
    setPhase("upload");
    setPipelineStep("upload");
    setPipelineError(null);
    setJobId(null);
    setResults([]);

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  // --- Format duration ---
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-background">
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: "var(--color-muted)",
            color: "var(--color-foreground)",
            border: "1px solid var(--color-border)",
          },
        }}
      />

      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg text-foreground leading-tight">
                TeamDiscovery
              </h1>
              <p className="text-xs text-muted-foreground">
                Four styles. Endless creativity.
              </p>
            </div>
          </div>

          {phase === "upload" && videoFile && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`
                inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                font-semibold text-sm text-on-primary
                bg-primary hover:bg-primary/90
                transition-all duration-150 ease-out
                active:scale-[0.97]
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
                disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
              `}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Captions
                </>
              )}
            </button>
          )}

          {phase !== "upload" && (
            <button
              onClick={handleReset}
              className="
                inline-flex items-center gap-2 px-4 py-2 rounded-xl
                text-sm text-muted-foreground
                hover:text-foreground hover:bg-muted
                transition-all duration-150 ease-out
                active:scale-[0.97]
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
              "
            >
              <Video className="w-4 h-4" />
              New Video
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Upload phase */}
        {phase === "upload" && (
          <div className="space-y-6">
            {!videoFile ? (
              <UploadZone onFileSelected={handleFileSelected} />
            ) : (
              <>
                {/* Video preview */}
                <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-border shadow-lg">
                  <video
                    src={videoPreviewUrl!}
                    controls
                    className="w-full max-h-[400px] object-contain"
                    poster={undefined}
                  />
                  <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium text-foreground border border-border">
                    {videoDuration ? formatDuration(videoDuration) : "..."}
                  </div>
                </div>

                {/* Upload another */}
                <div className="flex justify-center">
                  <UploadZone
                    onFileSelected={handleFileSelected}
                    disabled={isGenerating}
                  />
                </div>
              </>
            )}

            {/* Pipeline error */}
            {pipelineError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive text-center">
                {pipelineError}
              </div>
            )}
          </div>
        )}

        {/* Processing phase */}
        {phase === "processing" && (
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Video thumbnail during processing */}
            {videoPreviewUrl && (
              <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-border">
                <video
                  src={videoPreviewUrl}
                  className="w-full max-h-[240px] object-cover opacity-60"
                  muted
                  autoPlay
                  loop
                  playsInline
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                    <span className="text-sm text-foreground font-medium">
                      Processing your video...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <ProgressIndicator
              currentStep={pipelineStep}
              error={pipelineError}
            />
          </div>
        )}

        {/* Results phase */}
        {phase === "results" && (
          <div className="space-y-6">
            {/* Video player */}
            {videoPreviewUrl && (
              <div className="rounded-2xl overflow-hidden bg-black/40 border border-border shadow-lg">
                <video
                  src={videoPreviewUrl}
                  controls
                  className="w-full max-h-[360px] object-contain"
                />
              </div>
            )}

            {/* Caption cards */}
            <ResultsPanel
              results={results}
              onRegenerate={handleRegenerate}
              regeneratingStyles={regeneratingStyles}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-muted-foreground">
          TeamDiscovery &middot; Multi-Style Video Captioning &middot; Built
          with ❤️
        </div>
      </footer>
    </div>
  );
}
