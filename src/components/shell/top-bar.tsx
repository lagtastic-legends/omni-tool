"use client";

import { motion } from "framer-motion";
import { Hexagon, Zap } from "lucide-react";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";
import type { EngineState } from "@/types/omni";

const STATE_META: Record<
  EngineState,
  { label: string; dotClass: string; textClass: string }
> = {
  idle: {
    label: "ENGINE STANDBY",
    dotClass: "bg-muted-foreground",
    textClass: "text-muted-foreground",
  },
  loading: {
    label: "ENGINE BOOTING",
    dotClass: "bg-amber-400",
    textClass: "text-amber-300",
  },
  ready: {
    label: "ENGINE ONLINE",
    dotClass: "bg-emerald-400",
    textClass: "text-emerald-300",
  },
  error: {
    label: "ENGINE FAULT",
    dotClass: "bg-red-400",
    textClass: "text-red-300",
  },
};

export function TopBar() {
  const { state, capabilities } = useFFmpegEngine();
  const meta = STATE_META[state];

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 90 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="relative grid size-10 place-items-center rounded-xl border border-primary/40 bg-primary/10 glow-box-violet"
          >
            <Hexagon className="size-5 text-primary" strokeWidth={1.75} />
            <Zap className="absolute size-3 text-neon" fill="currentColor" />
          </motion.div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-sm font-bold tracking-[0.32em] text-foreground">
              OMNI&nbsp;TOOL
            </span>
            <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              client-side media suite
            </span>
          </div>
        </div>

        {/* Status cluster */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 md:flex"
            title={
              capabilities.crossOriginIsolated
                ? "Cross-origin isolation is active — SharedArrayBuffer available"
                : "Not isolated — single-threaded WASM core in use (still fully functional)"
            }
          >
            <span
              className={`size-1.5 rounded-full ${
                capabilities.crossOriginIsolated
                  ? "bg-neon shadow-[0_0_8px_oklch(0.82_0.12_205/0.9)]"
                  : "bg-muted-foreground/60"
              }`}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {capabilities.crossOriginIsolated ? "COI locked" : "COI open"}
            </span>
          </div>

          <div
            className="flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1.5"
            role="status"
            aria-live="polite"
          >
            <motion.span
              animate={
                state === "loading" ? { scale: [1, 1.45, 1], opacity: [1, 0.6, 1] } : {}
              }
              transition={
                state === "loading"
                  ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
                  : undefined
              }
              className={`size-1.5 rounded-full ${meta.dotClass} ${
                state === "ready"
                  ? "shadow-[0_0_10px_oklch(0.75_0.18_162/0.9)]"
                  : ""
              }`}
            />
            <span
              className={`font-mono text-[10px] font-medium uppercase tracking-[0.18em] ${meta.textClass}`}
            >
              {meta.label}
            </span>
          </div>

          <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-primary sm:inline-block">
            v0.3 · PHASE 3/7
          </span>
        </div>
      </div>
    </motion.header>
  );
}
