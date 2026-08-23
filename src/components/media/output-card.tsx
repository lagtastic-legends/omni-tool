"use client";

/**
 * OutputCard — renders a finished job output: inline player, file stats,
 * download action and optional badges (e.g. compression savings).
 */

import { motion } from "framer-motion";
import { Download, FileAudio, FileImage, FileVideo, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { formatBytes } from "@/lib/format";
import type { JobOutput } from "@/hooks/use-media-job";

interface OutputCardProps {
  output: JobOutput;
  /** Extra row under the player (savings stats, notes, etc). */
  extra?: ReactNode;
  /** Compact badge, e.g. "−72% smaller". */
  badge?: string;
  badgeTone?: "pulse" | "neon" | "plasma";
}

const TONE: Record<NonNullable<OutputCardProps["badgeTone"]>, string> = {
  pulse: "border-pulse/40 bg-pulse/10 text-pulse",
  neon: "border-neon/40 bg-neon/10 text-neon",
  plasma: "border-plasma/40 bg-plasma/10 text-plasma",
};

export function OutputCard({ output, extra, badge, badgeTone = "pulse" }: OutputCardProps) {
  const isVideo = output.mime.startsWith("video/");
  const isAudio = output.mime.startsWith("audio/");
  const isImage = output.mime.startsWith("image/");

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="panel-hud space-y-3 rounded-xl p-4"
    >
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-pulse/30 bg-pulse/10">
          {isVideo ? (
            <FileVideo className="size-5 text-pulse" strokeWidth={1.75} />
          ) : isAudio ? (
            <FileAudio className="size-5 text-pulse" strokeWidth={1.75} />
          ) : (
            <FileImage className="size-5 text-pulse" strokeWidth={1.75} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-xs font-semibold text-foreground">
            {output.name}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {formatBytes(output.size)} · {output.mime}
          </p>
        </div>
        {badge && (
          <span
            className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold ${TONE[badgeTone]}`}
          >
            <Sparkles className="size-3" />
            {badge}
          </span>
        )}
      </div>

      {isVideo && (
        <video
          src={output.url}
          controls
          playsInline
          className="max-h-72 w-full rounded-lg border border-border/50 bg-black"
        />
      )}
      {isAudio && <audio src={output.url} controls className="w-full" />}
      {isImage && (
         
        <img
          src={output.url}
          alt={output.name}
          className="max-h-72 w-full rounded-lg border border-border/50 bg-black object-contain"
        />
      )}

      {extra}

      <a
        href={output.url}
        download={output.name}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-pulse/40 bg-pulse/15 font-display text-xs font-bold tracking-[0.18em] text-pulse transition-colors hover:bg-pulse/25"
      >
        <Download className="size-4" />
        SAVE TO DEVICE
      </a>
    </motion.div>
  );
}
