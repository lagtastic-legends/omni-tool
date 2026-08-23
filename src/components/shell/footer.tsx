"use client";

import { Cpu, ShieldCheck } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border/50 bg-background/60 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-center sm:flex-row sm:px-6 sm:text-left">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          OMNI TOOL — phase 2 / 7 · video &amp; visual engine
        </p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <Cpu className="size-3.5 text-neon/70" />
            100% on-device processing
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-pulse/70" />
            zero uploads
          </span>
        </div>
      </div>
    </footer>
  );
}
