"use client";

/**
 * AppShell — top-level composition: ambient background, top bar, and the
 * animated view switcher between the Dashboard and individual tool views.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Compass, Database, Layers, Loader2, Scissors, Sparkles, Video } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import { AuthGateway } from "@/components/auth/auth-gateway";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AuroraBackground } from "@/components/shell/aurora-background";
import { AppFooter } from "@/components/shell/footer";
import { TopBar } from "@/components/shell/top-bar";
import { StickyMobileCta } from "@/components/shell/sticky-mobile-cta";
import { FloatingToolbar } from "@/components/ui/floating-toolbar";
import AskOmni from "@/components/AskOmni";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { ToolShell } from "@/components/tools/tool-shell";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useAiStore } from "@/store/useAiStore";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { BackConfirmDialog } from "@/components/navigation/back-confirm-dialog";
import { DesktopSidebar } from "@/components/shell/desktop-sidebar";
import { DesktopInspector } from "@/components/shell/desktop-inspector";

/* Dynamic code-split tool modules to control memory & isolate thread workloads */
const MediaConverter = lazy(() => import("@/components/tools/media-converter").then((m) => ({ default: m.MediaConverter })));
const VideoCompressor = lazy(() => import("@/components/tools/video-compressor").then((m) => ({ default: m.VideoCompressor })));
const VideoMute = lazy(() => import("@/components/tools/video-mute").then((m) => ({ default: m.VideoMute })));
const GifMaker = lazy(() => import("@/components/tools/gif-maker").then((m) => ({ default: m.GifMaker })));
const AudioEditor = lazy(() => import("@/components/tools/audio-editor").then((m) => ({ default: m.AudioEditor })));
const SlowedReverb = lazy(() => import("@/components/tools/slowed-reverb").then((m) => ({ default: m.SlowedReverb })));
const BassBooster = lazy(() => import("@/components/tools/bass-booster").then((m) => ({ default: m.BassBooster })));
const Spatial8D = lazy(() => import("@/components/tools/spatial-8d").then((m) => ({ default: m.Spatial8D })));
const EqualizerTool = lazy(() => import("@/components/tools/equalizer-tool").then((m) => ({ default: m.EqualizerTool })));
const ReverseAudio = lazy(() => import("@/components/tools/reverse-audio").then((m) => ({ default: m.ReverseAudio })));
const StereoPanner = lazy(() => import("@/components/tools/stereo-panner").then((m) => ({ default: m.StereoPanner })));
const VolumeChanger = lazy(() => import("@/components/tools/volume-changer").then((m) => ({ default: m.VolumeChanger })));
const RingtoneMaker = lazy(() => import("@/components/tools/ringtone-maker").then((m) => ({ default: m.RingtoneMaker })));
const ImageToPdf = lazy(() => import("@/components/tools/image-to-pdf").then((m) => ({ default: m.ImageToPdf })));
const TextToPdf = lazy(() => import("@/components/tools/text-to-pdf").then((m) => ({ default: m.TextToPdf })));
const LockPdf = lazy(() => import("@/components/tools/lock-pdf").then((m) => ({ default: m.LockPdf })));
const ScanToPdf = lazy(() => import("@/components/tools/scan-to-pdf").then((m) => ({ default: m.ScanToPdf })));
const PaletteExtractor = lazy(() => import("@/components/tools/palette-extractor").then((m) => ({ default: m.PaletteExtractor })));
const AsciiGenerator = lazy(() => import("@/components/tools/ascii-generator").then((m) => ({ default: m.AsciiGenerator })));
const WatermarkRemover = lazy(() => import("@/components/tools/watermark-remover").then((m) => ({ default: m.WatermarkRemover })));
const VaultView = lazy(() => import("@/components/vault/vault-view").then((m) => ({ default: m.VaultView })));
const StudioRecorder = lazy(() => import("@/components/tools/studio-recorder").then((m) => ({ default: m.StudioRecorder })));
const QrStudio = lazy(() => import("@/components/tools/qr-studio").then((m) => ({ default: m.QrStudio })));
const UnifiedAudioStudio = lazy(() => import("@/components/audio/UnifiedAudioStudio").then((m) => ({ default: m.UnifiedAudioStudio })));

const AudioDspTool = () => <UnifiedAudioStudio initialToolId="spatial-8d" />;
const VocalRemoverTool = () => <UnifiedAudioStudio initialToolId="vocal-remover" />;
const ReverbTool = () => <UnifiedAudioStudio initialToolId="reverb" />;
const AutoPannerTool = () => <UnifiedAudioStudio initialToolId="auto-panner" />;
const NoiseReducerTool = () => <UnifiedAudioStudio initialToolId="noise-reducer" />;
const PitchShifterTool = () => <UnifiedAudioStudio initialToolId="pitch-shifter" />;
const TempoChangerTool = () => <UnifiedAudioStudio initialToolId="tempo-changer" />;
const Spatial8DStudioTool = () => <UnifiedAudioStudio initialToolId="spatial-8d" />;
const BassBoosterStudioTool = () => <UnifiedAudioStudio initialToolId="bass-booster" />;
const EqualizerStudioTool = () => <UnifiedAudioStudio initialToolId="equalizer" />;
const ReverseAudioStudioTool = () => <UnifiedAudioStudio initialToolId="reverse-audio" />;
const StereoPannerStudioTool = () => <UnifiedAudioStudio initialToolId="stereo-panner" />;
const VolumeChangerStudioTool = () => <UnifiedAudioStudio initialToolId="volume-changer" />;
const TrimmerStudioTool = () => <UnifiedAudioStudio initialToolId="trimmer" />;

function ToolSkeleton() {
  return (
    <div className="panel-hud scanlines flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-tactile border border-border/80 p-10 text-center shadow-tactile animate-pulse">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="font-display text-xs font-bold tracking-[0.2em] text-foreground/80">
        MOUNTING MODULE WORKSPACE…
      </p>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Zero cloud latency · Allocating isolated sandbox memory
      </p>
    </div>
  );
}

/** tool id → module implementation (grows every phase) */
const TOOL_COMPONENTS: Record<string, React.ComponentType> = {
  "video-converter": MediaConverter,
  "video-compressor": VideoCompressor,
  "video-mute": VideoMute,
  "gif-maker": GifMaker,
  "audio-editor": AudioEditor,
  "slowed-reverb": SlowedReverb,
  "bass-booster": BassBoosterStudioTool,
  "spatial-8d": Spatial8DStudioTool,
  "equalizer": EqualizerStudioTool,
  "reverse-audio": ReverseAudioStudioTool,
  "stereo-panner": StereoPannerStudioTool,
  "volume-changer": VolumeChangerStudioTool,
  "trimmer": TrimmerStudioTool,
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
  "audio-dsp": AudioDspTool,
  "vocal-remover": VocalRemoverTool,
  "reverb": ReverbTool,
  "auto-panner": AutoPannerTool,
  "noise-reducer": NoiseReducerTool,
  "pitch-shifter": PitchShifterTool,
  "tempo-changer": TempoChangerTool,
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
      <Suspense fallback={<ToolSkeleton />}>
        <Tool />
      </Suspense>
    </ToolShell>
  );
}

export function AppShell() {
  useEffect(() => {
    let capSub: Promise<{ remove: () => Promise<void> }> | null = null;
    if (Capacitor.isNativePlatform()) {
      capSub = CapacitorApp.addListener("backButton", () => {
        void useNavStore.getState().handleBack();
      });
    }

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      void useNavStore.getState().handleBack().then(() => {
        const activeView = useNavStore.getState().view;
        if (typeof window !== "undefined") {
          const expectedHash = activeView === "dashboard" ? "" : `#${activeView}`;
          if (window.location.hash !== expectedHash) {
            try {
              window.history.pushState({ view: activeView }, "", window.location.pathname + expectedHash);
            } catch {
              // ignore
            }
          }
        }
      });
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      if (capSub) {
        capSub.then((s) => s.remove()).catch(() => {});
      }
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const { view, navigate, reset } = useNavStore();
  const { isOpen: isAiOpen, toggleOpen: toggleAi } = useAiStore();

  useEffect(() => {
    if (isAiOpen) {
      return useNavStore.getState().registerOverlay("ai-chat", () => {
        useAiStore.getState().setIsOpen(false);
        return true;
      });
    }
  }, [isAiOpen]);

  const floatingActions = [
    {
      id: "ai",
      label: "Ask Omni AI",
      icon: Sparkles,
      accentClass: "text-neon border-neon/50 bg-neon/15 hover:bg-neon/25 shadow-[0_0_12px_rgba(0,240,255,0.3)]",
      onClick: () => toggleAi(),
    },
    { id: "matrix", label: "Tool Matrix", icon: Layers, onClick: () => reset() },
    { id: "converter", label: "Media Studio", icon: Scissors, onClick: () => navigate("video-converter") },
    { id: "vault", label: "File Vault", icon: Database, onClick: () => navigate("vault") },
    { id: "recorder", label: "Studio Recorder", icon: Video, onClick: () => navigate("studio-recorder") },
  ];

  return (
    <div className="relative flex min-h-screen flex-col">
      <AuroraBackground />
      <TopBar />
      <AskOmni />

      <div className="flex flex-1 w-full overflow-hidden">
        <DesktopSidebar />

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 py-6 sm:px-6 sm:py-10 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 14, scale: 0.992 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.995 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{ transform: "translate3d(0, 0, 0)", backfaceVisibility: "hidden" }}
              className="flex-1 will-change-[transform,opacity]"
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

        <DesktopInspector />
      </div>

      {!isAiOpen && <FloatingToolbar actions={floatingActions} />}
      <StickyMobileCta />
      <BackConfirmDialog />
      <AppFooter />
    </div>
  );
}

