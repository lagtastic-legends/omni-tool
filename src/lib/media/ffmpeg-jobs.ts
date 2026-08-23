/**
 * Shared helpers for building ffmpeg job specs (virtual FS naming, MIME
 * resolution, size guards). Pure functions — safe on server and client.
 */

export const OUTPUT_MIME: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  webm: "video/webm",
  gif: "image/gif",
  png: "image/png",
  jpg: "image/jpeg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  ogg: "audio/ogg",
};

/** Wasm heap guard rails (practical limits for the single-thread core). */
export const SIZE_WARN_BYTES = 300 * 1024 * 1024; // warn above 300 MB
export const SIZE_BLOCK_BYTES = 900 * 1024 * 1024; // block above 900 MB

export function extOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx + 1).toLowerCase();
}

export function baseName(name: string): string {
  const idx = name.lastIndexOf(".");
  const base = idx === -1 ? name : name.slice(0, idx);
  // strip any path artifacts from drag-and-dropped files
  return base.replace(/[\\/]/g, "_").slice(0, 60) || "output";
}

export function mimeFor(ext: string): string {
  return OUTPUT_MIME[ext] ?? "application/octet-stream";
}

/** True when the file smells like a video (mime prefix or known extension). */
export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  return ["mp4", "mov", "avi", "mkv", "webm", "m4v", "mpg", "mpeg", "wmv", "3gp", "ts"].includes(
    extOf(file.name),
  );
}

/** True when the file smells like audio. */
export function isAudioFile(file: File): boolean {
  if (file.type.startsWith("audio/")) return true;
  return ["mp3", "wav", "m4a", "aac", "flac", "ogg", "opus", "wma", "aiff"].includes(
    extOf(file.name),
  );
}

export function kindForMime(mime: string): "video" | "audio" | "image" | "file" {
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("image/")) return "image";
  return "file";
}
