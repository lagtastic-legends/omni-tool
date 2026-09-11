"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal, Cpu, Trash2, Copy, Sparkles, Activity, Check } from "lucide-react";
import { useStdoutTelemetry } from "@/hooks/useStdoutTelemetry";
import { useHaptics } from "@/hooks/use-haptics";

export function StdoutConsole({
  title = "ffmpeg-worker-daemon.stdout",
  maxHeight = "260px",
  compact = false,
}: {
  title?: string;
  maxHeight?: string;
  compact?: boolean;
}) {
  const { logs, heapUsedMb, heapMaxMb, simdThreads, isStreaming, flushHeap, benchmarkCpu, copyDiagnostics, clearLogs } =
    useStdoutTelemetry();
  const haptics = useHaptics();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [benchmarking, setBenchmarking] = useState(false);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleBenchmark = async () => {
    haptics.medium();
    setBenchmarking(true);
    try {
      await benchmarkCpu();
    } finally {
      setBenchmarking(false);
    }
  };

  const handleCopy = async () => {
    haptics.light();
    await copyDiagnostics();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFlush = () => {
    haptics.light();
    flushHeap();
  };

  const heapPct = Math.round((heapUsedMb / heapMaxMb) * 100);

  return (
    <div className="panel-hud scanlines flex flex-col rounded-tactile border border-border/80 bg-card/85 text-card-foreground shadow-tactile backdrop-blur-md overflow-hidden">
      {/* Console Header */}
      <div className="flex items-center justify-between border-b border-border/70 bg-secondary/40 px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-destructive/80" />
            <span className="size-2 rounded-full bg-chart-4/80" />
            <span className="size-2 rounded-full bg-chart-5/80" />
          </div>
          <span className="font-mono text-[11px] font-medium tracking-wide text-foreground/90">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px]">
          {isStreaming && (
            <span className="flex items-center gap-1 text-chart-5">
              <span className="size-1.5 animate-ping rounded-full bg-chart-5" />
              <span className="uppercase tracking-wider">LIVE</span>
            </span>
          )}
          <span className="rounded border border-border/60 bg-background/50 px-1.5 py-0.5 text-muted-foreground">
            {simdThreads} THREADS
          </span>
        </div>
      </div>

      {/* Hardware Telemetry Bar */}
      {!compact && (
        <div className="grid grid-cols-2 gap-2 border-b border-border/50 bg-background/40 px-3 py-1.5 font-mono text-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">HEAP BUFFER</span>
            <span className="font-semibold text-foreground">
              {heapUsedMb}MB / {heapMaxMb}MB ({heapPct}%)
            </span>
          </div>
          <div className="flex items-center justify-between pl-2 border-l border-border/40">
            <span className="text-muted-foreground">ISOLATION</span>
            <span className="font-semibold text-chart-5">COOP/COEP ACTIVE</span>
          </div>
        </div>
      )}

      {/* Terminal Output Area */}
      <div
        ref={scrollRef}
        style={{ maxHeight }}
        className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed select-text space-y-1 bg-background/70 scrollbar-none"
      >
        {logs.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground/60 italic">
            Console quiet. Ready for execution...
          </div>
        ) : (
          logs.map((line) => {
            let colorClass = "text-muted-foreground";
            if (line.type === "system") colorClass = "text-foreground font-semibold";
            if (line.type === "wasm") colorClass = "text-primary";
            if (line.type === "ffmpeg") colorClass = "text-chart-2";
            if (line.type === "audio") colorClass = "text-chart-5";
            if (line.type === "ok") colorClass = "text-chart-5 font-medium";
            if (line.type === "warn") colorClass = "text-chart-4";
            if (line.type === "error") colorClass = "text-destructive font-bold";

            return (
              <div key={line.id} className="flex items-start gap-2 break-all">
                <span className="shrink-0 text-muted-foreground/50 select-none">
                  [{line.time}]
                </span>
                <span className={colorClass}>{line.text}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Console Actions Toolbar */}
      <div className="flex items-center justify-between border-t border-border/70 bg-secondary/30 px-3 py-1.5 font-mono text-[10px]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleBenchmark}
            disabled={benchmarking}
            className="flex items-center gap-1 rounded border border-border/60 bg-card/60 px-2 py-1 text-muted-foreground hover:border-primary/50 hover:text-foreground active:scale-95 transition-all"
            title="Run SIMD AVX FLOPS stress test"
          >
            <Cpu className="size-3 text-primary" />
            <span>{benchmarking ? "TESTING..." : "BENCHMARK"}</span>
          </button>

          <button
            onClick={handleFlush}
            className="flex items-center gap-1 rounded border border-border/60 bg-card/60 px-2 py-1 text-muted-foreground hover:border-primary/50 hover:text-foreground active:scale-95 transition-all"
            title="Flush WASM memory heap"
          >
            <Activity className="size-3 text-chart-5" />
            <span>FLUSH HEAP</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded border border-border/60 bg-card/60 px-2 py-1 text-muted-foreground hover:border-primary/50 hover:text-foreground active:scale-95 transition-all"
            title="Copy diagnostic state as JSON"
          >
            {copied ? <Check className="size-3 text-chart-5" /> : <Copy className="size-3" />}
            <span>{copied ? "COPIED" : "JSON"}</span>
          </button>

          <button
            onClick={() => {
              haptics.light();
              clearLogs();
            }}
            className="flex items-center gap-1 rounded border border-border/60 bg-card/60 p-1 text-muted-foreground hover:border-destructive/50 hover:text-destructive active:scale-95 transition-all"
            title="Clear console"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
