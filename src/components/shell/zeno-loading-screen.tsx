"use client";

import Image from "next/image";

interface ZenoLoadingScreenProps {
  status?: string;
  substatus?: string;
}

export function ZenoLoadingScreen({
  status = "INITIALIZING CLIENT SUITE",
  substatus = "100% On-Device · Zero Cloud Latency",
}: ZenoLoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={status}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-4 py-8 text-center select-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
    >
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-72 sm:size-96 rounded-full bg-primary/10 blur-[90px] animate-pulse" />
      </div>

      <div className="relative flex flex-col items-center gap-6 max-w-sm w-full">
        {/* Glowing Logo Emblem */}
        <div className="relative grid size-20 sm:size-24 place-items-center">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-primary/30 to-plasma/30 blur-md animate-pulse" />
          <div className="relative size-full rounded-2xl border border-primary/40 bg-card/80 p-2 shadow-[0_0_24px_rgba(99,102,241,0.25)] flex items-center justify-center overflow-hidden">
            <Image
              src="/logo.jpg"
              alt="ZenoDeck"
              width={80}
              height={80}
              priority
              className="size-full rounded-xl object-cover"
            />
          </div>
        </div>

        {/* Brand Header & Status */}
        <div className="space-y-2 w-full">
          <h1 className="font-display text-lg sm:text-xl font-black uppercase tracking-[0.28em] text-foreground">
            ZENODECK
          </h1>

          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary/90">
            {status}
          </p>

          <p className="font-mono text-[11px] text-muted-foreground">
            {substatus}
          </p>

          {/* Indeterminate Shimmer Progress Bar */}
          <div className="mx-auto mt-4 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-border/60">
            <div className="h-full w-2/3 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary via-plasma to-neon" />
          </div>
        </div>
      </div>
    </div>
  );
}
