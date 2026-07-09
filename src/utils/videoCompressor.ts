/**
 * Compresses a video file in the browser using Canvas + MediaRecorder.
 * Re-encodes at a lower bitrate to fit within Supabase free tier 50MB limit.
 * Preserves audio by combining canvas video tracks with the video element's audio tracks.
 */

const TARGET_SIZE_MB = 38; // leaves ~12MB headroom for audio + container overhead under 50MB limit
const MAX_WIDTH = 1280;
const MAX_HEIGHT = 720;

export async function compressVideo(file: File): Promise<File> {
  // If already under limit, return as-is
  if (file.size <= TARGET_SIZE_MB * 1024 * 1024) {
    return file;
  }

  const video = document.createElement("video");
  video.preload = "metadata";

  const url = URL.createObjectURL(file);
  video.src = url;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load video for compression"));
  });

  const duration = video.duration;

  // Calculate target bitrate to hit our size target
  // Size (bits) = bitrate (bps) * duration (s)
  const targetBits = TARGET_SIZE_MB * 1024 * 1024 * 8;
  const targetBitrate = Math.floor(targetBits / duration);

  // Cap resolution at 720p
  let width = video.videoWidth;
  let height = video.videoHeight;

  if (width > MAX_WIDTH || height > MAX_HEIGHT) {
    const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
  }

  // Even dimensions required by some encoders
  width = width % 2 === 0 ? width : width - 1;
  height = height % 2 === 0 ? height : height - 1;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Video tracks from canvas (scaled down)
  const canvasStream = canvas.captureStream(30);

  // Audio tracks from the original video element
  const videoStream = video.captureStream();
  const audioTracks = videoStream.getAudioTracks();

  // Combine scaled video + original audio
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioTracks,
  ]);

  const mimeType = getSupportedMimeType();

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: Math.min(targetBitrate, 8_000_000), // cap at 8 Mbps
  });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const compressionFinished = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  // Start recording, then play the video at natural speed
  video.currentTime = 0;
  recorder.start(1000); // 1-second chunks
  video.play();

  // Draw frames via rAF until the video ends
  await new Promise<void>((resolve) => {
    function drawFrame() {
      if (video.ended || video.paused) {
        recorder.stop();
        URL.revokeObjectURL(url);
        resolve();
        return;
      }

      ctx.drawImage(video, 0, 0, width, height);
      requestAnimationFrame(drawFrame);
    }

    video.onplaying = () => {
      drawFrame();
    };

    video.onended = () => {
      recorder.stop();
      URL.revokeObjectURL(url);
      resolve();
    };
  });

  const blob = await compressionFinished;

  const MAX_UPLOAD_BYTES = 48 * 1024 * 1024; // 48MB — safe under 50MB limit

  // If still too large after compression, it's a very long/high-quality video
  if (blob.size > MAX_UPLOAD_BYTES) {
    URL.revokeObjectURL(url);
    throw new Error(
      `Video is too long to compress under the 50MB limit (compressed to ${(blob.size / 1024 / 1024).toFixed(0)}MB). Try a shorter clip or lower quality source.`
    );
  }

  // If compression didn't help (e.g. already low-res video), use original
  // Original already passed the >38MB check above, so it's at least reasonable
  if (blob.size >= file.size) {
    URL.revokeObjectURL(url);
    return file;
  }

  // Create a new File from the compressed blob
  const nameParts = file.name.split(".");
  const ext = nameParts.pop() || "mp4";
  const baseName = nameParts.join(".");

  return new File([blob], `${baseName}-compressed.${ext}`, {
    type: mimeType,
  });
}

function getSupportedMimeType(): string {
  const types = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  throw new Error("MediaRecorder is not supported in this browser");
}
