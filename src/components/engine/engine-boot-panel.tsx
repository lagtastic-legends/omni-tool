"use client";

/**
 * ENGINE BOOT PANEL — the Phase 1 hero.
 * Left: boot trigger, stage checklist, live stats.
 * Right: streaming terminal console bound to the engine log ring buffer.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  CircleDot,
  Cpu,
  Loader2,
  Power,
  RotateCcw,
  Terminal,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";
import { formatBytes, formatDurationMs } from "@/lib/format";
import type { BootStage, LogLevel } from "@/types/omni";

const STAGES: { id: BootStage; label: string }[] = [
  { id: "worker", label: "Spawn module worker" },
  { id: "fetch", label: "Fetch WASM core (30.7 MB)" },
  { id: "compile", label: "Compile WebAssembly" },
  { id: "online", label: "Engine online" },
];

const LEVEL_CLASS: Record<LogLevel, string> = {
  info: "text-neon/90",
  success: "text-pulse",
  warn: "text-amber-300",
  error: "text-red-300",
  ffmpeg: "text-zinc-400",
};

function StageIcon({ stage, current }: { stage: BootStage; current: BootStage }) {
  const order: BootStage[] = ["standby", "worker", "fetch", "compile", "online"];
  const stageIdx = order.indexOf(stage);
  const currentIdx = order.indexOf(current);
  const isError = currentIdx < 0;

  if (!isError && stageIdx < currentIdx) {
    return <Check className="size-3.5 text-pulse" strokeWidth={3} />;
  }
  if (!isError && stageIdx === currentIdx) {
    return (
      <Loader2 className="size-3.5 animate-spin text-primary" strokeWidth={2.5} />
    );
  }
  return <CircleDot className="size-3.5 text-muted-foreground/50" />;
}

export function EngineBootPanel() {
  const { state, stage, error, boot, shutdown, bootMs, download, logs, capabilities } =
    useFFmpegEngine();

  const consoleRef = useRef<HTMLDivElement>(null);

  /* Keep the terminal pinned to the newest line. */
  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs, download]);

  const busy = state === "loading";
  const ready = state === "ready";
  const failed = state === "error";

  return (
    <section
      aria-labelledby="engine-heading"
      className="panel-hud scanlines relative overflow-hidden rounded-2xl"
    >
      <div className="grid lg:grid-cols-[1fr_1.15fr]">
        {/* ------------------------------------------------ left column */}
        <div className="flex flex-col gap-6 p-6 sm:p-8">
          <div className="space-y-3">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-primary/90">
              <Cpu className="size-3.5" />
              system boot
            </p>
            <h2
              id="engine-heading"
              className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              Initialize the{" "}
              <span className="text-glow-violet text-primary">Media Engine</span>
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Boots a self-hosted FFmpeg WebAssembly core directly in your
              browser. Nothing ever leaves this device — every future tool in
              the suite draws its power from this engine.
            </p>
          </div>

          {/* Boot stages */}
          <ol className="space-y-2.5" aria-label="Boot stages">
            {STAGES.map((s) => (
              <li key={s.id} className="flex items-center gap-3">
                <StageIcon stage={s.id} current={stage} />
                <span
                  className={`font-mono text-xs tracking-wide ${
                    ready || s.id === stage
                      ? "text-foreground/90"
                      : "text-muted-foreground/70"
                  }`}
                >
                  {s.label}
                </span>
                {s.id === "fetch" && stage === "fetch" && download && (
                  <span className="ml-auto font-mono text-[10px] text-neon">
                    {Math.round(download.percent * 100)}%
                  </span>
                )}
                {s.id === "fetch" && (ready || stage === "compile") && (
                  <Check className="ml-auto size-3 text-pulse" />
                )}
              </li>
            ))}
          </ol>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <motion.button
              onClick={() => void boot()}
              disabled={busy || ready}
              whileHover={busy || ready ? undefined : { scale: 1.025 }}
              whileTap={busy || ready ? undefined : { scale: 0.97 }}
              aria-busy={busy}
              className={`group relative inline-flex min-h-11 items-center gap-2.5 overflow-hidden rounded-xl px-6 py-3 font-display text-xs font-bold tracking-[0.2em] transition-colors ${
                ready
                  ? "cursor-default border border-pulse/40 bg-pulse/10 text-pulse"
                  : failed
                    ? "border border-red-400/40 bg-red-500/15 text-red-200 hover:bg-red-500/25"
                    : busy
                      ? "cursor-wait border border-primary/40 bg-primary/15 text-primary/80"
                      : "border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 text-white hover:from-primary hover:to-plasma glow-box-violet"
              }`}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : ready ? (
                <Check className="size-4" strokeWidth={3} />
              ) : failed ? (
                <RotateCcw className="size-4" />
              ) : (
                <Power className="size-4 transition-transform group-hover:scale-110" />
              )}
              {ready ? "ENGINE ONLINE" : busy ? "BOOTING…" : failed ? "RETRY BOOT" : "INITIALIZE ENGINE"}
            </motion.button>

            {ready && (
              <motion.button
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={shutdown}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border/70 bg-card/50 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-300"
              >
                <Power className="size-3.5" />
                Terminate
              </motion.button>
            )}
          </div>

          {failed && error && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] leading-relaxed text-red-300"
              role="alert"
            >
              fault → {error}
            </motion.p>
          )}

          {/* Post-boot stats */}
          <AnimatePresence>
            {ready && (
              <motion.dl
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="grid grid-cols-3 gap-3"
              >
                {[
                  { label: "boot time", value: bootMs ? formatDurationMs(bootMs) : "—" },
                  { label: "core size", value: formatBytes(32_232_419) },
                  {
                    label: "mode",
                    value: capabilities.crossOriginIsolated
                      ? "isolated"
                      : "single-thread",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-border/60 bg-background/50 px-3 py-2.5"
                  >
                    <dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                      {stat.label}
                    </dt>
                    <dd className="mt-1 font-mono text-sm font-semibold text-neon">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </motion.dl>
            )}
          </AnimatePresence>
        </div>

        {/* ----------------------------------------------- right column */}
        <div className="flex min-h-72 flex-col border-t border-border/50 lg:border-l lg:border-t-0">
          {/* console chrome */}
          <div className="flex items-center gap-2 border-b border-border/50 bg-background/60 px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-red-400/70" />
            <span className="size-2.5 rounded-full bg-amber-400/70" />
            <span className="size-2.5 rounded-full bg-pulse/70" />
            <span className="ml-3 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground">
              <Terminal className="size-3" />
              omni://engine/boot.log
            </span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground/60">
              {logs.length} lines
            </span>
          </div>

          {/* transfer bar */}
          <div className="border-b border-border/50 bg-background/40 px-4 py-2">
            <AnimatePresence mode="wait">
              {stage === "fetch" && download ? (
                <motion.div
                  key="fetch"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                    <span>
                      core.wasm · {formatBytes(download.received)} /{" "}
                      {formatBytes(download.total)}
                    </span>
                    <span className="text-neon">
                      {Math.round(download.percent * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-neon"
                      animate={{ width: `${Math.max(download.percent * 100, 2)}%` }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
              ) : stage === "compile" ? (
                <motion.div
                  key="compile"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="mb-1.5 flex justify-between font-mono text-[10px] text-muted-foreground">
                    <span>compiling webassembly · aot</span>
                    <span className="text-primary">working…</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="animate-shimmer h-full w-full rounded-full bg-[linear-gradient(90deg,transparent,oklch(0.62_0.22_300/0.9),oklch(0.82_0.12_205/0.9),transparent)]" />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="idle-bar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-between font-mono text-[10px] text-muted-foreground/60"
                >
                  <span>transfer idle</span>
                  <ChevronRight className="size-3" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* log stream */}
          <div
            ref={consoleRef}
            className="scroll-hud flex-1 space-y-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed max-h-72 lg:max-h-[26rem]"
            role="log"
            aria-live="polite"
            aria-label="Engine boot log"
          >
            {logs.length === 0 ? (
              <p className="text-muted-foreground/50">
                <span className="text-primary">omni@localhost</span>:~$ awaiting
                initialization
                <span className="animate-caret ml-1 inline-block h-3 w-1.5 translate-y-0.5 bg-neon/80" />
              </p>
            ) : (
              logs.map((line) => (
                <div key={line.id} className="flex gap-2">
                  <span className="shrink-0 text-muted-foreground/40">
                    {new Date(line.ts).toLocaleTimeString("en-GB", {
                      hour12: false,
                    })}
                  </span>
                  <span className={`shrink-0 ${LEVEL_CLASS[line.level]}`}>
                    {line.source === "system" ? "[sys]" : "[ff]"}
                  </span>
                  <span className={`break-all ${LEVEL_CLASS[line.level]}`}>
                    {line.message}
                  </span>
                </div>
              ))
            )}
            {(busy || ready) && (
              <span className="animate-caret inline-block h-3 w-1.5 translate-y-0.5 bg-neon/80" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
