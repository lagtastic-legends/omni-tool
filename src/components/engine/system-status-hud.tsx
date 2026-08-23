"use client";

/**
 * Live capability probes — verifies the Phase 1 environment is sane:
 * cross-origin isolation, SharedArrayBuffer, workers, WASM, plus
 * forward-looking checks for Phase 5 (MediaRecorder / IndexedDB).
 */

import { motion } from "framer-motion";
import {
  Database,
  Hexagon,
  Layers,
  Mic,
  ShieldCheck,
  SquareCode,
} from "lucide-react";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";

export function SystemStatusHUD() {
  const { capabilities } = useFFmpegEngine();

  const items = [
    {
      icon: ShieldCheck,
      name: "Cross-Origin Isolation",
      ok: capabilities.crossOriginIsolated,
      hint: "COOP + COEP headers via next.config.ts",
    },
    {
      icon: Layers,
      name: "SharedArrayBuffer",
      ok: capabilities.sharedArrayBuffer,
      hint: "Unlocks MT WASM cores",
    },
    {
      icon: SquareCode,
      name: "WebAssembly",
      ok: capabilities.wasm,
      hint: "FFmpeg execution layer",
    },
    {
      icon: Hexagon,
      name: "Web Workers",
      ok: capabilities.webWorker,
      hint: "Off-main-thread engine",
    },
    {
      icon: Mic,
      name: "MediaRecorder",
      ok: capabilities.mediaRecorder,
      hint: "Studio Recorder · phase 5",
    },
    {
      icon: Database,
      name: "IndexedDB",
      ok: capabilities.indexedDB,
      hint: "File Vault · phase 5",
    },
  ];

  return (
    <section aria-labelledby="hud-heading" className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h3
          id="hud-heading"
          className="font-display text-sm font-bold uppercase tracking-[0.28em] text-foreground/90"
        >
          System Integrity
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          runtime probes
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {items.map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i, duration: 0.45, ease: "easeOut" }}
            className="panel-hud group rounded-xl p-3.5 transition-colors hover:border-primary/40"
          >
            <div className="flex items-start justify-between">
              <item.icon
                className={`size-4.5 transition-colors ${
                  item.ok
                    ? "text-neon group-hover:text-primary"
                    : "text-muted-foreground/50"
                }`}
                strokeWidth={1.75}
              />
              <span
                className={`rounded-full px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.14em] ${
                  item.ok
                    ? "bg-pulse/10 text-pulse"
                    : "bg-muted text-muted-foreground/70"
                }`}
              >
                {item.ok ? "active" : "n/a"}
              </span>
            </div>
            <p className="mt-2.5 font-mono text-[11px] font-medium leading-snug text-foreground/85">
              {item.name}
            </p>
            <p className="mt-1 font-mono text-[9px] leading-snug text-muted-foreground/80">
              {item.hint}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
