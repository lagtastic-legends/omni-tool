"use client";

/**
 * STUDIO RECORDER — native-browser capture: microphone, webcam and screen.
 * MediaRecorder → WebM (opus / vp9+opus), with live level telemetry,
 * pause/resume, elapsed timer and vault-ready output.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Monitor,
  Mic,
  Pause,
  Play,
  Square,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { OmniRecorder } from "@/lib/native-recorder";
import { OutputCard } from "@/components/media/output-card";
import fixWebmDuration from "fix-webm-duration";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { JobOutput } from "@/hooks/use-media-job";
import { formatDurationMs } from "@/lib/format";

type RecorderMode = "mic" | "webcam" | "screen";
type MediaState = "off" | "starting" | "live" | "denied";

const MODE_META: Record<
  RecorderMode,
  { label: string; icon: typeof Mic; mime: string[]; hint: string }
> = {
  mic: {
    label: "Microphone",
    icon: Mic,
    mime: ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"],
    hint: "voice memos, samples, meetings — audio only",
  },
  webcam: {
    label: "Web Camera",
    icon: Camera,
    mime: ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"],
    hint: "camera + microphone picture-in-picture vlog takes",
  },
  screen: {
    label: "Screen",
    icon: Monitor,
    mime: ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"],
    hint: "full screen, window or tab — you pick when it starts",
  },
};

function pickMime(candidates: string[]): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      /* keep probing */
    }
  }
  return undefined;
}

export function StudioRecorder() {
  const [mode, setMode] = useState<RecorderMode>("mic");
  const [mediaState, setMediaState] = useState<MediaState>("off");
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [output, setOutput] = useState<JobOutput | null>(null);
  const [levels, setLevels] = useState<number[]>(() => new Array(28).fill(0.06));
  const [screenQuality, setScreenQuality] = useState<"720p" | "1080p" | "4k">("1080p");
  const [screenFps, setScreenFps] = useState<30 | 60>(30);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const pausedAccumRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);

  /* ------------------------------------------------------------------ */
  /* teardown helpers                                                     */
  /* ------------------------------------------------------------------ */
  const stopAnalysis = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    setLevels(new Array(28).fill(0.06));
  }, []);

  const teardownMedia = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    stopAnalysis();
    setMediaState("off");
    setRecording(false);
    setPaused(false);
    setElapsedMs(0);
    startedAtRef.current = null;
    pausedAtRef.current = null;
    pausedAccumRef.current = 0;
  }, [stopAnalysis]);

  useEffect(() => () => teardownMedia(), [teardownMedia]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = OmniRecorder.addListener("onRecordComplete", async (info) => {
      try {
        const res = await fetch(Capacitor.convertFileSrc(info.uri));
        const blob = await res.blob();
        const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, "");
        const name = `omni-screen-${stamp}.mp4`;
        
        setOutput((prev) => {
          if (prev) URL.revokeObjectURL(prev.url);
          return {
            name,
            blob,
            url: URL.createObjectURL(blob),
            size: blob.size,
            mime: "video/mp4",
          };
        });
      } catch (err) {
        console.error("Failed to process background record completion:", err);
      }
      setRecording(false);
      setPaused(false);
    });
    return () => {
      sub.then(handle => handle.remove()).catch(() => undefined);
    };
  }, []);

  /* elapsed timer while recording ------------------------------------- */
  useEffect(() => {
    if (!recording || paused) return;
    const t = setInterval(() => {
      if (startedAtRef.current !== null) {
        const now = performance.now();
        const pausedTotal = pausedAccumRef.current +
          (pausedAtRef.current !== null ? now - pausedAtRef.current : 0);
        setElapsedMs(now - startedAtRef.current - pausedTotal);
      }
    }, 100);
    return () => clearInterval(t);
  }, [recording, paused]);

  /* live level meter (mic + webcam audio track) ------------------------ */
  const startAnalysis = useCallback((stream: MediaStream) => {
    const track = stream.getAudioTracks()[0];
    if (!track || typeof AudioContext === "undefined") return;
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buffer);
        const bars = 28;
        const step = Math.floor(buffer.length / bars);
        const next: number[] = [];
        for (let i = 0; i < bars; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += buffer[i * step + j];
          next.push(Math.max(0.06, (sum / step / 255) * 1.4));
        }
        setLevels(next);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      /* analysis optional */
    }
  }, []);

  /* ------------------------------------------------------------------ */
  /* acquisition                                                          */
  /* ------------------------------------------------------------------ */
  const acquireStream = useCallback(async (m: RecorderMode): Promise<MediaStream> => {
    if (m === "screen") {
      const md = navigator.mediaDevices as MediaDevices & {
        getDisplayMedia?: (c: MediaStreamConstraints) => Promise<MediaStream>;
      };
      if (!md.getDisplayMedia) throw new Error("Screen capture unsupported in this browser.");
      const is4k = screenQuality === "4k";
      const is720 = screenQuality === "720p";
      const idealW = is4k ? 3840 : is720 ? 1280 : 1920;
      const idealH = is4k ? 2160 : is720 ? 720 : 1080;
      return md.getDisplayMedia({
        video: {
          width: { ideal: idealW },
          height: { ideal: idealH },
          frameRate: { ideal: screenFps, max: screenFps },
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
          channelCount: 2,
        },
        surfaceSwitching: "include",
        systemAudio: "include",
      } as MediaStreamConstraints & { surfaceSwitching?: string; systemAudio?: string });
    }
    if (m === "mic") {
      return navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 2,
        },
        video: false,
      });
    }
    const isNative = Capacitor.isNativePlatform();
    return navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: isNative ? 1280 : 1920 },
        height: { ideal: isNative ? 720 : 1080 },
        facingMode: cameraFacing,
        frameRate: { ideal: 30 },
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  }, [screenQuality, screenFps, cameraFacing]);

  const arm = async (m: RecorderMode) => {
    setMediaState("starting");
    setOutput(null);
    try {
      if (m === "screen" && Capacitor.isNativePlatform()) {
        setMediaState("live");
        return;
      }
      const stream = await acquireStream(m);
      streamRef.current = stream;
      if (videoRef.current && stream.getVideoTracks().length > 0) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      if (m !== "screen") startAnalysis(stream);
      setMediaState("live");

      /* auto-disarm when a screen share ends from the browser UI */
      stream.getVideoTracks().forEach((t) => {
        t.addEventListener("ended", () => {
          if (recorderRef.current?.state === "recording") {
            finalizeRecording();
          } else {
            teardownMedia();
          }
        });
      });
    } catch (err) {
      setMediaState("denied");
      const name = err instanceof Error ? err.name : "";
      void name; // message rendered in UI below
    }
  };

  /* ------------------------------------------------------------------ */
  /* recorder control                                                     */
  /* ------------------------------------------------------------------ */
  const beginRecording = async () => {
    if (mode === "screen" && Capacitor.isNativePlatform()) {
      try {
        await OmniRecorder.startRecording({ 
          internalAudio: true, 
          microphone: false, 
          quality: screenQuality, 
          fps: screenFps 
        });
        startedAtRef.current = performance.now();
        pausedAccumRef.current = 0;
        pausedAtRef.current = null;
        setRecording(true);
        setPaused(false);
        setElapsedMs(0);
      } catch (err) {
        console.error("Native recording failed:", err);
        setMediaState("denied");
      }
      return;
    }

    const stream = streamRef.current;
    if (!stream) return;
    const mime = pickMime(MODE_META[mode].mime);
    const options: MediaRecorderOptions = {};
    if (mime) options.mimeType = mime;
    if (mode === "screen") {
      options.videoBitsPerSecond = screenQuality === "4k" ? 20_000_000 : screenQuality === "720p" ? 4_000_000 : 8_000_000;
      options.audioBitsPerSecond = 192_000;
    } else if (mode === "webcam") {
      options.videoBitsPerSecond = 5_000_000;
      options.audioBitsPerSecond = 160_000;
    } else {
      options.audioBitsPerSecond = 192_000;
    }
    const recorder = new MediaRecorder(stream, options);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const type = recorder.mimeType || mime || "video/webm";
      let blob = new Blob(chunksRef.current, { type });
      const isAudio = mode === "mic";
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, "");
      const name = `omni-${mode}-${stamp}.${ext}`;

      if (ext === "webm") {
        const now = performance.now();
        const pTotal = pausedAccumRef.current + (pausedAtRef.current !== null ? now - pausedAtRef.current : 0);
        const durationMs = startedAtRef.current !== null ? Math.floor(now - startedAtRef.current - pTotal) : 0;
        if (durationMs > 0) {
          try {
            blob = await fixWebmDuration(blob, durationMs, { logger: false });
          } catch (err) {
            console.error("Failed to fix webm duration:", err);
          }
        }
      }

      setOutput((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return {
          name,
          blob,
          url: URL.createObjectURL(blob),
          size: blob.size,
          mime: isAudio && type.startsWith("audio") ? type.split(";")[0] : type.split(";")[0],
        };
      });
    };
    recorder.start(400);
    recorderRef.current = recorder;
    startedAtRef.current = performance.now();
    pausedAccumRef.current = 0;
    pausedAtRef.current = null;
    setRecording(true);
    setPaused(false);
    setElapsedMs(0);
  };

  const finalizeRecording = async () => {
    if (mode === "screen" && Capacitor.isNativePlatform()) {
      try {
        const result = await OmniRecorder.stopRecording();
        const res = await fetch(Capacitor.convertFileSrc(result.uri));
        const blob = await res.blob();
        const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, "");
        const name = `omni-screen-${stamp}.mp4`;
        
        setOutput((prev) => {
          if (prev) URL.revokeObjectURL(prev.url);
          return {
            name,
            blob,
            url: URL.createObjectURL(blob),
            size: blob.size,
            mime: "video/mp4",
          };
        });
      } catch (err) {
        console.error("Native recording stop failed:", err);
      }
      setRecording(false);
      setPaused(false);
      return;
    }

    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
    setPaused(false);
  };

  const stopEverything = () => {
    if (recording) finalizeRecording();
    teardownMedia();
  };

  const togglePause = () => {
    const r = recorderRef.current;
    if (!r || r.state === "inactive") return;
    if (r.state === "recording") {
      r.pause();
      pausedAtRef.current = performance.now();
      setPaused(true);
    } else if (r.state === "paused") {
      if (pausedAtRef.current !== null) {
        pausedAccumRef.current += performance.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }
      r.resume();
      setPaused(false);
    }
  };

  const busyOrLive = mediaState === "live";
  const meta = MODE_META[mode];
  const Icon = meta.icon;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ------------------------------------------------------- input column */}
      <div className="space-y-5">
        {/* mode tabs */}
        <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Recording source">
          {(Object.keys(MODE_META) as RecorderMode[]).map((m) => {
            const MIcon = MODE_META[m].icon;
            const active = mode === m;
            return (
              <button
                key={m}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  if (busyOrLive || recording) return;
                  setMode(m);
                  setMediaState("off");
                  setOutput(null);
                }}
                disabled={busyOrLive || recording}
                className={`relative flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 transition-all ${
                  active
                    ? "border-primary/50 bg-primary/10 text-primary glow-box-violet"
                    : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/30 disabled:opacity-50"
                }`}
              >
                <MIcon className="size-4" />
                <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                  {MODE_META[m].label}
                </span>
              </button>
            );
          })}
        </div>

        {/* stage */}
        <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-neon/90">
              <Icon className="size-3.5" />
              {meta.label} stage
            </p>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${
                mediaState === "live"
                  ? "bg-pulse/10 text-pulse"
                  : mediaState === "denied"
                    ? "bg-red-500/10 text-red-300"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {mediaState === "live" ? (recording ? (paused ? "paused" : "recording") : "armed") : mediaState}
            </span>
          </div>

          <div className="relative overflow-hidden rounded-lg border border-border/50 bg-black">
            <video
              ref={videoRef}
              muted
              playsInline
              className={`aspect-video w-full object-cover ${mode !== "mic" && mediaState === "live" && !(mode === "screen" && Capacitor.isNativePlatform()) ? "" : "hidden"}`}
              aria-label="Capture preview"
            />

            {(mode === "mic" || mediaState !== "live" || (mode === "screen" && Capacitor.isNativePlatform())) && (
              <div className="grid aspect-video w-full place-items-center px-6 text-center">
                {mediaState === "denied" ? (
                  <div className="space-y-2">
                    <p className="font-mono text-[11px] text-red-300">
                      capture blocked
                    </p>
                    <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                      permission denied or hardware unavailable in this environment — allow
                      access in the browser prompt and arm again
                    </p>
                  </div>
                ) : mediaState === "starting" ? (
                  <p className="animate-pulse font-mono text-[11px] text-muted-foreground">
                    requesting {meta.label.toLowerCase()}…
                  </p>
                ) : mode === "screen" && Capacitor.isNativePlatform() && mediaState === "live" ? (
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="space-y-2">
                      <Monitor className="mx-auto size-8 text-muted-foreground/50" />
                      <p className="font-mono text-[11px] text-muted-foreground">
                        native screen recording ready
                      </p>
                    </div>
                    {!recording && (
                      <div className="flex items-center gap-4">
                        <select 
                          value={screenQuality}
                          onChange={(e) => setScreenQuality(e.target.value as "720p" | "1080p" | "4k")}
                          className="bg-surface-container-low border border-outline-variant rounded-md text-[11px] font-mono p-1 text-on-surface focus:outline-none"
                        >
                          <option value="720p">720p (HD)</option>
                          <option value="1080p">1080p (FHD)</option>
                          <option value="4k">4K (UHD)</option>
                        </select>
                        <select 
                          value={screenFps}
                          onChange={(e) => setScreenFps(Number(e.target.value) as 30 | 60)}
                          className="bg-surface-container-low border border-outline-variant rounded-md text-[11px] font-mono p-1 text-on-surface focus:outline-none"
                        >
                          <option value={30}>30 FPS</option>
                          <option value={60}>60 FPS</option>
                        </select>
                      </div>
                    )}
                  </div>
                ) : mode === "mic" && mediaState === "live" ? (
                  <div className="flex h-24 w-full max-w-sm items-center justify-center gap-[3px]">
                    {levels.map((lv, i) => (
                      <motion.span
                        key={i}
                        className={`w-full rounded-sm ${
                          recording && !paused
                            ? "bg-gradient-to-t from-primary to-neon"
                            : "bg-gradient-to-t from-primary/30 to-neon/30"
                        }`}
                        style={{ height: `${Math.min(lv * 100, 100)}%` }}
                        animate={{ opacity: recording && !paused ? 1 : 0.7 }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="max-w-60 font-mono text-[10px] leading-relaxed text-muted-foreground">
                      {mode === "mic" ? "audio-only capture — arm the mic to see levels" : `${meta.hint} · arm to preview`}
                    </p>
                    {mode === "screen" && !Capacitor.isNativePlatform() && (
                      <div className="flex items-center justify-center gap-3">
                        <select 
                          value={screenQuality}
                          onChange={(e) => setScreenQuality(e.target.value as "720p" | "1080p" | "4k")}
                          className="bg-surface-container-low border border-outline-variant rounded-md text-[11px] font-mono p-1 text-on-surface focus:outline-none"
                        >
                          <option value="720p">720p (HD)</option>
                          <option value="1080p">1080p (FHD)</option>
                          <option value="4k">4K (UHD)</option>
                        </select>
                        <select 
                          value={screenFps}
                          onChange={(e) => setScreenFps(Number(e.target.value) as 30 | 60)}
                          className="bg-surface-container-low border border-outline-variant rounded-md text-[11px] font-mono p-1 text-on-surface focus:outline-none"
                        >
                          <option value={30}>30 FPS</option>
                          <option value={60}>60 FPS</option>
                        </select>
                      </div>
                    )}
                    {mode === "webcam" && Capacitor.isNativePlatform() && (
                      <button
                        type="button"
                        onClick={() => setCameraFacing((f) => (f === "user" ? "environment" : "user"))}
                        className="rounded-lg border border-border/60 bg-card/60 px-3 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Lens: {cameraFacing === "user" ? "Front (Selfie)" : "Rear (Back)"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* REC badge */}
            {recording && !paused && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [1, 0.55, 1], scale: 1 }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.2em] text-white"
              >
                ● REC {formatDurationMs(elapsedMs)}
              </motion.div>
            )}
            {recording && paused && (
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-amber-500/90 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.2em] text-black">
                ‖ PAUSED {formatDurationMs(elapsedMs)}
              </div>
            )}
          </div>

          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            {meta.hint} · {Capacitor.isNativePlatform() ? "native hardware acceleration" : "encodes locally in browser"}.
          </p>
        </div>

        {/* transport */}
        <div className="grid grid-cols-3 gap-2">
          {!busyOrLive ? (
            <button
              onClick={() => void arm(mode)}
              className="col-span-3 flex min-h-12 items-center justify-center gap-2.5 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.2em] text-white transition-transform hover:scale-[1.01] active:scale-95 glow-box-violet"
            >
              <Play className="size-4" />
              ARM {meta.label.toUpperCase()}
            </button>
          ) : (
            <>
              {!recording ? (
                <button
                  onClick={beginRecording}
                  className="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-400/50 bg-red-500/20 font-display text-xs font-bold tracking-[0.18em] text-red-200 transition-colors hover:bg-red-500/30"
                >
                  <span className="size-3 rounded-full bg-red-500" />
                  START RECORDING
                </button>
              ) : (
                <>
                  <button
                    onClick={finalizeRecording}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-pulse/50 bg-pulse/15 font-display text-[11px] font-bold tracking-[0.14em] text-pulse hover:bg-pulse/25"
                  >
                    <Square className="size-4" />
                    STOP
                  </button>
                  <button
                    onClick={togglePause}
                    aria-label={paused ? "Resume recording" : "Pause recording"}
                    className={`flex min-h-12 items-center justify-center rounded-xl border font-display text-[11px] font-bold tracking-[0.14em] transition-colors ${
                      paused
                        ? "border-pulse/50 bg-pulse/15 text-pulse hover:bg-pulse/25"
                        : "border-amber-400/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                    }`}
                  >
                    {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
                    {paused ? "RESUME" : "PAUSE"}
                  </button>
                </>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    aria-label="Discard capture"
                    className={`flex min-h-12 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-300 ${recording ? "col-span-1" : "col-span-1"}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Discard this capture?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The {meta.label.toLowerCase()} stream stops and any in-progress recording is thrown away.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep going</AlertDialogCancel>
                    <AlertDialogAction onClick={stopEverything}>Discard</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------ output column */}
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {output ? (
            <motion.div key="out" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <OutputCard
                output={output}
                badge={mode === "mic" ? "audio captured" : mode === "webcam" ? "camera take" : "screen capture"}
                badgeTone={mode === "screen" ? "plasma" : "neon"}
                onClear={() => {
                  if (output) URL.revokeObjectURL(output.url);
                  setOutput(null);
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border/60"
            >
              <p className="font-mono text-[11px] text-muted-foreground/70">
                {recording ? "recording… stop to preview" : "captures land here"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {recording && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="mb-2 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>capture in progress</span>
              <span className="text-neon">{formatDurationMs(elapsedMs)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="animate-shimmer h-full w-full rounded-full bg-[linear-gradient(90deg,transparent,oklch(0.62_0.22_300/0.9),oklch(0.82_0.12_205/0.9),transparent)]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
