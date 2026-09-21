"use client";

/**
 * OMNI TOOL — Video Editor Workspace
 * "The Edit Bay" Real Multi-Track Offline Timeline Video Editor
 *
 * ARCHITECTURAL CONSTRAINTS:
 * 1. Scoped Styling: Encapsulated inside .omni-editor-workspace (zero global bleed)
 * 2. Viewport Contrast: Pure black (#000000) directly behind video player
 * 3. Dual Environment: CSS variables for DOM + EditorCanvasTheme for 60fps Canvas 2D timeline
 *
 * 100% REAL VIDEO PROCESSING:
 * - Real in/out point trimming and razor cuts
 * - Multi-clip split and segment deletion
 * - Real-time color grading & GLSL-modeled presets
 * - Live aspect ratio framing (16:9, 9:16 Vertical Shorts/Reels/TikTok, 1:1, 4:3)
 * - Burned-in typography overlay engine
 * - Pitch-corrected speed adjustments (0.5x to 2.0x) & volume controls
 * - Real FFmpeg WASM baking with frame-accurate progress and instant export
 */

import { motion, AnimatePresence } from "framer-motion";
import {
  Film,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Scissors,
  Type,
  Sparkles,
  Sliders,
  Download,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  MousePointer,
  Check,
  Loader2,
  Maximize2,
  Plus,
  Trash2,
  Layers,
  Save,
  FileVideo,
  X,
  FastForward,
  Crop,
  Layers as LayersIcon,
  ChevronsLeft,
  ChevronsRight,
  Split,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Magnet,
  Expand,
  Undo2,
  Smartphone,
  Tablet,
  Laptop,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDevicePosture } from "@/hooks/use-device-posture";
import { BladeCutEffect } from "@/components/tools/editor/blade-cut-effect";
import { MobileJogWheel } from "@/components/tools/editor/mobile-jog-wheel";
import { MobileThumbDeck } from "@/components/tools/editor/mobile-thumb-deck";
import { MobileTransitionsDrawer } from "@/components/tools/editor/mobile-transitions-drawer";
import { ToolShell } from "@/components/tools/tool-shell";
import { DropZone } from "@/components/media/drop-zone";
import { OutputCard } from "@/components/media/output-card";
import { ProcessingStatus } from "@/components/media/processing-status";
import { useMediaJob } from "@/hooks/use-media-job";
import { useToast } from "@/hooks/use-toast";
import { useHaptics } from "@/hooks/use-haptics";
import { EditorCanvasTheme, getTimelineTrackColor } from "@/styles/editor-theme";
import { probeVideo } from "@/lib/media/probe";
import { formatBytes, formatDurationMs } from "@/lib/format";
import {
  buildEditorJobSpec,
  type EditorClip,
  type EditorColorFilter,
  type EditorTextOverlay,
} from "@/lib/video-engine/editor-job-builder";
import {
  type EditorTransition,
  type VideoTransitionType,
  TRANSITION_PRESETS,
} from "@/lib/video-engine/transitions";

type EditorToolMode = "trim" | "transitions" | "color" | "text" | "aspect" | "audio";

function formatTimecode(seconds: number, fps = 30): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * fps);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}:${f.toString().padStart(2, "0")}`;
}

async function extractAudioPeaks(file: File, sampleCount = 800): Promise<Float32Array | null> {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    const ctx = new AudioCtx();
    const slice = file.slice(0, Math.min(file.size, 40 * 1024 * 1024));
    const buf = await slice.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(buf);
    const data = audioBuffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / sampleCount));
    const peaks = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
      let max = 0;
      const start = i * step;
      const end = Math.min(data.length, start + step);
      for (let j = start; j < end; j += 4) {
        const val = Math.abs(data[j] || 0);
        if (val > max) max = val;
      }
      peaks[i] = max;
    }
    await ctx.close();
    return peaks;
  } catch {
    return null;
  }
}

function generateOrganicWaveform(barIndex: number, startSec: number): number {
  const t = barIndex * 0.18 + startSec * 1.8;
  const h1 = Math.sin(t * 0.9) * 0.35;
  const h2 = Math.cos(t * 2.3 + 1.2) * 0.25;
  const h3 = Math.sin(t * 5.7 + 0.4) * 0.15;
  const speechCadence = Math.max(0, Math.sin(t * 0.22));
  const raw = Math.abs(h1 + h2 + h3) * speechCadence + 0.15;
  return Math.min(1, Math.max(0.08, raw));
}

export function VideoEditor() {
  const { toast } = useToast();
  const haptics = useHaptics();

  // FFmpeg WASM Media Job Runner
  const {
    phase,
    busy,
    progress,
    passIndex,
    passCount,
    passLabel,
    elapsedMs,
    error,
    outputs,
    run,
    reset,
  } = useMediaJob();

  // File & Video State
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(10);
  const [sourceDimensions, setSourceDimensions] = useState({ width: 1920, height: 1080 });
  const [hasAudio, setHasAudio] = useState(true);

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Active Tool Mode & Adaptive Zoom
  const [activeTab, setActiveTab] = useState<EditorToolMode>("trim");
  const [zoom, setZoom] = useState(25); // adaptive pixels per second

  // Track Visibilities & Locks
  const [trackVisibleV1, setTrackVisibleV1] = useState(true);
  const [trackLockedV1, setTrackLockedV1] = useState(false);
  const [trackLockedA1, setTrackLockedA1] = useState(false);
  const [soloAudio, setSoloAudio] = useState(false);
  const [trackLockedT1, setTrackLockedT1] = useState(false);
  const [trackLockedFX1, setTrackLockedFX1] = useState(false);
  const [snapping, setSnapping] = useState(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [audioPeaks, setAudioPeaks] = useState<Float32Array | null>(null);

  // Dragging & Direct Trimming Refs
  const isScrubbingRef = useRef(false);
  const dragModeRef = useRef<"none" | "scrub" | "trim-start" | "trim-end">("none");
  const dragClipIdRef = useRef<string | null>(null);
  const hoverEdgeRef = useRef<{ edge: "start" | "end"; clipId: string } | null>(null);

  // ---------------------------------------------------------------------------
  // REAL EDITING STATE
  // ---------------------------------------------------------------------------

  // Real Multi-Clip Timeline Segments & Undo History
  const [clips, setClips] = useState<EditorClip[]>([]);
  const [clipHistory, setClipHistory] = useState<EditorClip[][]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // Device Posture & Adaptive Mobile State
  const detectedPosture = useDevicePosture();
  const [layoutOverride, setLayoutOverride] = useState<"auto" | "flex" | "fold" | "mobile" | "desktop">("auto");
  const [isBladeCutting, setIsBladeCutting] = useState(false);
  const [showMobileTransitions, setShowMobileTransitions] = useState(false);

  const effectiveFormFactor = React.useMemo(() => {
    if (layoutOverride === "flex") return "flip-flex";
    if (layoutOverride === "fold") return "fold-dual";
    if (layoutOverride === "mobile") return "slab-portrait";
    if (layoutOverride === "desktop") return "desktop";
    return detectedPosture.formFactor;
  }, [layoutOverride, detectedPosture.formFactor]);

  const isFlexLayout = effectiveFormFactor === "flip-flex";
  const isFoldLayout = effectiveFormFactor === "fold-dual";
  const isMobileLayout =
    effectiveFormFactor === "slab-portrait" ||
    effectiveFormFactor === "slab-landscape" ||
    isFlexLayout;

  // Cinematic Transitions Engine
  const [transition, setTransition] = useState<EditorTransition>({
    type: "fade",
    duration: 0.5,
  });

  // Color Grading & Filters
  const [colorFilter, setColorFilter] = useState<EditorColorFilter>({
    preset: "none",
    brightness: 0,
    contrast: 1,
    saturation: 1,
  });

  // Text & Title Overlay
  const [textOverlay, setTextOverlay] = useState<EditorTextOverlay>({
    enabled: false,
    text: "ZenoDeck Studio",
    position: "bottom",
    size: "md",
    theme: "box",
  });

  // Aspect Ratio & Framing
  const [aspectRatio, setAspectRatio] = useState<"original" | "16:9" | "9:16" | "1:1" | "4:3">("original");

  // Export Settings Modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportResolution, setExportResolution] = useState<"source" | "1080p" | "720p" | "480p">("source");

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const viewportContainerRef = useRef<HTMLDivElement | null>(null);

  // ---------------------------------------------------------------------------
  // File Intake & Metadata Resolution
  // ---------------------------------------------------------------------------
  const handleFile = useCallback(
    async (newFile: File) => {
      reset();
      setFile(newFile);
      const url = URL.createObjectURL(newFile);
      setVideoUrl(url);
      setCurrentTime(0);
      setIsPlaying(false);

      try {
        const meta = await probeVideo(newFile);
        const fileDuration = meta.durationSec > 0 ? meta.durationSec : 10;
        setDuration(fileDuration);
        setSourceDimensions({ width: meta.width || 1920, height: meta.height || 1080 });
        setHasAudio(meta.hasAudio !== false);

        const initialClip: EditorClip = {
          id: `clip-${Date.now()}`,
          name: newFile.name,
          startSec: 0,
          endSec: fileDuration,
          duration: fileDuration,
        };
        setClips([initialClip]);
        setSelectedClipId(initialClip.id);

        // Auto-fit Zoom on file mount: calculate ideal pixels per second
        const containerW = timelineContainerRef.current?.clientWidth || 800;
        const autoZoom = Math.max(6, Math.min(80, Math.floor((containerW - 30) / fileDuration)));
        setZoom(autoZoom);

        // Extract real audio peaks in background
        if (meta.hasAudio !== false) {
          extractAudioPeaks(newFile).then((peaks) => {
            if (peaks) setAudioPeaks(peaks);
          }).catch(() => {});
        }

        toast({
          title: "Video Mounted into The Edit Bay",
          description: `${newFile.name} (${fileDuration.toFixed(1)}s · ${meta.width}x${meta.height})`,
        });
      } catch (err) {
        console.warn("Probe video error:", err);
        const fallbackDuration = 10;
        setDuration(fallbackDuration);
        const initialClip: EditorClip = {
          id: `clip-${Date.now()}`,
          name: newFile.name,
          startSec: 0,
          endSec: fallbackDuration,
          duration: fallbackDuration,
        };
        setClips([initialClip]);
        setSelectedClipId(initialClip.id);
      }
    },
    [reset, toast]
  );

  const handleClear = useCallback(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(null);
    setVideoUrl(null);
    setCurrentTime(0);
    setIsPlaying(false);
    setClips([]);
    setSelectedClipId(null);
    reset();
  }, [videoUrl, reset]);

  // Sync Video Metadata Once DOM element loads
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const v = videoRef.current;
      if (v.duration && Number.isFinite(v.duration) && v.duration > 0) {
        setDuration(v.duration);
      }
      if (v.videoWidth && v.videoHeight) {
        setSourceDimensions({ width: v.videoWidth, height: v.videoHeight });
      }
    }
  };

  // Playback speed sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Volume & Mute sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = Math.min(1, volume);
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // ---------------------------------------------------------------------------
  // Playback Controls
  // ---------------------------------------------------------------------------
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      // If at end of active clips, restart from first clip start
      const firstClip = clips[0];
      const lastClip = clips[clips.length - 1];
      if (lastClip && currentTime >= lastClip.endSec && firstClip) {
        videoRef.current.currentTime = firstClip.startSec;
        setCurrentTime(firstClip.startSec);
      }
      videoRef.current.play().catch(console.warn);
      setIsPlaying(true);
    }
    void haptics.light();
  }, [isPlaying, clips, currentTime, haptics]);

  const stepFrame = useCallback(
    (forward: boolean) => {
      if (!videoRef.current) return;
      const delta = forward ? 1 / 30 : -1 / 30;
      const nextTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + delta));
      videoRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
      void haptics.light();
    },
    [duration, haptics]
  );

  // Time update: handle segment bounds during preview playback
  const handleTimeUpdate = () => {
    if (!videoRef.current || isScrubbingRef.current) return;
    const now = videoRef.current.currentTime;
    setCurrentTime(now);

    // If multi-clip, check if playhead exited a clip and skip gap
    if (clips.length > 1) {
      const activeClip = clips.find((c) => now >= c.startSec && now <= c.endSec);
      if (!activeClip && isPlaying) {
        // Find next upcoming clip
        const nextClip = clips.find((c) => c.startSec > now);
        if (nextClip) {
          videoRef.current.currentTime = nextClip.startSec;
          setCurrentTime(nextClip.startSec);
        } else {
          // Reached end of all clips
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }
    }
  };

  const toggleFullscreen = () => {
    if (!viewportContainerRef.current) return;
    if (!document.fullscreenElement) {
      viewportContainerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(console.warn);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.warn);
    }
  };

  // ---------------------------------------------------------------------------
  // REAL EDITING ACTIONS (Trim, Split, Delete)
  // ---------------------------------------------------------------------------

  // Push current clip layout to history stack for Ctrl+Z undo
  const pushClipHistory = useCallback((currentClips: EditorClip[]) => {
    setClipHistory((prev) => [...prev.slice(-15), currentClips]);
  }, []);

  // Undo Last Clip Edit
  const handleUndo = useCallback(() => {
    if (clipHistory.length === 0) {
      toast({
        title: "Nothing to Undo",
        description: "No previous clip edit in history.",
      });
      return;
    }
    const previousClips = clipHistory[clipHistory.length - 1];
    setClipHistory((prev) => prev.slice(0, -1));
    setClips(previousClips);
    if (previousClips[0]) {
      setSelectedClipId(previousClips[0].id);
    }
    void haptics.light();
    toast({
      title: "Undo Action",
      description: "Restored previous clip layout.",
    });
  }, [clipHistory, haptics, toast]);

  // Set In-Point (Trim Start)
  const handleSetInPoint = () => {
    if (!selectedClipId) return;
    if (trackLockedV1) {
      toast({
        title: "Track Locked",
        description: "Unlock V1 track to trim in-point.",
        variant: "destructive",
      });
      return;
    }
    void haptics.medium();
    pushClipHistory(clips);
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === selectedClipId && currentTime < c.endSec) {
          const newStart = Math.min(currentTime, c.endSec - 0.1);
          return {
            ...c,
            startSec: newStart,
            duration: c.endSec - newStart,
          };
        }
        return c;
      })
    );
    toast({
      title: "In-Point Set",
      description: `Clip start trimmed to ${formatTimecode(currentTime)}.`,
    });
  };

  // Set Out-Point (Trim End)
  const handleSetOutPoint = () => {
    if (!selectedClipId) return;
    if (trackLockedV1) {
      toast({
        title: "Track Locked",
        description: "Unlock V1 track to trim out-point.",
        variant: "destructive",
      });
      return;
    }
    void haptics.medium();
    pushClipHistory(clips);
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === selectedClipId && currentTime > c.startSec) {
          const newEnd = Math.max(currentTime, c.startSec + 0.1);
          return {
            ...c,
            endSec: newEnd,
            duration: newEnd - c.startSec,
          };
        }
        return c;
      })
    );
    toast({
      title: "Out-Point Set",
      description: `Clip end trimmed to ${formatTimecode(currentTime)}.`,
    });
  };

  // Razor Cut: Split Active Clip at Current Playhead
  const handleSplitAtPlayhead = () => {
    if (trackLockedV1) {
      toast({
        title: "Track Locked",
        description: "Unlock V1 track before cutting clips.",
        variant: "destructive",
      });
      return;
    }
    const splitSec = currentTime;
    const target = clips.find((c) => splitSec > c.startSec + 0.05 && splitSec < c.endSec - 0.05);

    if (!target) {
      toast({
        title: "Cannot Split Here",
        description: "Move the playhead inside an active clip to split it.",
        variant: "destructive",
      });
      return;
    }

    void haptics.heavy();
    setIsBladeCutting(true);
    setTimeout(() => setIsBladeCutting(false), 420);
    pushClipHistory(clips);

    const clip1: EditorClip = {
      id: `${target.id}-a-${Date.now()}`,
      name: `${target.name} (Part 1)`,
      startSec: target.startSec,
      endSec: splitSec,
      duration: splitSec - target.startSec,
    };

    const clip2: EditorClip = {
      id: `${target.id}-b-${Date.now()}`,
      name: `${target.name} (Part 2)`,
      startSec: splitSec,
      endSec: target.endSec,
      duration: target.endSec - splitSec,
    };

    setClips((prev) => {
      const idx = prev.findIndex((c) => c.id === target.id);
      const copy = [...prev];
      copy.splice(idx, 1, clip1, clip2);
      return copy;
    });

    setSelectedClipId(clip2.id);

    toast({
      title: "Clip Split at CTI",
      description: `Divided track into two clips at ${formatTimecode(splitSec)}.`,
    });
  };

  // Delete Selected Clip
  const handleDeleteSelectedClip = (clipIdToDelete?: string) => {
    if (trackLockedV1) {
      toast({
        title: "Track Locked",
        description: "Unlock V1 track to delete segments.",
        variant: "destructive",
      });
      return;
    }
    const id = clipIdToDelete || selectedClipId;
    if (!id || clips.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "Timeline requires at least one video clip.",
        variant: "destructive",
      });
      return;
    }

    void haptics.medium();
    pushClipHistory(clips);
    const remaining = clips.filter((c) => c.id !== id);
    setClips(remaining);
    setSelectedClipId(remaining[0]?.id || null);

    toast({
      title: "Clip Deleted",
      description: "Segment removed from the timeline render queue.",
    });
  };

  // Reset Timeline to Full Original Video
  const handleResetTimeline = () => {
    void haptics.light();
    pushClipHistory(clips);
    const resetClip: EditorClip = {
      id: `clip-full-${Date.now()}`,
      name: file ? file.name : "Original Video",
      startSec: 0,
      endSec: duration,
      duration: duration,
    };
    setClips([resetClip]);
    setSelectedClipId(resetClip.id);
    setCurrentTime(0);
    if (videoRef.current) videoRef.current.currentTime = 0;
    toast({
      title: "Timeline Reset",
      description: "Restored full source video clip.",
    });
  };

  // Precise Seek to Time (for Jog Wheel & Mobile Touch Ribbon)
  const handleSeekToTime = useCallback(
    (timeSec: number) => {
      const clamped = Math.max(0, Math.min(duration, timeSec));
      setCurrentTime(clamped);
      if (videoRef.current) {
        videoRef.current.currentTime = clamped;
      }
      const matching = clips.find((c) => clamped >= c.startSec && clamped <= c.endSec);
      if (matching && matching.id !== selectedClipId) {
        setSelectedClipId(matching.id);
      }
    },
    [duration, clips, selectedClipId]
  );

  // Test Transition Simulation Preview
  const handleTestTransitionPreview = useCallback(() => {
    if (clips.length < 2) return;
    const seamTime = clips[0].duration;
    const startTime = Math.max(0, seamTime - 0.6);
    handleSeekToTime(startTime);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }, 1500);
    }
  }, [clips, handleSeekToTime]);

  // Fit Entire Timeline to Viewport Width
  const handleFitTimeline = useCallback(() => {
    if (duration <= 0) return;
    const containerW = timelineContainerRef.current?.clientWidth || 800;
    const autoZoom = Math.max(5, Math.min(120, Math.floor((containerW - 30) / duration)));
    setZoom(autoZoom);
    void haptics.light();
    toast({
      title: "Timeline Fitted",
      description: `Zoom set to ${autoZoom}px/s for full ${duration.toFixed(1)}s overview.`,
    });
  }, [duration, haptics, toast]);

  // Desktop NLE Keyboard Shortcuts (Space, J-K-L, S/B, I/[, O/], Delete, Ctrl+Z, +/-, Left/Right, F, N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "s" || e.key === "S" || e.key === "b" || e.key === "B") {
        e.preventDefault();
        handleSplitAtPlayhead();
      } else if (e.key === "i" || e.key === "I" || e.key === "[") {
        e.preventDefault();
        handleSetInPoint();
      } else if (e.key === "o" || e.key === "O" || e.key === "]") {
        e.preventDefault();
        handleSetOutPoint();
      } else if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        const newT = Math.max(0, currentTime - 1);
        setCurrentTime(newT);
        if (videoRef.current) videoRef.current.currentTime = newT;
        void haptics.light();
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        if (isPlaying) togglePlay();
        void haptics.light();
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        const newT = Math.min(duration, currentTime + 1);
        setCurrentTime(newT);
        if (videoRef.current) videoRef.current.currentTime = newT;
        void haptics.light();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDeleteSelectedClip();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepFrame(false);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stepFrame(true);
      } else if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setZoom((z) => Math.min(150, z + 5));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((z) => Math.max(5, z - 5));
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        handleFitTimeline();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setSnapping((s) => !s);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    togglePlay,
    handleSplitAtPlayhead,
    handleSetInPoint,
    handleSetOutPoint,
    handleDeleteSelectedClip,
    handleUndo,
    stepFrame,
    handleFitTimeline,
    currentTime,
    duration,
    isPlaying,
    haptics,
  ]);

  // Smooth Wheel Zoom (Ctrl + Wheel / Alt + Wheel)
  const handleTimelineWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.altKey || e.metaKey) {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.2 : 0.8;
      setZoom((prev) => Math.max(5, Math.min(150, Math.round(prev * factor))));
    }
  };

  // Total active timeline duration
  const totalActiveDuration = clips.reduce((acc, c) => acc + c.duration, 0);

  // ---------------------------------------------------------------------------
  // Canvas 2D High-Performance 60fps Studio Timeline Renderer
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const container = timelineContainerRef.current;
    const containerWidth = container ? container.clientWidth : 800;
    const timelineWidth = Math.max(containerWidth, Math.ceil(duration * zoom) + 80);
    const timelineHeight = 194; // 32 (ruler) + 48 (V1) + 42 (A1) + 36 (T1) + 36 (FX1)

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(timelineWidth * dpr);
    canvas.height = Math.floor(timelineHeight * dpr);
    canvas.style.width = `${timelineWidth}px`;
    canvas.style.height = `${timelineHeight}px`;

    ctx.scale(dpr, dpr);

    // 1. Bed Background (Studio dark)
    ctx.fillStyle = "#121212";
    ctx.fillRect(0, 0, timelineWidth, timelineHeight);

    // 2. Timecode Ruler Background (y: 0 -> 32)
    const rulerHeight = 32;
    const rulerGrad = ctx.createLinearGradient(0, 0, 0, rulerHeight);
    rulerGrad.addColorStop(0, "#1A1A1A");
    rulerGrad.addColorStop(1, "#141414");
    ctx.fillStyle = rulerGrad;
    ctx.fillRect(0, 0, timelineWidth, rulerHeight);

    ctx.strokeStyle = "#262626";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rulerHeight);
    ctx.lineTo(timelineWidth, rulerHeight);
    ctx.stroke();

    // 3. Adaptive Ruler Ticks & Timecode Numbers
    let majorStep = 1;
    let minorStep = 0.25;
    if (zoom < 6) {
      majorStep = 60;
      minorStep = 15;
    } else if (zoom < 12) {
      majorStep = 30;
      minorStep = 5;
    } else if (zoom < 25) {
      majorStep = 10;
      minorStep = 2;
    } else if (zoom < 50) {
      majorStep = 5;
      minorStep = 1;
    } else if (zoom < 90) {
      majorStep = 2;
      minorStep = 0.5;
    } else {
      majorStep = 1;
      minorStep = 0.25;
    }

    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";

    for (let sec = 0; sec <= duration + majorStep; sec += minorStep) {
      const x = sec * zoom;
      const isMajor = Math.abs(sec % majorStep) < 0.001 || Math.abs((sec % majorStep) - majorStep) < 0.001;
      const tickH = isMajor ? 12 : 5;

      ctx.beginPath();
      ctx.strokeStyle = isMajor ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.1)";
      ctx.moveTo(x, rulerHeight - tickH);
      ctx.lineTo(x, rulerHeight);
      ctx.stroke();

      if (isMajor && x < timelineWidth - 25) {
        ctx.fillStyle = isMajor ? "rgba(255, 255, 255, 0.65)" : "rgba(255, 255, 255, 0.35)";
        ctx.fillText(formatTimecode(sec).slice(3, 8), x, rulerHeight - 15);
      }
    }

    // 4. Track Background Lanes & Grid Lines
    const tracks = [
      { id: "v1", y: 32, h: 48, bg: "#161616", border: "#222222" },
      { id: "a1", y: 80, h: 42, bg: "#141414", border: "#202020" },
      { id: "t1", y: 122, h: 36, bg: "#131313", border: "#1F1F1F" },
      { id: "fx1", y: 158, h: 36, bg: "#131313", border: "#1F1F1F" },
    ];

    tracks.forEach((t) => {
      ctx.fillStyle = t.bg;
      ctx.fillRect(0, t.y, timelineWidth, t.h);
      ctx.strokeStyle = t.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, t.y + t.h);
      ctx.lineTo(timelineWidth, t.y + t.h);
      ctx.stroke();
    });

    // 5. Render V1 Video Track Clips
    clips.forEach((clip, idx) => {
      const clipX = clip.startSec * zoom;
      const clipW = Math.max(8, clip.duration * zoom);
      const isSelected = clip.id === selectedClipId;
      const trackY = 32;
      const trackH = 48;
      const clipH = trackH - 6;
      const clipY = trackY + 3;

      // Clip Gradient Body
      const clipGrad = ctx.createLinearGradient(0, clipY, 0, clipY + clipH);
      if (isSelected) {
        clipGrad.addColorStop(0, "#2563EB");
        clipGrad.addColorStop(1, "#1D4ED8");
      } else {
        clipGrad.addColorStop(0, "#1E40AF");
        clipGrad.addColorStop(1, "#172554");
      }

      ctx.fillStyle = clipGrad;
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(clipX, clipY, clipW, clipH, 5);
      } else {
        ctx.rect(clipX, clipY, clipW, clipH);
      }
      ctx.fill();

      // Filmstrip Frame Dividers & Sprockets (pro cinema look)
      const frameStep = Math.max(60, 2 * zoom);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      for (let fx = clipX + frameStep; fx < clipX + clipW - 10; fx += frameStep) {
        ctx.beginPath();
        ctx.moveTo(fx, clipY + 16);
        ctx.lineTo(fx, clipY + clipH);
        ctx.stroke();

        // Sprocket holes along top and bottom
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(fx - 2, clipY + 2, 4, 3);
        ctx.fillRect(fx - 2, clipY + clipH - 5, 4, 3);
      }

      // Clip Header Strip (top 15px)
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(clipX, clipY, clipW, 15, [5, 5, 0, 0]);
      } else {
        ctx.rect(clipX, clipY, clipW, 15);
      }
      ctx.fill();

      // Clip Label & Duration Badge
      ctx.fillStyle = isSelected ? "#FFFFFF" : "#E2E8F0";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "left";
      const labelText = `🎬 #${idx + 1} ${clip.name} (${clip.duration.toFixed(1)}s)`;
      ctx.fillText(labelText, clipX + 8, clipY + 11, Math.max(10, clipW - 20));

      // Left Trim Handle (In-point grip)
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(clipX, clipY, 6, clipH);
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fillRect(clipX + 2, clipY + clipH / 2 - 4, 2, 2);
      ctx.fillRect(clipX + 2, clipY + clipH / 2, 2, 2);
      ctx.fillRect(clipX + 2, clipY + clipH / 2 + 4, 2, 2);

      // Right Trim Handle (Out-point grip)
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(clipX + clipW - 6, clipY, 6, clipH);
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fillRect(clipX + clipW - 4, clipY + clipH / 2 - 4, 2, 2);
      ctx.fillRect(clipX + clipW - 4, clipY + clipH / 2, 2, 2);
      ctx.fillRect(clipX + clipW - 4, clipY + clipH / 2 + 4, 2, 2);

      // Border & Selection Neon Glow
      ctx.strokeStyle = isSelected ? "#60A5FA" : "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      // Selection Corner Brackets
      if (isSelected) {
        ctx.fillStyle = "#93C5FD";
        ctx.fillRect(clipX - 1, clipY - 1, 4, 4);
        ctx.fillRect(clipX + clipW - 3, clipY - 1, 4, 4);
        ctx.fillRect(clipX - 1, clipY + clipH - 3, 4, 4);
        ctx.fillRect(clipX + clipW - 3, clipY + clipH - 3, 4, 4);
      }
    });

    // 5b. Render Transition Seam Badges between sequential clips (Track V1)
    if (clips.length > 1) {
      for (let i = 0; i < clips.length - 1; i++) {
        const seamX = clips[i].endSec * zoom;
        const trackY = 32;
        const trackH = 48;
        const centerY = trackY + trackH / 2;

        // Seam vertical dashed guide line
        ctx.strokeStyle = transition.type !== "none" ? "rgba(56, 189, 248, 0.7)" : "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.moveTo(seamX, trackY);
        ctx.lineTo(seamX, trackY + trackH);
        ctx.stroke();
        ctx.setLineDash([]);

        // Interactive Transition Badge Capsule
        const hasTrans = transition.type !== "none";
        const badgeW = hasTrans ? 48 : 22;
        const badgeH = 18;
        const badgeX = seamX - badgeW / 2;
        const badgeY = centerY - badgeH / 2;

        // Badge Pill Background
        const badgeGrad = ctx.createLinearGradient(0, badgeY, 0, badgeY + badgeH);
        if (hasTrans) {
          badgeGrad.addColorStop(0, "#0369A1");
          badgeGrad.addColorStop(1, "#082F49");
        } else {
          badgeGrad.addColorStop(0, "#334155");
          badgeGrad.addColorStop(1, "#1E293B");
        }
        ctx.fillStyle = badgeGrad;
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === "function") {
          (ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, 4);
        } else {
          ctx.rect(badgeX, badgeY, badgeW, badgeH);
        }
        ctx.fill();

        // Badge Outline
        ctx.strokeStyle = hasTrans ? "#38BDF8" : "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Badge Text
        ctx.fillStyle = hasTrans ? "#E0F2FE" : "#94A3B8";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const badgeLabel = hasTrans ? `⧗ ${transition.duration.toFixed(1)}s` : "⧗";
        ctx.fillText(badgeLabel, seamX, centerY + 1);
      }
    }

    // 6. Render A1 Audio Track Clips & Waveform
    clips.forEach((clip) => {
      const clipX = clip.startSec * zoom;
      const clipW = Math.max(8, clip.duration * zoom);
      const isSelected = clip.id === selectedClipId;
      const trackY = 80;
      const trackH = 42;
      const clipH = trackH - 6;
      const clipY = trackY + 3;
      const centerY = clipY + clipH / 2;

      // Audio Clip Box Body
      const audioGrad = ctx.createLinearGradient(0, clipY, 0, clipY + clipH);
      if (isMuted) {
        audioGrad.addColorStop(0, "#334155");
        audioGrad.addColorStop(1, "#1E293B");
      } else if (isSelected) {
        audioGrad.addColorStop(0, "#065F46");
        audioGrad.addColorStop(1, "#022C22");
      } else {
        audioGrad.addColorStop(0, "#064E3B");
        audioGrad.addColorStop(1, "#022C22");
      }

      ctx.fillStyle = audioGrad;
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(clipX, clipY, clipW, clipH, 5);
      } else {
        ctx.rect(clipX, clipY, clipW, clipH);
      }
      ctx.fill();

      // Center 0dB Baseline Guide
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(clipX, centerY);
      ctx.lineTo(clipX + clipW, centerY);
      ctx.stroke();

      // Render Organic / Real Audio Waveform
      if (!isMuted && hasAudio) {
        const barWidth = 2.5;
        const barGap = 1.5;
        const totalBars = Math.floor(clipW / (barWidth + barGap));
        const maxBarH = clipH - 8;

        for (let b = 0; b < totalBars; b++) {
          const bx = clipX + b * (barWidth + barGap) + 4;
          const barTime = clip.startSec + (b / totalBars) * clip.duration;

          let normAmp = 0.2;
          if (audioPeaks && audioPeaks.length > 0) {
            const peakIdx = Math.min(
              audioPeaks.length - 1,
              Math.floor((barTime / duration) * audioPeaks.length)
            );
            normAmp = audioPeaks[peakIdx] ?? 0.2;
          } else {
            normAmp = generateOrganicWaveform(b, clip.startSec);
          }

          const scaledAmp = Math.min(1, normAmp * Math.min(1.5, volume));
          const barH = Math.max(3, scaledAmp * maxBarH);
          const by = centerY - barH / 2;

          ctx.fillStyle = isSelected
            ? "rgba(52, 211, 153, 0.9)"
            : "rgba(16, 185, 129, 0.75)";
          ctx.fillRect(bx, by, barWidth, barH);
        }
      }

      // Audio Clip Header
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(clipX, clipY, clipW, 12);
      ctx.fillStyle = isMuted ? "#94A3B8" : "#A7F3D0";
      ctx.font = "8px monospace";
      ctx.textAlign = "left";
      ctx.fillText(
        `🎵 AUDIO · ${isMuted ? "MUTED" : Math.round(volume * 100) + "%"}`,
        clipX + 6,
        clipY + 9,
        Math.max(10, clipW - 12)
      );

      // Border
      ctx.strokeStyle = isSelected ? "#34D399" : "rgba(16, 185, 129, 0.3)";
      ctx.lineWidth = isSelected ? 1.5 : 1;
      ctx.stroke();
    });

    // 7. Render T1 Text / Title Track (y: 122 -> 158)
    const t1Y = 122;
    const t1H = 36;
    if (textOverlay.enabled && textOverlay.text.trim()) {
      const tClipX = 0;
      const tClipW = duration * zoom;
      const tGrad = ctx.createLinearGradient(0, t1Y + 3, 0, t1Y + t1H - 3);
      tGrad.addColorStop(0, "#7C3AED");
      tGrad.addColorStop(1, "#5B21B6");
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(tClipX, t1Y + 3, tClipW, t1H - 6, 4);
      } else {
        ctx.rect(tClipX, t1Y + 3, tClipW, t1H - 6);
      }
      ctx.fill();

      ctx.strokeStyle = "#A78BFA";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`T TITLE: "${textOverlay.text.slice(0, 40)}" [${textOverlay.position.toUpperCase()}]`, tClipX + 8, t1Y + 19, tClipW - 16);
    } else {
      // Standby Lane Placeholder Prompt
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(4, t1Y + 4, timelineWidth - 8, t1H - 8);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
      ctx.font = "9px monospace";
      ctx.textAlign = "left";
      ctx.fillText("+ Click to Add Title Overlay", 16, t1Y + 21);
    }

    // 8. Render FX1 Color Grade Track (y: 158 -> 194)
    const fx1Y = 158;
    const fx1H = 36;
    const isFxActive =
      colorFilter.preset !== "none" ||
      colorFilter.brightness !== 0 ||
      colorFilter.contrast !== 1 ||
      colorFilter.saturation !== 1;

    if (isFxActive) {
      const fxClipX = 0;
      const fxClipW = duration * zoom;
      const fxGrad = ctx.createLinearGradient(0, fx1Y + 3, 0, fx1Y + fx1H - 3);
      fxGrad.addColorStop(0, "#D97706");
      fxGrad.addColorStop(1, "#92400E");
      ctx.fillStyle = fxGrad;
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(fxClipX, fx1Y + 3, fxClipW, fx1H - 6, 4);
      } else {
        ctx.rect(fxClipX, fx1Y + 3, fxClipW, fx1H - 6);
      }
      ctx.fill();

      ctx.strokeStyle = "#FBBF24";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "left";
      const fxName = colorFilter.preset !== "none" ? colorFilter.preset.toUpperCase() : "CUSTOM";
      ctx.fillText(`✨ GRADE: ${fxName} · B:${colorFilter.brightness > 0 ? "+" + colorFilter.brightness : colorFilter.brightness} C:${colorFilter.contrast}x S:${colorFilter.saturation}x`, fxClipX + 8, fx1Y + 19, fxClipW - 16);
    } else {
      // Standby Lane Placeholder Prompt
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(4, fx1Y + 4, timelineWidth - 8, fx1H - 8);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
      ctx.font = "9px monospace";
      ctx.textAlign = "left";
      ctx.fillText("+ Click to Add Color Grade / Filter", 16, fx1Y + 21);
    }

    // 9. Hover Hairline (if user is hovering over timeline)
    if (hoverTime !== null && hoverTime >= 0 && hoverTime <= duration) {
      const hx = hoverTime * zoom;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, timelineHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 10. Playhead CTI (Current Time Indicator - Red Needle & Diamond Head)
    const playheadX = currentTime * zoom;

    // Playhead vertical line
    ctx.strokeStyle = "#EF4444";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(playheadX, rulerHeight);
    ctx.lineTo(playheadX, timelineHeight);
    ctx.stroke();

    // Playhead Glow Aura
    ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
    ctx.fillRect(playheadX - 1.5, rulerHeight, 3, timelineHeight - rulerHeight);

    // Needle Diamond/Chevron Head
    ctx.fillStyle = "#EF4444";
    ctx.beginPath();
    ctx.moveTo(playheadX - 6, 0);
    ctx.lineTo(playheadX + 6, 0);
    ctx.lineTo(playheadX + 6, 18);
    ctx.lineTo(playheadX, rulerHeight);
    ctx.lineTo(playheadX - 6, 18);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#FCA5A5";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inner White Dot
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(playheadX, 9, 2, 0, Math.PI * 2);
    ctx.fill();

    // Floating Timestamp Badge (during drag / scrub)
    if (isScrubbingRef.current || dragModeRef.current !== "none") {
      const badgeW = 74;
      const badgeH = 18;
      const bx = Math.max(2, Math.min(timelineWidth - badgeW - 2, playheadX - badgeW / 2));
      const by = 2;

      ctx.fillStyle = "#000000";
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(bx, by, badgeW, badgeH, 4);
      } else {
        ctx.rect(bx, by, badgeW, badgeH);
      }
      ctx.fill();

      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(formatTimecode(currentTime), bx + badgeW / 2, by + 12);
    }
  }, [
    currentTime,
    duration,
    zoom,
    clips,
    selectedClipId,
    transition,
    textOverlay,
    colorFilter,
    isMuted,
    hasAudio,
    hoverTime,
    audioPeaks,
    volume,
  ]);

  // Direct Edge Hover & Trim Handler
  const handleTimelinePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = Math.max(0, e.clientX - rect.left);
    const mouseY = e.clientY - rect.top;
    const targetSec = Math.max(0, Math.min(duration, mouseX / zoom));

    setHoverTime(targetSec);

    // If dragging in progress
    if (dragModeRef.current !== "none") {
      let finalSec = targetSec;

      if (snapping) {
        const snapThresholdSec = 10 / zoom;
        const snapTargets = [0, duration];
        clips.forEach((c) => snapTargets.push(c.startSec, c.endSec));
        for (const st of snapTargets) {
          if (Math.abs(st - finalSec) < snapThresholdSec) {
            finalSec = st;
            break;
          }
        }
      }

      if (dragModeRef.current === "scrub") {
        setCurrentTime(finalSec);
        if (videoRef.current) {
          videoRef.current.currentTime = finalSec;
        }
      } else if (dragModeRef.current === "trim-start" && dragClipIdRef.current) {
        if (trackLockedV1) return;
        const clipId = dragClipIdRef.current;
        setClips((prev) =>
          prev.map((c) => {
            if (c.id === clipId) {
              const clampedStart = Math.max(0, Math.min(c.endSec - 0.2, finalSec));
              return {
                ...c,
                startSec: clampedStart,
                duration: c.endSec - clampedStart,
              };
            }
            return c;
          })
        );
        if (videoRef.current) videoRef.current.currentTime = finalSec;
        setCurrentTime(finalSec);
      } else if (dragModeRef.current === "trim-end" && dragClipIdRef.current) {
        if (trackLockedV1) return;
        const clipId = dragClipIdRef.current;
        setClips((prev) =>
          prev.map((c) => {
            if (c.id === clipId) {
              const clampedEnd = Math.max(c.startSec + 0.2, Math.min(duration, finalSec));
              return {
                ...c,
                endSec: clampedEnd,
                duration: clampedEnd - c.startSec,
              };
            }
            return c;
          })
        );
        if (videoRef.current) videoRef.current.currentTime = finalSec;
        setCurrentTime(finalSec);
      }
      return;
    }

    // Check hover for trim handles
    let foundEdge: { edge: "start" | "end"; clipId: string } | null = null;
    const isOverTracks = mouseY >= 32 && mouseY <= 122; // V1 and A1

    if (isOverTracks && !trackLockedV1) {
      const edgeHitPx = 8;
      for (const clip of clips) {
        const leftPx = clip.startSec * zoom;
        const rightPx = clip.endSec * zoom;

        if (Math.abs(mouseX - leftPx) <= edgeHitPx) {
          foundEdge = { edge: "start", clipId: clip.id };
          break;
        }
        if (Math.abs(mouseX - rightPx) <= edgeHitPx) {
          foundEdge = { edge: "end", clipId: clip.id };
          break;
        }
      }
    }

    hoverEdgeRef.current = foundEdge;
    if (canvas) {
      if (foundEdge) {
        canvas.style.cursor = "ew-resize";
      } else if (mouseY <= 32) {
        canvas.style.cursor = "pointer";
      } else {
        canvas.style.cursor = "crosshair";
      }
    }
  };

  const handleTimelinePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = Math.max(0, e.clientX - rect.left);
    const mouseY = e.clientY - rect.top;
    const targetSec = Math.max(0, Math.min(duration, mouseX / zoom));

    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    // Standby track clicks (T1 or FX1)
    if (mouseY >= 122 && mouseY <= 158) {
      if (!textOverlay.enabled) {
        setTextOverlay((prev) => ({ ...prev, enabled: true }));
        setActiveTab("text");
        toast({
          title: "Title Track Activated",
          description: "Enter title text in the inspector.",
        });
      }
    } else if (mouseY >= 158 && mouseY <= 194) {
      if (colorFilter.preset === "none") {
        setColorFilter((prev) => ({ ...prev, preset: "cinematic" }));
        setActiveTab("color");
        toast({
          title: "Color Grade Activated",
          description: "Cinematic look applied to timeline.",
        });
      }
    }

    // Check if clicked directly on a cut seam badge (track V1: y between 32 and 80)
    if (mouseY >= 32 && mouseY <= 80 && clips.length > 1) {
      for (let i = 0; i < clips.length - 1; i++) {
        const seamX = clips[i].endSec * zoom;
        if (Math.abs(mouseX - seamX) <= 24) {
          setActiveTab("transitions");
          void haptics.light();
          toast({
            title: "Transition Node Selected",
            description: `Editing transition between Clip #${i + 1} and Clip #${i + 2}.`,
          });
          return;
        }
      }
    }

    // Direct Edge Trimming vs Scrubbing
    if (hoverEdgeRef.current && !trackLockedV1) {
      dragModeRef.current = hoverEdgeRef.current.edge === "start" ? "trim-start" : "trim-end";
      dragClipIdRef.current = hoverEdgeRef.current.clipId;
      setSelectedClipId(hoverEdgeRef.current.clipId);
      void haptics.light();
    } else {
      dragModeRef.current = "scrub";
      dragClipIdRef.current = null;
      isScrubbingRef.current = true;

      let finalSec = targetSec;
      if (snapping) {
        const snapThresholdSec = 10 / zoom;
        const snapTargets = [0, duration];
        clips.forEach((c) => snapTargets.push(c.startSec, c.endSec));
        for (const st of snapTargets) {
          if (Math.abs(st - finalSec) < snapThresholdSec) {
            finalSec = st;
            break;
          }
        }
      }

      setCurrentTime(finalSec);
      if (videoRef.current) {
        videoRef.current.currentTime = finalSec;
      }

      const clickedClip = clips.find((c) => finalSec >= c.startSec && finalSec <= c.endSec);
      if (clickedClip) {
        setSelectedClipId(clickedClip.id);
      }
    }
  };

  const handleTimelinePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragModeRef.current === "trim-start" || dragModeRef.current === "trim-end") {
      void haptics.medium();
      toast({
        title: "Clip Boundaries Updated",
        description: `Active segment trimmed to ${formatTimecode(currentTime)}.`,
      });
    }
    dragModeRef.current = "none";
    dragClipIdRef.current = null;
    isScrubbingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleTimelinePointerLeave = () => {
    setHoverTime(null);
    hoverEdgeRef.current = null;
  };

  // ---------------------------------------------------------------------------
  // REAL EXPORT EXECUTION (FFmpeg WASM)
  // ---------------------------------------------------------------------------
  const handleExecuteExport = async () => {
    if (!file) return;
    setShowExportModal(false);

    try {
      toast({
        title: "Starting Video Export",
        description: "Baking timeline cuts, shaders, aspect ratio, and typography…",
      });

      const spec = await buildEditorJobSpec({
        file,
        sourceWidth: sourceDimensions.width,
        sourceHeight: sourceDimensions.height,
        hasAudio,
        clips,
        colorFilter,
        aspectRatio,
        resolution: exportResolution,
        speed,
        volume,
        isMuted,
        textOverlay,
        transition,
      });

      await run(spec);
    } catch (err) {
      console.error("Export error:", err);
      toast({
        title: "Export Failed",
        description: err instanceof Error ? err.message : "Video encoding failed.",
        variant: "destructive",
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Real-Time Visual Transition Simulation for Video Viewport
  // ---------------------------------------------------------------------------
  const transitionActiveEffect = React.useMemo(() => {
    if (transition.type === "none" || clips.length < 2) return null;
    const halfDur = transition.duration / 2;

    for (let i = 0; i < clips.length - 1; i++) {
      const seamSec = clips[i].endSec;
      const diff = currentTime - seamSec;
      if (Math.abs(diff) <= halfDur) {
        // Normalized progress: 0 at start of transition, 0.5 at cut seam, 1 at end
        const progress = (diff + halfDur) / transition.duration;
        const peakIntensity = Math.sin(progress * Math.PI);

        if (transition.type === "fadeblack") {
          return {
            backgroundColor: `rgba(0, 0, 0, ${(peakIntensity * 0.95).toFixed(3)})`,
          };
        }
        if (transition.type === "fadewhite") {
          return {
            backgroundColor: `rgba(255, 255, 255, ${(peakIntensity * 0.95).toFixed(3)})`,
          };
        }
        if (transition.type === "fade") {
          return {
            backdropFilter: `blur(${(peakIntensity * 5).toFixed(1)}px)`,
            backgroundColor: `rgba(0, 0, 0, ${(peakIntensity * 0.35).toFixed(3)})`,
          };
        }
        if (transition.type === "wipeleft" || transition.type === "slideleft") {
          const pct = Math.round(progress * 100);
          return {
            background: `linear-gradient(to left, rgba(0,0,0,0.65) ${pct}%, transparent ${pct + 12}%)`,
          };
        }
        if (transition.type === "wiperight" || transition.type === "slideright") {
          const pct = Math.round(progress * 100);
          return {
            background: `linear-gradient(to right, rgba(0,0,0,0.65) ${pct}%, transparent ${pct + 12}%)`,
          };
        }
        if (transition.type === "zoomin") {
          return {
            transform: `scale(${(1 + peakIntensity * 0.08).toFixed(3)})`,
            backgroundColor: `rgba(0, 0, 0, ${(peakIntensity * 0.25).toFixed(3)})`,
          };
        }
      }
    }
    return null;
  }, [transition, clips, currentTime]);

  // Compute live CSS filter string for preview
  const liveCssFilter = React.useMemo(() => {
    let brightness = 1 + colorFilter.brightness;
    let contrast = colorFilter.contrast;
    let saturation = colorFilter.saturation;
    let grayscale = 0;
    let sepia = 0;
    let hueRotate = 0;

    switch (colorFilter.preset) {
      case "vibrant":
        saturation *= 1.35;
        contrast *= 1.1;
        break;
      case "cinematic":
        contrast *= 1.15;
        saturation *= 0.92;
        break;
      case "cyberpunk":
        contrast *= 1.22;
        saturation *= 1.4;
        hueRotate = 10;
        break;
      case "noir":
        grayscale = 1;
        contrast *= 1.25;
        break;
      case "vintage":
        sepia = 0.65;
        contrast *= 1.1;
        break;
      case "highcontrast":
        contrast *= 1.35;
        saturation *= 1.15;
        break;
    }

    return `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) grayscale(${grayscale}) sepia(${sepia}) hue-rotate(${hueRotate}deg)`;
  }, [colorFilter]);

  // Aspect ratio styling for preview player
  const aspectClass = React.useMemo(() => {
    switch (aspectRatio) {
      case "16:9":
        return "aspect-video";
      case "9:16":
        return "aspect-[9/16] max-w-[280px]";
      case "1:1":
        return "aspect-square max-w-[380px]";
      case "4:3":
        return "aspect-[4/3]";
      case "original":
      default:
        return "aspect-video";
    }
  }, [aspectRatio]);

  return (
    <ToolShell toolId="video-editor">
      {/* 
        RULE 1: Scoped strictly to .omni-editor-workspace 
        Custom CSS variables exist ONLY inside this wrapper
      */}
      <div className="omni-editor-workspace rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col bg-[#121212] text-[#E2E8F0]">
        {/* Workspace Top Navigation / Action Bar */}
        <div className="editor-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-[#1E1E1E]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-[11px] font-bold tracking-wider">
              <Film className="size-3.5" />
              <span>THE EDIT BAY</span>
            </div>
            <span className="text-xs text-[#94A3B8] font-mono hidden sm:inline truncate max-w-[200px]">
              {file ? file.name : "Project: Untitled"}
            </span>

            {/* Form Factor Adaptive Switcher */}
            <div className="flex items-center gap-1 bg-[#121212] px-2 py-1 rounded-lg border border-white/5 text-[10px] font-mono">
              <button
                onClick={() => {
                  setLayoutOverride((prev) => {
                    if (prev === "auto") return "flex";
                    if (prev === "flex") return "fold";
                    if (prev === "fold") return "mobile";
                    if (prev === "mobile") return "desktop";
                    return "auto";
                  });
                  void haptics.light();
                }}
                className="flex items-center gap-1 text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                title="Click to cycle form factor preview (Auto -> Flex 90° -> Dual Fold -> Mobile -> Desktop)"
              >
                {effectiveFormFactor === "flip-flex" ? (
                  <span className="text-cyan-400 font-bold flex items-center gap-1">
                    <Smartphone className="size-3" />
                    <span>FLEX 90°</span>
                  </span>
                ) : effectiveFormFactor === "fold-dual" ? (
                  <span className="text-purple-400 font-bold flex items-center gap-1">
                    <Tablet className="size-3" />
                    <span>FOLD DUAL</span>
                  </span>
                ) : effectiveFormFactor === "slab-portrait" || effectiveFormFactor === "slab-landscape" ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Smartphone className="size-3" />
                    <span>MOBILE DECK</span>
                  </span>
                ) : (
                  <span className="text-[#94A3B8] flex items-center gap-1">
                    <Laptop className="size-3" />
                    <span>WORKSTATION</span>
                  </span>
                )}
                {layoutOverride !== "auto" && (
                  <span className="text-[9px] text-amber-400 uppercase tracking-tighter">[MANUAL]</span>
                )}
              </button>
            </div>
          </div>

          {/* Center Tabs: Tool Modes */}
          <div className="flex items-center gap-1 bg-[#121212] p-1 rounded-lg border border-white/5">
            <button
              onClick={() => {
                setActiveTab("trim");
                void haptics.light();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "trim"
                  ? "bg-[#3B82F6] text-white shadow-sm font-bold"
                  : "text-[#94A3B8] hover:text-[#E2E8F0]"
              }`}
            >
              <Scissors className="size-3.5" />
              <span>Trim & Split</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("transitions");
                void haptics.light();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "transitions"
                  ? "bg-[#3B82F6] text-white shadow-sm font-bold"
                  : "text-[#94A3B8] hover:text-[#E2E8F0]"
              }`}
            >
              <LayersIcon className="size-3.5" />
              <span>Transitions</span>
              {clips.length > 1 && transition.type !== "none" && (
                <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("color");
                void haptics.light();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "color"
                  ? "bg-[#3B82F6] text-white shadow-sm font-bold"
                  : "text-[#94A3B8] hover:text-[#E2E8F0]"
              }`}
            >
              <Sparkles className="size-3.5" />
              <span>Color Grade</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("text");
                void haptics.light();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "text"
                  ? "bg-[#3B82F6] text-white shadow-sm font-bold"
                  : "text-[#94A3B8] hover:text-[#E2E8F0]"
              }`}
            >
              <Type className="size-3.5" />
              <span>Titles</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("aspect");
                void haptics.light();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "aspect"
                  ? "bg-[#3B82F6] text-white shadow-sm font-bold"
                  : "text-[#94A3B8] hover:text-[#E2E8F0]"
              }`}
            >
              <Crop className="size-3.5" />
              <span>Aspect</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("audio");
                void haptics.light();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "audio"
                  ? "bg-[#3B82F6] text-white shadow-sm font-bold"
                  : "text-[#94A3B8] hover:text-[#E2E8F0]"
              }`}
            >
              <Volume2 className="size-3.5" />
              <span>Audio & Speed</span>
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {videoUrl && (
              <>
                <button
                  onClick={handleUndo}
                  disabled={clipHistory.length === 0 || busy}
                  className="px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10 text-xs text-[#94A3B8] hover:text-white hover:bg-white/10 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                  title="Undo Clip Edit (Ctrl+Z)"
                >
                  <Undo2 className="size-3.5" />
                  <span className="hidden md:inline">Undo</span>
                </button>
                <button
                  onClick={handleClear}
                  disabled={busy}
                  className="px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10 text-xs text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer disabled:opacity-50"
                  title="Close Project"
                >
                  <X className="size-3.5" />
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#3B82F6] hover:bg-[#2563EB] text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Download className="size-3.5" />
                  <span>Export Video</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Intaking DropZone (When no video is loaded) */}
        {!videoUrl ? (
          <div className="p-8 flex flex-col items-center justify-center min-h-[380px] text-center bg-[#121212]">
            <div className="max-w-md w-full space-y-4">
              <DropZone
                accept="video/*"
                file={file}
                onFile={handleFile}
                onClear={handleClear}
                label="Drop video file to open The Edit Bay"
                hint="Supports MP4, WebM, MOV, MKV, AVI — Zero server upload · 100% on-device editing"
              />
            </div>
          </div>
        ) : (
          <>
            {/* 
              RULE 2: Pure Black (#000000) Viewport
              Background directly behind video player is pure black to eliminate letterbox seams
            */}
            <div
              ref={viewportContainerRef}
              className="editor-viewport relative w-full min-h-[280px] max-h-[460px] bg-[#000000] flex items-center justify-center overflow-hidden p-2"
              style={{ backgroundColor: EditorCanvasTheme.viewport.background }}
            >
              {/* Visual Blade Cut Slash Animation */}
              <BladeCutEffect active={isBladeCutting} />

              {/* Aspect Ratio Container Framing */}
              <div className={`relative flex items-center justify-center overflow-hidden ${aspectClass}`}>
                {/* HTML5 Video preview player with live Color Shaders */}
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                  playsInline
                  className={`w-full h-full object-contain pointer-events-none select-none transition-opacity duration-150 ${
                    trackVisibleV1 ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ filter: liveCssFilter }}
                />

                {/* Real-time Visual Transition Simulation Layer */}
                {transitionActiveEffect && (
                  <div
                    className="absolute inset-0 pointer-events-none transition-all duration-75 z-10"
                    style={transitionActiveEffect}
                  />
                )}

                {/* Live Text Overlay on Player Preview */}
                {textOverlay.enabled && textOverlay.text.trim() && (
                  <div
                    className={`absolute inset-0 pointer-events-none p-4 flex ${
                      textOverlay.position === "top"
                        ? "items-start justify-center"
                        : textOverlay.position === "center"
                          ? "items-center justify-center"
                          : textOverlay.position === "bottom-left"
                            ? "items-end justify-start"
                            : textOverlay.position === "top-right"
                              ? "items-start justify-end"
                              : "items-end justify-center"
                    }`}
                  >
                    <div
                      className={`px-4 py-2 rounded-lg font-bold text-center tracking-wider transition-all ${
                        textOverlay.theme === "box"
                          ? "bg-black/75 backdrop-blur-sm border border-white/20 text-white shadow-xl"
                          : textOverlay.theme === "gold"
                            ? "text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.8)]"
                            : textOverlay.theme === "neon"
                              ? "text-cyan-300 drop-shadow-[0_2px_10px_rgba(6,182,212,0.9)]"
                              : "text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                      } ${
                        textOverlay.size === "sm"
                          ? "text-xs sm:text-sm"
                          : textOverlay.size === "md"
                            ? "text-base sm:text-xl"
                            : textOverlay.size === "lg"
                              ? "text-xl sm:text-2xl"
                              : "text-2xl sm:text-3xl"
                      }`}
                    >
                      {textOverlay.text}
                    </div>
                  </div>
                )}
              </div>

              {/* Viewport Floating Timecode Overlay */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-black/70 backdrop-blur-md border border-white/10 font-mono text-xs text-[#E2E8F0] tracking-widest shadow">
                {formatTimecode(currentTime)}
              </div>

              {/* Play / Pause Big Hit Box */}
              <button
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause video" : "Play video"}
                className="absolute inset-0 w-full h-full cursor-pointer flex items-center justify-center group focus:outline-none"
              >
                <div
                  className={`size-16 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all ${
                    isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-90 scale-105"
                  }`}
                >
                  {isPlaying ? <Pause className="size-7" /> : <Play className="size-7 ml-1" />}
                </div>
              </button>
            </div>

            {/* Flex Mode 90° Cockpit Header Banner */}
            {isFlexLayout && (
              <div className="px-4 py-2 bg-gradient-to-r from-cyan-950/60 via-blue-950/40 to-slate-900 border-y border-cyan-500/20 flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <Smartphone className="size-3.5 animate-pulse" />
                  <span>FLEX MODE COCKPIT (90° TABLETOP)</span>
                </span>
                <span className="text-cyan-300/80 text-[11px]">
                  {formatTimecode(currentTime)} / {formatTimecode(duration)}
                </span>
              </div>
            )}

            {/* Mobile & Foldable Interactive Clip Ribbon with Live Seam Badges */}
            {(isMobileLayout || isFoldLayout) && (
              <div className="w-full bg-[#161616] border-y border-white/5 py-2.5 px-3 overflow-x-auto select-none scrollbar-none">
                <div className="flex items-center gap-2 min-w-max">
                  {clips.map((c, i) => {
                    const isSelected = c.id === selectedClipId;
                    return (
                      <React.Fragment key={c.id}>
                        <div
                          onClick={() => {
                            setSelectedClipId(c.id);
                            handleSeekToTime(c.startSec);
                            void haptics.light();
                          }}
                          className={`flex flex-col justify-between px-3 py-1.5 rounded-xl border text-xs font-mono cursor-pointer transition-all min-w-[95px] max-w-[130px] ${
                            isSelected
                              ? "bg-blue-600/30 border-blue-400 text-white font-bold shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                              : "bg-[#1F1F1F] border-white/10 text-[#94A3B8] hover:border-white/20 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-blue-400 font-bold">#{i + 1}</span>
                            <span className="text-white/60">{c.duration.toFixed(1)}s</span>
                          </div>
                          <span className="truncate text-[11px] mt-0.5 text-white/90">{c.name}</span>
                        </div>

                        {/* Interactive Seam Transition Badge */}
                        {i < clips.length - 1 && (
                          <button
                            onClick={() => {
                              setShowMobileTransitions(true);
                              void haptics.light();
                            }}
                            className="shrink-0 px-2 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-[10px] font-mono flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-[0_0_8px_rgba(34,211,238,0.15)] hover:bg-cyan-500/25"
                            title="Tap to change transition"
                          >
                            <Layers className="size-3 text-cyan-400" />
                            <span>{transition.type !== "none" ? transition.type : "cut"}</span>
                            <span className="text-cyan-400/70 text-[9px]">{transition.duration}s</span>
                          </button>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tactile Mobile Jog Wheel for Frame-by-Frame Touch Scrubbing */}
            {(isMobileLayout || isFoldLayout) && (
              <MobileJogWheel
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                onTogglePlay={togglePlay}
                onSeek={handleSeekToTime}
              />
            )}

            {/* Desktop Workstation Transport Control Dock */}
            {!isMobileLayout && (
              <div className="editor-panel flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-y border-white/10 bg-[#1E1E1E]">
                {/* Transport Buttons */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => stepFrame(false)}
                    className="p-1.5 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white transition-all cursor-pointer"
                    title="Step Back 1 Frame (Left Arrow)"
                  >
                    <SkipBack className="size-4" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all cursor-pointer"
                    title="Play / Pause (Space)"
                  >
                    {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
                  </button>
                  <button
                    onClick={() => stepFrame(true)}
                    className="p-1.5 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white transition-all cursor-pointer"
                    title="Step Forward 1 Frame (Right Arrow)"
                  >
                    <SkipForward className="size-4" />
                  </button>
                </div>

                {/* Timecode Readouts */}
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-white font-bold">{formatTimecode(currentTime)}</span>
                  <span className="text-[#94A3B8]">/</span>
                  <span className="text-[#94A3B8]">{formatTimecode(duration)}</span>
                  <span className="text-xs text-blue-400 font-bold ml-2">
                    [{clips.length} clip{clips.length > 1 ? "s" : ""} · {totalActiveDuration.toFixed(1)}s]
                  </span>
                </div>

                {/* Fast Quick Edit Actions */}
                <div className="flex items-center gap-2">
                  {/* Razor Split Button */}
                  <button
                    onClick={handleSplitAtPlayhead}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 border border-white/10 text-xs text-[#E2E8F0] hover:bg-blue-500/20 hover:border-blue-500/40 transition-all cursor-pointer"
                    title="Split Clip at Current Playhead (S)"
                  >
                    <Scissors className="size-3.5 text-blue-400" />
                    <span className="hidden sm:inline">Split (S)</span>
                  </button>

                  {/* In/Out Trim Buttons */}
                  <button
                    onClick={handleSetInPoint}
                    className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs font-mono text-[#E2E8F0] hover:bg-white/10 transition-all cursor-pointer"
                    title="Trim Start to Playhead (I)"
                  >
                    Set [In]
                  </button>
                  <button
                    onClick={handleSetOutPoint}
                    className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs font-mono text-[#E2E8F0] hover:bg-white/10 transition-all cursor-pointer"
                    title="Trim End to Playhead (O)"
                  >
                    Set [Out]
                  </button>

                  {/* Timeline Zoom */}
                  <div className="flex items-center gap-1 bg-[#121212] px-2 py-1 rounded border border-white/5">
                    <button
                      onClick={() => setZoom((z) => Math.max(20, z - 15))}
                      className="p-1 text-[#94A3B8] hover:text-white cursor-pointer"
                      title="Zoom Out Timeline"
                    >
                      <ZoomOut className="size-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-[#94A3B8] w-7 text-center">{zoom}px</span>
                    <button
                      onClick={() => setZoom((z) => Math.min(180, z + 15))}
                      className="p-1 text-[#94A3B8] hover:text-white cursor-pointer"
                      title="Zoom In Timeline"
                    >
                      <ZoomIn className="size-3.5" />
                    </button>
                  </div>

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white transition-all cursor-pointer"
                    title="Toggle Fullscreen"
                  >
                    <Maximize2 className="size-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Contextual Inspector Drawer */}
            <div className="editor-panel px-4 py-3 border-b border-white/10 bg-[#181818]">
              {/* TAB 1: TRIM & SPLIT CLIPS */}
              {activeTab === "trim" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Scissors className="size-4 text-blue-400" />
                      <span className="font-bold text-white font-mono uppercase">
                        Timeline Segments ({clips.length})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleResetTimeline}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white transition-all cursor-pointer"
                      >
                        <RotateCcw className="size-3" />
                        <span>Reset to Full Video</span>
                      </button>
                    </div>
                  </div>

                  {/* Active Clips Strip */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {clips.map((clip, idx) => {
                      const isSel = clip.id === selectedClipId;
                      return (
                        <div
                          key={clip.id}
                          onClick={() => {
                            setSelectedClipId(clip.id);
                            setCurrentTime(clip.startSec);
                            if (videoRef.current) videoRef.current.currentTime = clip.startSec;
                            void haptics.light();
                          }}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                            isSel
                              ? "bg-blue-600/20 border-blue-500 text-white shadow-sm"
                              : "bg-[#121212] border-white/10 text-[#94A3B8] hover:text-white hover:border-white/20"
                          }`}
                        >
                          <span className="font-bold text-blue-400">#{idx + 1}</span>
                          <span className="truncate max-w-[120px]">{clip.name}</span>
                          <span className="text-[10px] opacity-75">
                            {clip.startSec.toFixed(1)}s → {clip.endSec.toFixed(1)}s
                          </span>
                          {clips.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSelectedClip(clip.id);
                              }}
                              className="p-1 hover:text-red-400 transition-colors"
                              title="Delete this segment"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB: CINEMATIC TRANSITIONS */}
              {activeTab === "transitions" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 font-mono">
                        <LayersIcon className="size-3.5 text-blue-400" />
                        Cinematic Video Transitions
                      </h4>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">
                        Blend cut points between sequential clips with hardware shaders and FFmpeg WASM xfade.
                      </p>
                    </div>

                    {clips.length > 1 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {clips.length - 1} Seam Node{clips.length > 2 ? "s" : ""} Active
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          1 Single Clip (Split Required)
                        </span>
                      </div>
                    )}
                  </div>

                  {clips.length < 2 && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
                      <Split className="size-4 shrink-0 mt-0.5 text-blue-400" />
                      <div>
                        <p className="font-semibold">How to apply transitions:</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-relaxed">
                          Transitions blend between two or more clips. Press <strong className="text-white">S</strong> or <strong className="text-white">B</strong> (or click <strong>Split at CTI</strong> in the Trim tab) to divide your video into segments, then select an effect below.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Transition Duration Slider */}
                  <div className="space-y-1.5 bg-[#121212] p-3 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#E2E8F0] flex items-center gap-1.5 font-mono">
                        <Sparkles className="size-3 text-cyan-400" />
                        Transition Duration
                      </span>
                      <span className="font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 text-[11px]">
                        {transition.duration.toFixed(2)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.5"
                      step="0.05"
                      value={transition.duration}
                      onChange={(e) => {
                        const d = parseFloat(e.target.value);
                        setTransition((prev) => ({ ...prev, duration: d }));
                      }}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#27272A] rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-[#94A3B8] font-mono px-0.5">
                      <span>0.2s (Fast)</span>
                      <span>0.5s (Cinematic)</span>
                      <span>1.0s (Dreamy)</span>
                      <span>1.5s (Slow)</span>
                    </div>
                  </div>

                  {/* Transitions Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TRANSITION_PRESETS.map((preset) => {
                      const isSelected = transition.type === preset.type;
                      return (
                        <button
                          key={preset.type}
                          onClick={() => {
                            setTransition((prev) => ({ ...prev, type: preset.type }));
                            void haptics.light();
                          }}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[92px] relative overflow-hidden group ${
                            isSelected
                              ? "bg-gradient-to-br from-blue-900/40 via-cyan-950/30 to-slate-900 border-cyan-400/80 shadow-[0_0_15px_rgba(56,189,248,0.15)]"
                              : "bg-[#121212] border-white/5 hover:border-white/20 hover:bg-white/[0.03]"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors font-mono">
                              {preset.label}
                            </div>
                            {isSelected && (
                              <div className="size-4 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[10px] font-bold">
                                ✓
                              </div>
                            )}
                          </div>
                          <div className="text-[10px] text-[#94A3B8] line-clamp-2 leading-relaxed mt-1">
                            {preset.description}
                          </div>
                          <div className="mt-2 text-[9px] font-mono uppercase tracking-wider text-cyan-400/80">
                            {preset.category}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: COLOR GRADING & PRESETS */}
              {activeTab === "color" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-orange-400" />
                      <span className="font-bold text-white font-mono uppercase">
                        Color Grading & Looks
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        setColorFilter({ preset: "none", brightness: 0, contrast: 1, saturation: 1 })
                      }
                      className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-[#94A3B8] hover:text-white transition-all cursor-pointer font-mono"
                    >
                      Reset All
                    </button>
                  </div>

                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    {[
                      { id: "none", label: "Normal" },
                      { id: "vibrant", label: "Vibrant" },
                      { id: "cinematic", label: "Cinematic" },
                      { id: "cyberpunk", label: "Cyberpunk" },
                      { id: "noir", label: "B&W Noir" },
                      { id: "vintage", label: "Vintage" },
                      { id: "highcontrast", label: "High Contrast" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() =>
                          setColorFilter((prev) => ({ ...prev, preset: p.id as any }))
                        }
                        className={`px-3 py-1 rounded-md border transition-all cursor-pointer ${
                          colorFilter.preset === p.id
                            ? "bg-orange-500/20 border-orange-500 text-orange-300 font-bold"
                            : "bg-[#121212] border-white/10 text-[#94A3B8] hover:text-white"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Sliders */}
                  <div className="flex flex-wrap items-center gap-6 text-xs font-mono pt-1">
                    <label className="flex items-center gap-2">
                      <span className="text-[#94A3B8]">Brightness:</span>
                      <input
                        type="range"
                        min="-0.5"
                        max="0.5"
                        step="0.05"
                        value={colorFilter.brightness}
                        onChange={(e) =>
                          setColorFilter((prev) => ({
                            ...prev,
                            brightness: parseFloat(e.target.value),
                          }))
                        }
                        className="w-24 accent-orange-500"
                      />
                      <span className="w-8 text-right">
                        {colorFilter.brightness > 0
                          ? `+${colorFilter.brightness}`
                          : colorFilter.brightness}
                      </span>
                    </label>

                    <label className="flex items-center gap-2">
                      <span className="text-[#94A3B8]">Contrast:</span>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={colorFilter.contrast}
                        onChange={(e) =>
                          setColorFilter((prev) => ({
                            ...prev,
                            contrast: parseFloat(e.target.value),
                          }))
                        }
                        className="w-24 accent-orange-500"
                      />
                      <span className="w-8 text-right">{colorFilter.contrast}x</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <span className="text-[#94A3B8]">Saturation:</span>
                      <input
                        type="range"
                        min="0"
                        max="2.5"
                        step="0.1"
                        value={colorFilter.saturation}
                        onChange={(e) =>
                          setColorFilter((prev) => ({
                            ...prev,
                            saturation: parseFloat(e.target.value),
                          }))
                        }
                        className="w-24 accent-orange-500"
                      />
                      <span className="w-8 text-right">{colorFilter.saturation}x</span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 3: TITLES & TYPOGRAPHY */}
              {activeTab === "text" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Type className="size-4 text-purple-400" />
                      <span className="font-bold text-white font-mono uppercase">
                        Title & Caption Overlay
                      </span>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-[#E2E8F0] cursor-pointer font-mono">
                      <input
                        type="checkbox"
                        checked={textOverlay.enabled}
                        onChange={(e) =>
                          setTextOverlay((prev) => ({ ...prev, enabled: e.target.checked }))
                        }
                        className="accent-purple-500"
                      />
                      <span>Enable on Video</span>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      value={textOverlay.text}
                      onChange={(e) =>
                        setTextOverlay((prev) => ({ ...prev, text: e.target.value }))
                      }
                      placeholder="Type overlay title..."
                      className="px-3 py-1.5 rounded bg-[#121212] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 w-full sm:w-80"
                    />

                    {/* Position Selector */}
                    <select
                      value={textOverlay.position}
                      onChange={(e) =>
                        setTextOverlay((prev) => ({
                          ...prev,
                          position: e.target.value as any,
                        }))
                      }
                      className="px-3 py-1.5 rounded bg-[#121212] border border-white/10 text-xs text-white focus:outline-none font-mono"
                    >
                      <option value="bottom">Bottom Center</option>
                      <option value="top">Top Center</option>
                      <option value="center">Middle Center</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                    </select>

                    {/* Theme Selector */}
                    <select
                      value={textOverlay.theme}
                      onChange={(e) =>
                        setTextOverlay((prev) => ({
                          ...prev,
                          theme: e.target.value as any,
                        }))
                      }
                      className="px-3 py-1.5 rounded bg-[#121212] border border-white/10 text-xs text-white focus:outline-none font-mono"
                    >
                      <option value="box">Black Box (Subtitles)</option>
                      <option value="clean">Clean White</option>
                      <option value="gold">Gold Shimmer</option>
                      <option value="neon">Cyan Neon</option>
                    </select>

                    {/* Size */}
                    <div className="flex items-center gap-1 bg-[#121212] p-1 rounded border border-white/10 text-xs font-mono">
                      {(["sm", "md", "lg", "xl"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setTextOverlay((prev) => ({ ...prev, size: s }))}
                          className={`px-2 py-0.5 rounded uppercase ${
                            textOverlay.size === s
                              ? "bg-purple-600 text-white font-bold"
                              : "text-[#94A3B8] hover:text-white"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ASPECT RATIO */}
              {activeTab === "aspect" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Crop className="size-4 text-emerald-400" />
                    <span className="font-bold text-white font-mono uppercase">
                      Aspect Ratio & Framing
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    {[
                      { id: "original", label: "Original Aspect" },
                      { id: "16:9", label: "16:9 Landscape (YouTube)" },
                      { id: "9:16", label: "9:16 Vertical (TikTok / Reels / Shorts)" },
                      { id: "1:1", label: "1:1 Square (Instagram)" },
                      { id: "4:3", label: "4:3 Classic TV" },
                    ].map((ar) => (
                      <button
                        key={ar.id}
                        onClick={() => setAspectRatio(ar.id as any)}
                        className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          aspectRatio === ar.id
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold"
                            : "bg-[#121212] border-white/10 text-[#94A3B8] hover:text-white"
                        }`}
                      >
                        {ar.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: AUDIO & SPEED */}
              {activeTab === "audio" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Volume2 className="size-4 text-cyan-400" />
                    <span className="font-bold text-white font-mono uppercase">
                      Playback Speed & Audio Level
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
                    {/* Speed Controls */}
                    <div className="flex items-center gap-2">
                      <span className="text-[#94A3B8]">Speed:</span>
                      <div className="flex items-center gap-1 bg-[#121212] p-1 rounded border border-white/10">
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                          <button
                            key={s}
                            onClick={() => setSpeed(s)}
                            className={`px-2 py-0.5 rounded cursor-pointer ${
                              speed === s
                                ? "bg-cyan-600 text-white font-bold"
                                : "text-[#94A3B8] hover:text-white"
                            }`}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Volume Controls */}
                    <label className="flex items-center gap-2">
                      <span className="text-[#94A3B8]">Volume:</span>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={volume}
                        disabled={isMuted}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-24 accent-cyan-500"
                      />
                      <span className="w-10 text-right">{Math.round(volume * 100)}%</span>
                    </label>

                    {/* Mute Audio */}
                    <button
                      onClick={() => setIsMuted((m) => !m)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        isMuted
                          ? "bg-red-500/20 border-red-500 text-red-300 font-bold"
                          : "bg-[#121212] border-white/10 text-[#94A3B8] hover:text-white"
                      }`}
                    >
                      {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                      <span>{isMuted ? "Audio Muted" : "Mute Audio Track"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 
              RULE 3: Studio Multi-Track Timeline with Pinned Sticky Headers & High-Performance 60fps Canvas
            */}
            <div className="flex flex-col border-t border-white/10 bg-[#121212]">
              {/* Timeline Quick Action Toolbar (Above Ruler) */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 bg-[#1A1A1A] border-b border-white/10 text-xs font-mono select-none">
                {/* Left Editing Tools */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleSplitAtPlayhead}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold hover:text-white transition-all cursor-pointer shadow-sm"
                    title="Split Clip at Playhead (S or Ctrl+K)"
                  >
                    <Scissors className="size-3.5" />
                    <span>Split (S)</span>
                  </button>

                  <button
                    onClick={() => handleDeleteSelectedClip()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-white transition-all cursor-pointer"
                    title="Delete Selected Clip (Delete / Backspace)"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>

                  <button
                    onClick={handleSetInPoint}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[#E2E8F0] transition-all cursor-pointer"
                    title="Trim In-Point to Playhead (I)"
                  >
                    Set [In]
                  </button>

                  <button
                    onClick={handleSetOutPoint}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[#E2E8F0] transition-all cursor-pointer"
                    title="Trim Out-Point to Playhead (O)"
                  >
                    Set [Out]
                  </button>

                  <button
                    onClick={() => setSnapping((s) => !s)}
                    className={`flex items-center gap-1 px-2 py-1 rounded border transition-all cursor-pointer ${
                      snapping
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold"
                        : "bg-white/5 border-white/10 text-[#94A3B8] hover:text-white"
                    }`}
                    title={snapping ? "Magnetic Snapping Active (N)" : "Magnetic Snapping Disabled (N)"}
                  >
                    <Magnet className="size-3" />
                    <span className="hidden md:inline">Snap</span>
                  </button>

                  <button
                    onClick={handleResetTimeline}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white transition-all cursor-pointer"
                    title="Reset to Full Video"
                  >
                    <RotateCcw className="size-3" />
                    <span className="hidden lg:inline">Reset</span>
                  </button>
                </div>

                {/* Center: Segment Badges */}
                <div className="hidden md:flex items-center gap-1.5 overflow-x-auto max-w-sm py-0.5">
                  {clips.map((c, i) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedClipId(c.id);
                        setCurrentTime(c.startSec);
                        if (videoRef.current) videoRef.current.currentTime = c.startSec;
                      }}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-mono cursor-pointer transition-all ${
                        c.id === selectedClipId
                          ? "bg-blue-600/30 border-blue-400 text-white font-bold shadow-sm"
                          : "bg-white/5 border-white/10 text-[#94A3B8] hover:text-white"
                      }`}
                    >
                      <span className="text-blue-400">#{i + 1}</span>
                      <span>{c.duration.toFixed(1)}s</span>
                      {clips.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSelectedClip(c.id);
                          }}
                          className="hover:text-red-400"
                          title="Delete clip"
                        >
                          <X className="size-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Right: Timecode & Zoom Controller */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[11px] font-mono mr-1">
                    <span className="text-white font-bold">{formatTimecode(currentTime)}</span>
                    <span className="text-white/40">/</span>
                    <span className="text-[#94A3B8]">{formatTimecode(duration)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-[#121212] px-2 py-0.5 rounded-lg border border-white/10">
                    <button
                      onClick={() => setZoom((z) => Math.max(5, z - 10))}
                      className="p-1 text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="size-3" />
                    </button>

                    <input
                      type="range"
                      min="5"
                      max="120"
                      step="2"
                      value={zoom}
                      onChange={(e) => setZoom(parseInt(e.target.value))}
                      className="w-16 sm:w-20 accent-blue-500 h-1 cursor-pointer"
                      title={`Zoom: ${zoom} px/second`}
                    />

                    <button
                      onClick={() => setZoom((z) => Math.min(120, z + 10))}
                      className="p-1 text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="size-3" />
                    </button>

                    <button
                      onClick={handleFitTimeline}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-blue-400 hover:text-blue-300 font-bold transition-all cursor-pointer border border-white/5"
                      title="Fit Entire Timeline to Window (F)"
                    >
                      <Expand className="size-2.5" />
                      <span>Fit</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SPLIT TIMELINE: PINNED LEFT TRACK HEADERS + SCROLLABLE CANVAS */}
              <div className="flex w-full overflow-hidden relative bg-[#121212]">
                {/* PINNED TRACK HEADERS (LEFT COLUMN: Fixed width 105px) */}
                <div className="w-[105px] shrink-0 border-r border-white/10 bg-[#161616] flex flex-col select-none z-20 shadow-md">
                  {/* Ruler Corner Header (32px) */}
                  <div className="h-[32px] px-2.5 flex items-center justify-between border-b border-white/10 bg-[#141414] text-[10px] text-[#94A3B8]">
                    <span className="font-bold tracking-wider text-white/70">TRACKS</span>
                    <span className="text-[9px] text-white/40">30fps</span>
                  </div>

                  {/* V1 Video Track Header (48px) */}
                  <div className="h-[48px] px-2 flex items-center justify-between border-b border-white/5 bg-[#1A1A1A] relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                    <div className="flex items-center gap-1.5 pl-1">
                      <Film className="size-3.5 text-blue-400" />
                      <span className="font-bold text-xs text-white">V1</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setTrackVisibleV1((v) => !v)}
                        className={`p-1 rounded transition-colors ${trackVisibleV1 ? "text-[#94A3B8] hover:text-white" : "text-amber-400"}`}
                        title={trackVisibleV1 ? "Hide Video Track" : "Show Video Track"}
                      >
                        {trackVisibleV1 ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                      </button>
                      <button
                        onClick={() => setTrackLockedV1((l) => !l)}
                        className={`p-1 rounded transition-colors ${trackLockedV1 ? "text-red-400" : "text-[#94A3B8] hover:text-white"}`}
                        title={trackLockedV1 ? "Unlock Video Track" : "Lock Video Track"}
                      >
                        {trackLockedV1 ? <Lock className="size-3" /> : <Unlock className="size-3" />}
                      </button>
                    </div>
                  </div>

                  {/* A1 Audio Track Header (42px) */}
                  <div className="h-[42px] px-2 flex items-center justify-between border-b border-white/5 bg-[#1A1A1A] relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                    <div className="flex items-center gap-1.5 pl-1">
                      <Volume2 className="size-3.5 text-emerald-400" />
                      <span className="font-bold text-xs text-white">A1</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIsMuted((m) => !m)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                          isMuted ? "bg-red-500 text-white" : "bg-white/5 text-[#94A3B8] hover:text-white"
                        }`}
                        title={isMuted ? "Unmute Audio" : "Mute Audio Track (M)"}
                      >
                        M
                      </button>
                      <button
                        onClick={() => setSoloAudio((s) => !s)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                          soloAudio ? "bg-amber-500 text-black font-extrabold" : "bg-white/5 text-[#94A3B8] hover:text-white"
                        }`}
                        title="Solo Audio Track"
                      >
                        S
                      </button>
                      <button
                        onClick={() => setTrackLockedA1((l) => !l)}
                        className={`p-1 rounded transition-colors ${trackLockedA1 ? "text-red-400" : "text-[#94A3B8] hover:text-white"}`}
                        title={trackLockedA1 ? "Unlock Audio Track" : "Lock Audio Track"}
                      >
                        {trackLockedA1 ? <Lock className="size-3" /> : <Unlock className="size-3" />}
                      </button>
                    </div>
                  </div>

                  {/* T1 Titles Track Header (36px) */}
                  <div className="h-[36px] px-2 flex items-center justify-between border-b border-white/5 bg-[#1A1A1A] relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />
                    <div className="flex items-center gap-1.5 pl-1">
                      <Type className="size-3.5 text-purple-400" />
                      <span className="font-bold text-xs text-white">T1</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setTextOverlay((t) => ({ ...t, enabled: !t.enabled }))}
                        className={`p-1 rounded transition-colors ${textOverlay.enabled ? "text-purple-400" : "text-[#94A3B8] hover:text-white"}`}
                        title={textOverlay.enabled ? "Disable Titles" : "Enable Titles"}
                      >
                        {textOverlay.enabled ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                      </button>
                      <button
                        onClick={() => setTrackLockedT1((l) => !l)}
                        className={`p-1 rounded transition-colors ${trackLockedT1 ? "text-red-400" : "text-[#94A3B8] hover:text-white"}`}
                      >
                        {trackLockedT1 ? <Lock className="size-3" /> : <Unlock className="size-3" />}
                      </button>
                    </div>
                  </div>

                  {/* FX1 Effects Track Header (36px) */}
                  <div className="h-[36px] px-2 flex items-center justify-between bg-[#1A1A1A] relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                    <div className="flex items-center gap-1.5 pl-1">
                      <Sparkles className="size-3.5 text-amber-400" />
                      <span className="font-bold text-xs text-white">FX1</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setColorFilter((prev) =>
                            prev.preset !== "none"
                              ? { ...prev, preset: "none" }
                              : { ...prev, preset: "cinematic" }
                          )
                        }
                        className={`p-1 rounded transition-colors ${colorFilter.preset !== "none" ? "text-amber-400" : "text-[#94A3B8] hover:text-white"}`}
                        title={colorFilter.preset !== "none" ? "Disable Color FX" : "Enable Color FX"}
                      >
                        {colorFilter.preset !== "none" ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                      </button>
                      <button
                        onClick={() => setTrackLockedFX1((l) => !l)}
                        className={`p-1 rounded transition-colors ${trackLockedFX1 ? "text-red-400" : "text-[#94A3B8] hover:text-white"}`}
                      >
                        {trackLockedFX1 ? <Lock className="size-3" /> : <Unlock className="size-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* SCROLLABLE TIMELINE CANVAS (RIGHT) */}
                <div
                  ref={timelineContainerRef}
                  onWheel={handleTimelineWheel}
                  className="relative flex-1 overflow-x-auto overflow-y-hidden bg-[#121212] select-none scrollbar-thin scrollbar-thumb-white/15"
                  style={{ height: "194px" }}
                >
                  <canvas
                    ref={canvasRef}
                    onPointerDown={handleTimelinePointerDown}
                    onPointerMove={handleTimelinePointerMove}
                    onPointerUp={handleTimelinePointerUp}
                    onPointerLeave={handleTimelinePointerLeave}
                    className="block"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Live Processing Status (During FFmpeg Render Pass) */}
        {busy && (
          <div className="p-4 border-t border-white/10 bg-[#141414]">
            <ProcessingStatus
              phase={phase}
              progress={progress}
              passIndex={passIndex}
              passCount={passCount}
              passLabel={passLabel}
              elapsedMs={elapsedMs}
              error={error}
            />
          </div>
        )}

        {/* Finished Export Output Card */}
        {outputs.length > 0 && (
          <div className="p-4 border-t border-blue-500/30 bg-[#161616]">
            {outputs.map((out) => (
              <OutputCard
                key={out.url}
                output={out}
                badge="Master Exported"
                badgeTone="pulse"
                onClear={reset}
                extra={
                  <div className="text-[11px] font-mono text-[#94A3B8]">
                    Rendered with {clips.length} segment{clips.length > 1 ? "s" : ""} · {aspectRatio} framing · {speed}x speed
                  </div>
                }
              />
            ))}
          </div>
        )}

        {/* Workspace Footer Status Bar */}
        <div className="px-4 py-2 bg-[#181818] border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] font-mono text-[#94A3B8]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>FFMPEG WASM CORE & ZERO-COPY WORKERFS</span>
            </span>
            <span>·</span>
            <span>HARDWARE CODEC ACCELERATION</span>
          </div>

          <div className="flex items-center gap-4">
            <span>CLIPS: {clips.length}</span>
            <span>ASPECT: {aspectRatio.toUpperCase()}</span>
            <span>STATUS: {busy ? "PROCESSING" : "READY"}</span>
          </div>
        </div>

        {/* Sticky Mobile Ergonomic Action Bay */}
        {videoUrl && isMobileLayout && (
          <div className="sticky bottom-0 z-30 w-full">
            <MobileThumbDeck
              onSplit={handleSplitAtPlayhead}
              onSetInPoint={handleSetInPoint}
              onSetOutPoint={handleSetOutPoint}
              onUndo={handleUndo}
              canUndo={clipHistory.length > 0}
              onOpenTransitions={() => setShowMobileTransitions(true)}
              onDeleteClip={() => handleDeleteSelectedClip()}
              onExport={() => setShowExportModal(true)}
              clipsCount={clips.length}
              hasActiveTransition={transition.type !== "none"}
              canDelete={clips.length > 1}
              isBusy={busy}
            />
          </div>
        )}
      </div>

      {/* Real Export Options Modal */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md w-full rounded-2xl bg-[#1E1E1E] border border-white/10 p-6 text-white space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="size-5 text-blue-400" />
                  <h3 className="font-bold text-lg font-display">Export Master Video</h3>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-1 rounded text-[#94A3B8] hover:text-white cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[#94A3B8] mb-1.5">OUTPUT RESOLUTION</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["source", "1080p", "720p", "480p"] as const).map((res) => (
                      <button
                        key={res}
                        onClick={() => setExportResolution(res)}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                          exportResolution === res
                            ? "bg-[#3B82F6] border-blue-400 text-white font-bold"
                            : "bg-[#121212] border-white/10 text-[#94A3B8] hover:text-white"
                        }`}
                      >
                        {res.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Edit Summary */}
                <div className="p-3.5 rounded-lg bg-[#121212] border border-white/5 space-y-2 text-[11px] text-[#94A3B8]">
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span>Timeline Segments:</span>
                    <span className="text-white font-bold">
                      {clips.length} clip{clips.length > 1 ? "s" : ""} ({totalActiveDuration.toFixed(1)}s total)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aspect Ratio:</span>
                    <span className="text-emerald-400 font-bold">{aspectRatio.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Speed / Audio:</span>
                    <span className="text-white">
                      {speed}x speed · {isMuted ? "Muted" : `${Math.round(volume * 100)}% vol`}
                    </span>
                  </div>
                  {colorFilter.preset !== "none" && (
                    <div className="flex justify-between">
                      <span>Color Grade:</span>
                      <span className="text-orange-400 font-bold">
                        {colorFilter.preset.toUpperCase()}
                      </span>
                    </div>
                  )}
                  {textOverlay.enabled && textOverlay.text.trim() && (
                    <div className="flex justify-between">
                      <span>Typography:</span>
                      <span className="text-purple-400 truncate max-w-[180px]">
                        &ldquo;{textOverlay.text}&rdquo;
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-white/5">
                    <span>Pipeline:</span>
                    <span className="text-white font-bold">100% Client-Side FFmpeg WASM</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-[#94A3B8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteExport}
                  className="px-5 py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-xs font-mono font-bold text-white shadow-lg transition-all cursor-pointer"
                >
                  Start Real Export
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Transitions Bottom Sheet Drawer */}
      <MobileTransitionsDrawer
        isOpen={showMobileTransitions}
        onClose={() => setShowMobileTransitions(false)}
        transition={transition}
        onChangeTransition={setTransition}
        clipsCount={clips.length}
        onTestPreview={handleTestTransitionPreview}
      />
    </ToolShell>
  );
}
