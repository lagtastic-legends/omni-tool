import type { ToolMeta } from "@/types/omni";

/** Shared accent styling for icon tiles + phase chips across the suite. */
export const ACCENT_STYLES: Record<
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
