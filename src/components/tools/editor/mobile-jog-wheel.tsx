"use client";

import React, { useRef, useState, useCallback } from "react";
import { useHaptics } from "@/hooks/use-haptics";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

interface MobileJogWheelProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
}

const FRAME_TIME = 1 / 30; // 30 FPS standard frame delta (0.0333s)

/**
 * MobileJogWheel — Tactile Touch Scrubber with Haptic Millimeter Ticks.
 *
 * Designed for one-thumb micro-scrubbing on mobile devices:
 * - Frame-by-frame stepping (-1f / +1f) with micro-haptic clicks.
 * - Inertial touch-drag ribbon calibrated for precise editing.
 * - Center playhead indicator with dynamic timecode display.
 */
export function MobileJogWheel({
  currentTime,
  duration,
  isPlaying,
  onTogglePlay,
  onSeek,
}: MobileJogWheelProps) {
  const haptics = useHaptics();
  const touchStartRef = useRef<{ x: number; time: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastTickTimeRef = useRef<number>(currentTime);

  // Step exact frames
  const handleStepFrames = useCallback(
    (frames: number) => {
      const targetTime = Math.max(0, Math.min(duration, currentTime + frames * FRAME_TIME));
      onSeek(targetTime);
      void haptics.selectionChanged();
    },
    [currentTime, duration, onSeek, haptics]
  );

  // Step seconds
  const handleStepSeconds = useCallback(
    (sec: number) => {
      const targetTime = Math.max(0, Math.min(duration, currentTime + sec));
      onSeek(targetTime);
      void haptics.light();
    },
    [currentTime, duration, onSeek, haptics]
  );

  // Touch drag scrubbing across the jog wheel
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    touchStartRef.current = { x: clientX, time: currentTime };
    lastTickTimeRef.current = currentTime;
    setIsDragging(true);
    void haptics.selectionStart();
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStartRef.current || !isDragging) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - touchStartRef.current.x;

    // 1px of horizontal movement = 0.02 seconds of video
    const timeDelta = (deltaX * 0.02);
    const newTime = Math.max(
      0,
      Math.min(duration, touchStartRef.current.time + timeDelta)
    );

    onSeek(newTime);

    // Fire haptic tick every 3 frames (~0.1s)
    if (Math.abs(newTime - lastTickTimeRef.current) >= FRAME_TIME * 2) {
      void haptics.selectionChanged();
      lastTickTimeRef.current = newTime;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartRef.current = null;
    void haptics.selectionEnd();
  };

  // Generate graduated tick marks for the wheel visual
  const ticks = Array.from({ length: 41 }, (_, i) => i - 20);

  return (
    <div className="w-full bg-[#141414] border-t border-b border-white/5 py-2.5 px-3 flex flex-col items-center select-none touch-none">
      {/* Quick Frame Navigation Strip */}
      <div className="flex items-center justify-between w-full max-w-sm mb-2 text-xs font-mono">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleStepSeconds(-1)}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[#94A3B8] active:text-white transition-all text-[11px] cursor-pointer"
            title="Step Back 1s"
          >
            -1s
          </button>
          <button
            onClick={() => handleStepFrames(-1)}
            className="flex items-center px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-cyan-400 font-bold active:bg-cyan-500/20 transition-all text-[11px] cursor-pointer"
            title="Step Back 1 Frame"
          >
            <ChevronLeft className="size-3" />
            <span>1f</span>
          </button>
        </div>

        {/* Center Play/Pause button */}
        <button
          onClick={() => {
            onTogglePlay();
            void haptics.light();
          }}
          className={`size-8 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
            isPlaying
              ? "bg-amber-500 text-black font-bold scale-95"
              : "bg-blue-600 text-white hover:bg-blue-500 active:scale-95"
          }`}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current ml-0.5" />}
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleStepFrames(1)}
            className="flex items-center px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-cyan-400 font-bold active:bg-cyan-500/20 transition-all text-[11px] cursor-pointer"
            title="Step Forward 1 Frame"
          >
            <span>1f</span>
            <ChevronRight className="size-3" />
          </button>
          <button
            onClick={() => handleStepSeconds(1)}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[#94A3B8] active:text-white transition-all text-[11px] cursor-pointer"
            title="Step Forward 1s"
          >
            +1s
          </button>
        </div>
      </div>

      {/* Touch-Interactive Graduated Jog Strip */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        className={`w-full max-w-sm h-12 rounded-xl bg-[#0D0D0D] border border-white/10 relative overflow-hidden flex items-center justify-center cursor-ew-resize transition-all ${
          isDragging ? "border-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,0.2)]" : ""
        }`}
      >
        {/* Graduated Ruler Ticks */}
        <div className="flex items-center justify-center gap-1.5 w-full pointer-events-none opacity-60">
          {ticks.map((t) => {
            const isMajor = t % 5 === 0;
            const isCenter = t === 0;
            return (
              <div
                key={t}
                className={`transition-all rounded-full ${
                  isCenter
                    ? "w-0.5 h-7 bg-cyan-400 opacity-100"
                    : isMajor
                    ? "w-0.5 h-4 bg-white/60"
                    : "w-0.5 h-2 bg-white/20"
                }`}
              />
            );
          })}
        </div>

        {/* Center Laser CTI Playhead Needle */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-cyan-400 via-blue-400 to-cyan-400 pointer-events-none shadow-[0_0_8px_#22D3EE] z-10">
          <div className="size-2 rounded-full bg-cyan-300 absolute -top-1 -left-[3px] shadow-[0_0_6px_#22D3EE]" />
        </div>

        {/* Dynamic Drag Hint */}
        <div className="absolute bottom-1 right-2 text-[9px] font-mono text-white/30 uppercase tracking-widest pointer-events-none">
          {isDragging ? "SCRUBBING" : "JOG WHEEL"}
        </div>
      </div>
    </div>
  );
}
