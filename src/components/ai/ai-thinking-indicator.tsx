"use client";

import { motion } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";
import { AiAudioWave } from "./ai-audio-wave";

interface AiThinkingIndicatorProps {
  statusText?: string;
  className?: string;
}

export function AiThinkingIndicator({
  statusText = "Omni is analyzing your query...",
  className = "",
}: AiThinkingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className={`flex items-start gap-2.5 max-w-[85%] ${className}`}
    >
      {/* Animated Bot Avatar with Rotating Halo */}
      <div className="relative size-7 shrink-0 flex items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/40 shadow-sm mt-0.5">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-1 rounded-xl border border-dashed border-primary/40 pointer-events-none"
        />
        <Bot className="size-4 animate-pulse" />
      </div>

      {/* Cybernetic Thinking Card */}
      <div className="rounded-2xl rounded-tl-sm p-3.5 bg-card/80 border border-border/80 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <AiAudioWave isAnimating={true} barCount={5} barColor="bg-primary" />
          <div className="flex flex-col">
            <span className="font-mono text-xs font-semibold text-foreground tracking-wide flex items-center gap-1.5">
              <span>{statusText}</span>
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                className="size-1.5 rounded-full bg-primary inline-block"
              />
            </span>
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
              NEURAL STREAM ACTIVE
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
