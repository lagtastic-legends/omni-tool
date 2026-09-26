/**
 * ZenoDeck — YouTube Turbo Downloader Engine
 * ===========================================
 *
 * High-speed multi-worker parallel chunk streaming pipeline.
 *
 * Key Capabilities:
 *  1. Multi-Threaded Range Chunk Streaming: Bypasses single-connection throttling
 *     by splitting streams across 4–8 concurrent range workers (Range: bytes=X-Y).
 *  2. Dual-Stream Concurrent Fetching: Downloads 4K 60fps video and studio audio
 *     simultaneously.
 *  3. Zero-Loss Stream-Copy Muxing: Uses FFmpeg WASM `-c copy` to combine video
 *     and audio streams in seconds with zero re-encoding artifacts or CPU lag.
 *  4. Live Telemetry: Instantaneous throughput gauge (MB/s), thread counter,
 *     and dynamic ETA computation.
 */

import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { getYouTubeApiUrl, type YouTubeQualityOption } from "./innertube";

export type TurboPhase =
  | "idle"
  | "resolving"
  | "downloading"
  | "muxing"
  | "complete"
  | "error";

export interface TurboProgress {
  phase: TurboPhase;
  progress: number; // 0 .. 100
  speedMbps: number; // MB/s
  downloadedBytes: number;
  totalBytes: number;
  activeThreads: number;
  etaSeconds: number;
  statusMessage: string;
}

export interface TurboDownloadOptions {
  option: YouTubeQualityOption;
  videoTitle: string;
  engine: FFmpeg;
  maxParallelWorkers?: number;
  onProgress: (prog: TurboProgress) => void;
  signal?: AbortSignal;
}

export interface TurboDownloadResult {
  blob: Blob;
  url: string;
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  is4K: boolean;
  is60fps: boolean;
}

/**
 * Builds the stream proxy URL for web CORS compatibility or returns direct URL
 */
function getProxiedStreamUrl(directUrl: string): string {
  // If running natively in Capacitor (Android/iOS), fetch directly from CDN without server proxy
  if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.()) {
    return directUrl;
  }
  return getYouTubeApiUrl(`/api/youtube/stream?url=${encodeURIComponent(directUrl)}`);
}

/**
 * Measures content length of stream URL via HEAD request
 */
async function probeStreamSize(url: string, signal?: AbortSignal): Promise<number> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    const len = res.headers.get("content-length");
    if (len) return parseInt(len, 10);
  } catch {}
  return 0;
}

/**
 * Downloads a single stream using parallel Range chunk requests
 */
async function fetchStreamParallel({
  streamUrl,
  knownSize,
  maxWorkers = 4,
  label = "stream",
  onChunkBytes,
  signal,
}: {
  streamUrl: string;
  knownSize?: number;
  maxWorkers?: number;
  label?: string;
  onChunkBytes: (bytes: number) => void;
  signal?: AbortSignal;
}): Promise<Uint8Array> {
  const proxiedUrl = getProxiedStreamUrl(streamUrl);

  // 1. Determine exact file size
  let totalSize = knownSize || 0;
  if (!totalSize) {
    totalSize = await probeStreamSize(proxiedUrl, signal);
  }

  // If size is unknown or small (< 2 MB), fall back to single stream
  if (!totalSize || totalSize < 2 * 1024 * 1024) {
    const res = await fetch(proxiedUrl, { signal });
    if (!res.ok) throw new Error(`Stream fetch failed (${res.status}) for ${label}`);

    if (!res.body) {
      const buf = await res.arrayBuffer();
      onChunkBytes(buf.byteLength);
      return new Uint8Array(buf);
    }

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      if (signal?.aborted) throw new Error("Download aborted");
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        onChunkBytes(value.byteLength);
      }
    }

    const totalLen = chunks.reduce((acc, c) => acc + c.byteLength, 0);
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.byteLength;
    }
    return merged;
  }

  // 2. Multi-Worker Parallel Range Partitioning
  const workers = Math.max(2, Math.min(maxWorkers, 8));
  const chunkSize = Math.ceil(totalSize / workers);
  const partBuffers: Uint8Array[] = new Array(workers);

  const fetchPart = async (index: number) => {
    const start = index * chunkSize;
    const end = Math.min((index + 1) * chunkSize - 1, totalSize - 1);

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (signal?.aborted) throw new Error("Download aborted");
      try {
        const res = await fetch(proxiedUrl, {
          signal,
          headers: {
            Range: `bytes=${start}-${end}`,
          },
        });

        if (!res.ok && res.status !== 206) {
          throw new Error(`Range request failed (${res.status}) on worker ${index + 1}`);
        }

        if (!res.body) {
          const buf = await res.arrayBuffer();
          partBuffers[index] = new Uint8Array(buf);
          onChunkBytes(partBuffers[index].byteLength);
          return;
        }

        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let bytesReceived = 0;
        while (true) {
          if (signal?.aborted) throw new Error("Download aborted");
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            bytesReceived += value.byteLength;
            onChunkBytes(value.byteLength);
          }
        }

        const partMerged = new Uint8Array(bytesReceived);
        let offset = 0;
        for (const c of chunks) {
          partMerged.set(c, offset);
          offset += c.byteLength;
        }
        partBuffers[index] = partMerged;
        return;
      } catch (err: any) {
        lastError = err;
        if (attempt < 3 && !signal?.aborted) {
          await new Promise((r) => setTimeout(r, 400 * attempt));
        }
      }
    }
    throw lastError || new Error(`Worker ${index + 1} failed after 3 attempts`);
  };

  // Run all workers concurrently
  await Promise.all(Array.from({ length: workers }, (_, i) => fetchPart(i)));

  // Merge final parts in sequential order
  const finalMerged = new Uint8Array(totalSize);
  let finalOffset = 0;
  for (const part of partBuffers) {
    if (part) {
      finalMerged.set(part, finalOffset);
      finalOffset += part.byteLength;
    }
  }

  return finalMerged;
}

/**
 * Main Turbo Downloader entry point
 */
export async function downloadYouTubeStream({
  option,
  videoTitle,
  engine,
  maxParallelWorkers = 6,
  onProgress,
  signal,
}: TurboDownloadOptions): Promise<TurboDownloadResult> {
  const isAudioOnly = option.isAudioOnly;
  const is4K = option.is4K;
  const is60fps = option.is60fps;

  const totalEstBytes = option.approxSizeBytes || 50 * 1024 * 1024;
  let downloadedBytes = 0;
  let lastSampleTime = performance.now();
  let bytesSinceLastSample = 0;
  let currentSpeedMbps = 0;

  const updateProgress = (
    phase: TurboPhase,
    statusMessage: string,
    activeThreads = maxParallelWorkers
  ) => {
    const now = performance.now();
    const elapsedSec = (now - lastSampleTime) / 1000;

    if (elapsedSec >= 0.25) {
      const instantSpeed = (bytesSinceLastSample / (1024 * 1024)) / elapsedSec;
      currentSpeedMbps = currentSpeedMbps === 0 ? instantSpeed : currentSpeedMbps * 0.6 + instantSpeed * 0.4;
      lastSampleTime = now;
      bytesSinceLastSample = 0;
    }

    const pct = Math.min(100, Math.round((downloadedBytes / totalEstBytes) * 92)); // 0..92% for download, 92..100% for mux
    const remainingBytes = Math.max(0, totalEstBytes - downloadedBytes);
    const etaSeconds = currentSpeedMbps > 0 ? Math.round((remainingBytes / (1024 * 1024)) / currentSpeedMbps) : 0;

    onProgress({
      phase,
      progress: pct,
      speedMbps: Number(currentSpeedMbps.toFixed(1)),
      downloadedBytes,
      totalBytes: totalEstBytes,
      activeThreads,
      etaSeconds,
      statusMessage,
    });
  };

  const handleChunk = (size: number) => {
    downloadedBytes += size;
    bytesSinceLastSample += size;
    updateProgress("downloading", `Streaming ${option.label} via ${maxParallelWorkers} parallel channels…`);
  };

  updateProgress("resolving", "Connecting to high-speed stream servers…", 0);

  // Clean filename
  const sanitizedTitle = (videoTitle || "youtube_video")
    .replace(/[<>:"/\\|?*]/g, "")
    .trim()
    .substring(0, 60);

  // -------------------------------------------------------------
  // Case A: Audio Only (Extraction & Transcoding in Multiple Qualities)
  // -------------------------------------------------------------
  if (isAudioOnly && option.audioFormat) {
    const audioData = await fetchStreamParallel({
      streamUrl: option.audioFormat.url,
      knownSize: option.audioFormat.contentLength,
      maxWorkers: Math.min(maxParallelWorkers, 4),
      label: "audio",
      onChunkBytes: handleChunk,
      signal,
    });

    const inputName = `input_audio.${option.audioFormat.container}`;
    await engine.writeFile(inputName, audioData);

    let outputName = "output.mp3";
    let mimeType = "audio/mp3";
    let qualitySuffix = "[320kbps]";
    let ffmpegArgs: string[] = [];

    if (option.id === "audio-m4a") {
      outputName = "output.m4a";
      mimeType = "audio/mp4";
      qualitySuffix = "[Native AAC]";
      updateProgress("muxing", "Packaging native AAC audio stream…", 1);

      if (option.audioFormat.container === "m4a") {
        ffmpegArgs = ["-i", inputName, "-vn", "-c:a", "copy", outputName];
      } else {
        ffmpegArgs = ["-i", inputName, "-vn", "-c:a", "aac", "-b:a", "256k", "-ar", "44100", outputName];
      }
    } else if (option.id === "audio-wav") {
      outputName = "output.wav";
      mimeType = "audio/wav";
      qualitySuffix = "[Lossless PCM]";
      updateProgress("muxing", "Exporting uncompressed 16-bit WAV PCM…", 1);
      ffmpegArgs = ["-i", inputName, "-vn", "-c:a", "pcm_s16le", "-ar", "44100", outputName];
    } else {
      // MP3 at requested bitrate (320k, 256k, 192k, 128k, etc.)
      const bitrate = option.audioBitrate || (option.id === "audio-mp3" ? 320 : 256);
      outputName = "output.mp3";
      mimeType = "audio/mp3";
      qualitySuffix = `[${bitrate}kbps]`;
      updateProgress("muxing", `Mastering ${bitrate} kbps MP3 in WebAssembly…`, 1);
      ffmpegArgs = [
        "-i", inputName,
        "-vn",
        "-c:a", "libmp3lame",
        "-b:a", `${bitrate}k`,
        "-ar", "44100",
        "-af", "aresample=async=1000",
        outputName,
      ];
    }

    try {
      await engine.exec(ffmpegArgs);
    } catch (execErr: any) {
      console.warn("FFmpeg specialized audio command failed, trying fallback:", execErr);
      if (outputName.endsWith(".mp3")) {
        const fallbackBitrate = option.audioBitrate || 256;
        await engine.exec(["-i", inputName, "-vn", "-b:a", `${fallbackBitrate}k`, outputName]);
      } else if (outputName.endsWith(".m4a")) {
        await engine.exec(["-i", inputName, "-vn", "-c:a", "aac", outputName]);
      } else {
        throw execErr;
      }
    }

    const outData = (await engine.readFile(outputName)) as Uint8Array;
    try {
      await engine.deleteFile(inputName);
      await engine.deleteFile(outputName);
    } catch {}

    const blob = new Blob([outData.buffer as ArrayBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const ext = outputName.split(".").pop();
    const filename = `${sanitizedTitle} ${qualitySuffix}.${ext}`;

    onProgress({
      phase: "complete",
      progress: 100,
      speedMbps: currentSpeedMbps,
      downloadedBytes: blob.size,
      totalBytes: blob.size,
      activeThreads: 0,
      etaSeconds: 0,
      statusMessage: `Audio conversion complete (${qualitySuffix.replace(/[\[\]]/g, "")})!`,
    });

    return {
      blob,
      url,
      filename,
      fileSizeBytes: blob.size,
      mimeType,
      is4K: false,
      is60fps: false,
    };
  }

  // -------------------------------------------------------------
  // Case B: Video (4K 60fps / 2K / 1080p / 720p)
  // -------------------------------------------------------------
  if (!option.videoFormat) {
    throw new Error("Missing video stream format specification.");
  }

  const hasSeparateAudio = Boolean(option.audioFormat);
  const videoWorkers = hasSeparateAudio ? Math.max(2, maxParallelWorkers - 2) : maxParallelWorkers;
  const audioWorkers = hasSeparateAudio ? 2 : 0;

  // Parallel concurrent dual-stream download (Video + Audio simultaneously)
  const [videoBytes, audioBytes] = await Promise.all([
    fetchStreamParallel({
      streamUrl: option.videoFormat.url,
      knownSize: option.videoFormat.contentLength,
      maxWorkers: videoWorkers,
      label: "video",
      onChunkBytes: handleChunk,
      signal,
    }),
    hasSeparateAudio && option.audioFormat
      ? fetchStreamParallel({
          streamUrl: option.audioFormat.url,
          knownSize: option.audioFormat.contentLength,
          maxWorkers: audioWorkers,
          label: "audio",
          onChunkBytes: handleChunk,
          signal,
        })
      : Promise.resolve(null),
  ]);

  updateProgress("muxing", "Muxing 4K 60fps video & audio streams (lossless stream-copy)…", 1);

  // If video format already had pre-muxed audio, return directly
  if (!audioBytes) {
    const blob = new Blob([videoBytes.buffer as ArrayBuffer], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);
    const filename = `${sanitizedTitle} [${option.id}].mp4`;

    onProgress({
      phase: "complete",
      progress: 100,
      speedMbps: currentSpeedMbps,
      downloadedBytes: blob.size,
      totalBytes: blob.size,
      activeThreads: 0,
      etaSeconds: 0,
      statusMessage: "Download complete!",
    });

    return {
      blob,
      url,
      filename,
      fileSizeBytes: blob.size,
      mimeType: "video/mp4",
      is4K,
      is60fps,
    };
  }

  // Mux video stream + audio stream via FFmpeg stream copy (-c copy)
  const vInput = `stream_v.${option.videoFormat.container}`;
  const aInput = `stream_a.${option.audioFormat?.container || "webm"}`;
  const outputExt = "mp4";
  const outputName = `stream_out.${outputExt}`;

  await engine.writeFile(vInput, videoBytes);
  await engine.writeFile(aInput, audioBytes);

  // Lossless stream-copy muxing: instant 1-2s execution
  await engine.exec([
    "-i",
    vInput,
    "-i",
    aInput,
    "-c",
    "copy",
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-movflags",
    "+faststart",
    outputName,
  ]);

  const finalVideoData = (await engine.readFile(outputName)) as Uint8Array;

  try {
    await engine.deleteFile(vInput);
    await engine.deleteFile(aInput);
    await engine.deleteFile(outputName);
  } catch {}

  const finalBlob = new Blob([finalVideoData.buffer as ArrayBuffer], { type: "video/mp4" });
  const finalUrl = URL.createObjectURL(finalBlob);
  const finalFilename = `${sanitizedTitle} [${option.id}].mp4`;

  onProgress({
    phase: "complete",
    progress: 100,
    speedMbps: currentSpeedMbps,
    downloadedBytes: finalBlob.size,
    totalBytes: finalBlob.size,
    activeThreads: 0,
    etaSeconds: 0,
    statusMessage: `Ready! 4K 60fps video packaged cleanly.`,
  });

  return {
    blob: finalBlob,
    url: finalUrl,
    filename: finalFilename,
    fileSizeBytes: finalBlob.size,
    mimeType: "video/mp4",
    is4K,
    is60fps,
  };
}
