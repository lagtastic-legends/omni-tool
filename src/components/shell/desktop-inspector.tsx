"use client";

import { useState } from "react";
import { ShieldCheck, Cpu, HardDrive, Terminal, Zap, ChevronRight, ChevronLeft } from "lucide-react";
import { StdoutConsole } from "@/components/telemetry/stdout-console";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useHaptics } from "@/hooks/use-haptics";

export function DesktopInspector() {
  const [collapsed, setCollapsed] = useState(false);
  const { view } = useNavStore();
  const haptics = useHaptics();

  if (collapsed) {
    return (
      <div className="hidden xl:flex flex-col border-l border-border/80 bg-card/40 p-2 select-none items-center">
        <button
          onClick={() => {
            haptics.light();
            setCollapsed(false);
          }}
          className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-card/70 text-muted-foreground hover:border-primary hover:text-foreground"
          title="Expand Live Telemetry Inspector"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="mt-4 flex flex-col items-center gap-2 font-mono text-[9px] text-muted-foreground [writing-mode:vertical-rl] tracking-widest uppercase">
          <Terminal className="size-3.5 text-primary mb-1" />
          <span>TELEMETRY · STDOUT</span>
        </div>
      </div>
    );
  }

  return (
    <aside className="hidden xl:flex w-80 shrink-0 flex-col border-l border-border/80 bg-card/50 backdrop-blur-md p-3 space-y-3 select-none overflow-y-auto">
      {/* Inspector Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded bg-primary/20 text-primary border border-primary/40">
            <Terminal className="size-3.5" />
          </div>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
            Telemetry Inspector
          </span>
        </div>

        <button
          onClick={() => {
            haptics.light();
            setCollapsed(true);
          }}
          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          title="Collapse inspector"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Live Stdout Daemon Console */}
      <div className="flex-1">
        <StdoutConsole
          title="omni-wasm-daemon.stdout"
          maxHeight="320px"
        />
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
