"use client";

/**
 * VIDEO MUTE
 * Strips the audio track with a stream copy (-c copy -an) — effectively
 * instant, no re-encode. If the container refuses a raw copy, falls back
 * to a fast H.264 re-encode into MP4.
 */

import { motion } from "framer-motion";
import { VolumeX, Zap } from "lucide-react";
import { useState } from "react";
import { DropZone } from "@/components/media/drop-zone";
import { OutputCard } from "@/components/media/output-card";
import { ProcessingStatus } from "@/components/media/processing-status";
import { useMediaJob, type JobSpec } from "@/hooks/use-media-job";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";

const SAFE_COPY_EXTS = new Set(["mp4", "mov", "mkv", "webm", "m4v", "avi"]);

export function VideoMute() {
  const { phase, busy, progress, passIndex, passCount, passLabel, elapsedMs, error, outputs, run, reset } =
    useMediaJob();

  const [file, setFile] = useState<File | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const start = async () => {
    if (!file) return;
    const srcExt = extOf(file.name) || "mp4";
    const inputPath = `input.${srcExt}`;
    const buffer = new Uint8Array(await file.arrayBuffer());
    setUsedFallback(false);

    const canCopy = SAFE_COPY_EXTS.has(srcExt);
    const copyExt = canCopy ? srcExt : "mp4";
    const copySpec: JobSpec = {
      write: [{ path: inputPath, data: buffer }],
      passes: [
        {
          exec: ["-i", inputPath, "-c", "copy", "-an", `output.${copyExt}`],
          label: "Stripping audio (stream copy)",
        },
      ],
      read: [
        {
          path: `output.${copyExt}`,
          mime: mimeFor(copyExt),
          name: `${baseName(file.name)}-muted.${copyExt}`,
        },
      ],
      cleanup: [inputPath, `output.${copyExt}`],
    };

    const fallbackSpec: JobSpec = {
      write: [{ path: inputPath, data: buffer }],
      passes: [
        {
          exec: [
            "-i", inputPath,
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-pix_fmt", "yuv420p",
            "-an",
            "output.mp4",
          ],
          label: "Container refused copy — re-encoding silently",
        },
      ],
      read: [
        {
          path: "output.mp4",
          mime: mimeFor("mp4"),
          name: `${baseName(file.name)}-muted.mp4`,
        },
      ],
      cleanup: [inputPath, "output.mp4"],
    };

    try {
      await run(copySpec);
    } catch {
      setUsedFallback(true);
      await run(fallbackSpec);
    }
  };

  const output = outputs[0] ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* -------------------------------------------------- input + settings */}
      <div className="space-y-5">
        <DropZone
          accept="video/*"
          file={file}
          onFile={(f) => {
            reset();
            setFile(f);
            setUsedFallback(false);
          }}
          onClear={() => {
            reset();
            setFile(null);
          }}
          preview="video"
          label="Drop a video to silence"
          disabled={busy}
        />

        <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center gap-2.5">
            <Zap className="size-4 text-neon" />
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-neon">
              stream copy mode
            </p>
          </div>
          <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
            The video & codec bitstreams are copied untouched — only the audio
            track is dropped. That makes muting near-instant even for large
            files. Exotic containers automatically fall back to a fast
            re-encode.
          </p>
        </div>

        <motion.button
          onClick={() => void start()}
          disabled={!file || busy}
          whileHover={!file || busy ? undefined : { scale: 1.02 }}
          whileTap={!file || busy ? undefined : { scale: 0.97 }}
          className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.2em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 glow-box-violet"
        >
          <VolumeX className="size-4" />
          {busy ? "PROCESSING…" : "MUTE VIDEO"}
        </motion.button>
      </div>

      {/* ------------------------------------------------------------- output */}
      <div className="space-y-4">
        <ProcessingStatus
          phase={phase}
          progress={progress}
          passIndex={passIndex}
          passCount={passCount}
          passLabel={passLabel}
          elapsedMs={elapsedMs}
          error={error}
        />
        {output && (
          <OutputCard
            output={output}
            badge={usedFallback ? "re-encoded" : "instant copy"}
            badgeTone={usedFallback ? "plasma" : "neon"}
          />
        )}
        {!output && phase === "idle" && (
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
