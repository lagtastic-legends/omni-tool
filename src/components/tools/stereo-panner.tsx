"use client";

/**
 * STEREO PANNER — stereotools balance with a center-snap chip.
 */

import { useState } from "react";
import { AudioLines } from "lucide-react";
import { AudioWorkbench } from "@/components/audio/audio-workbench";
import { ParamPanel, ParamSlider } from "@/components/audio/param-controls";
import { useMediaJob } from "@/hooks/use-media-job";
import { panFilters } from "@/lib/audio/filters";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";

export function StereoPanner() {
  const job = useMediaJob();
  const { busy, outputs, run, reset } = job;

  const [file, setFile] = useState<File | null>(null);
  const [balance, setBalance] = useState(0);

  const start = async ({ format, outputArgs }: { format: string; outputArgs: string[] }) => {
    if (!file) return;
    const filters = panFilters({ balance });
    const inputPath = `input.${extOf(file.name) || "mp3"}`;
    const buffer = new Uint8Array(await file.arrayBuffer());
    await run({
      write: [{ path: inputPath, data: buffer }],
      passes: [
        {
          exec: ["-i", inputPath, "-af", filters.join(","), ...outputArgs, `output.${format}`],
          label: `Panning ${balance === 0 ? "center" : balance < 0 ? `${Math.round(-balance * 100)}% left` : `${Math.round(balance * 100)}% right`}`,
        },
      ],
      read: [
        {
          path: `output.${format}`,
          mime: mimeFor(format),
          name: `${baseName(file.name)}-panned.${format}`,
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
      runLabel="APPLY PANNING"
      runDisabled={balance === 0}
      job={job}
      output={outputs[0] ?? null}
      badge="panned"
      note="Mono sources are upmixed to stereo first so the balance control always has both channels to work with."
      runIcon={<AudioLines className="size-4" />}
      controls={
        <ParamPanel title="image position">
          <ParamSlider
            label="Balance"
            value={balance}
            min={-1}
            max={1}
            step={0.05}
            onChange={setBalance}
            disabled={busy}
            display={(v) =>
              v === 0 ? "center" : v < 0 ? `L${Math.round(-v * 100)}` : `R${Math.round(v * 100)}`
            }
            hintLeft="full left"
            hintRight="full right"
          />
          <button
            onClick={() => setBalance(0)}
            disabled={busy}
            className="w-fit rounded-full border border-border/70 bg-background/50 px-3 py-1.5 font-mono text-[10px] md:text-xs lg:text-[13px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-40"
          >
            snap to center
          </button>
        </ParamPanel>
      }
    />
  );
}
