"use client";

/**
 * OMNI TOOL — Phase 1: Core Scaffolding & WASM Setup
 * ---------------------------------------------------
 * The entire suite lives on a single canvas ("/"). The engine provider is
 * mounted once here; every tool module (Phases 2–7) will consume it via
 * useFFmpeg() and render inside this shell through client-side view routing.
 */

import { motion } from "framer-motion";
import { AppFooter } from "@/components/shell/footer";
import { TopBar } from "@/components/shell/top-bar";
import { AuroraBackground } from "@/components/shell/aurora-background";
import { EngineBootPanel } from "@/components/engine/engine-boot-panel";
import { SystemStatusHUD } from "@/components/engine/system-status-hud";
import { ToolGrid } from "@/components/dashboard/tool-grid";
import { FFmpegEngineProvider } from "@/lib/ffmpeg/ffmpeg-context";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function Home() {
  return (
    <FFmpegEngineProvider>
      <div className="relative flex min-h-screen flex-col">
        <AuroraBackground />
        <TopBar />

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14">
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
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.35}
          >
            <EngineBootPanel />
          </motion.div>

          {/* system probes ---------------------------------------------------- */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.45}
          >
            <SystemStatusHUD />
          </motion.div>

          {/* tool matrix ------------------------------------------------------ */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0.55}
          >
            <ToolGrid />
          </motion.div>
        </main>

        <AppFooter />
      </div>
    </FFmpegEngineProvider>
  );
}
