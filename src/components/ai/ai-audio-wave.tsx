"use client";

import { motion } from "framer-motion";

interface AiAudioWaveProps {
  isAnimating?: boolean;
  barCount?: number;
  className?: string;
  barColor?: string;
}

export function AiAudioWave({
  isAnimating = true,
  barCount = 4,
  className = "",
  barColor = "bg-primary",
}: AiAudioWaveProps) {
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div className={`inline-flex items-center gap-[2px] h-3 px-1 ${className}`}>
      {bars.map((barIndex) => (
        <motion.span
          key={barIndex}
          animate={
            isAnimating
              ? {
                  scaleY: [0.25, 1, 0.4, 0.9, 0.3],
                  opacity: [0.6, 1, 0.7, 1, 0.6],
                }
              : { scaleY: 0.25, opacity: 0.4 }
          }
          transition={
            isAnimating
              ? {
                  duration: 0.8 + (barIndex % 3) * 0.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: barIndex * 0.12,
                }
              : { duration: 0.2 }
          }
          className={`w-[2.5px] h-full rounded-full origin-bottom ${barColor}`}
        />
      ))}
    </div>
  );
}
