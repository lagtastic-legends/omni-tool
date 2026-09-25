"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Youtube,
  Download,
  Zap,
  Gauge,
  Film,
  Music,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Clipboard,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";
import { useHaptics } from "@/hooks/use-haptics";
import { useUIAudio } from "@/hooks/useUIAudio";
import { nativeSave } from "@/lib/native-save";
import {
  extractYouTubeId,
  formatBytes,
  formatDuration,
  getYouTubeApiUrl,
  type YouTubeQualityOption,
  type YouTubeVideoInfo,
} from "@/lib/youtube/innertube";
import {
  downloadYouTubeStream,
  type TurboProgress,
  type TurboDownloadResult,
} from "@/lib/youtube/turbo-downloader";

export function YouTubeDownloader() {
  const { engine, state: engineState, boot } = useFFmpegEngine();
  const haptics = useHaptics();
  const { playSuccess, playError } = useUIAudio();

  const [inputUrl, setInputUrl] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<YouTubeVideoInfo | null>(null);

  const [selectedQuality, setSelectedQuality] = useState<YouTubeQualityOption | null>(null);
  const [workersCount, setWorkersCount] = useState<number>(6);

  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<TurboProgress | null>(null);
  const [downloadResult, setDownloadResult] = useState<TurboDownloadResult | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Auto-boot FFmpeg engine when mounting this tool
  useEffect(() => {
    if (engineState === "idle") {
      void boot();
    }
  }, [engineState, boot]);

  // Handle URL Resolution
  const handleResolve = async (urlToResolve = inputUrl) => {
    const videoId = extractYouTubeId(urlToResolve);
    if (!videoId) {
      setResolveError("Please enter a valid YouTube URL (e.g. https://www.youtube.com/watch?v=...)");
      void haptics.warning();
      return;
    }

    setResolveError(null);
    setIsResolving(true);
    setVideoInfo(null);
    setDownloadResult(null);
    setProgress(null);
    void haptics.light();

    try {
      const apiUrl = getYouTubeApiUrl(`/api/youtube/info?v=${encodeURIComponent(videoId)}`);
      const res = await fetch(apiUrl);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to resolve video details (${res.status})`);
      }

      const info: YouTubeVideoInfo = await res.json();
      setVideoInfo(info);

      // Default select the highest 4K 60fps / 1080p option available
      if (info.qualities && info.qualities.length > 0) {
        setSelectedQuality(info.qualities[0]);
      }
      void haptics.success();
    } catch (err: any) {
      console.error("Resolve error:", err);
      setResolveError(err.message || "Failed to load YouTube video streams.");
      void haptics.error();
    } finally {
      setIsResolving(false);
    }
  };

  // Handle Paste
  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputUrl(text);
          void handleResolve(text);
        }
      }
    } catch {
      // Ignore clipboard permission errors
    }
  };

  // Handle Turbo Download
  const handleStartDownload = async () => {
    if (!videoInfo || !selectedQuality) return;

    if (!engine || engineState !== "ready") {
      await boot();
    }

    if (!engine) {
      setResolveError("Media engine is initializing. Please wait a moment and try again.");
      return;
    }

    setIsDownloading(true);
    setDownloadResult(null);
    void haptics.medium();

    abortControllerRef.current = new AbortController();

    try {
      const result = await downloadYouTubeStream({
        option: selectedQuality,
        videoTitle: videoInfo.title,
        engine,
        maxParallelWorkers: workersCount,
        onProgress: (p) => setProgress(p),
        signal: abortControllerRef.current.signal,
      });

      setDownloadResult(result);
      void haptics.success();
      playSuccess();
    } catch (err: any) {
      if (err.message !== "Download aborted") {
        console.error("Download error:", err);
        setResolveError(err.message || "Download failed. Please try a different quality tier.");
        void haptics.error();
        playError();
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle Cancel
  const handleCancelDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsDownloading(false);
    setProgress(null);
    void haptics.light();
  };

  // Handle Save to Device
  const handleSaveToDevice = async () => {
    if (!downloadResult) return;
    void haptics.medium();
    await nativeSave(downloadResult.blob, downloadResult.filename);
  };

  // Sample 4K Demo Video
  const handleLoadSample = () => {
    const sample = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    setInputUrl(sample);
    void handleResolve(sample);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-3 sm:px-6 py-4">
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-red-400">
              <Youtube className="size-3" />
              <span>YouTube 4K Turbo</span>
            </span>
            <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-amber-300">
              <Zap className="size-2.5" />
              <span>60 FPS HDR</span>
            </span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            YouTube 4K 60FPS Downloader
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            Ultra-High-Definition video & studio audio downloads · Multi-worker chunk acceleration
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            type="button"
            onClick={handleLoadSample}
            disabled={isResolving || isDownloading}
            className="rounded-lg border border-border/70 bg-card/60 px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all cursor-pointer"
          >
            Load 4K Sample
          </button>
        </div>
      </div>

      {/* URL Input Bar */}
      <div className="panel-hud rounded-2xl border border-primary/20 bg-card/50 p-4 sm:p-5 shadow-elevation1 space-y-3">
        <label className="block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Enter YouTube Video URL
        </label>
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
              <Youtube className="size-4 text-red-500" />
            </div>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value);
                setResolveError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleResolve();
              }}
              placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
              disabled={isResolving || isDownloading}
              className="w-full rounded-xl border border-border/80 bg-background/80 py-2.5 pl-10 pr-24 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-red-500 focus:outline-hidden focus:ring-1 focus:ring-red-500/50"
            />
            <button
              type="button"
              onClick={handlePaste}
              disabled={isResolving || isDownloading}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-lg border border-border/60 bg-card/80 px-2 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Paste from clipboard"
            >
              <Clipboard className="size-3" />
              <span>Paste</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleResolve()}
            disabled={isResolving || isDownloading || !inputUrl.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 font-display text-xs font-bold text-white shadow-xs hover:bg-red-500 disabled:opacity-50 transition-all cursor-pointer shrink-0"
          >
            {isResolving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>RESOLVING 4K STREAMS…</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>FETCH VIDEO</span>
              </>
            )}
          </button>
        </div>

        {/* Error message */}
        {resolveError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 text-xs font-mono text-red-300">
            <AlertCircle className="size-4 shrink-0 text-red-400" />
            <span>{resolveError}</span>
          </div>
        )}
      </div>

      {/* Video Details & Quality Selection */}
      <AnimatePresence mode="wait">
        {videoInfo && !downloadResult && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            {/* Metadata Card */}
            <div className="panel-hud flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-border/80 bg-card/40 p-4 sm:p-5">
              <div className="relative aspect-video w-full sm:w-64 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-black">
                <img
                  src={videoInfo.thumbnailUrl}
                  alt={videoInfo.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-2 right-2 rounded-md bg-black/85 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-xs">
                  {videoInfo.durationFormatted}
                </div>
                {videoInfo.qualities.some((q) => q.is4K) && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md border border-amber-500/40 bg-black/85 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-300 shadow-sm backdrop-blur-xs">
                    <Sparkles className="size-2.5 text-amber-400" />
                    <span>4K 60FPS</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 min-w-0">
                <h2 className="font-display text-base sm:text-lg font-bold text-foreground line-clamp-2 leading-snug">
                  {videoInfo.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
                  <span className="font-semibold text-foreground/90">{videoInfo.author}</span>
                  <span>•</span>
                  <span>{videoInfo.viewCount} views</span>
                  <span>•</span>
                  <span>{videoInfo.durationFormatted}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono text-emerald-300 w-fit">
                  <ShieldCheck className="size-3.5 text-emerald-400" />
                  <span>Streams verified · Direct unthrottled endpoints ready</span>
                </div>
              </div>
            </div>

            {/* Quality Selector Grid */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between font-mono text-xs text-muted-foreground uppercase tracking-wider">
                <span>Select Quality Tier</span>
                <span className="text-[10px] text-primary">
                  {selectedQuality ? `${selectedQuality.label} · ${formatBytes(selectedQuality.approxSizeBytes)}` : ""}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {videoInfo.qualities.map((q) => {
                  const isSelected = selectedQuality?.id === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setSelectedQuality(q);
                        void haptics.light();
                      }}
                      disabled={isDownloading}
                      className={`relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-red-500/80 bg-red-500/15 shadow-[0_0_16px_rgba(239,68,68,0.2)] ring-1 ring-red-500/50"
                          : "border-border/70 bg-card/40 hover:border-red-500/40 hover:bg-card/70"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <span
                          className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${
                            q.is4K
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : q.badge.includes("60")
                              ? "bg-red-500/20 text-red-300 border border-red-500/40"
                              : q.isAudioOnly
                              ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                              : "bg-primary/15 text-primary border border-primary/30"
                          }`}
                        >
                          {q.badge}
                        </span>
                        <span className="font-mono text-xs font-semibold text-foreground/90">
                          {formatBytes(q.approxSizeBytes)}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          {q.isAudioOnly ? (
                            <Music className="size-3.5 text-violet-400" />
                          ) : (
                            <Film className="size-3.5 text-red-400" />
                          )}
                          <span className="font-display text-xs font-bold text-foreground">
                            {q.label}
                          </span>
                        </div>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {q.resolutionLabel} {q.fps > 0 ? `· ${q.fps} fps` : ""}
                        </p>
                      </div>

                      {/* Selected radio dot */}
                      <div className="absolute top-3 right-3">
                        <div
                          className={`size-3 rounded-full border flex items-center justify-center ${
                            isSelected ? "border-red-500 bg-red-500" : "border-border"
                          }`}
                        >
                          {isSelected && <div className="size-1 rounded-full bg-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Speed & Acceleration Settings */}
            <div className="panel-hud rounded-xl border border-border/70 bg-card/30 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Gauge className="size-4 text-amber-400 shrink-0" />
                <div className="font-mono text-xs text-foreground">
                  <span>Turbo Multi-Worker Acceleration:</span>{" "}
                  <span className="font-bold text-amber-300">{workersCount} Parallel Channels</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                {[4, 6, 8].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setWorkersCount(count)}
                    disabled={isDownloading}
                    className={`rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      workersCount === count
                        ? "border border-amber-500/50 bg-amber-500/20 text-amber-300"
                        : "border border-border/60 bg-card/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {count}x Threads
                  </button>
                ))}
              </div>
            </div>

            {/* Download Button or Progress HUD */}
            {!isDownloading ? (
              <button
                type="button"
                onClick={handleStartDownload}
                disabled={!selectedQuality}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 py-3.5 px-6 font-display text-sm font-bold text-white shadow-lg shadow-red-500/20 hover:opacity-95 transition-all cursor-pointer"
              >
                <Download className="size-4" />
                <span>
                  START TURBO DOWNLOAD ({selectedQuality?.badge || "4K"}) · {formatBytes(selectedQuality?.approxSizeBytes || 0)}
                </span>
              </button>
            ) : (
              <div className="panel-hud rounded-2xl border border-red-500/40 bg-card/80 p-5 space-y-4 shadow-elevation2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full size-3 bg-red-500" />
                    </span>
                    <span className="font-display text-sm font-bold text-foreground">
                      {progress?.phase === "muxing" ? "PACKAGING STREAM IN WEBASSEMBLY…" : "TURBO DOWNLOADING…"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {progress && progress.speedMbps > 0 && (
                      <div className="flex items-center gap-1 font-mono text-xs font-bold text-amber-400">
                        <Zap className="size-3.5 fill-amber-400" />
                        <span>{progress.speedMbps} MB/s</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleCancelDownload}
                      className="rounded-lg border border-border/70 px-2.5 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                    <span>{progress?.statusMessage || "Downloading chunks…"}</span>
                    <span className="font-bold text-foreground">{progress?.progress || 0}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
                    <motion.div
                      className="h-full bg-gradient-to-r from-red-500 via-rose-500 to-amber-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress?.progress || 0}%` }}
                      transition={{ ease: "easeOut", duration: 0.2 }}
                    />
                  </div>
                </div>

                {/* Telemetry metrics */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/50 text-center font-mono text-[10px]">
                  <div>
                    <span className="text-muted-foreground block">Downloaded</span>
                    <span className="font-bold text-foreground">
                      {formatBytes(progress?.downloadedBytes || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Active Threads</span>
                    <span className="font-bold text-amber-300">
                      {progress?.activeThreads || workersCount} Workers
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Estimated Time</span>
                    <span className="font-bold text-foreground">
                      {progress?.etaSeconds && progress.etaSeconds > 0 ? `${progress.etaSeconds}s` : "Calculating…"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Download Complete / Player View */}
        {downloadResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="panel-hud rounded-2xl border border-emerald-500/40 bg-card/60 p-5 sm:p-6 space-y-4 shadow-elevation2"
          >
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-400" />
                <span className="font-display text-sm sm:text-base font-bold text-foreground">
                  DOWNLOAD READY ({downloadResult.is4K ? "4K 60FPS" : downloadResult.mimeType.split("/")[0].toUpperCase()})
                </span>
              </div>
              <span className="font-mono text-xs text-emerald-400 font-bold">
                {formatBytes(downloadResult.fileSizeBytes)}
              </span>
            </div>

            {/* Video Player Preview */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/80 bg-black">
              <video
                ref={videoPreviewRef}
                src={downloadResult.url}
                controls
                className="h-full w-full object-contain"
              />
            </div>

            <div className="space-y-1">
              <p className="font-mono text-xs font-semibold text-foreground truncate">
                {downloadResult.filename}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">
                Lossless stream-copy muxed in WebAssembly · Zero compression artifacts
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleSaveToDevice}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 px-5 font-display text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition-all cursor-pointer"
              >
                <Download className="size-4" />
                <span>SAVE TO DEVICE</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDownloadResult(null);
                  setProgress(null);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/80 py-3 px-4 font-mono text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                <span>Download Another</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
