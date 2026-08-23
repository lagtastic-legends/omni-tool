"use client";

/**
 * Ambient cinematic backdrop:
 *  - three slow-drifting neon aurora orbs (violet / cyan / fuchsia)
 *  - an engineering grid that fades radially
 *  - a vignette to focus the content column
 * Purely decorative — pointer-events disabled, GPU-friendly transforms only.
 */

import { motion, useReducedMotion } from "framer-motion";

export function AuroraBackground() {
  const reduceMotion = useReducedMotion();

  const orbs = [
    {
      className:
        "h-[42rem] w-[42rem] -top-64 -left-40 bg-primary/25 blur-[140px]",
      drift: reduceMotion ? undefined : { x: [0, 60, -20, 0], y: [0, 30, 60, 0] },
    },
    {
      className:
        "h-[36rem] w-[36rem] top-1/3 -right-52 bg-neon/15 blur-[130px]",
      drift: reduceMotion ? undefined : { x: [0, -50, 10, 0], y: [0, 40, -30, 0] },
    },
    {
      className:
        "h-[30rem] w-[30rem] bottom-[-8rem] left-1/4 bg-plasma/15 blur-[120px]",
      drift: reduceMotion ? undefined : { x: [0, 30, -40, 0], y: [0, -40, 20, 0] },
    },
  ];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Aurora orbs */}
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${orb.className}`}
          animate={orb.drift ?? undefined}
          transition={
            reduceMotion
              ? undefined
              : {
                  duration: 26 + i * 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
        />
      ))}

      {/* Engineering grid */}
      <div className="absolute inset-0 bg-hud-grid" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_60%_at_50%_40%,transparent_40%,oklch(0.07_0.012_295/0.85)_100%)]" />

      {/* Bottom fade into the abyss */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-abyss/90 to-transparent" />
    </div>
  );
}
