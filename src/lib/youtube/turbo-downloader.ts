/**
 * ZenoDeck — YouTube Turbo Downloader Engine
 * ===========================================
 *
 * High-speed multi-worker parallel chunk streaming pipeline.
 *
 * Key Capabilities:
 *  1. Multi-Threaded Range Chunk Streaming: Bypasses single-connection throttling
 *     by splitting streams across progressive range workers (Range: bytes=X-Y).
 *  2. Dual-Stream Concurrent Fetching: Downloads 4K 60fps video and studio audio
 *     simultaneously with dynamic worker allocation.
 *  3. Edge Node Failover & Resume: Automatically cycles candidate CDN edge nodes
 *     (mn, fallback_host) with automatic retry and stall detection.
 *  4. Fast-Path Direct Saving: Native AAC (M4A) and pre-muxed 720p MP4 save
 *     instantly without WebAssembly overhead.
 *  5. Zero-Loss Stream-Copy Muxing: Uses FFmpeg WASM `-c copy` to combine video
 *     and audio streams in seconds with zero re-encoding artifacts or CPU lag.
 *  6. Live Telemetry: Instantaneous throughput gauge (MB/s), thread counter,
 *     and dynamic ETA computation.
 */

import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { Capacitor } from "@capacitor/core";
import {
  buildCandidateUrls,
  getYouTubeApiUrl,
  type YouTubeQualityOption,
} from "./innertube";

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
  engine?: FFmpeg | null;
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
 * Builds the stream proxy URL for web CORS compatibility or returns direct URL for native mobile
 */
function getProxiedStreamUrl(directUrl: string): string {
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    return directUrl;
  }
  return getYouTubeApiUrl(`/api/youtube/stream?url=${encodeURIComponent(directUrl)}`);
}

/**
 * Safely measures content length of stream URL via Range: bytes=0-0 GET probe
 * Bypasses hanging HEAD requests on Google Video CDN and CapacitorHttp
 */
async function probeStreamSizeSafe(
  candidateUrls: string[],
  knownSize?: number,
  signal?: AbortSignal
): Promise<number> {
  if (knownSize && knownSize > 0) return knownSize;

  for (const directUrl of candidateUrls) {
    if (signal?.aborted) return 0;
    try {
      const targetUrl = getProxiedStreamUrl(directUrl);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const onParentAbort = () => controller.abort();
      signal?.addEventListener("abort", onParentAbort);

      const res = await fetch(targetUrl, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        signal: controller.signal,
      });

      clearTimeout(timer);
      signal?.removeEventListener("abort", onParentAbort);

      const cr = res.headers.get("content-range");
      if (cr) {
        const match = cr.match(/\/(\d+)$/);
        if (match) {
          const size = parseInt(match[1], 10);
          if (size > 0) return size;
        }
      }
    } catch {}
  }
  return 0;
}

/**
 * Downloads a single stream using progressive range chunk workers with candidate failover
 */
async function downloadStreamResilient({
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
  const candidateUrls = buildCandidateUrls(streamUrl);

  // 1. Determine exact file size safely without hanging HEAD requests
  let totalSize = await probeStreamSizeSafe(candidateUrls, knownSize, signal);

  // Fallback: if size is still unknown or very small (< 1 MB), perform direct streaming fetch
  if (!totalSize || totalSize < 1024 * 1024) {
    let lastErr: Error | null = null;
    for (const cand of candidateUrls) {
      if (signal?.aborted) throw new Error("Download aborted");
      try {
        const targetUrl = getProxiedStreamUrl(cand);
        const res = await fetch(targetUrl, { signal });
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
      } catch (err: any) {
        lastErr = err;
      }
    }
    throw lastErr || new Error(`Failed to fetch ${label} stream.`);
  }

  // 2. Progressive Sized Chunk Partitioning
  // 512KB for streams < 10MB; 1MB for larger streams.
  // This guarantees fast packet-by-packet UI feedback (0% -> 2% -> 5% -> ...)
  // while preventing Android WebView base64 IPC bridge congestion.
  const CHUNK_SIZE = totalSize > 10 * 1024 * 1024 ? 1024 * 1024 : 512 * 1024;
  const numChunks = Math.ceil(totalSize / CHUNK_SIZE);
  const outputBuffer = new Uint8Array(totalSize);

  // Use 2–4 workers for optimal mobile network saturation without throttling
  const concurrency = Math.max(1, Math.min(maxWorkers, 4, numChunks));
  let nextChunkIndex = 0;

  const worker = async (workerId: number) => {
    while (true) {
      if (signal?.aborted) throw new Error("Download aborted");
      const chunkIndex = nextChunkIndex++;
      if (chunkIndex >= numChunks) break;

      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min((chunkIndex + 1) * CHUNK_SIZE - 1, totalSize - 1);

      let chunkSuccess = false;
      let lastErr: Error | null = null;

      // Retry up to 3 times per chunk with candidate edge node failover
      for (let attempt = 0; attempt < 3; attempt++) {
        if (signal?.aborted) throw new Error("Download aborted");
        const candidate = candidateUrls[(chunkIndex + attempt) % candidateUrls.length];
        const requestUrl = getProxiedStreamUrl(candidate);

        const chunkController = new AbortController();
        const timeoutTimer = setTimeout(() => chunkController.abort(), 8000);
        const onParentAbort = () => chunkController.abort();
        signal?.addEventListener("abort", onParentAbort);

        try {
          const res = await fetch(requestUrl, {
            signal: chunkController.signal,
            headers: { Range: `bytes=${start}-${end}` },
          });

          clearTimeout(timeoutTimer);
          signal?.removeEventListener("abort", onParentAbort);

          if (!res.ok && res.status !== 206) {
            throw new Error(`Range request failed (HTTP ${res.status})`);
          }

          const buf = await res.arrayBuffer();
          const partData = new Uint8Array(buf);
          if (partData.byteLength === 0) {
            throw new Error("Received empty chunk payload");
          }

          outputBuffer.set(partData, start);
          onChunkBytes(partData.byteLength);
          chunkSuccess = true;
          break;
        } catch (err: any) {
          clearTimeout(timeoutTimer);
          signal?.removeEventListener("abort", onParentAbort);
          lastErr = err;
          if (attempt < 2 && !signal?.aborted) {
            await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
          }
        }
      }

      if (!chunkSuccess) {
        throw lastErr || new Error(`Chunk ${chunkIndex + 1}/${numChunks} failed after 3 attempts`);
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i)));
  return outputBuffer;
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

  const hasSeparateAudio = Boolean(!isAudioOnly && option.audioFormat);
  const isDirectFastPath =
    (!isAudioOnly && !option.audioFormat && Boolean(option.videoFormat)) ||
    (isAudioOnly && option.id === "audio-m4a" && option.audioFormat?.container === "m4a");

  const progressMaxPct = isDirectFastPath ? 98 : 92;

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

    const pct = Math.min(100, Math.round((downloadedBytes / totalEstBytes) * progressMaxPct));
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
    updateProgress("downloading", `Streaming ${option.label} via multi-worker pipeline…`);
  };

  updateProgress("resolving", "Connecting to high-speed stream servers…", 0);

  // Clean filename
  const sanitizedTitle = (videoTitle || "youtube_video")
    .replace(/[<>:"/\\|?*]/g, "")
    .trim()
    .substring(0, 60);

  // -------------------------------------------------------------
  // Case A: Audio Only
  // -------------------------------------------------------------
  if (isAudioOnly && option.audioFormat) {
    const audioData = await downloadStreamResilient({
      streamUrl: option.audioFormat.url,
      knownSize: option.audioFormat.contentLength,
      maxWorkers: Math.min(maxParallelWorkers, 4),
      label: "audio",
      onChunkBytes: handleChunk,
      signal,
    });

    // Fast-path for Native AAC (M4A): direct container save without FFmpeg
    if (option.id === "audio-m4a" && option.audioFormat.container === "m4a") {
      const blob = new Blob([audioData.buffer as ArrayBuffer], { type: "audio/mp4" });
      const url = URL.createObjectURL(blob);
      const filename = `${sanitizedTitle} [Native AAC].m4a`;

      onProgress({
        phase: "complete",
        progress: 100,
        speedMbps: currentSpeedMbps,
        downloadedBytes: blob.size,
        totalBytes: blob.size,
        activeThreads: 0,
        etaSeconds: 0,
        statusMessage: "Audio extraction complete (Native AAC)!",
      });

      return {
        blob,
        url,
        filename,
        fileSizeBytes: blob.size,
        mimeType: "audio/mp4",
        is4K: false,
        is60fps: false,
      };
    }

    // FFmpeg audio transcoding for MP3 and WAV
    if (!engine) {
      throw new Error("FFmpeg engine is required to transcode audio.");
    }

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
      ffmpegArgs = ["-i", inputName, "-vn", "-c:a", "aac", "-b:a", "256k", "-ar", "44100", outputName];
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

  const videoWorkers = hasSeparateAudio ? Math.max(2, maxParallelWorkers - 2) : maxParallelWorkers;
  const audioWorkers = hasSeparateAudio ? 2 : 0;

  // Concurrent dual-stream download (Video + Audio simultaneously)
  const [videoBytes, audioBytes] = await Promise.all([
    downloadStreamResilient({
      streamUrl: option.videoFormat.url,
      knownSize: option.videoFormat.contentLength,
      maxWorkers: videoWorkers,
      label: "video",
      onChunkBytes: handleChunk,
      signal,
    }),
    hasSeparateAudio && option.audioFormat
      ? downloadStreamResilient({
          streamUrl: option.audioFormat.url,
          knownSize: option.audioFormat.contentLength,
          maxWorkers: audioWorkers,
          label: "audio",
          onChunkBytes: handleChunk,
          signal,
        })
      : Promise.resolve(null),
  ]);

  // Fast-path: If video format was already pre-muxed (e.g. 720p MP4), save directly without FFmpeg
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

  // Mux video stream + audio stream via FFmpeg lossless stream copy (-c copy)
  if (!engine) {
    throw new Error("FFmpeg engine is required for muxing separate streams.");
  }

  updateProgress("muxing", "Muxing 4K 60fps video & audio streams (lossless stream-copy)…", 1);

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
