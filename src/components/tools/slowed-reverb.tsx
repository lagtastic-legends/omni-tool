"use client";

/**
 * SLOWED + REVERB
 * The late-night signature: asetrate pitch-drop slow (sample rate detected
 * live via the engine's ffprobe) + tiered aecho reverb.
 */

import { useState } from "react";
import { AudioWaveform } from "lucide-react";
import { AudioWorkbench } from "@/components/audio/audio-workbench";
import { ParamPanel, ParamSlider } from "@/components/audio/param-controls";
import { useMediaJob } from "@/hooks/use-media-job";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";
import { slowedFilters } from "@/lib/audio/filters";
import { detectSampleRate } from "@/lib/audio/probe";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";

export function SlowedReverb() {
  const { engine, appendLog } = useFFmpegEngine();
  const job = useMediaJob();
  const { busy, outputs, run, reset } = job;

  const [file, setFile] = useState<File | null>(null);
  const [factor, setFactor] = useState(0.85);
  const [reverb, setReverb] = useState(0.55);

  const start = async ({ format, kbps, outputArgs }: {
    format: string; kbps: number; outputArgs: string[];
  }) => {
    if (!file || !engine) return;
    const inputPath = `input.${extOf(file.name) || "mp3"}`;
    const buffer = new Uint8Array(await file.arrayBuffer());

    /* Stage the input first — the filter chain needs the real sample rate. */
    await engine.writeFile(inputPath, buffer);
    const sr = await detectSampleRate(engine, inputPath);
    appendLog("system", "info", `detected sample rate → ${sr} Hz`);

    const filters = slowedFilters({
      factor,
      reverb,
      sampleRate: sr,
    });

    await run({
      write: [],
      passes: [
        {
          exec: ["-i", inputPath, "-af", filters.join(","), ...outputArgs, `output.${format}`],
          label: `Slowing to ${Math.round(factor * 100)}% · reverb ${Math.round(reverb * 100)}%`,
        },
      ],
      read: [
        {
          path: `output.${format}`,
          mime: mimeFor(format),
          name: `${baseName(file.name)}-slowed.${format}`,
        },
      ],
      cleanup: [inputPath, `output.${format}`],
    });
  };

  return (
    <AudioWorkbench
      file={file}
      onFile={(f) => {
        reset();
        setFile(f);
      }}
      onClear={() => {
        reset();
        setFile(null);
      }}
      busy={busy}
      onRun={(o) => void start(o)}
      runLabel="APPLY SLOWED + REVERB"
      job={job}
      output={outputs[0] ?? null}
      badge="slowed + reverbed"
      badgeTone="plasma"
      note="Classic 33rpm aesthetic — tempo and pitch drop together, drenched in tape-style echo. Sample rate is detected automatically so the factor stays exact on 44.1k and 48k sources."
      runIcon={<AudioWaveform className="size-4" />}
      controls={
        <ParamPanel title="signature">
          <ParamSlider
            label="Speed"
            value={factor}
            min={0.5}
            max={0.95}
            step={0.05}
            onChange={setFactor}
            disabled={busy}
            display={(v) => `${Math.round(v * 100)}%`}
            hintLeft="50% · deep"
            hintRight="95% · subtle"
          />
          <ParamSlider
            label="Reverb"
            value={reverb}
            min={0}
            max={1}
            step={0.05}
            onChange={setReverb}
            disabled={busy}
            display={(v) => (v < 0.05 ? "dry" : `${Math.round(v * 100)}%`)}
            hintLeft="dry"
            hintRight="cathedral"
          />
        </ParamPanel>
      }
    />
  );
}
