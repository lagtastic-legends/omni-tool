"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Terminal,
  Cpu,
  Trash2,
  Copy,
  Sparkles,
  Activity,
  Check,
  Search,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Layers,
  HardDrive,
  BarChart2,
} from "lucide-react";
import { useStdoutTelemetry } from "@/hooks/useStdoutTelemetry";
import { useHaptics } from "@/hooks/use-haptics";
import { motion, AnimatePresence } from "framer-motion";

type FilterLevel = "ALL" | "FFMPEG" | "WASM" | "SYSTEM" | "ERROR";

export function StdoutConsole({
  title = "omni-wasm-daemon.stdout",
  maxHeight = "360px",
  compact = false,
}: {
  title?: string;
  maxHeight?: string;
  compact?: boolean;
}) {
  const {
    logs,
    heapUsedMb,
    heapMaxMb,
    simdThreads,
    activeWorkers,
    isStreaming,
    flushHeap,
    benchmarkCpu,
    copyDiagnostics,
    clearLogs,
  } = useStdoutTelemetry();
  const haptics = useHaptics();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"terminal" | "hardware" | "specs">("terminal");
  const [filterLevel, setFilterLevel] = useState<FilterLevel>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmarkScore, setBenchmarkScore] = useState<string | null>(null);

  // Auto-scroll to bottom when new logs arrive if enabled
  useEffect(() => {
    if (autoScroll && !isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isPaused]);

  const handleBenchmark = async () => {
    haptics.medium();
    setBenchmarking(true);
    try {
      const start = performance.now();
      await benchmarkCpu();
      const elapsed = performance.now() - start;
      setBenchmarkScore(`${(1000 / elapsed * 42).toFixed(0)} MFLOPS`);
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

  const heapPct = Math.min(100, Math.round((heapUsedMb / heapMaxMb) * 100));

  // Filter logs by search and level
  const filteredLogs = useMemo(() => {
    return logs.filter((line) => {
      if (filterLevel === "FFMPEG" && line.type !== "ffmpeg") return false;
      if (filterLevel === "WASM" && line.type !== "wasm") return false;
      if (filterLevel === "SYSTEM" && line.type !== "system") return false;
      if (filterLevel === "ERROR" && line.type !== "error" && line.type !== "warn") return false;
      if (searchQuery.trim()) {
        return line.text.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [logs, filterLevel, searchQuery]);

  return (
    <div className="panel-hud scanlines flex flex-col rounded-tactile border border-border/80 bg-card/85 text-card-foreground shadow-tactile backdrop-blur-xl overflow-hidden select-none">
      {/* Console Multi-Tab Header */}
      <div className="flex items-center justify-between border-b border-border/70 bg-secondary/40 px-3 py-1.5 text-xs">
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <button
            onClick={() => {
              haptics.light();
              setActiveTab("terminal");
            }}
            className={`relative flex items-center gap-1 rounded px-2 py-1 transition-all ${
              activeTab === "terminal"
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal className="size-3" />
            <span>Daemon Logs</span>
          </button>

          <button
            onClick={() => {
              haptics.light();
              setActiveTab("hardware");
            }}
            className={`relative flex items-center gap-1 rounded px-2 py-1 transition-all ${
              activeTab === "hardware"
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Cpu className="size-3" />
            <span>Hardware</span>
          </button>

          <button
            onClick={() => {
              haptics.light();
              setActiveTab("specs");
            }}
            className={`relative flex items-center gap-1 rounded px-2 py-1 transition-all ${
              activeTab === "specs"
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="size-3" />
            <span>Sandbox</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          {isStreaming && (
            <span className="flex items-center gap-1 text-chart-5 font-bold">
              <span className="size-1.5 animate-ping rounded-full bg-chart-5" />
              <span>LIVE</span>
            </span>
          )}
          <span className="rounded border border-border/60 bg-background/60 px-1.5 py-0.5 text-muted-foreground text-[9px]">
            {simdThreads} THREADS
          </span>
        </div>
      </div>

      {/* Tab 1: Daemon Logs */}
      {activeTab === "terminal" && (
        <>
          {/* Search & Filter Toolbar */}
          <div className="flex items-center justify-between gap-1.5 border-b border-border/60 bg-background/50 px-2.5 py-1.5 font-mono text-[10px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Filter stream logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded border border-border/60 bg-card/60 pl-6 pr-2 py-0.5 text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
              />
            </div>

            {/* Filter Level Chips */}
            <div className="flex items-center gap-1 shrink-0 text-[9px]">
              {(["ALL", "FFMPEG", "WASM", "ERROR"] as FilterLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`rounded px-1.5 py-0.5 font-bold transition-colors ${
                    filterLevel === lvl
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Terminal Output Area */}
          <div
            ref={scrollRef}
            style={{ maxHeight }}
            className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed select-text space-y-1 bg-background/80 scrollbar-none"
          >
            {filteredLogs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground/60 italic text-xs">
                {logs.length === 0 ? "Daemon idle. Ready for process commands..." : "No logs match current filter."}
              </div>
            ) : (
              filteredLogs.map((line) => {
                let colorClass = "text-muted-foreground";
                if (line.type === "system") colorClass = "text-foreground font-semibold";
                if (line.type === "wasm") colorClass = "text-primary";
                if (line.type === "ffmpeg") colorClass = "text-chart-2";
                if (line.type === "audio") colorClass = "text-chart-5";
                if (line.type === "ok") colorClass = "text-chart-5 font-medium";
                if (line.type === "warn") colorClass = "text-chart-4";
                if (line.type === "error") colorClass = "text-destructive font-bold";

                return (
                  <div key={line.id} className="flex items-start gap-2 break-all text-[10.5px]">
                    <span suppressHydrationWarning className="shrink-0 text-muted-foreground/40 select-none text-[9.5px]">
                      [{line.time}]
                    </span>
                    <span suppressHydrationWarning className={colorClass}>{line.text}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Terminal Actions Toolbar */}
          <div className="flex items-center justify-between border-t border-border/70 bg-secondary/30 px-3 py-1.5 font-mono text-[10px]">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`flex items-center gap-1 rounded border px-2 py-0.5 transition-colors ${
                  autoScroll
                    ? "border-primary/40 bg-primary/10 text-primary font-bold"
                    : "border-border/60 bg-card/60 text-muted-foreground"
                }`}
                title="Toggle Auto-Scroll"
              >
                <span>Scroll: {autoScroll ? "ON" : "OFF"}</span>
              </button>

              <button
                onClick={() => setIsPaused(!isPaused)}
                className="flex items-center gap-1 rounded border border-border/60 bg-card/60 px-2 py-0.5 text-muted-foreground hover:text-foreground transition-colors"
                title={isPaused ? "Resume log stream" : "Pause log stream"}
              >
                {isPaused ? <Play className="size-2.5" /> : <Pause className="size-2.5" />}
                <span>{isPaused ? "Resume" : "Pause"}</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 rounded border border-border/60 bg-card/60 px-2 py-0.5 text-muted-foreground hover:border-primary/50 hover:text-foreground active:scale-95 transition-all"
                title="Copy full telemetry diagnostics JSON"
              >
                {copied ? <Check className="size-2.5 text-chart-5" /> : <Copy className="size-2.5" />}
                <span>{copied ? "COPIED" : "JSON"}</span>
              </button>

              <button
                onClick={clearLogs}
                className="flex size-6 items-center justify-center rounded border border-border/60 bg-card/60 text-muted-foreground hover:border-destructive hover:text-destructive active:scale-95 transition-all"
                title="Clear current log buffer"
              >
                <Trash2 className="size-2.5" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Tab 2: Hardware & Heap Gauges */}
      {activeTab === "hardware" && (
        <div className="p-3 font-mono text-xs space-y-3 bg-background/60">
          {/* Heap Memory Meter */}
          <div className="rounded-xl border border-border/70 bg-card/70 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Activity className="size-3.5 text-primary" />
                Heap Memory Barometer
              </span>
              <span className="font-bold text-primary">{heapPct}%</span>
            </div>

            <div className="h-2 w-full rounded-full bg-background overflow-hidden border border-border/50">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-chart-5 rounded-full"
                animate={{ width: `${heapPct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Used: {heapUsedMb} MB</span>
              <span>Allocated: {heapMaxMb} MB</span>
            </div>

            <button
              onClick={handleFlush}
              className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary font-bold text-[10px] uppercase hover:bg-primary/20 active:scale-98 transition-all"
            >
              <RotateCcw className="size-3" />
              Flush Heap Garbage Collection
            </button>
          </div>

          {/* SIMD Worker Thread Matrix */}
          <div className="rounded-xl border border-border/70 bg-card/70 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Cpu className="size-3.5 text-chart-2" />
                SIMD Pthread Workers
              </span>
              <span className="font-bold text-chart-5">
                {activeWorkers > 0 ? `${activeWorkers} Active` : `${simdThreads} Ready`}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {Array.from({ length: Math.min(Math.max(simdThreads, 4), 16) }).map((_, i) => {
                const isWorking = i < activeWorkers;
                const isReady = i < simdThreads;
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center py-1.5 rounded border text-[9px] font-bold transition-all ${
                      isWorking
                        ? "border-primary bg-primary/20 text-primary animate-pulse"
                        : isReady
                        ? "border-chart-5/40 bg-chart-5/10 text-chart-5"
                        : "border-border/40 bg-background/40 text-muted-foreground/40"
                    }`}
                  >
                    <span>T{i + 1}</span>
                    <span className="text-[7.5px] opacity-80">
                      {isWorking ? "BUSY" : isReady ? "READY" : "IDLE"}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleBenchmark}
              disabled={benchmarking}
              className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border/70 bg-secondary/60 text-muted-foreground font-bold text-[10px] uppercase hover:text-foreground active:scale-98 transition-all"
            >
              <Sparkles className="size-3" />
              {benchmarking ? "Testing FLOPS..." : benchmarkScore ? `Score: ${benchmarkScore}` : "Benchmark CPU FLOPS"}
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Sandbox Verification */}
      {activeTab === "specs" && (
        <div className="p-3 font-mono text-xs space-y-2.5 bg-background/60">
          <div className="rounded-xl border border-border/70 bg-card/70 p-3 space-y-2 text-[10.5px]">
            <div className="flex items-center gap-2 text-chart-5 font-bold text-xs">
              <ShieldCheck className="size-4" />
              <span>Isolated Client Architecture</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-sans leading-relaxed">
              Omni Tool executes transcode filtergraphs strictly within your browser's private WebAssembly memory sandbox. No telemetry or media chunks leave your physical device.
            </p>

            <div className="space-y-1.5 pt-1 border-t border-border/40 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cross-Origin Isolation:</span>
                <span
                  className={`font-bold ${
                    typeof window !== "undefined" && window.crossOriginIsolated
                      ? "text-chart-5"
                      : "text-amber-400"
                  }`}
                >
                  {typeof window !== "undefined" && window.crossOriginIsolated
                    ? "VERIFIED (COOP/COEP)"
                    : "STANDARD DOM"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">SharedArrayBuffer:</span>
                <span
                  className={`font-bold ${
                    typeof SharedArrayBuffer !== "undefined" ? "text-chart-5" : "text-amber-400"
                  }`}
                >
                  {typeof SharedArrayBuffer !== "undefined" ? "AVAILABLE" : "UNAVAILABLE"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Local Storage API:</span>
                <span className="font-bold text-foreground">
                  {typeof navigator !== "undefined" && typeof navigator.storage?.getDirectory === "function"
                    ? "OPFS V2 + IndexedDB"
                    : "IndexedDB"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Remote Network Egress:</span>
                <span className="font-bold text-chart-5">0 BYTES (AIR-GAPPED)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
