"use client";

/**
 * VIDEO COMPRESSOR
 * CRF-driven H.264 compression with optional downscaling. The result card
 * surfaces the size delta — the number users actually care about.
 */

import { motion } from "framer-motion";
import { Minimize2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DropZone } from "@/components/media/drop-zone";
import { OutputCard } from "@/components/media/output-card";
import { ProcessingStatus } from "@/components/media/processing-status";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMediaJob } from "@/hooks/use-media-job";
import { formatBytes } from "@/lib/format";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";
import type { VideoMeta } from "@/lib/media/probe";

type Resolution = "original" | "1080" | "720" | "480" | "360";

const RESOLUTION_LABELS: Record<Resolution, string> = {
  original: "Original",
  "1080": "1080p",
  "720": "720p",
  "480": "480p",
  "360": "360p",
};

function crfLabel(crf: number): string {
  if (crf <= 22) return "High fidelity";
  if (crf <= 27) return "Balanced";
  if (crf <= 32) return "Light";
  return "Aggressive";
}

export function VideoCompressor() {
  const { phase, busy, progress, passIndex, passCount, passLabel, elapsedMs, error, outputs, run, reset } =
    useMediaJob();

  const [file, setFile] = useState<File | null>(null);
  const [crf, setCrf] = useState(28);
  const [resolution, setResolution] = useState<Resolution>("720");
  const [keepAudio, setKeepAudio] = useState(true);
  const [meta, setMeta] = useState<VideoMeta | null>(null);

  /* Auto-pick a sensible resolution ceiling from the source height. */
  const effectiveResolution = useMemo<Resolution>(() => {
    if (resolution !== "original" && meta?.height && Number(resolution) > meta.height) {
      return "original"; // never upscale
    }
    return resolution;
  }, [resolution, meta]);

  const outputName = file ? `${baseName(file.name)}-compressed.mp4` : "";
  const output = outputs[0] ?? null;

  const start = async () => {
    if (!file) return;
    const inputPath = `input.${extOf(file.name) || "bin"}`;
    const outputPath = "output.mp4";

    const vf =
      effectiveResolution === "original"
        ? null
        : `scale=-2:'min(ih,${effectiveResolution})'`;

    const args = [
      "-i", inputPath,
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", String(crf),
      "-pix_fmt", "yuv420p",
      ...(vf ? ["-vf", vf] : []),
      ...(keepAudio ? ["-c:a", "aac", "-b:a", "128k"] : ["-an"]),
      "-movflags", "+faststart",
      outputPath,
    ];

    const buffer = new Uint8Array(await file.arrayBuffer());
    await run({
      write: [{ path: inputPath, data: buffer }],
      passes: [
        {
          exec: args,
          label: `Compressing · CRF ${crf}${vf ? ` · ≤${effectiveResolution}p` : ""}`,
        },
      ],
      read: [{ path: outputPath, mime: mimeFor("mp4"), name: outputName }],
      cleanup: [inputPath, outputPath],
    });
  };

  const savings = useMemo(() => {
    if (!file || !output) return null;
    const delta = file.size - output.size;
    const pct = Math.round((delta / file.size) * 100);
    return { delta, pct };
  }, [file, output]);

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
          }}
          onClear={() => {
            reset();
            setFile(null);
            setMeta(null);
          }}
          onProbed={setMeta}
          preview="video"
          label="Drop a video to compress"
          disabled={busy}
        />

        {/* CRF slider */}
        <div className="space-y-2.5 rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Compression strength
            </p>
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
              CRF {crf} · {crfLabel(crf)}
            </span>
          </div>
          <Slider
            value={[crf]}
            onValueChange={([v]) => setCrf(v)}
            min={18}
            max={38}
            step={1}
            disabled={busy}
            aria-label="Compression strength (CRF)"
          />
          <div className="flex justify-between font-mono text-[9px] text-muted-foreground/70">
            <span>18 — larger, near-lossless</span>
            <span>38 — tiny, visible loss</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Resolution cap
            </p>
            <Select
              value={effectiveResolution}
              onValueChange={(v) => setResolution(v as Resolution)}
              disabled={busy}
            >
              <SelectTrigger className="min-h-11 font-mono text-sm" aria-label="Resolution cap">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RESOLUTION_LABELS) as Resolution[]).map((r) => (
                  <SelectItem key={r} value={r} className="font-mono">
                    {RESOLUTION_LABELS[r]}
                    {r !== "original" ? ` (≤${r}p)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end justify-between gap-3 rounded-xl border border-border/60 bg-card/40 px-4 pb-4 pt-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Audio track
              </p>
              <p className="mt-1 font-mono text-[11px] text-foreground/80">
                {keepAudio ? "keep (AAC 128k)" : "strip"}
              </p>
            </div>
            <Switch checked={keepAudio} onCheckedChange={setKeepAudio} disabled={busy} aria-label="Keep audio track" />
          </div>
        </div>

        <motion.button
          onClick={() => void start()}
          disabled={!file || busy}
          whileHover={!file || busy ? undefined : { scale: 1.02 }}
          whileTap={!file || busy ? undefined : { scale: 0.97 }}
          className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.2em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 glow-box-violet"
        >
          <Minimize2 className="size-4" />
          {busy ? "COMPRESSING…" : "COMPRESS VIDEO"}
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
            onClear={reset}
            badge={
              savings && savings.delta > 0
                ? `−${savings.pct}% smaller`
                : savings && savings.delta <= 0
                  ? "size neutral"
                  : undefined
            }
            extra={
              file && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">source</p>
                    <p className="mt-0.5 font-mono text-xs font-semibold text-foreground/90">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">output</p>
                    <p className="mt-0.5 font-mono text-xs font-semibold text-neon">
                      {formatBytes(output.size)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">saved</p>
                    <p className="mt-0.5 font-mono text-xs font-semibold text-pulse">
                      {savings && savings.delta > 0
                        ? formatBytes(savings.delta)
                        : "—"}
                    </p>
                  </div>
                </div>
              )
            }
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
