"use client";

/**
 * 3D / 8D AUDIO — sine apulsator swings the stereo field around the
 * listener on a configurable cycle; extrastereo widens the image first.
 */

import { useState } from "react";
import { Orbit } from "lucide-react";
import { AudioWorkbench } from "@/components/audio/audio-workbench";
import { ParamPanel, ParamSlider } from "@/components/audio/param-controls";
import { useMediaJob } from "@/hooks/use-media-job";
import { spatialFilters } from "@/lib/audio/filters";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";

export function Spatial8D() {
  const job = useMediaJob();
  const { busy, outputs, run, reset } = job;

  const [file, setFile] = useState<File | null>(null);
  const [cycleSec, setCycleSec] = useState(8);
  const [intensity, setIntensity] = useState(0.9);

  const start = async ({ format, outputArgs }: { format: string; outputArgs: string[] }) => {
    if (!file) return;
    const filters = spatialFilters({ cycleSec, intensity });
    const inputPath = `input.${extOf(file.name) || "mp3"}`;
    const buffer = new Uint8Array(await file.arrayBuffer());
    await run({
      write: [{ path: inputPath, data: buffer }],
      passes: [
        {
          exec: ["-i", inputPath, "-af", filters.join(","), ...outputArgs, `output.${format}`],
          label: `Rendering 8D rotation · ${cycleSec}s/cycle`,
        },
      ],
      read: [
        {
          path: `output.${format}`,
          mime: mimeFor(format),
          name: `${baseName(file.name)}-8d.${format}`,
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
      runLabel="RENDER 8D AUDIO"
      job={job}
      output={outputs[0] ?? null}
      badge="8D spatialized"
      badgeTone="neon"
      note="Best with headphones — the sound orbits your head on a sine LFO. Mono sources are auto-upmixed to stereo before rotation."
      runIcon={<Orbit className="size-4" />}
      controls={
        <ParamPanel title="rotation field">
          <ParamSlider
            label="Cycle length"
            value={cycleSec}
            min={4}
            max={16}
            step={1}
            onChange={setCycleSec}
            disabled={busy}
            display={(v) => `${v}s / rotation`}
            hintLeft="4s · dizzy"
            hintRight="16s · hypnotic"
          />
          <ParamSlider
            label="Swing intensity"
            value={intensity}
            min={0.3}
            max={1}
            step={0.05}
            onChange={setIntensity}
            disabled={busy}
            display={(v) => `${Math.round(v * 100)}%`}
            hintLeft="gentle drift"
            hintRight="full orbit"
          />
        </ParamPanel>
      }
    />
  );
}
