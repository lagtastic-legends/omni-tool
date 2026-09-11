"use client";

import { ShieldCheck, Terminal, ChevronRight, ChevronLeft, Maximize2, Minimize2 } from "lucide-react";
import { StdoutConsole } from "@/components/telemetry/stdout-console";
import { useWorkstationStore } from "@/hooks/useWorkstationStore";
import { useStdoutTelemetry } from "@/hooks/useStdoutTelemetry";
import { useHaptics } from "@/hooks/use-haptics";

export function DesktopInspector() {
  const { inspectorCollapsed, toggleInspector, inspectorWidth, setInspectorWidth } =
    useWorkstationStore();
  const { heapUsedMb, simdThreads } = useStdoutTelemetry();
  const haptics = useHaptics();

  // Collapsed Minimal Vertical Dock
  if (inspectorCollapsed) {
    return (
      <div className="hidden xl:flex flex-col border-l border-border/80 bg-card/50 backdrop-blur-xl p-2 select-none items-center justify-between shrink-0 relative z-30">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => {
              haptics.light();
              toggleInspector();
            }}
            className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-card/80 text-muted-foreground hover:border-primary hover:text-foreground active:scale-95 transition-all shadow-sm"
            title="Expand Live Telemetry Inspector (])"
          >
            <ChevronLeft className="size-4" />
          </button>

          {/* Vertical Title & Live Pip */}
          <div className="mt-4 flex flex-col items-center gap-2 font-mono text-[9px] text-muted-foreground [writing-mode:vertical-rl] tracking-widest uppercase">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="size-1.5 rounded-full bg-chart-5 animate-ping" />
              <Terminal className="size-3.5 text-primary" />
            </div>
            <span>TELEMETRY · STDOUT</span>
          </div>
        </div>

        {/* Bottom Collapsed Telemetry Pill */}
        <div className="flex flex-col items-center gap-1 font-mono text-[8.5px] text-muted-foreground">
          <span className="rounded border border-border/60 bg-background/60 px-1 py-0.5 font-bold text-foreground">
            {heapUsedMb}M
          </span>
          <span className="text-[8px] opacity-70">{simdThreads}T</span>
        </div>
      </div>
    );
  }

  const isWide = inspectorWidth === "wide";

  return (
    <aside
      className={`hidden xl:flex shrink-0 flex-col border-l border-border/80 bg-card/50 backdrop-blur-xl p-3 space-y-3 select-none overflow-y-auto transition-all duration-300 relative z-30 ${
        isWide ? "w-96" : "w-80"
      }`}
    >
      {/* Inspector Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded bg-primary/20 text-primary border border-primary/40 shadow-sm">
            <Terminal className="size-3.5" />
          </div>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
            Telemetry Inspector
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Width Preset Toggle */}
          <button
            onClick={() => {
              haptics.light();
              setInspectorWidth(isWide ? "standard" : "wide");
            }}
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title={isWide ? "Compact Width (320px)" : "Expanded Width (384px)"}
          >
            {isWide ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>

          {/* Collapse Inspector */}
          <button
            onClick={() => {
              haptics.light();
              toggleInspector();
            }}
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="Collapse inspector (])"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Live Stdout Daemon Multi-Tab Console */}
      <div className="flex-1 min-h-[300px]">
        <StdoutConsole title="omni-wasm-daemon.stdout" maxHeight="340px" />
      </div>

      {/* Client-Side Isolation Assurance Card */}
      <div className="rounded-tactile border border-border/70 bg-card/80 p-3 text-xs shadow-sm font-mono space-y-2">
        <div className="flex items-center gap-2 text-chart-5 font-semibold text-[11px]">
          <ShieldCheck className="size-4 shrink-0" />
          <span>100% Client-Side Isolation</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-normal font-sans">
          All media transcoding, audio DSP filtering, and PDF crypt operations are executed in your browser's private WebAssembly memory sandbox.
        </p>

        <div className="grid grid-cols-2 gap-1.5 pt-1 text-[9px] text-muted-foreground border-t border-border/40">
          <div>
            <span className="block opacity-70">EXECUTION</span>
            <span className="font-bold text-foreground">PTHREADS SIMD</span>
          </div>
          <div>
            <span className="block opacity-70">NETWORK EGRESS</span>
            <span className="font-bold text-chart-5">0 BYTES (OFFLINE)</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
