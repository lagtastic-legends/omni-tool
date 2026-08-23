"use client";

/**
 * DashboardView — the hub: hero, engine boot console, system integrity
 * probes and the tool matrix.
 */

import { motion } from "framer-motion";
import { EngineBootPanel } from "@/components/engine/engine-boot-panel";
import { SystemStatusHUD } from "@/components/engine/system-status-hud";
import { ToolGrid } from "@/components/dashboard/tool-grid";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function DashboardView() {
  return (
    <div className="flex flex-col gap-10">
      {/* hero ------------------------------------------------------------ */}
      <section className="space-y-5 text-center">
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.05}
          className="mx-auto w-fit rounded-full border border-border/70 bg-card/50 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground backdrop-blur"
        >
          webassembly · zero-upload · cross-platform
        </motion.p>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.15}
          className="font-display text-4xl font-black uppercase leading-[1.05] tracking-tight text-foreground sm:text-6xl"
        >
          One toolkit.
          <br />
          <span className="bg-gradient-to-r from-primary via-plasma to-neon bg-clip-text text-transparent">
            Total control.
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.25}
          className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base"
        >
          Convert video, engineer audio, forge documents and capture your
          screen — all processed locally by a WebAssembly engine that never
          ships a single byte to a server.
        </motion.p>
      </section>

      {/* engine boot ----------------------------------------------------- */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.35}>
        <EngineBootPanel />
      </motion.div>

      {/* system probes ---------------------------------------------------- */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.45}>
        <SystemStatusHUD />
      </motion.div>

      {/* tool matrix ------------------------------------------------------ */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0.55}>
        <ToolGrid />
      </motion.div>
    </div>
  );
}
