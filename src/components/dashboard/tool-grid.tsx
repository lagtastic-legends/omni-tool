"use client";

/**
 * TOOL MATRIX — registry-driven dashboard grid.
 * Every tool across all 7 phases is declared once in TOOL_REGISTRY;
 * online tools navigate into their module, locked ones tease their phase.
 */

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, LayoutGrid, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";
import { useNavStore } from "@/lib/navigation/nav-store";
import { ACCENT_STYLES } from "@/lib/tools/accents";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  TOOL_REGISTRY,
  getOnlineTools,
} from "@/lib/tools/registry";
import type { ToolCategory, ToolMeta } from "@/types/omni";

type Filter = "all" | ToolCategory;

function ToolCard({
  tool,
  index,
  engineState,
}: {
  tool: ToolMeta;
  index: number;
  engineState: "idle" | "loading" | "ready" | "error";
}) {
  const { toast } = useToast();
  const navigate = useNavStore((s) => s.navigate);
  const accent = ACCENT_STYLES[tool.accent];
  const locked = tool.status !== "online";
  const requiresEngine = tool.requiresEngine !== false;
  const isEngineReady = !requiresEngine || engineState === "ready";

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: Math.min(index * 0.03, 0.4), duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { type: "spring", stiffness: 450, damping: 22 } }}
      whileTap={{ scale: 0.97, y: 1, transition: { type: "spring", stiffness: 500, damping: 22 } }}
      onClick={() =>
        locked
          ? toast({
              title: `${tool.name} is sealed`,
              description: `This module unlocks in Phase ${tool.phase} of the build sequence.`,
            })
          : navigate(tool.id)
      }
      className={`panel-hud group relative flex min-h-11 flex-col gap-3 rounded-tactile p-4 text-left shadow-tactile transition-all duration-200 ${
        locked
          ? "cursor-pointer hover:border-primary/35 hover:shadow-elevation1"
          : isEngineReady
          ? "cursor-pointer border-primary/40 glow-box-violet hover:shadow-elevation2"
          : "cursor-pointer hover:border-primary/40 hover:shadow-elevation1"
      }`}
      aria-label={`${tool.name} — ${locked ? `locked, phase ${tool.phase}` : isEngineReady ? "online, open module" : "standby, requires engine"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={`grid size-10 shrink-0 place-items-center rounded-lg border ${accent.tile} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
        >
          <tool.icon className="size-5" strokeWidth={1.75} />
        </div>
        {locked ? (
          <span className="flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            <Lock className="size-2.5" />
            phase {tool.phase}
          </span>
        ) : requiresEngine && engineState !== "ready" ? (
          engineState === "loading" ? (
            <span className="flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-cyan-300">
              <span className="size-1.5 animate-ping rounded-full bg-cyan-400" />
              booting…
            </span>
          ) : engineState === "error" ? (
            <span className="flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-destructive">
              <span className="size-1.5 rounded-full bg-destructive" />
              error
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full border border-border/70 bg-card/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-muted-foreground/60" />
              standby
            </span>
          )
        ) : (
          <span className="flex items-center gap-1 rounded-full border border-pulse/30 bg-pulse/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-pulse">
            <span className="size-1.5 animate-pulse rounded-full bg-pulse" />
            online
          </span>
        )}
      </div>

      <div>
        <p className="flex items-center gap-1.5 font-display text-[13px] font-bold tracking-wide text-foreground">
          {tool.name}
          {!locked && (
            <ArrowUpRight className="size-3.5 text-primary opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
          )}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {tool.description}
        </p>
      </div>

      <span
        className={`mt-auto inline-flex w-fit items-center rounded border px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.14em] ${accent.phaseChip}`}
      >
        {CATEGORY_LABELS[tool.category]}
      </span>
    </motion.button>
  );
}

export function ToolGrid() {
  const { state } = useFFmpegEngine();
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const map = new Map<Filter, number>([["all", TOOL_REGISTRY.length]]);
    for (const tool of TOOL_REGISTRY) {
      map.set(tool.category, (map.get(tool.category) ?? 0) + 1);
    }
    return map;
  }, []);

  const visible = useMemo(
    () =>
      filter === "all"
        ? TOOL_REGISTRY
        : TOOL_REGISTRY.filter((t) => t.category === filter),
    [filter],
  );

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All Modules" },
    ...CATEGORY_ORDER.map((c) => ({ id: c, label: CATEGORY_LABELS[c] })),
  ];

  const onlineCount = useMemo(
    () =>
      TOOL_REGISTRY.filter(
        (t) => t.status === "online" && (t.requiresEngine === false || state === "ready")
      ).length,
    [state]
  );

  return (
    <section aria-labelledby="matrix-heading" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3
          id="matrix-heading"
          className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.28em] text-foreground/90"
        >
          <LayoutGrid className="size-4 text-primary" />
          Tool Matrix
        </h3>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="text-pulse">{onlineCount} live</span> ·{" "}
          {TOOL_REGISTRY.length} modules · engine{" "}
          <span className={state === "ready" ? "text-pulse" : "text-amber-300"}>
            {state}
          </span>
        </p>
      </div>

      {/* filter rail */}
      <div className="scroll-hud flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter tools by category">
        {filters.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.id)}
              className={`relative shrink-0 rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                active
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="matrix-filter-pill"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-plasma"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10">
                {f.label}
                <span
                  className={`ml-1.5 text-[9px] ${active ? "text-white/70" : "text-muted-foreground/60"}`}
                >
                  {counts.get(f.id) ?? 0}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* grid */}
      <motion.div layout className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {visible.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 26 }}
              className="col-span-full panel-hud rounded-tactile p-10 sm:p-14 text-center space-y-4 border border-border/80 shadow-tactile"
            >
              <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-border/80 bg-card/70 text-muted-foreground shadow-subtle">
                <LayoutGrid className="size-5 opacity-70" />
              </div>
              <div className="space-y-1">
                <p className="font-display text-base font-bold tracking-wide text-foreground">
                  No modules in this sector
                </p>
                <p className="font-mono text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  There are no tools registered under this category yet. Explore other sectors or return to all modules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="mt-2 inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 font-mono text-xs font-semibold text-primary hover:bg-primary/20 active:scale-95 transition-all"
              >
                Show All Modules
              </button>
            </motion.div>
          ) : (
            visible.map((tool, i) => (
              <ToolCard key={tool.id} tool={tool} index={i} engineState={state} />
            ))
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
