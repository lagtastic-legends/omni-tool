"use client";

import React from "react";
import { Scissors, Undo2, Layers, Download, Trash2 } from "lucide-react";
import { useHaptics } from "@/hooks/use-haptics";

interface MobileThumbDeckProps {
  onSplit: () => void;
  onSetInPoint: () => void;
  onSetOutPoint: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onOpenTransitions: () => void;
  onDeleteClip: () => void;
  onExport: () => void;
  clipsCount: number;
  hasActiveTransition: boolean;
  canDelete: boolean;
  isBusy: boolean;
}

/**
 * MobileThumbDeck — Single-Thumb Ergonomic Action Bay.
 *
 * Positioned in the natural thumb zone (<120px from bottom):
 * - Prominent center Razor Blade split button.
 * - Quick trim In/Out buttons.
 * - One-tap Transitions sheet trigger with live seam badge.
 * - Undo rollback and master export actions.
 */
export function MobileThumbDeck({
  onSplit,
  onSetInPoint,
  onSetOutPoint,
  onUndo,
  canUndo,
  onOpenTransitions,
  onDeleteClip,
  onExport,
  clipsCount,
  hasActiveTransition,
  canDelete,
  isBusy,
}: MobileThumbDeckProps) {
  const haptics = useHaptics();

  return (
    <div className="w-full bg-[#181818]/95 backdrop-blur-md border-t border-white/10 px-3 py-2.5 flex items-center justify-between gap-1.5 select-none z-20 shadow-2xl">
      {/* Left Group: Undo & In Point */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => {
            onUndo();
            void haptics.light();
          }}
          disabled={!canUndo || isBusy}
          className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#94A3B8] active:text-white active:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="size-4" />
        </button>

        <button
          onClick={() => {
            onSetInPoint();
            void haptics.medium();
          }}
          disabled={isBusy}
          className="px-2.5 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-mono font-semibold text-[#E2E8F0] active:bg-white/15 transition-all cursor-pointer"
          title="Set In-Point"
        >
          [In]
        </button>

        <button
          onClick={() => {
            onSetOutPoint();
            void haptics.medium();
          }}
          disabled={isBusy}
          className="px-2.5 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-mono font-semibold text-[#E2E8F0] active:bg-white/15 transition-all cursor-pointer"
          title="Set Out-Point"
        >
          [Out]
        </button>
      </div>

      {/* Center: BIG RAZOR BLADE SPLIT BUTTON */}
      <button
        onClick={() => {
          onSplit();
          void haptics.heavy();
        }}
        disabled={isBusy}
        className="h-11 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(6,182,212,0.35)] active:scale-95 active:shadow-[0_0_28px_rgba(6,182,212,0.6)] transition-all cursor-pointer"
        title="Split Clip at Playhead"
      >
        <Scissors className="size-4" />
        <span>SPLIT</span>
      </button>

      {/* Right Group: Transitions, Delete, Export */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => {
            onOpenTransitions();
            void haptics.light();
          }}
          disabled={isBusy}
          className="h-10 px-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1 text-xs font-mono text-[#94A3B8] active:text-white active:bg-white/10 transition-all cursor-pointer relative"
          title="Open Transitions Drawer"
        >
          <Layers className="size-4 text-cyan-400" />
          <span className="hidden xs:inline">FX</span>
          {clipsCount > 1 && hasActiveTransition && (
            <span className="size-2 rounded-full bg-cyan-400 animate-pulse absolute -top-0.5 -right-0.5 shadow-[0_0_6px_#22D3EE]" />
          )}
        </button>

        {canDelete && (
          <button
            onClick={() => {
              onDeleteClip();
              void haptics.medium();
            }}
            disabled={isBusy}
            className="size-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 active:bg-red-500/20 transition-all cursor-pointer"
            title="Delete Selected Clip"
          >
            <Trash2 className="size-4" />
          </button>
        )}

        <button
          onClick={() => {
            onExport();
            void haptics.light();
          }}
          disabled={isBusy}
          className="size-10 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer"
          title="Export Video"
        >
          <Download className="size-4" />
        </button>
      </div>
    </div>
  );
}
