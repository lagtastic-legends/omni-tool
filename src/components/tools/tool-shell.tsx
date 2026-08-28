"use client";

/**
 * ToolShell — shared chrome for every tool module: back navigation,
 * identity header and the engine gate (tools refuse to run cold).
 */

import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Power } from "lucide-react";
import type { ReactNode } from "react";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";
import { useNavStore } from "@/lib/navigation/nav-store";
import { ACCENT_STYLES } from "@/lib/tools/accents";
import { TOOL_REGISTRY } from "@/lib/tools/registry";

interface ToolShellProps {
  toolId: string;
  children: ReactNode;
}

export function ToolShell({ toolId, children }: ToolShellProps) {
  const tool = TOOL_REGISTRY.find((t) => t.id === toolId);
  const reset = useNavStore((s) => s.reset);
  const { state, boot, engine, appendLog } = useFFmpegEngine();

  if (!tool) {
    return (
      <div className="panel-hud rounded-2xl p-8 text-center">
        <p className="font-mono text-sm text-muted-foreground">
          Unknown module — return to the dashboard.
        </p>
      </div>
    );
  }

  const accent = ACCENT_STYLES[tool.accent];
  const Icon = tool.icon;
  /* Document/imaging tools run without the wasm engine. */
  const requiresEngine = tool.requiresEngine !== false;

  return (
    <div className="space-y-6">
      {/* header ---------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <motion.button
          onClick={reset}
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.96 }}
          aria-label="Back to dashboard"
          className="flex w-fit min-h-11 items-center gap-2 rounded-xl border border-border/70 bg-card/50 px-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
            back
        </motion.button>

        <div className="flex flex-1 items-center gap-4">
          <div
            className={`grid size-12 shrink-0 place-items-center rounded-xl border ${accent.tile}`}
          >
            <Icon className="size-6" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold tracking-wide text-foreground sm:text-2xl">
              {tool.name}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              {tool.description}
            </p>
          </div>
        </div>
      </div>

      {/* engine gate ------------------------------------------------------ */}
      {requiresEngine && state !== "ready" ? (
        <div className="panel-hud scanlines flex flex-col items-center gap-4 rounded-2xl p-10 text-center">
          {state === "loading" ? (
            <>
              <Loader2 className="size-8 animate-spin text-primary" />
              <div>
                <p className="font-display text-sm font-bold tracking-wide text-foreground">
                  ENGINE BOOTING…
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  This module unlocks the moment the WASM core is online.
                </p>
              </div>
            </>
          ) : (
            <>
              <Power className="size-8 text-muted-foreground" />
              <div>
                <p className="font-display text-sm font-bold tracking-wide text-foreground">
                  ENGINE REQUIRED
                </p>
                <p className="mt-1 max-w-sm font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {tool.name} runs entirely on the local FFmpeg WebAssembly
                  engine. Bring it online first — one click, ~30 MB, cached
                  afterwards.
                </p>
              </div>
              <button
                onClick={() => void boot()}
                className="min-h-11 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 px-6 font-display text-xs font-bold tracking-[0.2em] text-white glow-box-violet transition-transform hover:scale-[1.03] active:scale-95"
              >
                INITIALIZE ENGINE
              </button>
              {state === "error" && (
                <p className="font-mono text-[11px] text-red-300">
                  Last boot failed — retry when ready.{" "}
                  {!engine && (
                    <button
                      className="underline"
                      onClick={() =>
                        appendLog("system", "info", "Retry requested from tool gate.")
                      }
                    >
                      details in log
                    </button>
                  )}
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        children
      )}
    </div>
  );
}


