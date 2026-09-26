"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  resolveYouTubeVideo,
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
  const [mediaTypeTab, setMediaTypeTab] = useState<"video" | "audio">("video");
  const [workersCount, setWorkersCount] = useState<number>(6);

  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<TurboProgress | null>(null);
  const [downloadResult, setDownloadResult] = useState<TurboDownloadResult | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const currentResultUrlRef = useRef<string | null>(null);

  const clearResult = useCallback(() => {
    if (currentResultUrlRef.current) {
      try {
        URL.revokeObjectURL(currentResultUrlRef.current);
      } catch {}
      currentResultUrlRef.current = null;
    }
    setDownloadResult(null);
    setProgress(null);
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (currentResultUrlRef.current) {
        try {
          URL.revokeObjectURL(currentResultUrlRef.current);
        } catch {}
        currentResultUrlRef.current = null;
      }
    };
  }, []);

  const videoQualities = videoInfo?.qualities.filter((q) => !q.isAudioOnly) || [];
  const audioQualities = videoInfo?.qualities.filter((q) => q.isAudioOnly) || [];
  const displayedQualities = mediaTypeTab === "video" ? videoQualities : audioQualities;

  const handleTabChange = (tab: "video" | "audio") => {
    setMediaTypeTab(tab);
    if (!videoInfo) return;
    if (tab === "video") {
      if (!selectedQuality || selectedQuality.isAudioOnly) {
        const v = videoInfo.qualities?.find((q) => !q.isAudioOnly);
        if (v) setSelectedQuality(v);
      }
    } else {
      if (!selectedQuality || !selectedQuality.isAudioOnly) {
        const a = videoInfo.qualities?.find((q) => q.isAudioOnly);
        if (a) setSelectedQuality(a);
      }
    }
    void haptics.light();
  };

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
    clearResult();
    void haptics.light();

    try {
      let data: any = null;
      let lastErrorMessage = "";

      // 1. Native mobile resolution: If running in Capacitor (Android/iOS APK),
      // resolve DIRECTLY on the user's mobile device via native network stack.
      // This bypasses browser CORS and cloud datacenter IP blocks completely!
      const isNative = typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.();
      if (isNative) {
        try {
          const directInfo = await resolveYouTubeVideo(videoId);
          if (directInfo && directInfo.videoId && Array.isArray(directInfo.qualities) && directInfo.qualities.length > 0) {
            data = directInfo;
          }
        } catch (nativeErr: any) {
          console.warn("Direct device resolution error:", nativeErr);
          lastErrorMessage = nativeErr?.message || "";
        }
      }

      // 2. Web browser: Query Next.js API route
      if (!data) {
        const apiUrl = getYouTubeApiUrl("/api/youtube/info");
        // Primary: GET with videoId query parameter
        let res = await fetch(`${apiUrl}?v=${encodeURIComponent(videoId)}`);
        data = await res.json().catch(() => ({}));

        // Fallback: If GET returns static status or lacks qualities, try POST
        if (!data || !data.videoId || !Array.isArray(data.qualities) || data.qualities.length === 0) {
          const postRes = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoId }),
          });
          if (postRes.ok) {
            const postData = await postRes.json().catch(() => ({}));
            if (postData && postData.videoId && Array.isArray(postData.qualities) && postData.qualities.length > 0) {
              data = postData;
            }
          }
        }
      }

      // 3. Fallback: Direct Client-Side Resolution (on-device or local desktop client)
      if (!data || !data.videoId || !Array.isArray(data.qualities) || data.qualities.length === 0) {
        try {
          const directInfo = await resolveYouTubeVideo(videoId);
          if (directInfo && directInfo.videoId && Array.isArray(directInfo.qualities) && directInfo.qualities.length > 0) {
            data = directInfo;
          }
        } catch (directErr: any) {
          if (!lastErrorMessage) lastErrorMessage = directErr?.message || "";
        }
      }

      if (!data || !data.videoId || !Array.isArray(data.qualities) || data.qualities.length === 0) {
        throw new Error(data?.error || lastErrorMessage || "Failed to resolve video details");
      }

      const info: YouTubeVideoInfo = data;
      setVideoInfo(info);

      // Default select the appropriate option based on active tab
      const firstVideo = info.qualities?.find((q) => !q.isAudioOnly);
      const firstAudio = info.qualities?.find((q) => q.isAudioOnly);

      if (mediaTypeTab === "audio" && firstAudio) {
        setSelectedQuality(firstAudio);
      } else if (firstVideo) {
        setSelectedQuality(firstVideo);
      } else if (info.qualities && info.qualities.length > 0) {
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

    const isDirectFastPath =
      (!selectedQuality.isAudioOnly && !selectedQuality.audioFormat && Boolean(selectedQuality.videoFormat)) ||
      (selectedQuality.isAudioOnly && selectedQuality.id === "audio-m4a" && selectedQuality.audioFormat?.container === "m4a");

    if (!isDirectFastPath) {
      if (!engine || engineState !== "ready") {
        await boot();
      }

      if (!engine) {
        setResolveError("Media engine is initializing. Please wait a moment and try again.");
        return;
      }
    }

    setIsDownloading(true);
    clearResult();
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

      currentResultUrlRef.current = result.url;
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
          <div className="rounded-2xl border border-red-500/40 bg-gradient-to-b from-red-500/15 via-red-950/20 to-card/60 p-4 sm:p-5 space-y-3 text-xs font-mono text-red-300 shadow-elevation2">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 shrink-0 text-red-400 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm text-red-200">
                    {resolveError.toLowerCase().includes("bot") || resolveError.includes("LOGIN_REQUIRED")
                      ? "YouTube Cloud Bot Protection Active"
                      : "Unable to Resolve YouTube Stream"}
                  </span>
                  <span className="rounded-md border border-red-500/40 bg-red-500/20 px-1.5 py-0.2 font-mono text-[9px] uppercase font-bold text-red-300">
                    Cloud Restricted
                  </span>
                </div>
                <p className="text-xs text-red-200/90 leading-relaxed font-sans">
                  {resolveError.toLowerCase().includes("bot") || resolveError.includes("LOGIN_REQUIRED")
                    ? "YouTube has restricted cloud server IPs (Vercel/AWS) from extracting this stream. To download in full 4K 60FPS or studio audio with zero restrictions, use the official ZenoDeck Android App on your direct mobile or Wi-Fi network."
                    : resolveError}
                </p>
              </div>
            </div>
            {(resolveError.toLowerCase().includes("bot") || resolveError.includes("LOGIN_REQUIRED")) && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1 pl-8">
                <a
                  href="/zenodeck.apk"
                  download="zenodeck.apk"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 px-4 py-2 text-xs font-display font-bold text-white shadow-md transition-all cursor-pointer w-fit"
                >
                  <Download className="size-3.5" />
                  <span>Download ZenoDeck APK (Free & Unrestricted)</span>
                </a>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Runs 100% on-device · Direct residential network
                </span>
              </div>
            )}
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
                {videoInfo.qualities?.some((q) => q.is4K) && (
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

            {/* Quality Selector & Media Type Selection */}
            <div className="space-y-3">
              {/* Segmented Media Tabs */}
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTabChange("video")}
                    disabled={isDownloading}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 font-display text-xs font-bold transition-all cursor-pointer ${
                      mediaTypeTab === "video"
                        ? "bg-red-500/20 text-red-300 border border-red-500/40 shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/50 border border-transparent"
                    }`}
                  >
                    <Film className="size-3.5" />
                    <span>Video Streams ({videoQualities.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange("audio")}
                    disabled={isDownloading}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 font-display text-xs font-bold transition-all cursor-pointer ${
                      mediaTypeTab === "audio"
                        ? "bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/50 border border-transparent"
                    }`}
                  >
                    <Music className="size-3.5" />
                    <span>Direct Audio ({audioQualities.length})</span>
                    <span className="rounded-full bg-violet-500/30 px-1.5 py-0.2 font-mono text-[9px] text-violet-200 uppercase">
                      Fast
                    </span>
                  </button>
                </div>

                <span className="hidden sm:inline-block font-mono text-[11px] text-muted-foreground">
                  {selectedQuality ? `${selectedQuality.label} · ${formatBytes(selectedQuality.approxSizeBytes)}` : ""}
                </span>
              </div>

              {/* Direct Audio Banner */}
              {mediaTypeTab === "audio" && (
                <div className="flex items-center gap-2.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3.5 py-2 text-xs font-mono text-violet-300">
                  <Sparkles className="size-3.5 shrink-0 text-violet-400" />
                  <span>
                    Direct Audio Mode: Downloads only the audio stream (~3–15 MB) for instant extraction at maximum speed.
                  </span>
                </div>
              )}

              {/* Quality Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {displayedQualities.map((q) => {
                  const isSelected = selectedQuality?.id === q.id;
                  const isAudio = q.isAudioOnly;

                  let badgeColor = "bg-primary/15 text-primary border border-primary/30";
                  if (q.is4K) badgeColor = "bg-amber-500/20 text-amber-300 border border-amber-500/40";
                  else if (q.badge.includes("60")) badgeColor = "bg-red-500/20 text-red-300 border border-red-500/40";
                  else if (q.badge === "320 KBPS") badgeColor = "bg-violet-500/20 text-violet-300 border border-violet-500/40";
                  else if (q.badge === "256 KBPS") badgeColor = "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40";
                  else if (q.badge === "192 KBPS") badgeColor = "bg-blue-500/20 text-blue-300 border border-blue-500/40";
                  else if (q.badge === "128 KBPS") badgeColor = "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40";
                  else if (q.badge === "NATIVE AAC") badgeColor = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";
                  else if (q.badge === "WAV PCM") badgeColor = "bg-amber-500/20 text-amber-300 border border-amber-500/40";
                  else if (isAudio) badgeColor = "bg-violet-500/20 text-violet-300 border border-violet-500/40";

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
                          ? isAudio
                            ? "border-violet-500/80 bg-violet-500/15 shadow-[0_0_16px_rgba(139,92,246,0.25)] ring-1 ring-violet-500/50"
                            : "border-red-500/80 bg-red-500/15 shadow-[0_0_16px_rgba(239,68,68,0.2)] ring-1 ring-red-500/50"
                          : "border-border/70 bg-card/40 hover:border-primary/40 hover:bg-card/70"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <span className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${badgeColor}`}>
                          {q.badge}
                        </span>
                        <span className="font-mono text-xs font-semibold text-foreground/90">
                          {formatBytes(q.approxSizeBytes)}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          {isAudio ? (
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
                            isSelected
                              ? isAudio
                                ? "border-violet-500 bg-violet-500"
                                : "border-red-500 bg-red-500"
                              : "border-border"
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
                className={`w-full flex items-center justify-center gap-2.5 rounded-xl py-3.5 px-6 font-display text-sm font-bold text-white transition-all cursor-pointer ${
                  selectedQuality?.isAudioOnly
                    ? "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 shadow-lg shadow-violet-500/25 hover:opacity-95"
                    : "bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 shadow-lg shadow-red-500/20 hover:opacity-95"
                }`}
              >
                {selectedQuality?.isAudioOnly ? (
                  <>
                    <Music className="size-4" />
                    <span>
                      EXTRACT AUDIO ({selectedQuality?.badge}) · {formatBytes(selectedQuality?.approxSizeBytes || 0)}
                    </span>
                  </>
                ) : (
                  <>
                    <Download className="size-4" />
                    <span>
                      START TURBO DOWNLOAD ({selectedQuality?.badge || "4K"}) · {formatBytes(selectedQuality?.approxSizeBytes || 0)}
                    </span>
                  </>
                )}
              </button>
            ) : (
              <div
                className={`panel-hud rounded-2xl border p-5 space-y-4 shadow-elevation2 ${
                  selectedQuality?.isAudioOnly
                    ? "border-violet-500/40 bg-card/80"
                    : "border-red-500/40 bg-card/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-3">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          selectedQuality?.isAudioOnly ? "bg-violet-400" : "bg-red-400"
                        }`}
                      />
                      <span
                        className={`relative inline-flex rounded-full size-3 ${
                          selectedQuality?.isAudioOnly ? "bg-violet-500" : "bg-red-500"
                        }`}
                      />
                    </span>
                    <span className="font-display text-sm font-bold text-foreground">
                      {progress?.phase === "muxing"
                        ? selectedQuality?.isAudioOnly
                          ? "MASTERING AUDIO IN WEBASSEMBLY…"
                          : "PACKAGING STREAM IN WEBASSEMBLY…"
                        : selectedQuality?.isAudioOnly
                        ? "TURBO DOWNLOADING AUDIO TRACK…"
                        : "TURBO DOWNLOADING 4K STREAMS…"}
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
                      className={`h-full ${
                        selectedQuality?.isAudioOnly
                          ? "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-400"
                          : "bg-gradient-to-r from-red-500 via-rose-500 to-amber-400"
                      }`}
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
            className="space-y-4"
          >
            {downloadResult.mimeType.startsWith("audio/") ? (
              /* Dedicated Audio Player View */
              <div className="panel-hud rounded-2xl border border-violet-500/40 bg-card/60 p-5 sm:p-6 space-y-4 shadow-elevation2">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-violet-400" />
                    <span className="font-display text-sm sm:text-base font-bold text-foreground">
                      AUDIO READY ({downloadResult.filename.split(".").pop()?.toUpperCase() || "MP3"})
                    </span>
                  </div>
                  <span className="font-mono text-xs text-violet-400 font-bold">
                    {formatBytes(downloadResult.fileSizeBytes)}
                  </span>
                </div>

                {/* Player Card */}
                <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 via-card/70 to-card/40 p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-3.5">
                    {videoInfo?.thumbnailUrl ? (
                      <img
                        src={videoInfo.thumbnailUrl}
                        alt={videoInfo.title}
                        className="size-16 rounded-xl object-cover border border-violet-500/40 shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="size-16 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center shrink-0">
                        <Music className="size-8 text-violet-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-display text-sm font-bold text-foreground truncate">
                        {videoInfo?.title}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground truncate">
                        {videoInfo?.author}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-violet-500/25 px-2 py-0.5 font-mono text-[10px] font-bold text-violet-300 border border-violet-500/40">
                          {downloadResult.filename.includes("[")
                            ? downloadResult.filename.split("[").pop()?.split("]")[0]
                            : "AUDIO"}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {formatBytes(downloadResult.fileSizeBytes)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <audio
                    controls
                    src={downloadResult.url}
                    className="w-full mt-2 accent-violet-500 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <p className="font-mono text-xs font-semibold text-foreground truncate">
                    {downloadResult.filename}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Mastered with high-fidelity WebAssembly audio engine · Studio response
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveToDevice}
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 px-5 font-display text-xs font-bold text-white shadow-xs hover:bg-violet-500 transition-all cursor-pointer"
                  >
                    <Download className="size-4" />
                    <span>SAVE AUDIO TO DEVICE</span>
                  </button>

                  <button
                    type="button"
                    onClick={clearResult}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/80 py-3 px-4 font-mono text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Convert Another</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Dedicated Video Player View */
              <div className="panel-hud rounded-2xl border border-emerald-500/40 bg-card/60 p-5 sm:p-6 space-y-4 shadow-elevation2">
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
                    onClick={clearResult}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/80 py-3 px-4 font-mono text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Download Another</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
