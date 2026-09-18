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
    const srcExt = extOf(file.name) || "mp3";
    const virtualInputPath = `/mnt_0/input.${srcExt}`;
    await run({
      inputFiles: [{ file, name: `input.${srcExt}`, mountPoint: "/mnt_0" }],
      passes: [
        {
          exec: ["-i", virtualInputPath, "-af", filters.join(","), ...outputArgs, `output.${format}`],
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
      runLabel="CHANGE VOLUME"
      job={job}
      output={outputs[0] ?? null}
      badge={normalize ? "normalized" : "re-gained"}
      note="Gain above +10 dB may clip loud masters — normalize mode uses dynamic loudness control instead of raw gain, which is safer at high targets."
      runIcon={<Volume2 className="size-4" />}
      controls={
        <ParamPanel title="gain stage">
          <div className="flex flex-wrap gap-1.5 pb-1">
            {[
              { label: "-12 dB", dbVal: -12, norm: false },
              { label: "-6 dB", dbVal: -6, norm: false },
              { label: "0 dB (Flat)", dbVal: 0, norm: false },
              { label: "+6 dB", dbVal: 6, norm: false },
              { label: "+12 dB", dbVal: 12, norm: false },
              { label: "Normalize", dbVal: 0, norm: true },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setNormalize(p.norm);
                  setDb(p.dbVal);
                }}
                disabled={busy}
                className={`rounded-full border px-2.5 py-1 font-mono text-[9px] md:text-[10px] uppercase tracking-[0.12em] transition-colors ${
                  (p.norm && normalize) || (!normalize && !p.norm && db === p.dbVal)
                    ? "border-primary/60 bg-primary/20 text-primary font-bold"
                    : "border-border/70 bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
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
