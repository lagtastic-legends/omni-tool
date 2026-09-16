"use client";

/**
 * Browser-native media probing — duration & dimensions straight from the
 * HTML media element. Zero ffmpeg cost; the engine stays cold for probing.
 */

export interface VideoMeta {
  durationSec: number;
  width: number;
  height: number;
}

export function probeVideo(file: File): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;

    const finish = (meta: VideoMeta) => {
      URL.revokeObjectURL(url);
      resolve(meta);
    };

    video.onloadedmetadata = () => {
      finish({
        // Some streams report Infinity — clamp to a sane working range.
        durationSec: Number.isFinite(video.duration) ? video.duration : 30,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read video metadata from this file."));
    };

    video.src = url;
  });
}

export function probeAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const d = Number.isFinite(audio.duration) ? audio.duration : 30;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read audio metadata from this file."));
    };
    audio.src = url;
  });
}

/**
 * Extracts embedded ID3/MP4 metadata titles from media files.
 * Replaces generic names (like '1000076567.mp4') with real titles.
 */
export async function probeMetadataTitle(file: File): Promise<string | null> {
  try {
    const mm = await import("music-metadata");
    const metadata = await mm.parseBlob(file);
    if (metadata?.common?.title) {
      return metadata.common.title;
    }
  } catch (err) {
    // Silently ignore if metadata is unreadable or absent
  }
  return null;
}
