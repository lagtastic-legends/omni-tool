"use client";

/**
 * OutputCard — renders a finished job output: inline player, file stats,
 * download action and optional badges (e.g. compression savings).
 */

import { motion } from "framer-motion";
import { Check, Database, Download, FileAudio, FileImage, FileText, FileVideo, Sparkles, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { formatBytes } from "@/lib/format";
import { useVault } from "@/lib/vault/vault-context";
import type { JobOutput } from "@/hooks/use-media-job";

interface OutputCardProps {
  output: JobOutput;
  /** Extra row under the player (savings stats, notes, etc). */
  extra?: ReactNode;
  /** Compact badge, e.g. "−72% smaller". */
  badge?: string;
  badgeTone?: "pulse" | "neon" | "plasma";
  /** Callback to dismiss/clear the output preview. */
  onClear?: () => void;
}

const TONE: Record<NonNullable<OutputCardProps["badgeTone"]>, string> = {
  pulse: "border-pulse/40 bg-pulse/10 text-pulse",
  neon: "border-neon/40 bg-neon/10 text-neon",
  plasma: "border-plasma/40 bg-plasma/10 text-plasma",
};

export function OutputCard({ output, extra, badge, badgeTone = "pulse", onClear }: OutputCardProps) {
  const { save } = useVault();
  const [vaultState, setVaultState] = useState<"idle" | "saved">("idle");

  const saveToVault = async () => {
    const item = await save({
      name: output.name,
      blob: output.blob,
      mime: output.mime,
      size: output.size,
    });
    if (item) setVaultState("saved");
  };

  const isVideo = output.mime.startsWith("video/");
  const isAudio = output.mime.startsWith("audio/");
  const isPdf = output.mime === "application/pdf";
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
          ) : isPdf ? (
            <FileText className="size-5 text-pulse" strokeWidth={1.75} />
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
        {onClear && (
          <button
            onClick={onClear}
            title="Remove preview"
            aria-label="Remove preview"
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/60 bg-card/40 text-muted-foreground transition-colors hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-300"
          >
            <X className="size-4" />
          </button>
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
      {isAudio && (
        <div className="rounded-lg border border-border/50 bg-black/40 p-3">
          <audio src={output.url} controls preload="metadata" className="w-full" />
        </div>
      )}
      {isImage && (
         
        <img
          src={output.url}
          alt={output.name}
          className="max-h-72 w-full rounded-lg border border-border/50 bg-black object-contain"
        />
      )}

      {extra}

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button
          onClick={() => void import("@/lib/native-save").then(m => m.nativeSave(output.blob, output.name))}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-pulse/40 bg-pulse/15 font-display text-xs font-bold tracking-[0.18em] text-pulse transition-colors hover:bg-pulse/25"
        >
          <Download className="size-4" />
          SAVE TO DEVICE
        </button>
        <motion.button
          onClick={() => void saveToVault()}
          disabled={vaultState === "saved"}
          whileTap={vaultState === "saved" ? undefined : { scale: 0.96 }}
          aria-label={vaultState === "saved" ? "Saved to vault" : "Save to vault"}
          title={vaultState === "saved" ? "Stored in the File Vault" : "Store in the on-device File Vault"}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 font-display text-xs font-bold tracking-[0.18em] transition-colors ${
            vaultState === "saved"
              ? "border-pulse/40 bg-pulse/10 text-pulse"
              : "border-border/70 bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-primary"
          }`}
        >
          {vaultState === "saved" ? (
            <Check className="size-4" strokeWidth={3} />
          ) : (
            <Database className="size-4" />
          )}
          <span className="hidden sm:inline">
            {vaultState === "saved" ? "VAULTED" : "VAULT"}
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}
