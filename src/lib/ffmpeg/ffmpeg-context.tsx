"use client";

/**
 * OMNI TOOL — FFmpeg.wasm Engine Provider
 * ========================================
 *
 * Owns the lifecycle of the FFmpeg.wasm instance for the entire app:
 *
 *  boot() flow:
 *    1. worker   — spawn the module worker served from /ffmpeg/worker.js
 *    2. fetch    — download the self-hosted single-thread core
 *                  (/ffmpeg/ffmpeg-core.{js,wasm}) with REAL byte progress
 *    3. compile  — instantiate + compile the WebAssembly module
 *    4. online   — engine ready; every tool module shares this instance
 *
 * The single-threaded core works with or without cross-origin isolation,
 * while the COOP/COEP headers shipped in next.config.ts keep the origin
 * ready for multi-threaded (SharedArrayBuffer) cores in the future.
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import type {
  BootStage,
  DownloadProgress,
  EngineCapabilities,
  EngineState,
  LogLevel,
  LogLine,
  LogSource,
  RuntimeProgress,
} from "@/types/omni";

const LOG_RING_CAPACITY = 400;
const WASM_BYTES_FALLBACK = 32_232_419;

const CORE_VER = "0.12.10";

const ENGINE_ASSETS = {
  worker: "/ffmpeg/worker.js",
  core: `https://unpkg.com/@ffmpeg/core@${CORE_VER}/dist/esm/ffmpeg-core.js`,
  wasm: `https://unpkg.com/@ffmpeg/core@${CORE_VER}/dist/umd/ffmpeg-core.wasm`,
} as const;

export interface FFmpegEngineContextValue {
  /* lifecycle ---------------------------------------------------------------- */
  state: EngineState;
  stage: BootStage;
  error: string | null;
  boot: () => Promise<void>;
  shutdown: () => void;
  /** Total time the last successful boot took, in milliseconds. */
  bootMs: number | null;

  /* live telemetry ----------------------------------------------------------- */
  /** Byte-accurate progress while the WASM core is downloading. */
  download: DownloadProgress | null;
  /** Most recent ffmpeg exec progress (0..1 + media time). */
  runtime: RuntimeProgress | null;
  logs: LogLine[];
  appendLog: (
    source: LogSource,
    level: LogLevel,
    message: string,
  ) => void;

  /* environment -------------------------------------------------------------- */
  capabilities: EngineCapabilities;

  /* the engine itself (null until state === "ready") ------------------------- */
  engine: FFmpeg | null;
}

const FFmpegEngineContext = createContext<FFmpegEngineContextValue | null>(null);

let logIdCounter = 0;

export function FFmpegEngineProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EngineState>("idle");
  const [stage, setStage] = useState<BootStage>("standby");
  const [error, setError] = useState<string | null>(null);
  const [bootMs, setBootMs] = useState<number | null>(null);
  const [download, setDownload] = useState<DownloadProgress | null>(null);
  const [runtime, setRuntime] = useState<RuntimeProgress | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [engine, setEngine] = useState<FFmpeg | null>(null);
  const [capabilities, setCapabilities] = useState<EngineCapabilities>({
    crossOriginIsolated: false,
    sharedArrayBuffer: false,
    webWorker: false,
    mediaRecorder: false,
    indexedDB: false,
    wasm: false,
  });

  /** Guards against double-boot (button spam / StrictMode double-effects). */
  const bootingRef = useRef(false);

  const appendLog = useCallback(
    (source: LogSource, level: LogLevel, message: string) => {
      setLogs((prev) => {
        const next = [
          ...prev,
          { id: ++logIdCounter, ts: Date.now(), source, level, message },
        ];
        return next.length > LOG_RING_CAPACITY
          ? next.slice(next.length - LOG_RING_CAPACITY)
          : next;
      });
    },
    [],
  );

  /* Probe browser capabilities once on the client (SSR-safe). ---------------- */
  useEffect(() => {
    setCapabilities({
      crossOriginIsolated:
        typeof window !== "undefined" &&
        window.crossOriginIsolated === true,
      sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
      webWorker: typeof Worker !== "undefined",
      mediaRecorder: typeof MediaRecorder !== "undefined",
      indexedDB: typeof indexedDB !== "undefined",
      wasm: typeof WebAssembly !== "undefined",
    });
  }, []);

  /* -------------------------------------------------------------------------- */
  /* boot                                                                        */
  /* -------------------------------------------------------------------------- */
  const boot = useCallback(async () => {
    if (bootingRef.current || state === "ready") return;
    bootingRef.current = true;

    setState("loading");
    setError(null);
    setDownload(null);
    setBootMs(null);
    setStage("worker");

    const startedAt = performance.now();
    const instance = new FFmpeg();

    /* Relay ffmpeg internal logs + progress into the shared console. */
    instance.on("log", ({ type, message }) => {
      appendLog("ffmpeg", type === "fferr" ? "ffmpeg" : "info", message);
    });
    instance.on("progress", ({ progress, time }) => {
      setRuntime({ progress, time });
    });

    try {
      appendLog(
        "system",
        "info",
        `Spawning module worker → ${ENGINE_ASSETS.worker}`,
      );

      /* Core glue script is tiny — no progress needed. Fetching directly via CDN. */
      const coreURL = ENGINE_ASSETS.core;

      setStage("fetch");
      const totalBytesGuess = WASM_BYTES_FALLBACK;
      appendLog(
        "system",
        "info",
        `Fetching WASM core → ${ENGINE_ASSETS.wasm}`,
      );

      /* The big one: ~31 MB with real byte-level progress. */
      const wasmURL = await toBlobURL(
        ENGINE_ASSETS.wasm,
        "application/wasm",
        true,
        ({ received, total, done }) => {
          const denom = total > 0 ? total : totalBytesGuess;
          setDownload({
            received,
            total: denom,
            percent: Math.min(received / denom, 1),
            done,
          });
        },
      );

      setStage("compile");
      appendLog(
        "system",
        "info",
        "Compiling WebAssembly module (AOT) …",
      );

      /* CRITICAL: resolve the worker against the document origin.
       * Bundlers may rewrite `import.meta.url` (used internally by the
       * FFmpeg class as the URL base) to a file:// path in dev, which
       * would break worker construction. An absolute URL string ignores
       * that base entirely. */
      const classWorkerURL = new URL(
        ENGINE_ASSETS.worker,
        window.location.href,
      ).href;

      await instance.load({
        classWorkerURL,
        coreURL,
        wasmURL,
      });

      const elapsed = performance.now() - startedAt;
      setEngine(instance);
      setStage("online");
      setState("ready");
      setBootMs(elapsed);
      appendLog(
        "system",
        "success",
        `Engine online in ${(elapsed / 1000).toFixed(2)}s — tools unblocked.`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err ?? "unknown error");
      instance.terminate();
      setEngine(null);
      setStage("standby");
      setState("error");
      setError(message);
      appendLog("system", "error", `Boot failed → ${message}`);
    } finally {
      bootingRef.current = false;
    }
  }, [appendLog, state]);

  /* -------------------------------------------------------------------------- */
  /* shutdown                                                                    */
  /* -------------------------------------------------------------------------- */
  const shutdown = useCallback(() => {
    engine?.terminate();
    setEngine(null);
    setState("idle");
    setStage("standby");
    setDownload(null);
    setRuntime(null);
    appendLog("system", "warn", "Engine terminated. Re-initialize when ready.");
  }, [appendLog, engine]);

  const value = useMemo<FFmpegEngineContextValue>(
    () => ({
      state,
      stage,
      error,
      boot,
      shutdown,
      bootMs,
      download,
      runtime,
      logs,
      appendLog,
      capabilities,
      engine,
    }),
    [
      state,
      stage,
      error,
      boot,
      shutdown,
      bootMs,
      download,
      runtime,
      logs,
      appendLog,
      capabilities,
      engine,
    ],
  );

  return (
    <FFmpegEngineContext.Provider value={value}>
      {children}
    </FFmpegEngineContext.Provider>
  );
}

export { FFmpegEngineContext };
