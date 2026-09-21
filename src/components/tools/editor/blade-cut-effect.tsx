"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BladeCutEffectProps {
  active: boolean;
}

/**
 * BladeCutEffect — High-impact visual razor slash animation.
 *
 * Plays when a clip split is triggered:
 * 1. Neon razor laser cuts diagonally across the screen.
 * 2. Lateral light-flare burst along the cut seam.
 * 3. Particle sparks fly off the incision point.
 */
export function BladeCutEffect({ active }: BladeCutEffectProps) {
  return (
    <AnimatePresence>
      {active && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden flex items-center justify-center">
          {/* Cyan/Blue Neon Blade Slash Line */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0, rotate: -28 }}
            animate={{
              scaleX: [0, 1.4, 1.6],
              opacity: [0, 1, 0],
              rotate: -28,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.38, ease: "easeOut" }}
            className="w-[140%] h-[3px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_24px_rgba(34,211,238,0.9),0_0_8px_white]"
          />

          {/* Flash Core Flare */}
          <motion.div
            initial={{ scale: 0.2, opacity: 0.9 }}
            animate={{ scale: [0.2, 1.8, 2.2], opacity: [0.9, 0.4, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="absolute size-28 rounded-full bg-cyan-400/30 blur-xl"
          />

          {/* Lateral Blade Knife Slice Shadow */}
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: [0.8, 0] }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-cyan-500/10 mix-blend-screen"
          />
        </div>
      )}
    </AnimatePresence>
  );
}
