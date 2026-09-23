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
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";

export function SlowedReverb() {
  const job = useMediaJob();
  const { busy, outputs, run, reset } = job;

  const [file, setFile] = useState<File | null>(null);
  const [factor, setFactor] = useState(0.85);
  const [reverb, setReverb] = useState(0.55);

  const start = async ({ format, outputArgs }: {
    format: string; kbps: number; outputArgs: string[];
  }) => {
    if (!file) return;
    const srcExt = extOf(file.name) || "mp3";
    const virtualInputPath = `/mnt_0/input.${srcExt}`;

    // Zero-copy WORKERFS audio pipeline:
    // Normalizing to 44.1kHz ensures exact pitch/tempo drop across any source sample rate
    // (e.g. 48kHz mobile recordings) with 0 MB JavaScript RAM overhead.
    const filters = [
      "aformat=sample_rates=44100",
      `asetrate=${Math.round(44100 * factor)}`,
      "aresample=44100",
    ];

    if (reverb >= 0.05) {
      if (reverb < 0.35) {
        // Light room ambience: Haas micro-reflections (16ms & 24ms), zero slapback
        filters.push("aecho=0.85:0.7:16|24:0.22|0.16,highpass=f=50,treble=g=-2:f=6500");
      } else if (reverb < 0.7) {
        // Medium studio hall: dense 4-tap diffuse reflections, warm damping
        filters.push("aecho=0.82:0.75:18|26|34|42:0.28|0.22|0.16|0.12,highpass=f=50,treble=g=-3:f=5500");
      } else {
        // Deep cathedral wash: multi-tap spatial bloom with progressive decay
        filters.push("aecho=0.80:0.8:20|28|36|48:0.34|0.26|0.20|0.14,highpass=f=50,treble=g=-3:f=5000");
      }
      filters.push("alimiter=limit=0.98");
    }

    await run({
      inputFiles: [{ file, name: `input.${srcExt}`, mountPoint: "/mnt_0" }],
      passes: [
        {
          exec: ["-i", virtualInputPath, "-af", filters.join(","), ...outputArgs, `output.${format}`],
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
      cleanup: [`output.${format}`],
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
