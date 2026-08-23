import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

export type EngineState = "idle" | "loading" | "ready" | "error";

export type BootStage = "standby" | "worker" | "fetch" | "compile" | "online";

export type LogSource = "system" | "ffmpeg";

export type LogLevel = "info" | "success" | "warn" | "error" | "ffmpeg";

export interface LogLine {
  id: number;
  ts: number;
  source: LogSource;
  level: LogLevel;
  message: string;
}

export interface DownloadProgress {
  received: number;
  total: number;
  percent: number;
  done: boolean;
}

export interface EngineCapabilities {
  crossOriginIsolated: boolean;
  sharedArrayBuffer: boolean;
  webWorker: boolean;
  mediaRecorder: boolean;
  indexedDB: boolean;
  wasm: boolean;
}

/* ------------------------------------------------------------------ */
/* Tool registry                                                       */
/* ------------------------------------------------------------------ */

export type ToolCategory =
  | "video"
  | "audio"
  | "documents"
  | "imaging"
  | "studio"
  | "system";

export type ToolStatus = "online" | "locked" | "soon";

export interface ToolMeta {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: LucideIcon;
  /** Delivery phase in the build roadmap (1–7). */
  phase: number;
  status: ToolStatus;
  /** Tailwind-friendly accent key used for the icon tile + glow. */
  accent: "violet" | "cyan" | "fuchsia" | "emerald" | "amber";
}

export interface RuntimeProgress {
  /** 0..1 reported by ffmpeg during exec */
  progress: number;
  /** processed media time in microseconds */
  time: number;
}
