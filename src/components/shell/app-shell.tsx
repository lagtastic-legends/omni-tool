"use client";

/**
 * AppShell — top-level composition: ambient background, top bar, and the
 * animated view switcher between the Dashboard and individual tool views.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Compass } from "lucide-react";
import { AuroraBackground } from "@/components/shell/aurora-background";
import { AppFooter } from "@/components/shell/footer";
import { TopBar } from "@/components/shell/top-bar";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { GifMaker } from "@/components/tools/gif-maker";
import { MediaConverter } from "@/components/tools/media-converter";
import { ToolShell } from "@/components/tools/tool-shell";
import { VideoCompressor } from "@/components/tools/video-compressor";
import { VideoMute } from "@/components/tools/video-mute";
import { useNavStore } from "@/lib/navigation/nav-store";

/** tool id → module implementation (grows every phase) */
const TOOL_COMPONENTS: Record<string, React.ComponentType> = {
  "video-converter": MediaConverter,
  "video-compressor": VideoCompressor,
  "video-mute": VideoMute,
  "gif-maker": GifMaker,
};

function ToolView({ toolId }: { toolId: string }) {
  const resetNav = useNavStore((s) => s.reset);
  const Tool = TOOL_COMPONENTS[toolId];
  if (!Tool) {
    return (
      <div className="panel-hud flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
        <Compass className="size-8 text-muted-foreground" />
        <p className="font-display text-sm font-bold text-foreground">
          MODULE NOT YET DEPLOYED
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">
          This module ships in a later phase of the build sequence.
        </p>
        <button
          onClick={resetNav}
          className="mt-2 min-h-11 rounded-xl border border-border/70 bg-card/50 px-5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:border-primary/40 hover:text-foreground"
        >
          back to dashboard
        </button>
      </div>
    );
  }
  return (
    <ToolShell toolId={toolId}>
      <Tool />
    </ToolShell>
  );
}

export function AppShell() {
  const view = useNavStore((s) => s.view);

  return (
    <div className="relative flex min-h-screen flex-col">
      <AuroraBackground />
      <TopBar />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1"
          >
            {view === "dashboard" ? <DashboardView /> : <ToolView toolId={view} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <AppFooter />
    </div>
  );
}
