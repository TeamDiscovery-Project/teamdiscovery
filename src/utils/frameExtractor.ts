/**
 * Extracts frames from a video at regular intervals using the Canvas API.
 * Target: 1 frame per 3 seconds (configurable).
 * Returns base64-encoded JPEG images along with their timestamps.
 */

export interface ExtractedFrame {
  timestamp: number;  // seconds into the video
  dataUrl: string;    // base64 JPEG data URL
}

export async function extractFrames(
  videoFile: File,
  intervalSeconds: number = 3
): Promise<ExtractedFrame[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get 2D rendering context"));
      return;
    }

    video.preload = "metadata";
    video.muted = true;

    const url = URL.createObjectURL(videoFile);
    video.src = url;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (!isFinite(duration) || duration <= 0) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not determine video duration"));
        return;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;

      const frames: ExtractedFrame[] = [];
      const timestamps: number[] = [];

      // Calculate frame timestamps (avoid capturing at 0s and the very end)
      let ts = intervalSeconds;
      while (ts < duration - 0.5) {
        timestamps.push(ts);
        ts += intervalSeconds;
      }

      // Ensure at least one frame
      if (timestamps.length === 0) {
        timestamps.push(duration / 2);
      }

      let currentIndex = 0;

      const seekAndCapture = () => {
        if (currentIndex >= timestamps.length) {
          URL.revokeObjectURL(url);
          resolve(frames);
          return;
        }

        const timestamp = timestamps[currentIndex];
        video.currentTime = timestamp;
      };

      video.onseeked = () => {
        if (currentIndex >= timestamps.length) return;

        const timestamp = timestamps[currentIndex];
        ctx!.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        frames.push({ timestamp, dataUrl });

        currentIndex++;
        seekAndCapture();
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load video for frame extraction"));
      };

      // Start the extraction loop
      seekAndCapture();
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video file"));
    };
  });
}
