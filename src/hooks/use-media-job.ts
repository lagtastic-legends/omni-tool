"use client";

/**
 * useMediaJob — declarative multi-pass ffmpeg job runner.
 *
 * A job = inputs to write → sequential exec passes → outputs to read →
 * virtual files to clean up. The hook exposes live phase, overall progress
 * (pass index + engine ratio), elapsed time, and resulting blob URLs.
 *
 * Every tool in the suite (converter, compressor, mute, GIF, future audio
 * suite) drives the engine exclusively through this hook.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";
import { clamp } from "@/lib/format";

export type JobPhase = "idle" | "writing" | "processing" | "reading" | "done" | "error";

export interface JobPass {
  /** Full argv array (without the implicit -y). */
  exec: string[];
  /** Short label shown while this pass runs, e.g. "Generating palette". */
  label?: string;
}

export interface JobSpec {
  write: { path: string; data: Uint8Array }[];
  passes: JobPass[];
  read: { path: string; mime: string; name: string }[];
  /** Virtual paths to unlink at the end (best-effort). */
  cleanup?: string[];
}

export interface JobOutput {
  name: string;
  blob: Blob;
  url: string;
  size: number;
  mime: string;
}

export function useMediaJob() {
  const { engine } = useFFmpegEngine();

  const [phase, setPhase] = useState<JobPhase>("idle");
  const [progress, setProgress] = useState(0); // overall 0..1
  const [passIndex, setPassIndex] = useState(0);
  const [passCount, setPassCount] = useState(0);
  const [passLabel, setPassLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<JobOutput[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);

  const busy = phase === "writing" || phase === "processing" || phase === "reading";
  const busyRef = useRef(false);
  const urlsRef = useRef<string[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Revoke any dangling blob URLs on unmount. ------------------------------ */
  useEffect(() => {
    return () => {
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const releaseOutputs = useCallback(() => {
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = [];
    setOutputs([]);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (startedAtRef.current !== null) {
      setElapsedMs(Date.now() - startedAtRef.current);
      startedAtRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopTimer();
    releaseOutputs();
    setPhase("idle");
    setProgress(0);
    setPassIndex(0);
    setPassCount(0);
    setPassLabel(null);
    setError(null);
    setElapsedMs(0);
  }, [releaseOutputs, stopTimer]);

  /* ---------------------------------------------------------------------- */
  /* run                                                                      */
  /* ---------------------------------------------------------------------- */
  const run = useCallback(
    async (spec: JobSpec) => {
      if (!engine) {
        setError("Engine is not online. Initialize it from the dashboard first.");
        setPhase("error");
        return;
      }
      if (busyRef.current) return;

      busyRef.current = true;
      releaseOutputs();
      setError(null);
      setProgress(0);
      setPassIndex(0);
      setPassCount(spec.passes.length);
      setElapsedMs(0);
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      timerRef.current = setInterval(() => {
        if (startedAtRef.current !== null) {
          setElapsedMs(Date.now() - startedAtRef.current);
        }
      }, 150);

      /* Per-job progress listener (engine ratio is per-pass). */
      const totalPasses = Math.max(spec.passes.length, 1);
      const currentPassRef = { current: 0 };
      const handler = ({ progress: p }: { progress: number; time: number }) => {
        const ratio = clamp(Number.isFinite(p) ? p : 0, 0, 1);
        setProgress((currentPassRef.current + ratio) / totalPasses);
      };
      engine.on("progress", handler);

      try {
        /* 1 — stage inputs into the virtual FS --------------------------- */
        setPhase("writing");
        for (const w of spec.write) {
          await engine.writeFile(w.path, w.data);
        }

        /* 2 — sequential exec passes -------------------------------------- */
        setPhase("processing");
        for (let i = 0; i < spec.passes.length; i++) {
          currentPassRef.current = i;
          setPassIndex(i);
          setPassLabel(spec.passes[i].label ?? null);
          setProgress(i / totalPasses);
          const ret = await engine.exec(["-y", ...spec.passes[i].exec]);
          if (ret !== 0) {
            throw new Error(
              `FFmpeg exited with code ${ret} while ${spec.passes[i].label ?? "processing"}. Check the engine log for the failing command.`,
            );
          }
        }
        setProgress(1);

        /* 3 — read outputs back out --------------------------------------- */
        setPhase("reading");
        const collected: JobOutput[] = [];
        for (const r of spec.read) {
          const data = await engine.readFile(r.path, "binary");
          if (!(data instanceof Uint8Array) || data.byteLength === 0) {
            throw new Error(`Output "${r.name}" came back empty — conversion failed.`);
          }
          const blob = new Blob([data], { type: r.mime });
          const url = URL.createObjectURL(blob);
          urlsRef.current.push(url);
          collected.push({
            name: r.name,
            blob,
            url,
            size: blob.size,
            mime: r.mime,
          });
        }

        setOutputs(collected);
        setPhase("done");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err ?? "unknown job failure");
        setError(message);
        setPhase("error");
      } finally {
        engine.off("progress", handler);
        /* 4 — best-effort virtual FS cleanup ------------------------------ */
        if (spec.cleanup?.length) {
          for (const p of spec.cleanup) {
            try {
              await engine.deleteFile(p);
            } catch {
              /* virtual file already gone — nothing to do */
            }
          }
        }
        stopTimer();
        busyRef.current = false;
      }
    },
    [engine, releaseOutputs, stopTimer],
  );

  return {
    phase,
    busy,
    progress,
    passIndex,
    passCount,
    passLabel,
    error,
    outputs,
    elapsedMs,
    run,
    reset,
  };
}
