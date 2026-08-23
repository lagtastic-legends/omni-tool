"use client";

/**
 * BASS BOOSTER — low-shelf amplifier with adjustable intensity + cutoff,
 * optional treble clarity shelf so boosted tracks don't turn to mud.
 */

import { useState } from "react";
import { Speaker } from "lucide-react";
import { AudioWorkbench } from "@/components/audio/audio-workbench";
import {
  ParamPanel,
  ParamSelect,
  ParamSlider,
  ParamToggle,
} from "@/components/audio/param-controls";
import { useMediaJob } from "@/hooks/use-media-job";
import { bassFilters } from "@/lib/audio/filters";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";

export function BassBooster() {
  const job = useMediaJob();
  const { busy, outputs, run, reset } = job;

  const [file, setFile] = useState<File | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [cutoff, setCutoff] = useState("110");
  const [clarity, setClarity] = useState(true);

  const start = async ({ format, outputArgs }: { format: string; outputArgs: string[] }) => {
    if (!file) return;
    const filters = bassFilters({
      intensity,
      cutoff: Number(cutoff),
      clarity,
    });
    const inputPath = `input.${extOf(file.name) || "mp3"}`;
    const buffer = new Uint8Array(await file.arrayBuffer());
    await run({
      write: [{ path: inputPath, data: buffer }],
      passes: [
        {
          exec: ["-i", inputPath, "-af", filters.join(","), ...outputArgs, `output.${format}`],
          label: `Boosting bass +${(intensity * 1.8).toFixed(1)} dB @ ${cutoff} Hz`,
        },
      ],
      read: [
        {
          path: `output.${format}`,
          mime: mimeFor(format),
          name: `${baseName(file.name)}-bass.${format}`,
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
      onRun={start}
      runLabel="BOOST THE BASS"
      job={job}
      output={outputs[0] ?? null}
      badge="bass boosted"
      note="A low-shelf filter lifts everything under the cutoff. Intensity 7+ is speaker-abuse territory — enable clarity to keep the mids alive."
      runIcon={<Speaker className="size-4" />}
      controls={
        <ParamPanel title="low-end engine">
          <ParamSlider
            label="Intensity"
            value={intensity}
            min={1}
            max={10}
            step={1}
            onChange={setIntensity}
            disabled={busy}
            display={(v) => `+${(v * 1.8).toFixed(1)} dB`}
            hintLeft="subtle"
            hintRight="earthquake"
          />
          <ParamSelect
            label="Cutoff"
            value={cutoff}
            onChange={setCutoff}
            disabled={busy}
            options={[
              { value: "60", label: "60 Hz · pure sub" },
              { value: "80", label: "80 Hz · deep" },
              { value: "110", label: "110 Hz · classic" },
              { value: "150", label: "150 Hz · punchy" },
            ]}
          />
          <ParamToggle
            label="Clarity shelf"
            checked={clarity}
            onChange={setClarity}
            disabled={busy}
            hint="+3 dB treble @ 8 kHz — offsets mud from heavy boosting"
          />
        </ParamPanel>
      }
    />
  );
}
