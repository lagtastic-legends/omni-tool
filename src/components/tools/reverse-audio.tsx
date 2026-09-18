"use client";

/**
 * REVERSE AUDIO — areverse in one pass. No parameters beyond format;
 * the module exists as its own surface per the suite spec.
 */

import { useState } from "react";
import { Rewind } from "lucide-react";
import { AudioWorkbench } from "@/components/audio/audio-workbench";
import { ParamPanel, ParamToggle } from "@/components/audio/param-controls";
import { useMediaJob } from "@/hooks/use-media-job";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";

export function ReverseAudio() {
  const job = useMediaJob();
  const { busy, outputs, run, reset } = job;
  const [file, setFile] = useState<File | null>(null);
  const [includeEcho, setIncludeEcho] = useState(false);

  const start = async ({ format, outputArgs }: { format: string; outputArgs: string[] }) => {
    if (!file) return;
    const srcExt = extOf(file.name) || "mp3";
    const virtualInputPath = `/mnt_0/input.${srcExt}`;
    const filterChain = ["areverse"];
    if (includeEcho) {
      filterChain.push(
        "aecho=0.82:0.75:18|26|34|42:0.28|0.22|0.16|0.12",
        "highpass=f=50",
        "treble=g=-3:f=5500",
      );
    }
    await run({
      inputFiles: [{ file, name: `input.${srcExt}`, mountPoint: "/mnt_0" }],
      passes: [
        {
          exec: [
            "-i", virtualInputPath,
            "-af", filterChain.join(","),
            ...outputArgs,
            `output.${format}`,
          ],
          label: includeEcho ? "Reversing waveform + atmospheric echo" : "Reversing waveform",
        },
      ],
      read: [
        {
          path: `output.${format}`,
          mime: mimeFor(format),
          name: `${baseName(file.name)}-reversed.${format}`,
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
      runLabel="REVERSE TRACK"
      job={job}
      output={outputs[0] ?? null}
      badge="reversed"
      note="Temporal waveform inversion: flips the sample sequence backwards with optional atmospheric room echo."
      runIcon={<Rewind className="size-4" />}
      controls={
        <ParamPanel title="reverse options">
          <ParamToggle
            label="Atmospheric Echo Tail"
            checked={includeEcho}
            onChange={setIncludeEcho}
            hint="Appends rich ambient reverb decay to the reversed audio"
            disabled={busy}
          />
        </ParamPanel>
      }
    />
  );
}
