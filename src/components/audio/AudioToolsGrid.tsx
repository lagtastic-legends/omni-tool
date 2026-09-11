"use client";

/**
 * OMNI TOOL — AUDIO TOOLS GRID (PHASE 2)
 * =======================================
 *
 * Interactive, dark-mode, hardware-accelerated grid displaying all 13
 * Unified Audio DSP modules with expandable preset selection trays,
 * Framer Motion layoutId spring physics, and Capacitor Haptics integration.
 */

import { useState, useMemo, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Orbit,
  Waves,
  Speaker,
  SlidersVertical,
  MicOff,
  Sliders,
  RotateCcw,
  Clock,
  Scissors,
  Volume2,
  ChevronDown,
  Sparkles,
  Check,
  Search,
  Wand2,
} from "lucide-react";
import { useHaptics } from "@/hooks/use-haptics";
import {
  AUDIO_TOOLS_CATALOG,
  type AudioEffectType,
  type AudioToolMeta,
  getDefaultAudioParams,
} from "@/lib/audio-dsp";

const ICON_MAP = {
  Orbit,
  Waves,
  Speaker,
  SlidersVertical,
  MicOff,
  Sliders,
  RotateCcw,
  Clock,
  Scissors,
  Volume2,
} as const;

const ACCENT_STYLES: Record<
  AudioToolMeta["accentColor"],
  { tile: string; text: string; ring: string; border: string; glow: string }
> = {
  violet: {
    tile: "border-violet-400/30 bg-violet-500/10 text-violet-300",
    text: "text-violet-300",
    ring: "ring-violet-500/30",
    border: "border-violet-500/40",
    glow: "glow-box-violet",
  },
  cyan: {
    tile: "border-cyan-400/30 bg-cyan-500/10 text-cyan-300",
    text: "text-cyan-300",
    ring: "ring-cyan-500/30",
    border: "border-cyan-500/40",
    glow: "glow-box-cyan",
  },
  fuchsia: {
    tile: "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-300",
    text: "text-fuchsia-300",
    ring: "ring-fuchsia-500/30",
    border: "border-fuchsia-500/40",
    glow: "glow-box-fuchsia",
  },
  emerald: {
    tile: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
    text: "text-emerald-300",
    ring: "ring-emerald-500/30",
    border: "border-emerald-500/40",
    glow: "glow-box-emerald",
  },
  amber: {
    tile: "border-amber-400/30 bg-amber-500/10 text-amber-300",
    text: "text-amber-300",
    ring: "ring-amber-500/30",
    border: "border-amber-500/40",
    glow: "glow-box-amber",
  },
  indigo: {
    tile: "border-indigo-400/30 bg-indigo-500/10 text-indigo-300",
    text: "text-indigo-300",
    ring: "ring-indigo-500/30",
    border: "border-indigo-500/40",
    glow: "glow-box-indigo",
  },
};

type CategoryFilter = "all" | "spatial" | "frequency" | "dynamics" | "creative" | "utility";

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All Modules (13)" },
  { id: "spatial", label: "Spatial & 8D" },
  { id: "frequency", label: "EQ & Bass" },
  { id: "dynamics", label: "Denoise & Vol" },
  { id: "creative", label: "Reverb & Voice" },
  { id: "utility", label: "Tempo & Cut" },
];

export interface AudioToolsGridProps {
  selectedToolId?: AudioEffectType | null;
  onSelectTool: (toolId: AudioEffectType, initialParams: Record<string, any>) => void;
  className?: string;
}

const AudioToolCard = memo(function AudioToolCard({
  tool,
  isExpanded,
  onToggleExpand,
  onActivateTool,
}: {
  tool: AudioToolMeta;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onActivateTool: (params: Record<string, any>) => void;
}) {
  const haptics = useHaptics();
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const IconComponent = ICON_MAP[tool.iconName] || Sliders;
  const accent = ACCENT_STYLES[tool.accentColor] || ACCENT_STYLES.violet;

  const currentPreset = tool.presets[selectedPresetIdx];

  const handleSelectPreset = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    void haptics.light();
    setSelectedPresetIdx(idx);
  };

  const handleLaunch = (e: React.MouseEvent) => {
    e.stopPropagation();
    void haptics.medium();
    const defaults = getDefaultAudioParams(tool.id);
    const activeParams = { ...defaults, ...(tool.presets[selectedPresetIdx]?.params || {}) };
    onActivateTool(activeParams);
  };

  return (
    <motion.div
      layout="position"
      layoutId={`audio-tool-${tool.id}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.7 }}
      style={{ transform: "translate3d(0, 0, 0)", backfaceVisibility: "hidden" }}
      className={`panel-hud group relative flex flex-col rounded-tactile p-4 text-left transition-all duration-200 border border-border/50 ${
        isExpanded
          ? `bg-background/90 ${accent.border} ${accent.glow} shadow-elevation2`
          : "bg-background/60 hover:border-primary/40 hover:shadow-elevation1"
      }`}
      onClick={onToggleExpand}
    >
      {/* Top Bar: Icon + Category Badge + Expand Toggle */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <div
            className={`grid size-10 shrink-0 place-items-center rounded-lg border ${accent.tile} transition-transform duration-300 group-hover:scale-105 group-hover:rotate-2`}
          >
            <IconComponent className="size-5" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="font-medium text-sm text-foreground tracking-tight flex items-center gap-1.5">
              {tool.name}
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {tool.category}
            </span>
          </div>
        </div>

        <button
          type="button"
          aria-label={isExpanded ? `Collapse ${tool.name}` : `Expand ${tool.name} presets`}
          className={`grid size-7 place-items-center rounded-md border border-border/40 text-muted-foreground transition-all duration-200 hover:bg-white/5 hover:text-foreground ${
            isExpanded ? "rotate-180 text-foreground bg-white/5" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
        >
          <ChevronDown className="size-3.5 transition-transform" />
        </button>
      </div>

      {/* Description */}
      <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
        {tool.shortDesc}
      </p>

      {/* Quick Launch / Active Preset Teaser */}
      {!isExpanded && (
        <div className="mt-3.5 pt-3 border-t border-border/30 flex items-center justify-between">
          <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
            <Sparkles className="size-3 text-primary/70" />
            {tool.presets.length} presets
          </span>
          <button
            type="button"
            onClick={handleLaunch}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/15 hover:bg-primary/25 text-primary border border-primary/25 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Wand2 className="size-3" />
            Open Tool
          </button>
        </div>
      )}

      {/* Expandable Preset Selection Tray */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3.5 pt-3 border-t border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Quick Presets
                </span>
                <span className="text-[10px] text-muted-foreground/80">
                  Select & Run
                </span>
              </div>

              {/* Preset Buttons Grid */}
              <div className="grid grid-cols-2 gap-1.5">
                {tool.presets.map((preset, idx) => {
                  const isSelected = idx === selectedPresetIdx;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={(e) => handleSelectPreset(e, idx)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-mono text-left transition-all duration-150 border ${
                        isSelected
                          ? `bg-primary/20 border-primary/50 text-foreground font-semibold shadow-xs`
                          : "bg-background/40 hover:bg-background/80 border-border/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="truncate">{preset.label}</span>
                      {isSelected && <Check className="size-3 text-primary shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>

              {/* Action Trigger */}
              <button
                type="button"
                onClick={handleLaunch}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold tracking-wide transition-all duration-150 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-elevation1`}
              >
                <Wand2 className="size-3.5" />
                Configure & Apply {tool.name}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export function AudioToolsGrid({
  selectedToolId,
  onSelectTool,
  className = "",
}: AudioToolsGridProps) {
  const haptics = useHaptics();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedToolId, setExpandedToolId] = useState<AudioEffectType | null>(
    selectedToolId || null
  );

  const filteredTools = useMemo(() => {
    return AUDIO_TOOLS_CATALOG.filter((tool) => {
      const matchesCategory =
        activeCategory === "all" || tool.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.presets.some((p) => p.label.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const handleCategoryChange = (cat: CategoryFilter) => {
    void haptics.light();
    setActiveCategory(cat);
  };

  const handleToggleExpand = (id: AudioEffectType) => {
    void haptics.light();
    setExpandedToolId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Category Pills & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/40 border border-border/50 rounded-tactile p-3 panel-hud">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={`relative px-3 py-1.5 rounded-full font-mono text-xs whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? "text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="audio-category-pill"
                    className="absolute inset-0 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.6 }}
                  />
                )}
                <span className="relative z-10">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] sm:w-60 shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audio tools..."
            className="w-full pl-8 pr-3 py-1.5 rounded-md text-xs bg-background/60 border border-border/60 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-mono"
          />
        </div>
      </div>

      {/* Grid of 13 DSP Cards */}
      {filteredTools.length === 0 ? (
        <div className="p-8 text-center rounded-tactile border border-dashed border-border/60 panel-hud">
          <p className="text-sm text-muted-foreground">
            No audio tools matched your filter query.
          </p>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5"
        >
          {filteredTools.map((tool) => (
            <AudioToolCard
              key={tool.id}
              tool={tool}
              isExpanded={expandedToolId === tool.id}
              onToggleExpand={() => handleToggleExpand(tool.id)}
              onActivateTool={(params) => onSelectTool(tool.id, params)}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
