"use client";

/**
 * AppShell — top-level composition: ambient background, top bar, and the
 * animated view switcher between the Dashboard and individual tool views.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Compass } from "lucide-react";
import { AuthGateway } from "@/components/auth/auth-gateway";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AuroraBackground } from "@/components/shell/aurora-background";
import { AppFooter } from "@/components/shell/footer";
import { TopBar } from "@/components/shell/top-bar";
import { StickyMobileCta } from "@/components/shell/sticky-mobile-cta";
import AskOmni from "@/components/AskOmni";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { GifMaker } from "@/components/tools/gif-maker";
import { AudioEditor } from "@/components/tools/audio-editor";
import { BassBooster } from "@/components/tools/bass-booster";
import { EqualizerTool } from "@/components/tools/equalizer-tool";
import { ImageToPdf } from "@/components/tools/image-to-pdf";
import { LockPdf } from "@/components/tools/lock-pdf";
import { MediaConverter } from "@/components/tools/media-converter";
import { ReverseAudio } from "@/components/tools/reverse-audio";
import { RingtoneMaker } from "@/components/tools/ringtone-maker";
import { ScanToPdf } from "@/components/tools/scan-to-pdf";
import { SlowedReverb } from "@/components/tools/slowed-reverb";
import { Spatial8D } from "@/components/tools/spatial-8d";
import { StereoPanner } from "@/components/tools/stereo-panner";
import { StudioRecorder } from "@/components/tools/studio-recorder";
import { TextToPdf } from "@/components/tools/text-to-pdf";
import { PaletteExtractor } from "@/components/tools/palette-extractor";
import { AsciiGenerator } from "@/components/tools/ascii-generator";
import { WatermarkRemover } from "@/components/tools/watermark-remover";
import { QrStudio } from "@/components/tools/qr-studio";
import { ToolShell } from "@/components/tools/tool-shell";
import { VaultView } from "@/components/vault/vault-view";
import { VideoCompressor } from "@/components/tools/video-compressor";
import { VideoMute } from "@/components/tools/video-mute";
import { VolumeChanger } from "@/components/tools/volume-changer";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

/** tool id → module implementation (grows every phase) */
const TOOL_COMPONENTS: Record<string, React.ComponentType> = {
  "video-converter": MediaConverter,
  "video-compressor": VideoCompressor,
  "video-mute": VideoMute,
  "gif-maker": GifMaker,
  "audio-editor": AudioEditor,
  "slowed-reverb": SlowedReverb,
  "bass-booster": BassBooster,
  "spatial-8d": Spatial8D,
  "equalizer": EqualizerTool,
  "reverse-audio": ReverseAudio,
  "stereo-panner": StereoPanner,
  "volume-changer": VolumeChanger,
  "ringtone-maker": RingtoneMaker,
  "image-to-pdf": ImageToPdf,
  "text-to-pdf": TextToPdf,
  "lock-pdf": LockPdf,
  "scan-to-pdf": ScanToPdf,
  "palette-extractor": PaletteExtractor,
  "ascii-generator": AsciiGenerator,
  "watermark-remover": WatermarkRemover,
  vault: VaultView,
  "studio-recorder": StudioRecorder,
  "qr-studio": QrStudio,
  "auth-gateway": AuthGateway,
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
          back
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
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = CapacitorApp.addListener("backButton", () => {
      if (useNavStore.getState().view !== "dashboard") {
        useNavStore.getState().reset();
      } else {
        CapacitorApp.exitApp();
      }
    });
    return () => {
      sub.then((s) => s.remove()).catch(() => {});
    };
  }, []);
  const view = useNavStore((s) => s.view);

  return (
    <div className="relative flex min-h-screen flex-col">
      <AuroraBackground />
      <TopBar />
      <AskOmni />

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
            {/* The Auth Gateway stays reachable above the security gate —
             * it hosts the setup instructions (open mode) and profile
             * management (signed in). Every other surface is guarded. */}
            {view === "auth-gateway" ? (
              <ToolShell toolId="auth-gateway">
                <AuthGateway />
              </ToolShell>
            ) : (
              <AuthGuard>
                {view === "dashboard" ? <DashboardView /> : <ToolView toolId={view} />}
              </AuthGuard>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <StickyMobileCta />
      <AppFooter />
    </div>
  );
}

