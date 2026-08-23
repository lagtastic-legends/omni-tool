"use client";

/**
 * VOLUME CHANGER — clean gain staging in dB, or a one-pass loudness
 * normalization (dynaudnorm) that levels dynamics automatically.
 */

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { AudioWorkbench } from "@/components/audio/audio-workbench";
import {
  ParamPanel,
  ParamSlider,
  ParamToggle,
} from "@/components/audio/param-controls";
import { useMediaJob } from "@/hooks/use-media-job";
import { volumeFilters } from "@/lib/audio/filters";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";

export function VolumeChanger() {
  const job = useMediaJob();
  const { busy, outputs, run, reset } = job;

  const [file, setFile] = useState<File | null>(null);
  const [db, setDb] = useState(6);
  const [normalize, setNormalize] = useState(false);

  const start = async ({ format, outputArgs }: { format: string; outputArgs: string[] }) => {
    if (!file) return;
    const filters = volumeFilters({ db, normalize });
    const inputPath = `input.${extOf(file.name) || "mp3"}`;
    const buffer = new Uint8Array(await file.arrayBuffer());
    await run({
      write: [{ path: inputPath, data: buffer }],
      passes: [
        {
          exec: ["-i", inputPath, "-af", filters.join(","), ...outputArgs, `output.${format}`],
          label: normalize ? "Normalizing loudness" : `Applying ${db > 0 ? "+" : ""}${db} dB`,
        },
      ],
      read: [
        {
          path: `output.${format}`,
          mime: mimeFor(format),
          name: `${baseName(file.name)}-${normalize ? "normalized" : "volume"}.${format}`,
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
      runLabel="CHANGE VOLUME"
      runDisabled={!normalize && db === 0}
      job={job}
      output={outputs[0] ?? null}
      badge={normalize ? "normalized" : "re-gained"}
      note="Gain above +10 dB may clip loud masters — normalize mode uses dynamic loudness control instead of raw gain, which is safer at high targets."
      runIcon={<Volume2 className="size-4" />}
      controls={
        <ParamPanel title="gain stage">
          <ParamSlider
            label="Volume"
            value={db}
            min={-30}
            max={20}
            step={1}
            onChange={setDb}
            disabled={busy || normalize}
            display={(v) => `${v > 0 ? "+" : ""}${v} dB`}
            hintLeft="whisper"
            hintRight="wall-shaking"
          />
          <ParamToggle
            label="Loudness normalize"
            checked={normalize}
            onChange={setNormalize}
            disabled={busy}
            hint="dynaudnorm — evens out quiet & loud passages to a constant level"
          />
        </ParamPanel>
      }
    />
  );
}
