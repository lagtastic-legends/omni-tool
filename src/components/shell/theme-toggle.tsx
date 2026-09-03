"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Palette, Sparkles, SunMedium } from "lucide-react";
import { useThemeStore } from "@/lib/theme/theme-store";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="size-8 rounded-full border border-border/70 bg-card/60 animate-pulse" />
    );
  }

  const isTerracotta = theme === "terracotta";

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileTap={{ scale: 0.92 }}
      title={isTerracotta ? "Switch to Cyber Dark Theme" : "Switch to Terracotta Studio Theme"}
      aria-label="Toggle Theme"
      className={cn(
        "relative flex h-8 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[10px] font-bold tracking-wider transition-all duration-300",
        isTerracotta
          ? "border-[#C2652A]/50 bg-[#FAF5EE] text-[#3A302A] shadow-sm hover:border-[#C2652A]"
          : "border-border/70 bg-card/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
      )}
    >
      {/* Color indicator dot */}
      <span
        className={cn(
          "size-2 rounded-full transition-all duration-300",
          isTerracotta
            ? "bg-[#C2652A] shadow-[0_0_8px_#C2652A]"
            : "bg-primary shadow-[0_0_8px_oklch(0.62_0.22_300)]"
        )}
      />

      <span className="hidden sm:inline uppercase">
        {isTerracotta ? "Terracotta" : "Cyber"}
      </span>

      <span className="sm:hidden">
        {isTerracotta ? "🎨" : "⚡"}
      </span>
    </motion.button>
  );
}
