"use client";

/**
 * ProcessingStatus — live job telemetry: phase, per-pass chips, overall
 * progress bar, elapsed timer and fault card.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  FileInput,
  FileOutput,
  Loader2,
  Terminal,
} from "lucide-react";
import { formatDurationMs } from "@/lib/format";
import type { JobPhase } from "@/hooks/use-media-job";

interface ProcessingStatusProps {
  phase: JobPhase;
  progress: number;
  passIndex: number;
  passCount: number;
  passLabel: string | null;
  elapsedMs: number;
  error: string | null;
  passNames?: string[];
}

const PHASE_META: Record<
  Exclude<JobPhase, "idle">,
  { label: string; icon: typeof FileInput }
> = {
  writing: { label: "Staging input into virtual FS", icon: FileInput },
  processing: { label: "Executing FFmpeg pipeline", icon: Terminal },
  reading: { label: "Reading output from sandbox", icon: FileOutput },
  done: { label: "Complete", icon: CheckCircle2 },
  error: { label: "Fault", icon: AlertTriangle },
};

export function ProcessingStatus({
  phase,
  progress,
  passIndex,
  passCount,
  passLabel,
  elapsedMs,
  error,
  passNames = [],
}: ProcessingStatusProps) {
  if (phase === "idle") return null;

  const meta = PHASE_META[phase];
  const pct = Math.round(progress * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4"
      role="status"
      aria-live="polite"
    >
      {/* phase line */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {phase === "error" ? (
            <AlertTriangle className="size-4 shrink-0 text-red-400" />
          ) : phase === "done" ? (
            <CheckCircle2 className="size-4 shrink-0 text-pulse" />
          ) : (
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
          )}
          <span className="truncate font-mono text-xs text-foreground/90">
            {phase === "processing" && passLabel ? passLabel : meta.label}
          </span>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {formatDurationMs(elapsedMs)}
        </span>
      </div>

      {/* progress bar */}
      {phase !== "error" && (
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            className={
              phase === "done"
                ? "h-full rounded-full bg-pulse"
                : "h-full rounded-full bg-gradient-to-r from-primary to-neon"
            }
            animate={{ width: `${phase === "done" ? 100 : Math.max(pct, 2)}%` }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
        </div>
      )}

      {/* pass chips */}
      {passCount > 1 && phase !== "error" && (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: passCount }).map((_, i) => (
            <span
              key={i}
              className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] ${
                phase === "done" || i < passIndex
                  ? "border-pulse/40 bg-pulse/10 text-pulse"
                  : i === passIndex && (phase === "processing" || phase === "reading")
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground/60"
              }`}
            >
              {passNames[i] ?? `pass ${i + 1}`}
            </span>
          ))}
        </div>
      )}

      {/* fault */}
      <AnimatePresence>
        {phase === "error" && error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] leading-relaxed text-red-300"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
