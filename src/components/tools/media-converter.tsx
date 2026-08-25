"use client";

/**
 * MEDIA CONVERTER
 *  ─ Video format transcode: MP4 / MOV / MKV / AVI / WebM
 *  ─ Audio extraction:       MP3 / WAV / M4A / FLAC / OGG
 * Codec matrix verified against the shipped wasm core:
 * libx264 · libvpx(vp8) · libmp3lame · libvorbis · aac · flac · pcm_s16le
 */

import { motion } from "framer-motion";
import { Film, Music4, Wand2 } from "lucide-react";
import { useState } from "react";
import { DropZone } from "@/components/media/drop-zone";
import { OutputCard } from "@/components/media/output-card";
import { ProcessingStatus } from "@/components/media/processing-status";
import { useMediaJob } from "@/hooks/use-media-job";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Mode = "video" | "audio";
type VideoFormat = "mp4" | "mov" | "mkv" | "avi" | "webm";
type AudioFormat = "mp3" | "wav" | "m4a" | "flac" | "ogg";
type Quality = "high" | "balanced" | "compact";

const QUALITY_META: Record<Quality, { crf: number; aviQ: number; webmKbps: number; label: string }> = {
  high: { crf: 20, aviQ: 4, webmKbps: 1500, label: "High fidelity" },
  balanced: { crf: 26, aviQ: 6, webmKbps: 800, label: "Balanced" },
  compact: { crf: 32, aviQ: 9, webmKbps: 400, label: "Compact" },
};

const VIDEO_FORMAT_NOTES: Record<VideoFormat, string> = {
  mp4: "H.264 + AAC — universal compatibility",
  mov: "H.264 + AAC — QuickTime container",
  mkv: "H.264 + AAC — flexible Matroska",
  avi: "MPEG-4 + MP3 — legacy container",
  webm: "VP8 + Vorbis — web-native (slower encode)",
};

const AUDIO_FORMAT_NOTES: Record<AudioFormat, string> = {
  mp3: "Lossy · universal",
  wav: "Lossless PCM · large",
  m4a: "AAC lossy · Apple-friendly",
  flac: "Lossless compressed",
  ogg: "Vorbis lossy · open",
};

function buildVideoArgs(
  input: string,
  output: string,
  format: VideoFormat,
  quality: Quality,
  audioKbps: number,
): string[] {
  const q = QUALITY_META[quality];
  switch (format) {
    case "mp4":
    case "mov":
    case "mkv":
      return [
        "-i", input,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", String(q.crf),
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", `${audioKbps}k`,
        ...(format !== "mkv" ? ["-movflags", "+faststart"] : []),
        output,
      ];
    case "avi":
      return [
        "-i", input,
        "-c:v", "mpeg4",
        "-vtag", "xvid",
        "-q:v", String(q.aviQ),
        "-c:a", "libmp3lame",
        "-b:a", `${Math.min(audioKbps, 192)}k`,
        output,
      ];
    case "webm":
      return [
        "-i", input,
        "-c:v", "libvpx",
        "-b:v", `${q.webmKbps}k`,
        "-deadline", "realtime",
        "-cpu-used", "5",
        "-c:a", "libvorbis",
        "-b:a", `${Math.min(audioKbps, 192)}k`,
        output,
      ];
  }
}

function buildAudioArgs(
  input: string,
  output: string,
  format: AudioFormat,
  audioKbps: number,
): string[] {
  switch (format) {
    case "mp3":
      return ["-i", input, "-vn", "-c:a", "libmp3lame", "-b:a", `${audioKbps}k`, output];
    case "wav":
      return ["-i", input, "-vn", "-c:a", "pcm_s16le", output];
    case "m4a":
      return ["-i", input, "-vn", "-c:a", "aac", "-b:a", `${audioKbps}k`, output];
    case "flac":
      return ["-i", input, "-vn", "-c:a", "flac", "-compression_level", "5", output];
    case "ogg":
      return ["-i", input, "-vn", "-c:a", "libvorbis", "-q:a", "5", output];
  }
}

export function MediaConverter() {
  const { phase, busy, progress, passIndex, passCount, passLabel, elapsedMs, error, outputs, run, reset } =
    useMediaJob();

  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>("video");
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("mp4");
  const [audioFormat, setAudioFormat] = useState<AudioFormat>("mp3");
  const [quality, setQuality] = useState<Quality>("balanced");
  const [audioKbps, setAudioKbps] = useState("192");

  const targetExt = mode === "video" ? videoFormat : audioFormat;
  const inputPath = file ? `input.${extOf(file.name) || "bin"}` : "";
  const outputName = file ? `${baseName(file.name)}.${targetExt}` : "";
  const outputPath = `output.${targetExt}`;

  const start = async () => {
    if (!file) return;
    const kbps = Number(audioKbps);
    const args =
      mode === "video"
        ? buildVideoArgs(inputPath, outputPath, videoFormat, quality, kbps)
        : buildAudioArgs(inputPath, outputPath, audioFormat, kbps);

    const buffer = new Uint8Array(await file.arrayBuffer());
    await run({
      write: [{ path: inputPath, data: buffer }],
      passes: [
        {
          exec: args,
          label:
            mode === "video"
              ? `Transcoding → ${videoFormat.toUpperCase()} (H.264 ultrafast)`
              : `Extracting audio → ${audioFormat.toUpperCase()}`,
        },
      ],
      read: [{ path: outputPath, mime: mimeFor(targetExt), name: outputName }],
      cleanup: [inputPath, outputPath],
    });
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
          }}
          onClear={() => {
            reset();
            setFile(null);
          }}
          preview="video"
          label="Drop a video to convert"
          disabled={busy}
        />

        {/* mode tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="video" className="gap-2 font-mono text-[11px] uppercase tracking-[0.14em]">
              <Film className="size-3.5" />
              Video format
            </TabsTrigger>
            <TabsTrigger value="audio" className="gap-2 font-mono text-[11px] uppercase tracking-[0.14em]">
              <Music4 className="size-3.5" />
              Extract audio
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* format selectors */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Target format
            </p>
            <Select
              value={mode === "video" ? videoFormat : audioFormat}
              onValueChange={(v) =>
                mode === "video" ? setVideoFormat(v as VideoFormat) : setAudioFormat(v as AudioFormat)
              }
              disabled={busy}
            >
              <SelectTrigger className="min-h-11 font-mono text-sm uppercase" aria-label="Target format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mode === "video"
                  ? (Object.keys(VIDEO_FORMAT_NOTES) as VideoFormat[]).map((f) => (
                      <SelectItem key={f} value={f} className="font-mono uppercase">
                        {f}
                      </SelectItem>
                    ))
                  : (Object.keys(AUDIO_FORMAT_NOTES) as AudioFormat[]).map((f) => (
                      <SelectItem key={f} value={f} className="font-mono uppercase">
                        {f}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "video" ? (
            <div className="space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Quality
              </p>
              <Select value={quality} onValueChange={(v) => setQuality(v as Quality)} disabled={busy}>
                <SelectTrigger className="min-h-11 font-mono text-sm" aria-label="Quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(QUALITY_META) as Quality[]).map((q) => (
                    <SelectItem key={q} value={q} className="font-mono">
                      {QUALITY_META[q].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Audio bitrate
              </p>
              <Select value={audioKbps} onValueChange={setAudioKbps} disabled={busy}>
                <SelectTrigger className="min-h-11 font-mono text-sm" aria-label="Audio bitrate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["96", "128", "192", "256"].map((k) => (
                    <SelectItem key={k} value={k} className="font-mono">
                      {k} kbps
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* format note */}
        <p className="rounded-lg border border-border/60 bg-card/40 px-3 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          {mode === "video"
            ? VIDEO_FORMAT_NOTES[videoFormat]
            : AUDIO_FORMAT_NOTES[audioFormat]}
          {mode === "video" && " · preset: ultrafast (wasm-optimized)"}
        </p>

        {/* run */}
        <motion.button
          onClick={() => void start()}
          disabled={!file || busy}
          whileHover={!file || busy ? undefined : { scale: 1.02 }}
          whileTap={!file || busy ? undefined : { scale: 0.97 }}
          className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.2em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 glow-box-violet"
        >
          <Wand2 className="size-4" />
          {busy ? "PROCESSING…" : `CONVERT → ${targetExt.toUpperCase()}`}
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
            badge={mode === "audio" ? "audio extracted" : "transcoded"}
            badgeTone={mode === "audio" ? "neon" : "pulse"}
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
