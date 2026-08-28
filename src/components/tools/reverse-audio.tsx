"use client";

/**
 * REVERSE AUDIO — areverse in one pass. No parameters beyond format;
 * the module exists as its own surface per the suite spec.
 */

import { useState } from "react";
import { Rewind } from "lucide-react";
import { AudioWorkbench } from "@/components/audio/audio-workbench";
import { ParamPanel } from "@/components/audio/param-controls";
import { useMediaJob } from "@/hooks/use-media-job";
import { reverseFilters } from "@/lib/audio/filters";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";

export function ReverseAudio() {
  const job = useMediaJob();
  const { busy, outputs, run, reset } = job;
  const [file, setFile] = useState<File | null>(null);

  const start = async ({ format, outputArgs }: { format: string; outputArgs: string[] }) => {
    if (!file) return;
    const inputPath = `input.${extOf(file.name) || "mp3"}`;
    const buffer = new Uint8Array(await file.arrayBuffer());
    await run({
      write: [{ path: inputPath, data: buffer }],
      passes: [
        {
          exec: [
            "-i", inputPath,
            "-af", reverseFilters().join(","),
            ...outputArgs,
            `output.${format}`,
          ],
          label: "Reversing waveform",
        },
      ],
      read: [
        {
          path: `output.${format}`,
          mime: mimeFor(format),
          name: `${baseName(file.name)}-reversed.${format}`,
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
      runLabel="REVERSE TRACK"
      job={job}
      output={outputs[0] ?? null}
      badge="reversed"
      note="Hidden messages, beat-flip sampling, or plain curiosity. Very long files buffer entirely in memory during the flip."
      runIcon={<Rewind className="size-4" />}
      controls={
        <ParamPanel title="operation">
          <p className="font-mono text-[11px] md:text-xs lg:text-[13px] leading-relaxed text-muted-foreground">
            The entire waveform is mirrored back-to-front — every transient,
            every reverb tail. The output keeps the source channels and
            container metadata is rebuilt fresh.
          </p>
        </ParamPanel>
      }
    />
  );
}
