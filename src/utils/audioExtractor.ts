/**
 * Extracts the audio track from a video file using browser APIs.
 * Returns a lightweight audio-only WebM file suitable for Whisper transcription.
 */

export async function extractAudio(videoFile: File): Promise<File> {
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = false;    // required so captureStream() includes audio tracks
  video.volume = 0;       // silence speaker output during processing

  const url = URL.createObjectURL(videoFile);
  video.src = url;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load video for audio extraction"));
  });

  const videoStream = (video as unknown as HTMLMediaElement & { captureStream(): MediaStream }).captureStream();
  const audioTracks = videoStream.getAudioTracks();

  if (audioTracks.length === 0) {
    URL.revokeObjectURL(url);
    throw new Error("Video has no audio tracks to extract");
  }

  const audioOnly = new MediaStream(audioTracks);

  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(audioOnly, {
    mimeType,
    audioBitsPerSecond: 64000, // 64kbps — plenty for speech
  });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingDone = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  recorder.start();
  await video.play();

  // Wait for the video to finish playing
  await new Promise<void>((resolve) => {
    video.onended = () => resolve();
    video.onerror = () => resolve(); // don't block on error
  });

  // Let the last audio chunk flush
  await new Promise((r) => setTimeout(r, 200));

  recorder.stop();
  const blob = await recordingDone;

  URL.revokeObjectURL(url);

  return new File([blob], `audio-${Date.now()}.webm`, { type: mimeType });
}
