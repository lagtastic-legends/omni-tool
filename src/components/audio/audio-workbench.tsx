"use client";

/**
 * AudioWorkbench — the shared two-column surface for audio effect tools:
 * left = intake + params + fire button, right = telemetry + output.
 * Owns the output format/bitrate bar so every effect module stays lean.
 *
 * The animated bar strip is decorative flair that pulses while jobs run.
 */

import { motion } from "framer-motion";
import { Headphones, Wand2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { DropZone } from "@/components/media/drop-zone";
import { OutputCard } from "@/components/media/output-card";
import { ProcessingStatus } from "@/components/media/processing-status";
import { ParamSelect } from "@/components/audio/param-controls";
import type { JobOutput, JobPhase } from "@/hooks/use-media-job";
import { audioOutputArgs, type AudioFormat } from "@/lib/audio/filters";
import type { VideoMeta } from "@/lib/media/probe";

interface AudioWorkbenchProps {
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
  onProbed?: (meta: VideoMeta) => void;
  busy: boolean;
  /** Receives the chosen output format + bitrate at fire time. */
  onRun: (opts: { format: AudioFormat; kbps: number; outputArgs: string[] }) => void;
  runLabel: string;
  runDisabled?: boolean;
  job: {
    phase: JobPhase;
    progress: number;
    passIndex: number;
    passCount: number;
    passLabel: string | null;
    elapsedMs: number;
    error: string | null;
  };
  output: JobOutput | null;
  badge?: string;
  badgeTone?: "pulse" | "neon" | "plasma";
  showFormatBar?: boolean;
  controls: ReactNode;
  note?: string;
  runIcon?: ReactNode;
}

const BAR_COUNT = 36;

function BarStrip({ active }: { active: boolean }) {
  const heights = useMemo(
    () => Array.from({ length: BAR_COUNT }, (_, i) => 18 + Math.abs(Math.sin(i * 0.7)) * 62),
    [],
  );
  return (
    <div
      aria-hidden="true"
      className="flex h-14 items-end gap-[3px] overflow-hidden rounded-lg border border-border/50 bg-background/60 px-3 pb-2.5 pt-2"
    >
      {heights.map((h, i) => (
        <motion.span
          key={i}
          className={`w-full rounded-sm ${
            active
              ? "bg-gradient-to-t from-primary to-neon"
              : "bg-gradient-to-t from-primary/25 to-neon/25"
          }`}
          style={{ height: `${h}%` }}
          animate={
            active
              ? { scaleY: [1, 0.35 + (i % 5) * 0.16, 1], opacity: [0.75, 1, 0.75] }
              : { scaleY: 1, opacity: 0.6 }
          }
          transition={
            active
              ? {
                  duration: 0.9 + (i % 6) * 0.12,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: (i % 9) * 0.06,
                }
              : { duration: 0.4 }
          }
        />
      ))}
    </div>
  );
}

export function AudioWorkbench({
  file,
  onFile,
  onClear,
  onProbed,
  busy,
  onRun,
  runLabel,
  runDisabled,
  job,
  output,
  badge,
  badgeTone = "pulse",
  showFormatBar = true,
  controls,
  note,
  runIcon,
}: AudioWorkbenchProps) {
  const [format, setFormat] = useState<AudioFormat>("mp3");
  const [kbps, setKbps] = useState("256");

  const fire = () =>
    onRun({
      format,
      kbps: Number(kbps),
      outputArgs: audioOutputArgs(format, Number(kbps)),
    });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ------------------------------------------------ left: intake + params */}
      <div className="space-y-5">
        <DropZone
          accept="audio/*"
          file={file}
          onFile={onFile}
          onClear={onClear}
          onProbed={onProbed}
          preview="audio"
          label="Drop an audio file"
          disabled={busy}
        />

        <BarStrip active={busy} />

        {controls}

        {showFormatBar && (
          <div className="grid grid-cols-2 gap-3">
            <ParamSelect
              label="Output format"
              value={format}
              onChange={(v) => setFormat(v as AudioFormat)}
              disabled={busy}
              options={[
                { value: "mp3", label: "MP3 · universal" },
                { value: "wav", label: "WAV · lossless PCM" },
                { value: "flac", label: "FLAC · lossless" },
                { value: "ogg", label: "OGG · Vorbis" },
                { value: "m4a", label: "M4A · AAC" },
              ]}
            />
            <ParamSelect
              label="Bitrate"
              value={kbps}
              onChange={setKbps}
              disabled={busy || format === "wav" || format === "flac"}
              options={[
                { value: "128", label: "128 kbps" },
                { value: "192", label: "192 kbps" },
                { value: "256", label: "256 kbps" },
                { value: "320", label: "320 kbps" },
              ]}
            />
          </div>
        )}

        {note && (
          <p className="rounded-lg border border-border/60 bg-card/40 px-3 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
            <Headphones className="mr-1.5 inline size-3 translate-y-0.5 text-neon/80" />
            {note}
          </p>
        )}

        <motion.button
          onClick={fire}
          disabled={!file || busy || runDisabled}
          whileHover={!file || busy || runDisabled ? undefined : { scale: 1.02 }}
          whileTap={!file || busy || runDisabled ? undefined : { scale: 0.97 }}
          className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.2em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 glow-box-violet"
        >
          {runIcon ?? <Wand2 className="size-4" />}
          {busy ? "PROCESSING…" : runLabel}
        </motion.button>
      </div>

      {/* ------------------------------------------------ right: status + output */}
      <div className="space-y-4">
        <ProcessingStatus {...job} />
        {output && <OutputCard output={output} badge={badge} badgeTone={badgeTone} />}
        {!output && job.phase === "idle" && (
          <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border/60">
            <p className="font-mono text-[11px] text-muted-foreground/70">
              output lands here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
