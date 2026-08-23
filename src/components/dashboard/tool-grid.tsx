"use client";

/**
 * TOOL MATRIX — registry-driven dashboard grid.
 * Every tool across all 7 phases is declared once in TOOL_REGISTRY;
 * this grid renders them with phase badges and lock states. As phases
 * ship, statuses flip to "online" and click handlers route to the
 * real module — no dashboard rewrite required.
 */

import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  TOOL_REGISTRY,
} from "@/lib/tools/registry";
import type { ToolCategory, ToolMeta } from "@/types/omni";

type Filter = "all" | ToolCategory;

const ACCENT_STYLES: Record<
  ToolMeta["accent"],
  { tile: string; phaseChip: string }
> = {
  violet: {
    tile: "border-violet-400/30 bg-violet-500/10 text-violet-300",
    phaseChip: "border-violet-400/25 text-violet-300/90",
  },
  cyan: {
    tile: "border-cyan-400/30 bg-cyan-500/10 text-cyan-300",
    phaseChip: "border-cyan-400/25 text-cyan-300/90",
  },
  fuchsia: {
    tile: "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-300",
    phaseChip: "border-fuchsia-400/25 text-fuchsia-300/90",
  },
  emerald: {
    tile: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
    phaseChip: "border-emerald-400/25 text-emerald-300/90",
  },
  amber: {
    tile: "border-amber-400/30 bg-amber-500/10 text-amber-300",
    phaseChip: "border-amber-400/25 text-amber-300/90",
  },
};

function ToolCard({ tool, index }: { tool: ToolMeta; index: number }) {
  const { toast } = useToast();
  const accent = ACCENT_STYLES[tool.accent];
  const locked = tool.status !== "online";

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: Math.min(index * 0.03, 0.4), duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() =>
        locked
          ? toast({
              title: `${tool.name} is sealed`,
              description: `This module unlocks in Phase ${tool.phase} of the build sequence.`,
            })
          : undefined
      }
      className={`panel-hud group relative flex min-h-11 flex-col gap-3 rounded-xl p-4 text-left transition-shadow ${
        locked
          ? "cursor-pointer hover:border-primary/35"
          : "border-primary/40 glow-box-violet"
      }`}
      aria-label={`${tool.name} — ${locked ? `locked, phase ${tool.phase}` : "online"}`}
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
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-pulse/30 bg-pulse/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-pulse">
            <span className="size-1.5 animate-pulse rounded-full bg-pulse" />
            online
          </span>
        )}
      </div>

      <div>
        <p className="font-display text-[13px] font-bold tracking-wide text-foreground">
          {tool.name}
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
          {visible.map((tool, i) => (
            <ToolCard key={tool.id} tool={tool} index={i} />
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
